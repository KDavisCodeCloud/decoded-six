"""Embed-health check for guide videos (no network)."""
from src.agents.content import guide_video_health as gvh


class SB:
    def __init__(self, rows):
        self.rows, self.updates, self.alerts = rows, [], []

    def table(self, name):
        sb = self

        class Q:
            def __init__(self): self.name, self.payload = name, None
            def select(self, *a): return self
            def in_(self, *a): return self
            def eq(self, *a): return self
            def limit(self, *a): return self
            def insert(self, p): sb.alerts.append(p); return self
            def update(self, p): sb.updates.append(p); return self
            def execute(self):
                class R: pass
                r = R()
                r.data = sb.rows if self.name == "articles" else []
                return r
        return Q()


def test_dead_video_marked_broken_and_alerted_unknown_left_alone():
    sb = SB([{"id": "a1", "slug": "s", "status": "pending_review",
              "video_embeds": [{"video_id": "aaaaaaaaaaa", "status": "ok"}, {"video_id": "bbbbbbbbbbb", "status": "ok"}]}])
    out = gvh.check(sb, probe=lambda vid: False if vid.startswith("a") else None)
    assert out["broken"] == ["s:aaaaaaaaaaa"]
    vids = sb.updates[-1]["video_embeds"]
    assert vids[0]["status"] == "broken" and vids[1]["status"] == "ok"
    assert any(a.get("kind") == "guide_video_broken" for a in sb.alerts)
