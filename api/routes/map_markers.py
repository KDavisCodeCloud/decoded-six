"""
api/routes/map_markers.py — interactive map data (Phase 5).

GET is public (published markers only, matches map_markers RLS policy).
POST/PATCH require DECODEDSIX_API_KEY via X-API-Key — a different header
convention from api/auth.py's Authorization: Bearer (used by n8n/dashboard),
since these routes are meant for community-submission / scraper callers.
Community submissions and scraped locations land as status='pending',
verified=false — they don't appear in GET until a HITL review promotes them.
"""

import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from supabase import create_client

router = APIRouter(prefix="/api/map/markers", tags=["map"])

MARKER_FIELDS = (
    "id,name,description,category,coordinates,area_name,"
    "payout_per_hour,difficulty,verified,daily_reset"
)


def get_supabase():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Database not configured")
    return create_client(url, key)


def require_map_api_key(x_api_key: str = Header(None, alias="X-API-Key")) -> None:
    key = os.getenv("DECODEDSIX_API_KEY")
    if not key:
        return  # dev mode, matches api/auth.py's no-key-set behavior
    if x_api_key != key:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _write_audit(sb, action: str, result: str, error: Optional[str] = None) -> None:
    """Best-effort — an audit sink failure must never mask the real response."""
    try:
        sb.table("audit_log").insert({
            "agent_id": "map_markers_api",
            "action": action,
            "article_id": None,
            "result": result,
            "error": error,
        }).execute()
    except Exception:
        pass


class Coordinates(BaseModel):
    lat: float
    lng: float


class MarkerCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    coordinates: Coordinates
    area_name: Optional[str] = None
    payout_per_hour: Optional[int] = None
    difficulty: Optional[str] = None
    source: Optional[str] = None


class MarkerUpdateRequest(BaseModel):
    status: Optional[str] = None
    verified: Optional[bool] = None
    payout_per_hour: Optional[int] = None
    last_confirmed: Optional[str] = None


@router.get("")
def list_markers(category: Optional[str] = None, status: str = "published"):
    sb = get_supabase()
    query = sb.table("map_markers").select(MARKER_FIELDS).eq("status", status)
    if category:
        query = query.eq("category", category)
    result = query.execute()
    return result.data


@router.post("", dependencies=[Depends(require_map_api_key)])
def create_marker(body: MarkerCreateRequest):
    sb = get_supabase()
    row = {
        "name": body.name,
        "description": body.description,
        "category": body.category,
        "coordinates": body.coordinates.model_dump(),
        "area_name": body.area_name,
        "payout_per_hour": body.payout_per_hour,
        "difficulty": body.difficulty,
        "source": body.source,
        "status": "pending",
        "verified": False,
    }

    try:
        result = sb.table("map_markers").insert(row).execute()
    except Exception as exc:
        _write_audit(sb, "create", "failure", str(exc)[:500])
        raise HTTPException(status_code=400, detail=f"Failed to create marker: {exc}")

    if not result.data:
        _write_audit(sb, "create", "failure", "insert returned no data")
        raise HTTPException(status_code=400, detail="Failed to create marker")

    _write_audit(sb, "create", "success")
    return result.data[0]


@router.patch("/{marker_id}", dependencies=[Depends(require_map_api_key)])
def update_marker(marker_id: str, body: MarkerUpdateRequest):
    sb = get_supabase()
    safe_body = body.model_dump(exclude_unset=True)
    if not safe_body:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        result = sb.table("map_markers").update(safe_body).eq("id", marker_id).execute()
    except Exception as exc:
        _write_audit(sb, "update", "failure", str(exc)[:500])
        raise HTTPException(status_code=400, detail=f"Failed to update marker: {exc}")

    if not result.data:
        _write_audit(sb, "update", "failure", f"marker {marker_id} not found")
        raise HTTPException(status_code=404, detail="Marker not found")

    _write_audit(sb, "update", "success")
    return result.data[0]
