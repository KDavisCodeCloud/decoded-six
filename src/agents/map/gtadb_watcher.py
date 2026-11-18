"""Map Phase 5 watcher: is there a gtadb commit newer than the one we pinned?

Every 6 hours (scheduler.py) this looks at rolux/gtadb.org over git -- a
blob-less partial clone, so only commit/tree objects come down, never tiles or
photos, and nothing is fetched from gtadb.org itself (their rule: "simply
`git pull`"). If HEAD moved past the pinned SHA and touched GTA 6 tiles or
landmark data, it raises ONE map_alerts row for Mission Control with a diff
summary. It never re-imports: Kelvin approves a new SHA, then the import
scripts are re-run by hand with --sha <new>.

GTADB_PINNED_SHA (env) is the approved commit. Default/initial: 8b1dc4f06.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger(__name__)

AGENT_ID = "map-gtadb-watcher"
REPO_URL = "https://github.com/rolux/gtadb.org.git"
LANDMARKS = "map/data/6/landmarks.json"
TILES_DIR = "maps/tiles/6/"


def _git(*args: str, cwd: Optional[str] = None, timeout: int = 300) -> str:
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True,
                          text=True, timeout=timeout).stdout


def summarize_changes(name_status: str) -> dict:
    """Pure: `git diff --name-status` output -> what changed for GTA 6."""
    tile_sets: dict[str, int] = {}
    landmarks_changed = False
    other = 0
    for line in name_status.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        path = parts[-1]
        if path == LANDMARKS:
            landmarks_changed = True
        elif path.startswith(TILES_DIR):
            tile_set = path[len(TILES_DIR):].split("/", 1)[0]
            tile_sets[tile_set] = tile_sets.get(tile_set, 0) + 1
        else:
            other += 1
    return {"tile_sets": tile_sets, "landmarks_changed": landmarks_changed, "other_files": other}


def diff_landmarks(old: dict, new: dict) -> dict:
    """Pure: record-level diff of two landmarks.json payloads."""
    def pos(v: list) -> Optional[tuple]:
        return tuple(round(c, 1) for c in v[1]) if v[1] else None
    added = [k for k in new if k not in old]
    removed = [k for k in old if k not in new]
    moved = [k for k in new if k in old and pos(new[k]) != pos(old[k])]
    renamed = [k for k in new if k in old and new[k][0] != old[k][0]]
    return {"added": len(added), "removed": len(removed), "moved": len(moved), "renamed": len(renamed),
            "newly_positioned": sum(1 for k in new if new[k][1] and not (old.get(k) or [None, None])[1])}


def check(sb: Any, pinned: Optional[str] = None, workdir: Optional[str] = None) -> dict:
    pinned = pinned or os.environ.get("GTADB_PINNED_SHA") or "8b1dc4f06"
    with tempfile.TemporaryDirectory(dir=workdir) as tmp:
        repo = str(Path(tmp) / "gtadb")
        _git("clone", "--filter=blob:none", "--no-checkout", "--quiet", REPO_URL, repo)
        head = _git("rev-parse", "HEAD", cwd=repo).strip()
        if head.startswith(pinned):
            return {"status": "current", "head": head[:9], "pinned": pinned}
        commits = int(_git("rev-list", "--count", f"{pinned}..{head}", cwd=repo).strip() or 0)
        changes = summarize_changes(_git("diff", "--name-status", pinned, head, "--", TILES_DIR, LANDMARKS, cwd=repo))
        if changes["landmarks_changed"]:
            old = json.loads(_git("show", f"{pinned}:{LANDMARKS}", cwd=repo))
            new = json.loads(_git("show", f"{head}:{LANDMARKS}", cwd=repo))
            changes["landmarks"] = diff_landmarks(old, new)
        new_sets = [s for s in changes["tile_sets"] if re.match(r"^[a-z]+,\d+$", s)]
        changes["tile_sets_touched"] = new_sets
    result = {"status": "update_available", "head": head[:9], "pinned": pinned, "commits": commits, **changes}

    relevant = bool(changes["tile_sets"]) or changes["landmarks_changed"]
    already = (sb.table("map_alerts").select("id").eq("kind", "gtadb_update")
               .eq("ref", head[:9]).limit(1).execute().data or [])
    if relevant and not already:
        bits = []
        if changes["tile_sets"]:
            bits.append("tiles: " + ", ".join(f"{k} ({v} files)" for k, v in changes["tile_sets"].items()))
        if changes.get("landmarks"):
            lm = changes["landmarks"]
            bits.append(f"landmarks: +{lm['added']} / -{lm['removed']} / moved {lm['moved']} / renamed {lm['renamed']}")
        sb.table("map_alerts").insert({
            "kind": "gtadb_update", "severity": "info", "ref": head[:9],
            "title": f"gtadb has {commits} new commit(s) since {pinned} -- approve {head[:9]}?",
            "detail": {**result, "summary": "; ".join(bits),
                       "how_to_apply": f"Approve, then: git -C <clone> checkout {head[:9]} && "
                                       f"python3 scripts/import_gtadb_landmarks.py <clone> --sha {head[:9]}; "
                                       "node scripts/upload_gtadb_tiles.mjs <clone> (panel trim is automatic); "
                                       f"set GTADB_PINNED_SHA={head[:9]}"},
        }).execute()
        result["alerted"] = True
    return result


def run_check(sb: Any) -> dict:
    """Scheduler entry: one check, one audit_log row, win or lose."""
    try:
        result = check(sb)
    except Exception as exc:
        sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "gtadb_watch",
                                      "result": "failure", "error": f"{type(exc).__name__}: {exc}"[:2000]}).execute()
        raise
    sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "gtadb_watch",
                                  "result": json.dumps(result, default=str)[:4000]}).execute()
    return result
