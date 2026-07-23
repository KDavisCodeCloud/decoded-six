"""DS-IMAGE-VERIFY — confirms every embedded image actually resolves and is a
known, accurate official Rockstar press image before an article reaches HITL.

Two independent checks; either one failing flags the article for review
(never a hard crash — same non-fatal-flag pattern as ds_copyright.py):

1. URL RESOLVES — a live HTTP request returns a non-error status for a
   hotlinked https:// URL, or the file exists on disk under public/ for
   a site-relative local path (most images as of 2026-07-23 -- see
   rockstar_images.py). Catches broken references either way, e.g. the
   real bug found 2026-07-19 where ds_humanizer's banned-word filter
   silently corrupted "ULTIMATE_EDITION_" image filenames into
   "_EDITION_", 404-ing the image.

2. URL IS A KNOWN REGISTRY IMAGE — the exact URL must match an entry in
   rockstar_images.ROCKSTAR_IMAGES. This is the actual "accurate
   information" guarantee, not just an uptime check: only in-registry URLs
   are curated to real, correctly-identified official Rockstar press
   images with a verified caption. A URL that happens to resolve (200)
   but isn't in the registry could be pointing at literally any image —
   this check is what catches that a caption is actually describing what
   the image actually shows, not just that something loaded.

Regex/direct-lookup only, no LLM — same design as ds_copyright.py.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Optional

import requests

log = logging.getLogger(__name__)

AGENT_ID = "ds_image_verify"

_MD_IMAGE_RE = re.compile(r'!\[[^\]]*\]\(([^)\s]+)\)')


class ImageVerifyError(RuntimeError):
    """Raised when the check itself fails to run (not when it flags an issue)."""


def _get_supabase_client() -> Any:
    from supabase import create_client

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _write_audit(
    supabase: Any,
    article_id: Optional[str],
    action: str,
    result: str,
    error: Optional[str] = None,
) -> None:
    supabase.table("audit_log").insert({
        "agent_id": AGENT_ID,
        "action": action,
        "article_id": article_id,
        "result": result,
        "error": error,
    }).execute()


def _extract_image_urls(content: str) -> list[str]:
    return _MD_IMAGE_RE.findall(content)


def _url_resolves(url: str, timeout: float = 8.0) -> bool:
    """
    A "url" here is either a real hotlinked https:// address (Ultimate
    Edition / Vintage Vice City Pack, still hotlinked as of 2026-07-23 --
    see rockstar_images.py) or a site-relative local path like
    /images/tier1/characters/jason-duval/screenshot-Jason_Duval_01.jpg
    (everything else, now served from public/ instead of Rockstar's CDN).
    A local path can't be HTTP-resolved before the site is deployed with
    it, and doesn't need to be -- checking the file actually exists on
    disk is the equivalent, real check for that case.
    """
    if url.startswith("/"):
        from src.agents.content.rockstar_images import REPO_ROOT
        return (REPO_ROOT / "public" / url.lstrip("/")).is_file()

    try:
        resp = requests.head(url, timeout=timeout, allow_redirects=True)
        if resp.status_code >= 400:
            # Some CDNs don't support HEAD reliably -- confirm with a
            # minimal ranged GET before concluding it's actually broken.
            resp = requests.get(url, timeout=timeout, stream=True, headers={"Range": "bytes=0-0"})
        return resp.status_code < 400
    except requests.RequestException:
        return False


def verify_images(
    article_id: str,
    supabase_client: Optional[Any] = None,
) -> dict:
    """
    Verify every embedded image in article_id resolves and matches a known,
    curated official Rockstar press image.

    Returns {article_id, flagged, broken_urls, unverified_urls}. Writes an
    audit_log entry recording the outcome. Raises ImageVerifyError only if
    the check itself can't run (e.g. article not found) -- a broken or
    unverified image is a normal flagged result, not an exception.
    """
    from src.agents.content.rockstar_images import ROCKSTAR_IMAGES

    known_urls = {img["url"] for img in ROCKSTAR_IMAGES}

    supabase = supabase_client or _get_supabase_client()

    try:
        row_result = (
            supabase.table("articles").select("content").eq("id", article_id).single().execute()
        )
        if not row_result.data:
            raise ImageVerifyError(f"Article {article_id} not found")

        urls = _extract_image_urls(row_result.data["content"])
        unverified_urls = [u for u in urls if u not in known_urls]
        # Only spend a live HTTP round-trip verifying URLs already known to
        # be curated-correct -- an unverified URL is flagged regardless of
        # whether it happens to resolve, so no need to double-check it.
        broken_urls = [u for u in urls if u in known_urls and not _url_resolves(u)]

        flagged = bool(broken_urls or unverified_urls)

        result_str = (
            "passed" if not flagged else
            f"flagged:broken={len(broken_urls)},unverified={len(unverified_urls)}"
        )
        _write_audit(supabase, article_id, "image_verify", result_str)

        return {
            "article_id": article_id,
            "flagged": flagged,
            "broken_urls": broken_urls,
            "unverified_urls": unverified_urls,
        }

    except Exception as exc:
        try:
            _write_audit(supabase, article_id, "image_verify", "failure", error=str(exc))
        except Exception as audit_exc:
            log.error("[ds_image_verify] failed to write failure audit_log entry: %s", audit_exc)
        if isinstance(exc, ImageVerifyError):
            raise
        raise ImageVerifyError(f"ds_image_verify failed: {exc}") from exc
