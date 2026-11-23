"""Embed-health check for launch-guide YouTube picks (Kelvin, 2026-11-23).

Every 12 h, each video in a live or queued guide's video_embeds is checked
through YouTube oEmbed. 200 means it is public and embeddable; 401/403/404
means it is private, removed or has embedding disabled. A dead video is
marked status='broken' (ArticleMarkdown stops rendering it, so readers never
see a dead player) and Mission Control gets a map_alerts row (kind
'guide_video_broken', one per article+video). A video that comes back is
marked 'ok' again. Network errors / 5xx are treated as unknown and leave
the status alone; they are never counted as broken.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Callable, Optional

import httpx

AGENT_ID = "dsx-guide-video-health"
OEMBED = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={}"


def _oembed_status(video_id: str) -> Optional[bool]:
    try:
        r = httpx.get(OEMBED.format(video_id), timeout=20, headers={"User-Agent": "DecodedSix-embed-check/1.0"})
    except httpx.HTTPError:
        return None
    if r.status_code == 200:
        return True
    if r.status_code in (401, 403, 404):
        return False
    return None


def check(sb: Any, probe: Callable[[str], Optional[bool]] = _oembed_status) -> dict:
    rows = (sb.table("articles").select("id, slug, status, video_embeds")
            .in_("article_type", ["guide", "guide_hub"])
            .in_("status", ["published", "pending_review", "needs_revision"])
            .execute().data or [])
    now = datetime.now(timezone.utc).isoformat()
    out = {"checked": 0, "broken": [], "recovered": []}
    for row in rows:
        videos = row.get("video_embeds") or []
        changed = False
        for v in videos:
            ok = probe(v["video_id"])
            out["checked"] += 1
            if ok is None:
                continue
            new = "ok" if ok else "broken"
            if v.get("status") != new:
                changed = True
                (out["broken"] if new == "broken" else out["recovered"]).append(f"{row['slug']}:{v['video_id']}")
                if new == "broken":
                    ref = f"{row['id']}|{v['video_id']}"
                    seen = (sb.table("map_alerts").select("id").eq("kind", "guide_video_broken").eq("ref", ref)
                            .limit(1).execute().data or [])
                    if not seen:
                        sb.table("map_alerts").insert({
                            "kind": "guide_video_broken", "severity": "warning", "ref": ref,
                            "title": f"Guide video no longer embeddable: {row['slug']}",
                            "detail": {"article_id": row["id"], "slug": row["slug"], "video_id": v["video_id"],
                                       "channel": v.get("channel_name"),
                                       "how_to_fix": "It is hidden on the page already. Pick a replacement video "
                                                     "in the HITL card or remove it from video_embeds."},
                        }).execute()
            v["status"], v["checked_at"] = new, now
        if changed or videos:
            sb.table("articles").update({"video_embeds": videos}).eq("id", row["id"]).execute()
    return out


def run_check(sb: Any, check_fn: Optional[Callable[[Any], dict]] = None) -> dict:
    try:
        result = (check_fn or check)(sb)
    except Exception as exc:
        sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "guide_video_health", "result": "failure",
                                      "error": f"{type(exc).__name__}: {exc}"[:2000]}).execute()
        raise
    sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "guide_video_health",
                                  "result": json.dumps(result)[:4000]}).execute()
    return result
