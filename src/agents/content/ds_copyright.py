"""DS-COPYRIGHT — trademark/copyright compliance check. Regex only, no LLM.

Flags an article if its title or content contains Rockstar/Take-Two
corporate-affiliation claims, or any Rockstar-owned product name marked with
an explicit (R)/(TM) symbol. CLAUDE.md non-negotiable: "No Rockstar/GTA
trademarks on the site."

Design note — fair use: DecodedSix is a fan site whose entire purpose is
describing GTA 6 (money spots, locations, weekly challenges). Ordinary,
unmarked, descriptive references to "GTA 6", "Vice City", character names,
etc. are standard nominative fair use — every gaming site does this, and
blocking it would make the site's own core content unpublishable. What this
check actually targets is content that reads as an *official* Rockstar/
Take-Two source (bare "Rockstar"/"Rockstar Games" claims, explicit ® or ™
glyphs attached to a franchise name, affiliation phrases like "official
Rockstar Games product") — the kind of thing that shows up when an LLM
copies marketing copy verbatim, which is the actual infringement/affiliation
risk, not the word "Vice City" appearing in a location guide.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Optional

log = logging.getLogger(__name__)

AGENT_ID = "ds_copyright"

# Bare company/brand claims — always flagged, no symbol required, since
# claiming to BE or speak FOR Rockstar/Take-Two is the actual risk.
_COMPANY_PATTERNS = [
    r"Rockstar\s+Games",
    r"Rockstar\s+North",
    r"Rockstar\s+San\s+Diego",
    r"Rockstar\s+Games\s+Social\s+Club",
    r"Take-Two\s+Interactive(?:\s+Software)?",
    r"(?<!\w)Rockstar(?!\s+\w)",  # bare "Rockstar" not followed by another word (avoids false positives on unrelated phrases)
]

# Affiliation-claim phrasing — the kind of line an AI copies from official
# marketing copy, not something a fan would organically write.
_AFFILIATION_PATTERNS = [
    r"official\s+Rockstar\s+Games?\s+(?:product|site|partner)",
    r"licensed\s+by\s+Take-Two",
    r"in\s+partnership\s+with\s+Rockstar",
    r"Rockstar\s+Games\s+presents",
]

# Franchise/product names — only flagged when marked with the actual (R)/(TM)
# glyph, since that symbol appearing in generated content signals copied
# official copy, not a fan's own description.
_MARKED_FRANCHISE_NAMES = [
    "GTA", "Grand Theft Auto", "Red Dead Redemption", "Max Payne",
    "L.A. Noire", "Bully", "Midnight Club", "Manhunt", "Chinatown Wars",
    "Social Club",
]
_TRADEMARK_GLYPH_RE = re.compile(r"[®™]")

TRADEMARK_PATTERNS: list[str] = (
    _COMPANY_PATTERNS
    + _AFFILIATION_PATTERNS
    + [rf"{re.escape(name)}\s*[®™]" for name in _MARKED_FRANCHISE_NAMES]
)

_COMPILED_PATTERNS = [(p, re.compile(p, re.IGNORECASE)) for p in TRADEMARK_PATTERNS]


class CopyrightError(RuntimeError):
    """Raised when the check itself fails to run (not when it flags a match)."""


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


def check_copyright(
    article_id: str,
    supabase_client: Optional[Any] = None,
) -> dict:
    """
    Scan article_id's title + content for trademark/protected phrases.

    Returns {article_id, flagged, matches}. Sets articles.copyright_pass
    accordingly. Raises CopyrightError only if the check itself can't run
    (e.g. article not found) — a match is a normal flagged result, not
    an exception.
    """
    supabase = supabase_client or _get_supabase_client()

    try:
        row_result = (
            supabase.table("articles").select("title, content").eq("id", article_id).single().execute()
        )
        if not row_result.data:
            raise CopyrightError(f"Article {article_id} not found")

        combined = f"{row_result.data['title']}\n{row_result.data['content']}"
        matches = sorted({pattern for pattern, regex in _COMPILED_PATTERNS if regex.search(combined)})
        flagged = bool(matches)

        update_result = (
            supabase.table("articles")
            .update({"copyright_pass": not flagged})
            .eq("id", article_id)
            .execute()
        )
        if not update_result.data:
            raise CopyrightError(f"Update to articles failed for {article_id}")

        _write_audit(supabase, article_id, "copyright_check", "flagged" if flagged else "passed")

        return {"article_id": article_id, "flagged": flagged, "matches": matches}

    except Exception as exc:
        try:
            _write_audit(supabase, article_id, "copyright_check", "failure", error=str(exc))
        except Exception as audit_exc:
            log.error("[ds_copyright] failed to write failure audit_log entry: %s", audit_exc)
        if isinstance(exc, CopyrightError):
            raise
        raise CopyrightError(f"ds_copyright failed: {exc}") from exc
