"""
api/routes/events.py — read-only weekly events feed (future feature).
No write path yet: events are seeded manually until an agent owns this.
"""

import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from supabase import create_client

router = APIRouter(prefix="/api/events", tags=["events"])


def get_supabase():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Database not configured")
    return create_client(url, key)


@router.get("")
def list_events(week_start: Optional[str] = None):
    sb = get_supabase()
    query = sb.table("weekly_events").select("*").eq("published", True)
    if week_start:
        query = query.eq("week_start", week_start)
    result = query.order("week_start", desc=True).limit(10).execute()
    return result.data
