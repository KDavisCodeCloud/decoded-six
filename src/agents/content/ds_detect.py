"""DS-DETECT — AI detection scoring via Originality.ai.

Placeholder until ORIGINALITY_API_KEY is set: logs that the key is needed and
writes an audit_log entry without a score. Once the key is present, calls
Originality.ai, stores the score on articles.ai_detect_score, and flags
articles scoring above the docs/VOICE.md 30% threshold for manual review
instead of letting the pipeline treat them as clean.

NOTE: the Originality.ai request/response shape below (POST /api/v1/scan/ai,
X-OAI-API-KEY header, {"score": {"ai": 0..1}} response) matches their
documented v1 API as of this writing, but has not been exercised against a
live key — verify against current Originality.ai docs once
ORIGINALITY_API_KEY is available.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

import requests

log = logging.getLogger(__name__)

AGENT_ID = "ds_detect"
ORIGINALITY_API_URL = "https://api.originality.ai/api/v1/scan/ai"
DETECTION_THRESHOLD_PERCENT = 30  # docs/VOICE.md: "Never publish above 30%"


class DetectError(RuntimeError):
    """Raised when the detection pass fails to run (not the same as a high score)."""


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


def detect_article(
    article_id: str,
    supabase_client: Optional[Any] = None,
) -> dict:
    """
    Score article_id for AI-generated content via Originality.ai.

    Returns {article_id, score, flagged_for_review, checked}. `checked` is
    False when ORIGINALITY_API_KEY isn't set — placeholder mode, no score
    recorded. Raises DetectError only for unexpected failures (article
    missing, API/DB errors) — a high-but-successfully-measured score is a
    normal flagged result, not an exception.
    """
    supabase = supabase_client or _get_supabase_client()
    api_key = os.getenv("ORIGINALITY_API_KEY")

    if not api_key:
        log.warning(
            "[ds_detect] ORIGINALITY_API_KEY not set — running as placeholder, "
            "no AI detection score will be recorded for article %s",
            article_id,
        )
        _write_audit(supabase, article_id, "detect", "skipped_no_api_key")
        return {"article_id": article_id, "score": None, "flagged_for_review": False, "checked": False}

    try:
        row_result = (
            supabase.table("articles").select("title, content").eq("id", article_id).single().execute()
        )
        if not row_result.data:
            raise DetectError(f"Article {article_id} not found")

        response = requests.post(
            ORIGINALITY_API_URL,
            headers={"X-OAI-API-KEY": api_key, "Content-Type": "application/json"},
            json={"content": row_result.data["content"], "title": row_result.data.get("title", "")},
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        score = round(float(payload["score"]["ai"]) * 100)

        flagged = score > DETECTION_THRESHOLD_PERCENT

        update_result = (
            supabase.table("articles").update({"ai_detect_score": score}).eq("id", article_id).execute()
        )
        if not update_result.data:
            raise DetectError(f"Update to articles failed for {article_id}")

        _write_audit(
            supabase, article_id, "detect",
            f"flagged_for_review:score={score}" if flagged else f"passed:score={score}",
        )

        return {"article_id": article_id, "score": score, "flagged_for_review": flagged, "checked": True}

    except Exception as exc:
        try:
            _write_audit(supabase, article_id, "detect", "failure", error=str(exc))
        except Exception as audit_exc:
            log.error("[ds_detect] failed to write failure audit_log entry: %s", audit_exc)
        if isinstance(exc, DetectError):
            raise
        raise DetectError(f"ds_detect failed: {exc}") from exc
