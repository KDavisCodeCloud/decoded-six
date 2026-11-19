from datetime import datetime, timezone

import pytest

from src.agents.ops import vercel_usage as vu
from src.agents.ops import scheduler as ops


class FakeTable:
    def __init__(self, db, name):
        self.db, self.name = db, name

    def insert(self, row):
        self.db.setdefault(self.name, []).append(row)
        return self

    def execute(self):
        return self


class FakeSB:
    def __init__(self):
        self.rows = {}

    def table(self, name):
        return FakeTable(self.rows, name)


NOW = datetime(2026, 11, 19, 0, 0, tzinfo=timezone.utc)


def fake_get(deploys_24h=10, deploys_1h=2, bytes_out=1.5e9, hits=20_000, misses=150_000, inv=130_000, gbh=45.0,
             builds_today=3, builds_yesterday=40):
    def get(path, params):
        if path == "/v2/usage" and params["type"] == "builds":
            if params["from"].startswith("2026-11-18T00"):   # rolling 24 h -> hourly buckets
                return {"data": [{"date": "2026-11-18T03:00:00.000Z", "build_completed_count": deploys_24h - deploys_1h},
                                 {"date": "2026-11-18T23:00:00.000Z", "build_completed_count": deploys_1h}]}
            return {"data": [{"date": "2026-11-17T00:00:00.000Z", "build_completed_count": 7},
                             {"date": "2026-11-18T00:00:00.000Z", "build_completed_count": builds_yesterday},
                             {"date": "2026-11-19T00:00:00.000Z", "build_completed_count": builds_today}]}
        if path == "/v2/usage":
            return {"data": [
                {"bandwidth_outgoing_bytes": bytes_out, "bandwidth_incoming_bytes": 0,
                 "request_hit_count": hits, "request_miss_count": misses,
                 "function_invocation_successful_count": inv, "function_execution_successful_gb_hours": gbh}]}
        raise AssertionError(path)
    return get


def test_under_threshold_no_alerts():
    sb = FakeSB()
    row = vu.check_vercel_usage(sb, get=fake_get(), now=NOW)
    assert row["alerts"] == []
    by = {m["key"]: m for m in row["metrics"]}
    assert by["edge_requests"]["pct"] == 17.0
    assert by["fast_data_transfer_gb"]["used"] == 1.5
    assert by["deployments_24h"]["used"] == 10
    assert sb.rows["vercel_usage_checks"][0]["max_pct"] == row["max_pct"]
    assert sb.rows["audit_log"][0]["action"] == "vercel_usage_check"
    assert row["unavailable"], "unexposed Hobby metrics must be listed, not silently zero"


def test_alerts_at_70_percent():
    row = vu.check_vercel_usage(FakeSB(), get=fake_get(deploys_24h=70, inv=900_000), now=NOW)
    keys = {a["key"] for a in row["alerts"]}
    assert keys == {"deployments_24h", "function_invocations"}
    assert row["max_pct"] == 90.0


def test_api_failure_is_recorded_and_raised():
    sb = FakeSB()

    def boom(path, params):
        raise vu.VercelUsageError("GET /v2/usage -> 403")
    with pytest.raises(vu.VercelUsageError):
        vu.check_vercel_usage(sb, get=boom, now=NOW)
    assert "403" in sb.rows["vercel_usage_checks"][0]["error"]
    assert sb.rows["audit_log"][0]["result"].startswith("failed")


def test_missing_env_fails_loudly(monkeypatch):
    monkeypatch.delenv("VERCEL_API_TOKEN", raising=False)
    with pytest.raises(vu.VercelUsageError, match="VERCEL_API_TOKEN"):
        vu.check_vercel_usage(FakeSB(), now=NOW)


def test_scheduler_runs_when_due(monkeypatch):
    calls = []
    monkeypatch.setattr(ops, "due", lambda *a: True)
    monkeypatch.setattr(ops, "_claim", lambda *a: True)
    ops.tick(object(), check=lambda sb, trigger: calls.append(trigger) or {"ok": 1})
    assert calls == ["schedule"]
    monkeypatch.setenv("VERCEL_USAGE_DISABLED", "1")
    ops.tick(object(), check=lambda sb, trigger: calls.append(trigger))
    assert calls == ["schedule"]


def test_build_counter_rolling_and_previous_day():
    row = vu.check_vercel_usage(FakeSB(), get=fake_get(deploys_24h=90, deploys_1h=5, builds_yesterday=144), now=NOW)
    by = {m["key"]: m for m in row["metrics"]}
    assert by["deployments_24h"]["used"] == 90
    assert by["deployments_1h"]["used"] == 5
    assert by["builds_prev_day"]["pct"] == 144.0
    assert {a["key"] for a in row["alerts"]} == {"deployments_24h", "builds_prev_day"}
