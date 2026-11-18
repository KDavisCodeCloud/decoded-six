"""In-process schedules for the map pipeline (same pattern as
src/agents/discovery/scheduler.py: the API process runs the loop, a claim row
in audit_log stops two Railway instances from double-running a cycle).

  map scraper   cadence from MAP_SCRAPE_CADENCE (minutes, by date):
                default "2026-11-21T11:00Z=15,2026-11-26T23:59Z=30,*=240"
                = every 15 min for 72 h after the NZ unlock (Nov 18 11:00 UTC),
                every 30 min through Nov 26, then every 4 h.
  gtadb watcher every 6 h.

MAP_SCRAPE_DISABLED=1 / GTADB_WATCH_DISABLED=1 turn either off for an instance.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

log = logging.getLogger(__name__)

AGENT_ID = "ds-map-scheduler"
DEFAULT_CADENCE = "2026-11-21T11:00Z=15,2026-11-26T23:59Z=30,*=240"
WATCH_INTERVAL = timedelta(hours=6)
TICK_SECONDS = 60
CLAIM_WINDOW = timedelta(minutes=5)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def parse_cadence(spec: str) -> list[tuple[Optional[datetime], int]]:
    """'2026-11-21T11:00Z=15,*=240' -> [(until, minutes), ..., (None, minutes)]."""
    out: list[tuple[Optional[datetime], int]] = []
    for part in (p.strip() for p in spec.split(",") if p.strip()):
        until, minutes = part.rsplit("=", 1)
        when = None if until == "*" else datetime.fromisoformat(until.replace("Z", "+00:00"))
        out.append((when, int(minutes)))
    if not out or out[-1][0] is not None:
        raise ValueError(f"MAP_SCRAPE_CADENCE must end with '*=<minutes>': {spec!r}")
    return out


def scrape_interval(now: datetime, spec: Optional[str] = None) -> timedelta:
    for until, minutes in parse_cadence(spec or os.environ.get("MAP_SCRAPE_CADENCE") or DEFAULT_CADENCE):
        if until is None or now < until:
            return timedelta(minutes=minutes)
    raise AssertionError("unreachable")


def _last(sb: Any, action: str) -> Optional[datetime]:
    rows = (sb.table("audit_log").select("created_at").eq("action", action)
            .order("created_at", desc=True).limit(1).execute().data or [])
    return datetime.fromisoformat(str(rows[0]["created_at"]).replace("Z", "+00:00")) if rows else None


def _claim(sb: Any, action: str, now: datetime) -> bool:
    token = uuid.uuid4().hex
    sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": action, "result": token}).execute()
    claims = (sb.table("audit_log").select("result").eq("action", action)
              .gte("created_at", (now - CLAIM_WINDOW).isoformat()).order("created_at").limit(5).execute().data or [])
    return bool(claims) and claims[0]["result"] == token


def due(sb: Any, claim_action: str, interval: timedelta, now: datetime) -> bool:
    last = _last(sb, claim_action)
    # 90% of the interval so a slightly early tick doesn't skip a whole slot
    return last is None or now - last >= interval * 0.9


def tick(sb: Any, ai: Any, now: Optional[datetime] = None,
         scrape: Optional[Callable[..., dict]] = None, watch: Optional[Callable[[Any], dict]] = None) -> dict:
    now = now or _now()
    ran: dict = {}
    if os.environ.get("MAP_SCRAPE_DISABLED") != "1":
        if due(sb, "map_scrape_claim", scrape_interval(now), now) and _claim(sb, "map_scrape_claim", now):
            if scrape is None:
                from src.agents.map.ds_map_scrape import scrape_map_data as scrape
            try:
                ran["scrape"] = scrape(supabase_client=sb, anthropic_client=ai, trigger="schedule")
            except Exception as exc:   # already recorded in map_scrape_runs / map_alerts
                ran["scrape"] = {"error": str(exc)}
    if os.environ.get("GTADB_WATCH_DISABLED") != "1":
        if due(sb, "gtadb_watch_claim", WATCH_INTERVAL, now) and _claim(sb, "gtadb_watch_claim", now):
            if watch is None:
                from src.agents.map.gtadb_watcher import run_check as watch
            try:
                ran["watch"] = watch(sb)
            except Exception as exc:
                ran["watch"] = {"error": str(exc)}
    return ran


async def map_loop(clients: Callable[[], tuple[Any, Any]]) -> None:
    await asyncio.sleep(120)
    while True:
        try:
            sb, ai = clients()
            await asyncio.to_thread(tick, sb, ai)
        except Exception as exc:  # keep the loop alive
            log.error("[map-scheduler] tick raised: %s", exc)
        await asyncio.sleep(TICK_SECONDS)
