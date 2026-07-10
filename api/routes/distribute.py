"""
api/routes/distribute.py — marketing distribution endpoints.

POST /api/distribute/linkedin — posts a published article to LinkedIn via
the legacy UGC Posts API. Synchronous (not a background task, unlike
content_agent.py) since the caller needs the real success/failure result.

POST /api/distribute/reddit — DRAFT ONLY. Auto-posting to Reddit is a ban
risk, so this only ever inserts a reddit_drafts row for a human to review
and post manually — never calls Reddit's API.

articles.linkedin_posted / linkedin_posted_at / reddit_draft_created and
the reddit_drafts table are added by supabase/migrations/006_distribution.sql.
If that migration hasn't been run yet, the bookkeeping .update() calls below
are wrapped so a missing-column error doesn't mask an otherwise-successful
LinkedIn post / Reddit draft — see the comments at each call site.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from api.auth import require_api_key

router = APIRouter(prefix="/api/distribute", tags=["distribute"])

LINKEDIN_UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts"


def get_supabase():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Database not configured")
    return create_client(url, key)


def _write_audit(
    sb,
    agent_id: str,
    action: str,
    article_id: Optional[str],
    result: str,
    error: Optional[str] = None,
) -> None:
    sb.table("audit_log").insert({
        "agent_id": agent_id,
        "action": action,
        "article_id": article_id,
        "result": result,
        "error": error,
    }).execute()


def _get_published_article(sb, article_id: str) -> dict:
    try:
        result = sb.table("articles").select("*").eq("id", article_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Article not found")
    if not result.data:
        raise HTTPException(status_code=404, detail="Article not found")

    article = result.data
    if article.get("status") != "published":
        raise HTTPException(status_code=409, detail="Article must be published before distributing")
    return article


def _article_url(article: dict) -> str:
    site_url = os.getenv("NEXT_PUBLIC_SITE_URL", "https://thedecodedsix.com")
    return f"{site_url}/news/{article['slug']}"


# ── LinkedIn ──────────────────────────────────────────────────────────────────

class LinkedInDistributeRequest(BaseModel):
    article_id: str


class LinkedInDistributeResponse(BaseModel):
    success: bool
    linkedin_post_urn: Optional[str] = None


@router.post("/linkedin", response_model=LinkedInDistributeResponse)
def distribute_linkedin(
    body: LinkedInDistributeRequest,
    _: None = Depends(require_api_key),
) -> LinkedInDistributeResponse:
    sb = get_supabase()
    article = _get_published_article(sb, body.article_id)

    access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
    author_urn = os.getenv("LINKEDIN_AUTHOR_URN")
    if not access_token or not author_urn:
        detail = "LinkedIn credentials not configured (LINKEDIN_ACCESS_TOKEN / LINKEDIN_AUTHOR_URN)"
        _write_audit(sb, "mkt-distribute-li", "post", body.article_id, "failure", error=detail)
        raise HTTPException(status_code=503, detail=detail)

    commentary = f"{article['title']}\n\n{article.get('excerpt') or ''}\n\n{_article_url(article)}".strip()
    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": commentary},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    req = urllib.request.Request(
        LINKEDIN_UGC_POSTS_URL,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status_code = resp.status
            post_urn = resp.headers.get("x-restli-id")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        detail = f"LinkedIn API error: {exc.code} {error_body}"
        _write_audit(sb, "mkt-distribute-li", "post", body.article_id, "failure", error=detail[:500])
        raise HTTPException(status_code=502, detail=detail)
    except urllib.error.URLError as exc:
        detail = f"LinkedIn API error: connection failed — {exc.reason}"
        _write_audit(sb, "mkt-distribute-li", "post", body.article_id, "failure", error=detail[:500])
        raise HTTPException(status_code=502, detail=detail)

    if status_code >= 300:
        detail = f"LinkedIn API error: {status_code}"
        _write_audit(sb, "mkt-distribute-li", "post", body.article_id, "failure", error=detail)
        raise HTTPException(status_code=502, detail=detail)

    # See module docstring — linkedin_posted/linkedin_posted_at may not exist
    # yet if 006_distribution.sql hasn't been run. A failure here must not
    # be reported as a distribution failure: the LinkedIn post already
    # succeeded by this point.
    try:
        sb.table("articles").update({
            "linkedin_posted": True,
            "linkedin_posted_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", body.article_id).execute()
    except Exception as exc:
        _write_audit(sb, "mkt-distribute-li", "update_article_flags", body.article_id, "failure", error=str(exc)[:500])

    _write_audit(sb, "mkt-distribute-li", "post", body.article_id, "success")

    return LinkedInDistributeResponse(success=True, linkedin_post_urn=post_urn)


# ── Reddit (draft only) ───────────────────────────────────────────────────────

class RedditDistributeRequest(BaseModel):
    article_id: str
    subreddit: str = "GTA6"


class RedditDistributeResponse(BaseModel):
    success: bool
    draft_id: Optional[str] = None


@router.post("/reddit", response_model=RedditDistributeResponse)
def distribute_reddit(
    body: RedditDistributeRequest,
    _: None = Depends(require_api_key),
) -> RedditDistributeResponse:
    sb = get_supabase()
    article = _get_published_article(sb, body.article_id)

    draft_body = f"{_article_url(article)}\n\n{article.get('excerpt') or ''}".strip()
    row = {
        "article_id": body.article_id,
        "subreddit": body.subreddit,
        "title": article["title"],
        "body": draft_body,
        "status": "draft",
    }

    try:
        result = sb.table("reddit_drafts").insert(row).execute()
    except Exception as exc:
        _write_audit(sb, "mkt-distribute-reddit", "draft_created", body.article_id, "failure", error=str(exc)[:500])
        raise HTTPException(status_code=500, detail=f"Failed to create Reddit draft: {exc}")

    if not result.data:
        _write_audit(sb, "mkt-distribute-reddit", "draft_created", body.article_id, "failure", error="insert returned no data")
        raise HTTPException(status_code=500, detail="Failed to create Reddit draft")

    draft_id = result.data[0]["id"]

    # See module docstring — reddit_draft_created may not exist yet if
    # 006_distribution.sql hasn't been run. A failure here must not mask
    # the fact that the draft itself was created successfully.
    try:
        sb.table("articles").update({"reddit_draft_created": True}).eq("id", body.article_id).execute()
    except Exception as exc:
        _write_audit(sb, "mkt-distribute-reddit", "update_article_flags", body.article_id, "failure", error=str(exc)[:500])

    _write_audit(sb, "mkt-distribute-reddit", "draft_created", body.article_id, "success")

    return RedditDistributeResponse(success=True, draft_id=draft_id)
