#!/usr/bin/env python3
"""Map Phase 5: import gtadb's GTA 6 landmark data into map_markers.

Reads map/data/6/landmarks.json from a LOCAL git clone of rolux/gtadb.org,
checked out at the pinned SHA (gtadb asks that nobody fetch live data from
gtadb.org -- `git pull` only). Never touches the network for data.

Rules (Kelvin's spec, 2026-11-18):
  - positioned records only; nothing without in-game coordinates is invented
  - photos skipped entirely
  - source_type='gtadb_import', license='CC BY 4.0', game_version='pre_launch',
    status='published' when named (public, 'Community-mapped (gtadb)' badge), 'approved' for unnamed buildings (gazetteer only, NOT on the public map), placement_method='import'
  - upsert on the gtadb record ID (external_ref, e.g. 'L1')

County: gtadb has no county polygons. A record gets a county only when its own
in-game address names one ("..., Kelly County") or when its whole town/area is
unanimous (>= 95% of that area's explicitly-countied nearest neighbours, n >= 5).
Anything else stays NULL until Phase 4 traces the official county outlines.

Usage:
  set -a; . ./.env.local; set +a
  python3 scripts/import_gtadb_landmarks.py <gtadb-clone> --sha 8b1dc4f06 [--dry-run]
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

AGENT_ID = "map-gtadb-import"
ATTRIBUTION = "GTA VI Landmarks Data (CC BY 4.0) — https://map.gtadb.org"
COUNTIES = ("Mariana", "Vice-Dale", "Kelly", "Leonard", "Lummox")
# gtadb positions are a pre-launch reconstruction, not surveyed points
IMPORT_RADIUS_M = 75

# gtadb tag -> our category (first match wins; default 'landmark')
TAG_CATEGORY = [
    ("#gas", "fuel_station"),
    ("#clothes", "clothing"),
    ("#fence", "fence"),
    ("#safehouse", "safehouse"),
    ("#hospital", "hospital"),
    ("#police", "police_station"),
    ("#jail", "police_station"),
    ("#racetrack", "street_race"),
    ("#guns", "store"),
    ("#supermarket", "store"),
    ("supermarket", "store"),
    ("#electronics", "store"),
    ("#hair", "store"),
    ("#tattoos", "store"),
    ("#modshop", "store"),
    ("#pay'n'spray", "store"),
    ("#vendor", "store"),
    ("#gym", "gym"),
]


def visible_tags(tags: list[str]) -> list[str]:
    """gtadb's own public filter: drop //editor-notes and L<n> layer tags."""
    return [t for t in tags if not t.startswith("//") and not (t[:1] in "lL" and t[1:].isdigit())]


# every category the import produces; named records in these are public
PUBLIC_CATEGORIES = {"landmark", "store", "fuel_station", "fence", "police_station", "safehouse",
                     "hospital", "clothing", "gym", "street_race"}


def category_for(tags: list[str]) -> str:
    for tag, cat in TAG_CATEGORY:
        if tag in tags:
            return cat
    return "landmark"


def explicit_county(address: str) -> str | None:
    for c in COUNTIES:
        if f"{c} County" in address:
            return c
    return None


def area_counties(records: dict) -> dict[str, str]:
    """Area name -> county, only where the area is (near-)unanimous."""
    labelled = [(v[1][0], v[1][1], explicit_county(v[0])) for v in records.values() if explicit_county(v[0])]

    def nn(x: float, y: float, k: int = 7) -> str:
        near = sorted(labelled, key=lambda t: (t[0] - x) ** 2 + (t[1] - y) ** 2)[:k]
        return collections.Counter(t[2] for t in near).most_common(1)[0][0]

    votes: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for v in records.values():
        area = v[0].split(", ")[-1]
        votes[area][explicit_county(v[0]) or nn(*v[1])] += 1
    out = {}
    for area, c in votes.items():
        county, n = c.most_common(1)[0]
        total = sum(c.values())
        if total >= 5 and n / total >= 0.95:
            out[area] = county
    return out


def build_rows(records: dict, sha: str) -> list[dict]:
    by_area = area_counties(records)
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for rid, v in records.items():
        address, (x, y), tags = v[0], v[1], v[6]
        parts = [p.strip() for p in address.split(",")]
        vis = visible_tags(tags)
        kind = next((t.lstrip("#") for t in vis if t.startswith("#")), None) or (vis[0] if vis else "location")
        name = parts[0] if parts and parts[0] not in ("", "?") else f"Unnamed {kind}"
        rows.append({
            "external_ref": rid,
            "source_type": "gtadb_import",
            "source": "import",
            "name": name[:200],
            "area_name": ", ".join(p for p in parts[1:] if p and p != "?") or None,
            "description": f"gtadb tags: {', '.join(vis)}" if vis else None,
            "category": category_for(tags),
            "tags": vis,
            "x": round(float(x), 2),
            "y": round(float(y), 2),
            "frame": "gtadb_world",
            "coordinates": {},
            "county": explicit_county(address) or by_area.get(parts[-1]),
            # Kelvin 2026-11-18: named gtadb places are public ("Community-mapped (gtadb)");
            # unnamed buildings stay internal (scraper gazetteer only)
            "status": "published" if name and not name.startswith("Unnamed ") and category_for(tags) in PUBLIC_CATEGORIES else "approved",
            "verified": False,
            "placement_method": "import",
            "game_version": "pre_launch",
            "license": "CC BY 4.0",
            "attribution": ATTRIBUTION,
            "source_urls": ["https://map.gtadb.org"],
            "source_domains": ["gtadb.org"],
            "independent_source_count": 1,
            "accuracy_radius_m": IMPORT_RADIUS_M,
            "first_seen_at": now,
            "submitted_source_url": f"https://github.com/rolux/gtadb.org/blob/{sha}/map/data/6/landmarks.json",
            "updated_at": now,
        })
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("--sha", required=True, help="pinned gtadb commit; the clone's HEAD must match")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    head = subprocess.check_output(["git", "-C", a.repo, "rev-parse", "HEAD"], text=True).strip()
    if not head.startswith(a.sha):
        sys.exit(f"clone HEAD {head[:9]} != pinned {a.sha}; check out the pinned SHA first")

    data = json.loads((Path(a.repo) / "map/data/6/landmarks.json").read_text())
    positioned = {k: v for k, v in data.items() if v[1] and len(v[1]) == 2}
    rows = build_rows(positioned, head[:9])

    by_cat = collections.Counter(r["category"] for r in rows)
    by_county = collections.Counter(r["county"] or "(unassigned)" for r in rows)
    summary = {
        "sha": head[:9], "records": len(data), "positioned": len(positioned),
        "skipped_no_position": len(data) - len(positioned),
        "named": sum(1 for r in rows if not r["name"].startswith("Unnamed ")),
        "by_category": dict(by_cat.most_common()), "by_county": dict(by_county.most_common()),
    }
    print(json.dumps(summary, indent=2))
    if a.dry_run:
        return

    from supabase import create_client
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")
    sb = create_client(url, key)
    try:
        for i in range(0, len(rows), 500):
            sb.table("map_markers").upsert(rows[i:i + 500], on_conflict="source_type,external_ref").execute()
            print(f"  upserted {min(i + 500, len(rows))}/{len(rows)}")
    except Exception as exc:
        sb.table("audit_log").insert({"agent_id": AGENT_ID, "action": "gtadb_landmark_import",
                                      "result": "failure", "error": str(exc)[:2000]}).execute()
        raise
    sb.table("audit_log").insert({
        "agent_id": AGENT_ID, "action": "gtadb_landmark_import",
        "result": json.dumps(summary)[:4000],
    }).execute()


if __name__ == "__main__":
    main()
