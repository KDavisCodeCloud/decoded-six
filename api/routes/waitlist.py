"""
api/routes/waitlist.py — public waitlist signup for the map launch.
No auth — anon can insert (matches waitlist_emails_anon_insert RLS policy);
uses the service role key here only for consistency with the rest of api/,
and so audit_log writes (which anon can't write to) always succeed.
"""

import os
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from postgrest.exceptions import APIError
from pydantic import BaseModel, field_validator
from supabase import create_client

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_UNIQUE_VIOLATION = "23505"


def get_supabase():
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Database not configured")
    return create_client(url, key)


def _write_audit(sb, result: str, error: Optional[str] = None) -> None:
    try:
        sb.table("audit_log").insert({
            "agent_id": "waitlist_api",
            "action": "signup",
            "article_id": None,
            "result": result,
            "error": error,
        }).execute()
    except Exception:
        pass


class WaitlistRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v


@router.post("")
def join_waitlist(body: WaitlistRequest):
    sb = get_supabase()

    try:
        result = sb.table("waitlist_emails").insert({
            "email": body.email,
            "product_id": "decodedsix",
        }).execute()
    except APIError as exc:
        if exc.code == _UNIQUE_VIOLATION:
            _write_audit(sb, "duplicate", exc.message)
            raise HTTPException(status_code=409, detail="Email already on waitlist")
        _write_audit(sb, "failure", exc.message)
        raise HTTPException(status_code=400, detail=f"Failed to join waitlist: {exc.message}")

    if not result.data:
        _write_audit(sb, "failure", "insert returned no data")
        raise HTTPException(status_code=400, detail="Failed to join waitlist")

    _write_audit(sb, "success")
    return {"success": True}
