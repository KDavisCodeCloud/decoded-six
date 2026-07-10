"""DS-MAP-DAILY — daily reset marker refresher for the interactive GTA 6 map.

Clears last_confirmed on every published, daily_reset=true marker so the map
UI knows it needs re-confirmation for the new in-game day. Never deletes or
retires markers — only clears the timestamp. Writes one audit_log entry
per run with the reset count folded into the `result` field (audit_log has
no dedicated count column).
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

log = logging.getLogger(__name__)

AGENT_ID = "ds_map_daily"


class MapDailyResetError(RuntimeError):
    """Raised when the daily reset run fails."""


def _get_supabase_client() -> Any:
    from supabase import create_client

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _write_audit(
    supabase: Any,
    result: str,
    error: Optional[str] = None,
) -> None:
    supabase.table("audit_log").insert({
        "agent_id": AGENT_ID,
        "action": "daily_reset",
        "article_id": None,
        "result": result,
        "error": error,
    }).execute()


def reset_daily_markers(supabase_client: Optional[Any] = None) -> dict:
    """
    Clears last_confirmed (sets it to NULL) on every map_markers row where
    daily_reset=true and status='published'.

    Returns {"reset_count": int}. Raises MapDailyResetError on failure — an
    audit_log entry is written either way.
    """
    supabase = supabase_client or _get_supabase_client()

    try:
        update_result = (
            supabase.table("map_markers")
            .update({"last_confirmed": None})
            .eq("daily_reset", True)
            .eq("status", "published")
            .execute()
        )
        reset_count = len(update_result.data or [])

        _write_audit(supabase, f"success:reset_count={reset_count}")

        return {"reset_count": reset_count}

    except Exception as exc:
        try:
            _write_audit(supabase, "failure", error=str(exc))
        except Exception as audit_exc:
            log.error("[%s] failed to write failure audit_log entry: %s", AGENT_ID, audit_exc)
        if isinstance(exc, MapDailyResetError):
            raise
        raise MapDailyResetError(f"ds_map_daily failed: {exc}") from exc


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    result = reset_daily_markers()
    log.info("Daily reset complete — reset_count=%d", result["reset_count"])


if __name__ == "__main__":
    main()
