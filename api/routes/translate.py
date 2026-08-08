"""
api/routes/translate.py — POST /api/translate/{article_id} fans out
ds_translate across all 7 supported non-English locales for one article.

Called by the Next.js HITL review route's 'approve' action (fire-and-forget,
non-blocking — same pattern as content_agent.py's distribution webhook)
so every newly-published article gets translated automatically without
the reviewer having to do anything extra.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends

from api.auth import require_api_key

router = APIRouter(prefix="/api/translate", tags=["translate"])
log = logging.getLogger(__name__)


@router.post("/{article_id}")
async def trigger_translation(
    article_id: str,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
):
    background_tasks.add_task(_run_translation, article_id)
    return {"success": True, "article_id": article_id}


def _run_translation(article_id: str) -> None:
    try:
        from src.agents.content.ds_translate import translate_article_all_locales

        results = translate_article_all_locales(article_id)
        log.info("[ds_translate] article %s: %s", article_id, results)
    except Exception as exc:  # noqa: BLE001 — background task, never propagate; ds_translate itself already writes audit_log per locale
        log.error("[ds_translate] background run failed for %s: %s", article_id, exc)
