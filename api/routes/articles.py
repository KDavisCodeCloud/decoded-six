"""
api/routes/articles.py — dashboard calls these to read an article and to
approve/reject/publish it (PATCH status). Field allowlist on PATCH is
schema-derived from migrations/001_decodedsix_core.sql's articles table —
only columns that actually exist there.
"""

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from api.auth import require_api_key

router = APIRouter(prefix="/api/articles", tags=["articles"])

# Columns on `articles` a dashboard approve/reject/publish action may set.
# status: draft|pending_review|approved|published|archived (CHECK constraint)
# published_at: set when a review action transitions status -> published
ALLOWED_UPDATE_FIELDS = {"status", "published_at"}


def get_supabase():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Database not configured")
    return create_client(url, key)


@router.get("/{article_id}")
def get_article(article_id: str, _: None = Depends(require_api_key)):
    sb = get_supabase()
    # .single() raises (rather than returning empty data) when zero rows
    # match, so a missing article surfaces as an exception here, not a
    # falsy result.data — catch it and convert to a clean 404.
    try:
        result = sb.table("articles").select("*").eq("id", article_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Article not found")
    if not result.data:
        raise HTTPException(status_code=404, detail="Article not found")
    return result.data


@router.patch("/{article_id}")
def update_article(article_id: str, body: dict, _: None = Depends(require_api_key)):
    sb = get_supabase()
    safe_body = {k: v for k, v in body.items() if k in ALLOWED_UPDATE_FIELDS}
    if not safe_body:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    sb.table("articles").update(safe_body).eq("id", article_id).execute()
    return {"success": True}


@router.get("/{article_id}/audit")
def get_article_audit(article_id: str, _: None = Depends(require_api_key)):
    """Most recent ds_seo (Session 13) + ds_aeo audit_log results for this article."""
    sb = get_supabase()
    result = (
        sb.table("audit_log")
        .select("agent_id,result,error,created_at")
        .eq("article_id", article_id)
        .in_("agent_id", ["ds_seo", "ds_aeo"])
        .order("created_at", desc=True)
        .execute()
    )

    rows = result.data or []
    seo_entry = next((r for r in rows if r["agent_id"] == "ds_seo"), None)
    aeo_entry = next((r for r in rows if r["agent_id"] == "ds_aeo"), None)

    return {
        "article_id": article_id,
        "seo": _parse_audit_entry(seo_entry),
        "aeo": _parse_audit_entry(aeo_entry),
    }


def _parse_audit_entry(entry: Optional[dict]) -> Optional[dict]:
    """ds_seo/ds_aeo embed `passed:score=N` (or `failed:score=N`) in `result`
    since audit_log has no dedicated score column — parse it back out here."""
    if not entry:
        return None
    result = entry.get("result") or ""
    passed = result.startswith("passed")
    score: Optional[int] = None
    if ":score=" in result:
        try:
            score = int(result.split(":score=")[1])
        except ValueError:
            score = None
    issues = entry["error"].split("; ") if entry.get("error") else []
    return {
        "passed": passed,
        "score": score,
        "issues": issues,
        "checked_at": entry.get("created_at"),
    }
