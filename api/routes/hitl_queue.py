"""
api/routes/hitl_queue.py — surfaces the real hitl_queue table (the dashboard
queue page currently reads articles.status='pending_review' directly instead
of this table — known gap, see project memory / migrations/README.md).

NOTE on product_id: hitl_queue.product_id defaults to 'gta-hub'
(supabase/migrations/003_hitl_queue.sql), matching every article-related
insert in this codebase (content_agent.py, ds_draft.py both write
product_id='gta-hub') — NOT 'decodedsix'. 'decodedsix' is only used by
waitlist_emails. Filtering on 'decodedsix' here would silently return zero
rows against real data, so this route filters on 'gta-hub' instead.
"""

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from api.auth import require_api_key

router = APIRouter(prefix="/api/hitl-queue", tags=["hitl_queue"])

PRODUCT_ID = "gta-hub"
RESOLVED_STATUSES = {"approved", "rejected"}

# Columns a dashboard approve/reject/hold action may set (status CHECK:
# pending|approved|rejected|held — see 003_hitl_queue.sql).
ALLOWED_UPDATE_FIELDS = {"status", "action", "notes"}


def get_supabase():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Database not configured")
    return create_client(url, key)


@router.get("")
def list_hitl_queue(_: None = Depends(require_api_key)):
    sb = get_supabase()
    result = (
        sb.table("hitl_queue")
        .select("*, articles(title, slug, article_type)")
        .eq("product_id", PRODUCT_ID)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.patch("/{item_id}")
def update_hitl_queue_item(item_id: str, body: dict, _: None = Depends(require_api_key)):
    sb = get_supabase()
    safe_body = {k: v for k, v in body.items() if k in ALLOWED_UPDATE_FIELDS}
    if not safe_body:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    if safe_body.get("status") in RESOLVED_STATUSES:
        from datetime import datetime, timezone
        safe_body["resolved_at"] = datetime.now(timezone.utc).isoformat()

    result = sb.table("hitl_queue").update(safe_body).eq("id", item_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="HITL queue item not found")

    return result.data[0]
