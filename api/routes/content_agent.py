"""
api/routes/content_agent.py

POST /agents/decodedsix/content   — n8n triggers DSX-CA1, inserts article as pending_review
POST /agents/decodedsix/publish/{article_id} — HITL approval fires this, sets status=published
POST /agents/decodedsix/revise/{article_id} — dashboard "Revise" fires this, revises in place
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
    article_type: str           # 'news' | 'evergreen' | 'conversion' | 'feature' | 'breaking_news' | 'exclusive' | 'deep_dive'
    topic_seed: str = ""        # headline, keyword, or product name from n8n
    publish_date: Optional[str] = None  # ISO date — optional scheduled publish date
    # Additive (2026-09-17, discovery pipeline): run_content_agent() has
    # accepted fact_brief since 2026-09-02 (caller-supplied, pre-tiered
    # facts for the writer), but this route never exposed it, so nothing
    # in production could ever actually pass one in. Approved topic_queue
    # rows from the discovery pipeline attach their source URLs/angle here
    # instead of the writer working from a bare topic string alone.
    fact_brief: str = ""


class ContentResponse(BaseModel):
    success: bool
    article_id: Optional[str] = None
    error: Optional[str] = None


class PublishResponse(BaseModel):
    success: bool
    article_id: str
    published_at: Optional[str] = None
    error: Optional[str] = None


class ReviseRequest(BaseModel):
    hitl_notes: str  # what needs to change, from the dashboard "Revise" click


class ReviseResponse(BaseModel):
    success: bool
    article_id: Optional[str] = None
    error: Optional[str] = None


@router.post("/content", response_model=ContentResponse)
async def trigger_content_agent(
    body: ContentRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
) -> ContentResponse:
    # Widened 2026-09-17: run_content_agent() has supported 'feature',
    # 'exclusive', 'deep_dive', and 'breaking_news' since 2026-08-27 (see its
    # own WORD_COUNT_FLOORS dict), but this validation was never updated to
    # match, so every one of those requests 400'd before ever reaching the
    # agent -- a real blocker for the discovery pipeline, whose synthesis
    # step can legitimately suggest 'feature' or 'breaking_news'.
    valid_types = ("news", "evergreen", "conversion", "feature", "exclusive", "deep_dive", "breaking_news")
    if body.article_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"article_type must be one of: {', '.join(valid_types)}")

    # DataSanitizationShield: reject suspicious topic seeds before they reach the pipeline
    if len(body.topic_seed) > 500 or any(c in body.topic_seed for c in ["<", ">", "`", ";"]):
        raise HTTPException(status_code=400, detail="Invalid topic_seed")

    background_tasks.add_task(_run_agent, body.article_type, body.topic_seed, body.publish_date, body.fact_brief)
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


@router.post("/revise/{article_id}", response_model=ReviseResponse)
async def revise_article(
    article_id: str,
    body: ReviseRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
) -> ReviseResponse:
    """
    Called by the dashboard's "Revise" flow. The Next.js API route
    (src/app/api/articles/[id]/review/route.ts) already flipped
    articles.status to 'revision_in_progress' before calling this -- that's
    what removes the article from the HITL queue view immediately on click.
    This endpoint runs the actual revision as a background task; the article
    returns to 'pending_review' (or 'needs_revision' again if it still
    doesn't pass) when the agent finishes.
    """
    if not body.hitl_notes.strip():
        raise HTTPException(status_code=400, detail="hitl_notes required")

    background_tasks.add_task(_run_revision, article_id, body.hitl_notes)
    return ReviseResponse(success=True, article_id=article_id)


def _run_revision(article_id: str, hitl_notes: str) -> None:
    try:
        from src.agents.content.content_agent import revise_content_agent
        revise_content_agent(article_id=article_id, hitl_notes=hitl_notes)
    except Exception as exc:
        # Background task — revise_content_agent already wrote the article
        # back to needs_revision and to audit_log before re-raising, so
        # this is just the top-level log, same pattern as _run_agent below.
        import logging
        logging.getLogger(__name__).error("[dsx-ca1] revision run failed for %s: %s", article_id, exc)


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


def _run_agent(article_type: str, topic_seed: str, publish_date: Optional[str], fact_brief: str = "") -> None:
    try:
        from src.agents.content.content_agent import run_content_agent
        run_content_agent(
            article_type=article_type,
            topic_seed=topic_seed,
            publish_date=publish_date,
            fact_brief=fact_brief,
        )
    except Exception as exc:
        # Background task — error is already written to audit_log by the agent itself
        import logging
        logging.getLogger(__name__).error("[dsx-ca1] background run failed: %s", exc)
