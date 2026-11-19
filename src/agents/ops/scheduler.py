"""In-process schedule for ops checks (same claim pattern as
src/agents/map/scheduler.py, so two Railway instances never double-run).

  vercel usage   every 12 h (twice daily) -> vercel_usage_checks,
                 Mission Control alerts at VERCEL_USAGE_ALERT_PCT (70%).

VERCEL_USAGE_DISABLED=1 turns it off for an instance.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import timedelta
from typing import Any, Callable, Optional

from src.agents.map.scheduler import _claim, _now, due

log = logging.getLogger(__name__)

VERCEL_USAGE_INTERVAL = timedelta(hours=12)
TICK_SECONDS = 300


def tick(sb: Any, check: Optional[Callable[..., dict]] = None) -> dict:
    now = _now()
    ran: dict = {}
    if os.environ.get("VERCEL_USAGE_DISABLED") != "1":
        if due(sb, "vercel_usage_claim", VERCEL_USAGE_INTERVAL, now) and _claim(sb, "vercel_usage_claim", now):
            if check is None:
                from src.agents.ops.vercel_usage import check_vercel_usage as check
            try:
                ran["vercel_usage"] = check(sb, trigger="schedule")
            except Exception as exc:   # already recorded in vercel_usage_checks + audit_log
                ran["vercel_usage"] = {"error": str(exc)}
    return ran


async def ops_loop(clients: Callable[[], tuple[Any, Any]]) -> None:
    await asyncio.sleep(150)
    while True:
        try:
            sb, _ = clients()
            await asyncio.to_thread(tick, sb)
        except Exception as exc:  # keep the loop alive
            log.error("[ops-scheduler] tick raised: %s", exc)
        await asyncio.sleep(TICK_SECONDS)
