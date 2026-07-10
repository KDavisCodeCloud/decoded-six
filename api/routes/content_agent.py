"""
api/routes/content_agent.py

POST /agents/decodedsix/content   — n8n triggers DSX-CA1, inserts article as pending_review
POST /agents/decodedsix/publish/{article_id} — HITL approval fires this, sets status=published
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from api.auth import require_api_key

router = APIRouter(prefix="/agents/decodedsix", tags=["content-agent"])


class ContentRequest(BaseModel):
    article_type: str           # 'news' | 'evergreen' | 'conversion'
    topic_seed: str = ""        # headline, keyword, or product name from n8n
    publish_date: Optional[str] = None  # ISO date — optional scheduled publish date


class ContentResponse(BaseModel):
    success: bool
    article_id: Optional[str] = None
    error: Optional[str] = None


class PublishResponse(BaseModel):
    success: bool
    article_id: str
    published_at: Optional[str] = None
    error: Optional[str] = None


@router.post("/content", response_model=ContentResponse)
async def trigger_content_agent(
    body: ContentRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
) -> ContentResponse:
    if body.article_type not in ("news", "evergreen", "conversion"):
        raise HTTPException(status_code=400, detail="article_type must be news, evergreen, or conversion")

    # DataSanitizationShield: reject suspicious topic seeds before they reach the pipeline
    if len(body.topic_seed) > 500 or any(c in body.topic_seed for c in ["<", ">", "`", ";"]):
        raise HTTPException(status_code=400, detail="Invalid topic_seed")

    background_tasks.add_task(_run_agent, body.article_type, body.topic_seed, body.publish_date)
    return ContentResponse(success=True)


@router.post("/publish/{article_id}", response_model=PublishResponse)
async def publish_article(
    article_id: str,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
) -> PublishResponse:
    """
    Called by dashboard HITL approval. Sets status=published and published_at=now().
    Only articles with status='pending_review' or 'needs_revision' can be published.
    """
    try:
        from supabase import create_client

        sb = create_client(
            os.environ["NEXT_PUBLIC_SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )

        check = sb.table("articles").select("id, status, slug").eq("id", article_id).single().execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Article not found")

        current_status = check.data["status"]
        if current_status not in ("pending_review", "needs_revision"):
            raise HTTPException(
                status_code=409,
                detail=f"Cannot publish article with status '{current_status}'",
            )

        now = datetime.now(timezone.utc).isoformat()
        sb.table("articles").update({
            "status": "published",
            "published_at": now,
        }).eq("id", article_id).execute()

        # Audit log
        sb.table("audit_log").insert({
            "agent_id": "dsx-ca1-publish",
            "action": "article_published",
            "article_id": article_id,
            "result": "success",
        }).execute()

        # Fire the n8n distribution webhook — non-blocking, never fails the
        # publish response even if N8N_POST_APPROVAL_WEBHOOK_URL is unset or
        # unreachable.
        background_tasks.add_task(_fire_distribution_webhook, article_id, check.data["slug"])

        return PublishResponse(success=True, article_id=article_id, published_at=now)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _fire_distribution_webhook(article_id: str, slug: str) -> None:
    url = os.getenv("N8N_POST_APPROVAL_WEBHOOK_URL")
    if not url:
        return
    try:
        import httpx

        httpx.post(
            url,
            json={"article_id": article_id, "slug": slug, "event": "article_approved"},
            timeout=5.0,
        )
    except Exception as exc:
        import logging

        logging.getLogger(__name__).error("[dsx-publish] webhook fire failed: %s", exc)


def _run_agent(article_type: str, topic_seed: str, publish_date: Optional[str]) -> None:
    try:
        from src.agents.content.content_agent import run_content_agent
        run_content_agent(
            article_type=article_type,
            topic_seed=topic_seed,
            publish_date=publish_date,
        )
    except Exception as exc:
        # Background task — error is already written to audit_log by the agent itself
        import logging
        logging.getLogger(__name__).error("[dsx-ca1] background run failed: %s", exc)
