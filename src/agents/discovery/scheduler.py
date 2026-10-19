"""
In-process 4-hourly discovery schedule (Kelvin, 2026-10-19).

Discovery only ever ran by hand: twice ever (Sep 17, Oct 17). Its only
schedule was an n8n workflow spec that was either never imported or never
switched on, and nothing here could see whether it ran. So the API process
runs the cycle itself, the same pattern as mse-api's Loop Map history job.

Every cycle -- scheduled or the manual POST /agents/decodedsix/discovery/run
-- writes ONE audit_log row, action='discovery_cycle', result 'win' or
'lose'. That row is the heartbeat the CEO Decoded Loop Map reads, and the
double-run guard: a cycle is skipped if one was recorded in the last
MIN_GAP. Two processes starting together (a deploy overlap) each insert a
claim row and only the earliest claim proceeds.

DISCOVERY_SCHEDULE_DISABLED=1 turns the loop off for an instance.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

log = logging.getLogger(__name__)

AGENT_ID = "ds-discovery"
INTERVAL = timedelta(hours=4)
MIN_GAP = timedelta(hours=3, minutes=45)
TICK_SECONDS = 15 * 60
CLAIM_WINDOW = timedelta(minutes=10)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def last_cycle_at(sb: Any) -> Optional[str]:
    rows = (sb.table("audit_log").select("created_at").eq("action", "discovery_cycle")
            .order("created_at", desc=True).limit(1).execute().data or [])
    return rows[0]["created_at"] if rows else None


def record_cycle(sb: Any, result: Optional[dict], error: Optional[str], trigger: str) -> None:
    summary = dict(result or {})
    summary.pop("dropped_details", None)
    summary["trigger"] = trigger
    sb.table("audit_log").insert({
        "agent_id": AGENT_ID, "action": "discovery_cycle",
        "result": json.dumps(summary, default=str)[:4000] if not error else "lose",
        "error": (error or None) and error[:2000],
    }).execute()


def _claim(sb: Any, now: datetime) -> bool:
    token = uuid.uuid4().hex
    sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "discovery_cycle_claim",
                                  "result": token}).execute()
    claims = (sb.table("audit_log").select("result,created_at").eq("action", "discovery_cycle_claim")
              .gte("created_at", (now - CLAIM_WINDOW).isoformat())
              .order("created_at").limit(5).execute().data or [])
    return bool(claims) and claims[0]["result"] == token


def due(sb: Any, now: datetime) -> bool:
    last = last_cycle_at(sb)
    if not last:
        return True
    last_dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
    return now - last_dt >= MIN_GAP


def run_scheduled_cycle(sb: Any, ai: Any, *, now: Optional[datetime] = None,
                        cycle: Optional[Callable[[Any, Any], dict]] = None) -> Optional[dict]:
    """One tick: run a cycle if due and claimed. Returns the result, or None."""
    now = now or _now()
    if not due(sb, now) or not _claim(sb, now):
        return None
    if cycle is None:
        from src.agents.discovery.run_cycle import run_discovery_cycle as cycle
    try:
        result = cycle(sb, ai)
    except Exception as exc:
        record_cycle(sb, None, f"{type(exc).__name__}: {exc}", "schedule")
        log.error("[discovery] scheduled cycle failed: %s", exc)
        return {"error": str(exc)}
    record_cycle(sb, result, None, "schedule")
    log.warning("[discovery] scheduled cycle: proposed=%s dropped=%s fetched=%s",
                result.get("candidates_proposed"), result.get("candidates_dropped"),
                sum((result.get("fetch_counts") or {}).values()))
    return result


async def discovery_loop(clients: Callable[[], tuple[Any, Any]]) -> None:
    await asyncio.sleep(90)
    while True:
        try:
            sb, ai = clients()
            await asyncio.to_thread(run_scheduled_cycle, sb, ai)
        except Exception as exc:  # keep the loop alive
            log.error("[discovery] schedule tick raised: %s", exc)
        await asyncio.sleep(TICK_SECONDS)
