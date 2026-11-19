"""Watch rockstargames.com/VI for the official Leonida map download.

Kelvin, 2026-11-19: Rockstar's official map goes live on launch day. Check the
GTA VI downloads page every 30 minutes and alert Mission Control (map_alerts)
when a map download appears. Phase 4 runs when Kelvin drops the file in
map-source/ -- this watcher never downloads the file itself.

The downloads page (/VI/downloads -> /VI/media) is server-rendered Next.js;
each artwork card lists variants like {"variant":"map_printable", ...,
"downloadUrl": "https://media-rockstargames-com.akamaized.net/..."}. The
"Leonida Map" variant labels exist in the page's translation strings before
any file does, so only a real downloadUrl on a map variant counts.

One alert per (file URL, Last-Modified): a re-upload of the same file alerts
again, the same file never does.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Optional

import httpx

log = logging.getLogger(__name__)

AGENT_ID = "map-rockstar-watch"
PAGE = "https://www.rockstargames.com/VI/downloads"
UA = {"User-Agent": "DecodedSix-map-watch/1.0"}

# {"variant":"map" | "map_printable" | ..., ... "downloadUrl":"..."} with no nested object in between
_VARIANT = re.compile(r'\{"variant":"(map[a-z_]*)"(?:[^{}]|\{[^{}]*\})*?"downloadUrl":"([^"]+)"')
# fallback: any Rockstar media URL that is plainly a map file
_MAP_URL = re.compile(r'https://media-rockstargames-com\.akamaized\.net/VI/[^"\s<>]*?(?:Leonida_Map|_Map_|/Map)[^"\s<>]*\.(?:zip|png|jpe?g|pdf|tiff?)', re.I)


def find_map_downloads(page_html: str) -> list[dict]:
    """[{variant, url}] for every map download link on the page (deduped by URL)."""
    t = page_html.replace('\\"', '"').replace("\\u0026", "&")
    out: dict[str, dict] = {}
    for m in _VARIANT.finditer(t):
        out.setdefault(m.group(2), {"variant": m.group(1), "url": m.group(2)})
    for m in _MAP_URL.finditer(t):
        out.setdefault(m.group(0), {"variant": "map", "url": m.group(0)})
    return list(out.values())


def _http_get(url: str) -> str:
    r = httpx.get(url, headers=UA, timeout=45, follow_redirects=True)
    r.raise_for_status()
    return r.text


def _http_head(url: str) -> dict:
    r = httpx.head(url, headers=UA, timeout=30, follow_redirects=True)
    return {"status": r.status_code, "bytes": int(r.headers.get("content-length") or 0) or None,
            "last_modified": r.headers.get("last-modified"), "content_type": r.headers.get("content-type")}


def check(sb: Any, get: Callable[[str], str] = _http_get, head: Callable[[str], dict] = _http_head) -> dict:
    files = []
    for f in find_map_downloads(get(PAGE)):
        meta = head(f["url"])
        if meta["status"] == 200:
            files.append({**f, **meta})
    result: dict = {"page": PAGE, "map_files": files, "alerted": []}
    for f in files:
        ref = f"{f['url']}|{f.get('last_modified') or ''}"[:500]
        seen = (sb.table("map_alerts").select("id").eq("kind", "rockstar_map_download").eq("ref", ref)
                .limit(1).execute().data or [])
        if seen:
            continue
        size = f"{f['bytes'] / 1e6:.0f} MB" if f.get("bytes") else "size unknown"
        sb.table("map_alerts").insert({
            "kind": "rockstar_map_download", "severity": "critical", "ref": ref,
            "title": f"Rockstar's official Leonida map is downloadable ({f['variant']}, {size})",
            "detail": {**f, "page": "https://www.rockstargames.com/VI/downloads",
                       "how_to_apply": "Download it, unzip, and drop the map image into map-source/ -- Phase 4 "
                                       "(official map trace/align) runs from there. Rockstar art: credit "
                                       "'Map: Rockstar Games' wherever it is shown."},
        }).execute()
        result["alerted"].append(f["url"])
    return result


def run_check(sb: Any, check_fn: Optional[Callable[[Any], dict]] = None) -> dict:
    """Scheduler entry: one check, one audit_log row, win or lose."""
    try:
        result = (check_fn or check)(sb)
    except Exception as exc:
        sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "rockstar_map_watch", "result": "failure",
                                      "error": f"{type(exc).__name__}: {exc}"[:2000]}).execute()
        raise
    sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "rockstar_map_watch",
                                  "result": json.dumps(result, default=str)[:4000]}).execute()
    return result
