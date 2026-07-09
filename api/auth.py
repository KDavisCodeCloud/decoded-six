"""
api/auth.py — bearer token auth dependency for the DecodedSix API.

Reads DECODEDSIX_API_KEY from the environment. If unset, auth is
disabled entirely (dev mode) — a warning is logged once per process,
not on every request, to avoid log spam.
"""

import logging
import os

from fastapi import Header, HTTPException

log = logging.getLogger(__name__)

_dev_mode_warned = False


def require_api_key(authorization: str = Header(None)) -> None:
    global _dev_mode_warned
    key = os.getenv("DECODEDSIX_API_KEY")
    if not key:
        if not _dev_mode_warned:
            log.warning("DECODEDSIX_API_KEY not set — API running with no auth (dev mode)")
            _dev_mode_warned = True
        return
    if not authorization or authorization != f"Bearer {key}":
        raise HTTPException(status_code=401, detail="Invalid API key")
