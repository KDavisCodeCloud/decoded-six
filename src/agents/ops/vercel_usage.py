"""Twice-daily Vercel usage check against the Hobby plan limits.

Kelvin, 2026-11-18: stay inside Hobby; alert on Mission Control at 70%.

Reads the team-wide usage API (v2/usage, last 30 days rolling -- Hobby limits
are monthly, so a rolling 30-day window is the conservative read) plus the
deployments API for the 100/day and 100/hour deployment caps. Hobby metrics
the API doesn't expose on this plan (Active CPU, Fast Origin Transfer, image
transformations, ISR, Global Config, analytics events) are listed as
unavailable so nobody mistakes a missing number for zero.

Env: VERCEL_API_TOKEN, VERCEL_TEAM_ID (required); VERCEL_USAGE_ALERT_PCT (70).
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

import httpx

log = logging.getLogger(__name__)

AGENT_ID = "ds-vercel-usage"
API = "https://api.vercel.com"
GB = 1_000_000_000

# Hobby included usage, https://vercel.com/docs/plans/hobby + /docs/limits (read 2026-11-18)
HOBBY_LIMITS = {
    "fast_data_transfer_gb": ("Fast Data Transfer", 100, "GB", "30d"),
    "edge_requests": ("CDN requests", 1_000_000, "requests", "30d"),
    "function_invocations": ("Function invocations", 1_000_000, "invocations", "30d"),
    "provisioned_memory_gb_hrs": ("Provisioned memory", 360, "GB-hrs", "30d"),
    "deployments_24h": ("Deployments (24 h)", 100, "deployments", "24h"),
    "builds_prev_day": ("Builds (previous UTC day)", 100, "builds", "1d"),
    "deployments_1h": ("Deployments (1 h)", 100, "deployments", "1h"),
}
UNAVAILABLE = [
    ("Active CPU", "4 CPU-hrs"), ("Fast Origin Transfer", "10 GB"),
    ("Image transformations", "5,000"), ("Image cache reads / writes", "300K / 100K"),
    ("ISR reads / writes", "see Usage page"), ("Global Config reads / writes", "100K / 100"),
    ("Web Analytics events", "50,000"), ("Speed Insights events", "10,000"),
]


class VercelUsageError(RuntimeError):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _sum(rows: list[dict], key: str) -> float:
    return float(sum(r.get(key) or 0 for r in rows))


def fetch_raw(get: Callable[[str, dict], dict], team: str, now: datetime) -> dict:
    """All the numbers the check needs, from the Vercel API."""
    frm, to = _iso(now - timedelta(days=30)), _iso(now)
    usage = get("/v2/usage", {"teamId": team, "from": frm, "to": to, "type": "requests"}).get("data") or []
    # Deployment caps are judged on Vercel's build counter: the deployments
    # API prunes old/cancelled deployments (it showed 34 for a day the build
    # counter put at 144). A <25 h window comes back in hourly buckets, which
    # gives true rolling 24 h / 1 h counts; a 3-day window comes back daily.
    def n_builds(r: dict) -> int:
        return int((r.get("build_completed_count") or 0) + (r.get("build_failed_count") or 0))

    def ts(r: dict) -> datetime:
        return datetime.fromisoformat(str(r.get("date")).replace("Z", "+00:00"))

    hourly = get("/v2/usage", {"teamId": team, "from": _iso(now - timedelta(hours=24)), "to": to,
                               "type": "builds"}).get("data") or []
    day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
    daily = get("/v2/usage", {"teamId": team, "from": _iso(day0 - timedelta(days=2)), "to": to,
                              "type": "builds"}).get("data") or []
    hour0 = now.replace(minute=0, second=0, microsecond=0)
    builds_24h = sum(n_builds(r) for r in hourly)
    builds_1h = sum(n_builds(r) for r in hourly if ts(r) >= hour0 - timedelta(hours=1))
    builds_prev_day = sum(n_builds(r) for r in daily if ts(r).date() == (day0 - timedelta(days=1)).date())

    return {
        "bandwidth_bytes": _sum(usage, "bandwidth_outgoing_bytes") + _sum(usage, "bandwidth_incoming_bytes"),
        "requests": _sum(usage, "request_hit_count") + _sum(usage, "request_miss_count"),
        "invocations": _sum(usage, "function_invocation_successful_count") + _sum(usage, "function_invocation_error_count")
        + _sum(usage, "function_invocation_timeout_count") + _sum(usage, "function_invocation_throttle_count"),
        "memory_gb_hrs": _sum(usage, "function_execution_successful_gb_hours") + _sum(usage, "function_execution_error_gb_hours")
        + _sum(usage, "function_execution_timeout_gb_hours"),
        "deployments_24h": builds_24h,
        "builds_prev_day": builds_prev_day,
        "deployments_1h": builds_1h,
    }


def evaluate(raw: dict, threshold: float) -> tuple[list[dict], list[dict], float]:
    used = {
        "fast_data_transfer_gb": raw["bandwidth_bytes"] / GB,
        "edge_requests": raw["requests"],
        "function_invocations": raw["invocations"],
        "provisioned_memory_gb_hrs": raw["memory_gb_hrs"],
        "deployments_24h": raw["deployments_24h"],
        "builds_prev_day": raw["builds_prev_day"],
        "deployments_1h": raw["deployments_1h"],
    }
    metrics = []
    for key, (label, limit, unit, window) in HOBBY_LIMITS.items():
        u = used[key]
        metrics.append({"key": key, "label": label, "used": round(u, 3), "limit": limit, "unit": unit,
                        "window": window, "pct": round(100 * u / limit, 1)})
    alerts = [m for m in metrics if m["pct"] >= threshold]
    return metrics, alerts, max(m["pct"] for m in metrics)


def check_vercel_usage(sb: Any, trigger: str = "schedule", get: Optional[Callable[[str, dict], dict]] = None,
                       now: Optional[datetime] = None) -> dict:
    now = now or _now()
    threshold = float(os.environ.get("VERCEL_USAGE_ALERT_PCT") or 70)
    team = os.environ.get("VERCEL_TEAM_ID")
    row: dict = {"trigger": trigger, "threshold_pct": threshold,
                 "unavailable": [{"label": l, "limit": lim} for l, lim in UNAVAILABLE]}
    try:
        if get is None:
            token = os.environ.get("VERCEL_API_TOKEN")
            if not token or not team:
                raise VercelUsageError("VERCEL_API_TOKEN and VERCEL_TEAM_ID must be set")

            def get(path: str, params: dict) -> dict:
                r = httpx.get(API + path, params=params, headers={"Authorization": f"Bearer {token}"}, timeout=30)
                if r.status_code != 200:
                    raise VercelUsageError(f"GET {path} -> {r.status_code}: {r.text[:300]}")
                return r.json()
        metrics, alerts, max_pct = evaluate(fetch_raw(get, team or "", now), threshold)
        row.update(metrics=metrics, alerts=alerts, max_pct=max_pct)
    except Exception as exc:
        log.exception("[%s] check failed", AGENT_ID)
        row["error"] = f"{type(exc).__name__}: {exc}"[:1000]
    sb.table("vercel_usage_checks").insert(row).execute()
    if row.get("error"):
        result = f"failed: {row['error']}"
    else:
        result = (f"max {row['max_pct']}%; " + (", ".join(f"{a['label']} {a['pct']}%" for a in row["alerts"])
                                                 or f"nothing at/over {threshold:g}%"))
    sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "vercel_usage_check", "result": result[:1000]}).execute()
    if row.get("error"):
        raise VercelUsageError(row["error"])
    return row
