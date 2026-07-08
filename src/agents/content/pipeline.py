"""Content pipeline orchestrator: DRAFT -> HUM -> DETECT -> COPYRIGHT.

CLI usage:
    python -m src.agents.content.pipeline --topic "..." --category news

Stops at the first stage that raises. Each stage's own module already writes
its own audit_log entry on success/failure; this orchestrator additionally
writes one pipeline-level entry per failure and one on overall completion, so
a full run shows up as a single event too.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from typing import Any, Optional

log = logging.getLogger(__name__)

AGENT_ID = "ds_pipeline"


class PipelineError(RuntimeError):
    """Raised when any pipeline stage fails. Wraps the stage's own exception."""

    def __init__(self, stage: str, article_id: Optional[str], original: Exception):
        self.stage = stage
        self.article_id = article_id
        self.original = original
        super().__init__(f"Pipeline failed at stage '{stage}' (article_id={article_id}): {original}")


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


def _safe_write_audit(
    supabase: Any,
    article_id: Optional[str],
    action: str,
    result: str,
    error: Optional[str] = None,
) -> None:
    """_write_audit, but a broken audit sink must never mask the real pipeline error."""
    try:
        _write_audit(supabase, article_id, action, result, error=error)
    except Exception as audit_exc:
        log.error("[ds_pipeline] failed to write '%s' audit_log entry: %s", action, audit_exc)


def run_pipeline(topic: str, category: str, supabase_client: Optional[Any] = None) -> dict:
    """
    Run DRAFT -> HUM -> DETECT -> COPYRIGHT in sequence for one new article.

    Returns {article_id, status}, status is one of:
      "ok"                  — all stages passed clean
      "flagged_for_review"  — completed, but ds_detect or ds_copyright flagged it
    Raises PipelineError (with .stage / .article_id) if any stage errors out.
    """
    from src.agents.content.ds_copyright import check_copyright
    from src.agents.content.ds_detect import detect_article
    from src.agents.content.ds_draft import draft_article
    from src.agents.content.ds_humanizer import humanize_article

    supabase = supabase_client or _get_supabase_client()
    article_id: Optional[str] = None

    try:
        draft_result = draft_article(topic, category, supabase_client=supabase)
        article_id = draft_result["article_id"]
    except Exception as exc:
        _safe_write_audit(supabase, None, "pipeline", "failure:draft", error=str(exc))
        raise PipelineError("draft", None, exc) from exc

    try:
        humanize_article(article_id, supabase_client=supabase)
    except Exception as exc:
        _safe_write_audit(supabase, article_id, "pipeline", "failure:humanize", error=str(exc))
        raise PipelineError("humanize", article_id, exc) from exc

    try:
        detect_result = detect_article(article_id, supabase_client=supabase)
    except Exception as exc:
        _safe_write_audit(supabase, article_id, "pipeline", "failure:detect", error=str(exc))
        raise PipelineError("detect", article_id, exc) from exc

    try:
        copyright_result = check_copyright(article_id, supabase_client=supabase)
    except Exception as exc:
        _safe_write_audit(supabase, article_id, "pipeline", "failure:copyright", error=str(exc))
        raise PipelineError("copyright", article_id, exc) from exc

    flagged = detect_result.get("flagged_for_review", False) or copyright_result.get("flagged", False)
    status = "flagged_for_review" if flagged else "ok"

    _safe_write_audit(supabase, article_id, "pipeline", status)

    return {"article_id": article_id, "status": status}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the DecodedSix content pipeline for a single article.")
    parser.add_argument("--topic", required=True, help="Topic to draft an article about")
    parser.add_argument("--category", required=True, choices=["news", "rumor", "guide", "event"])
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    try:
        result = run_pipeline(args.topic, args.category)
    except PipelineError as exc:
        log.error(str(exc))
        sys.exit(1)

    log.info("Pipeline complete — article_id=%s status=%s", result["article_id"], result["status"])


if __name__ == "__main__":
    main()
