"""In-process discovery schedule: heartbeat row, gap guard, claim race."""

from datetime import datetime, timedelta, timezone

from src.agents.discovery import scheduler

NOW = datetime(2026, 10, 19, 18, 0, tzinfo=timezone.utc)


class _Q:
    def __init__(self, db, name):
        self.db, self.name, self.op, self.payload, self.f, self.o = db, name, "select", None, [], None

    def select(self, *a):
        return self

    def insert(self, p):
        self.op, self.payload = "insert", p
        return self

    def eq(self, k, v):
        self.f.append(lambda r: r.get(k) == v)
        return self

    def gte(self, k, v):
        self.f.append(lambda r: str(r.get(k)) >= v)
        return self

    def order(self, k, desc=False):
        self.o = (k, desc)
        return self

    def limit(self, n):
        return self

    def execute(self):
        rows = self.db.rows
        R = type("R", (), {})
        if self.op == "insert":
            row = {"created_at": self.db.clock(), **self.payload}
            rows.append(row)
            r = R(); r.data = [row]; return r
        hit = [x for x in rows if all(f(x) for f in self.f)]
        if self.o:
            hit.sort(key=lambda x: str(x.get(self.o[0])), reverse=self.o[1])
        r = R(); r.data = hit; return r


class DB:
    def __init__(self, rows=None):
        self.rows = list(rows or [])
        self.t = NOW

    def clock(self):
        self.t += timedelta(seconds=1)
        return self.t.isoformat()

    def table(self, name):
        return _Q(self, name)


def _cycle(sb, ai):
    return {"fetch_counts": {"IGN": 3}, "candidates_proposed": 2, "candidates_dropped": 5,
            "dropped_details": [{"x": 1}]}


def test_first_cycle_runs_and_writes_the_heartbeat():
    db = DB()
    out = scheduler.run_scheduled_cycle(db, None, now=NOW, cycle=_cycle)
    assert out["candidates_proposed"] == 2
    beats = [r for r in db.rows if r["action"] == "discovery_cycle"]
    assert len(beats) == 1 and '"trigger": "schedule"' in beats[0]["result"]
    assert "dropped_details" not in beats[0]["result"]


def test_skips_inside_the_gap_and_runs_after_it():
    db = DB([{"action": "discovery_cycle", "created_at": (NOW - timedelta(hours=2)).isoformat()}])
    assert scheduler.run_scheduled_cycle(db, None, now=NOW, cycle=_cycle) is None
    db = DB([{"action": "discovery_cycle", "created_at": (NOW - timedelta(hours=4)).isoformat()}])
    assert scheduler.run_scheduled_cycle(db, None, now=NOW, cycle=_cycle) is not None


def test_a_later_claim_stands_down():
    db = DB([{"action": "discovery_cycle_claim", "result": "someone-else",
              "created_at": (NOW - timedelta(minutes=1)).isoformat()}])
    assert scheduler.run_scheduled_cycle(db, None, now=NOW, cycle=_cycle) is None


def test_a_failed_cycle_is_recorded_as_lose():
    def boom(sb, ai):
        raise RuntimeError("RSS down")
    db = DB()
    out = scheduler.run_scheduled_cycle(db, None, now=NOW, cycle=boom)
    beat = [r for r in db.rows if r["action"] == "discovery_cycle"][0]
    assert out == {"error": "RSS down"} and beat["result"] == "lose" and "RSS down" in beat["error"]
