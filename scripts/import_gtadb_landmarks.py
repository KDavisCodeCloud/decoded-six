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
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

AGENT_ID = "map-gtadb-import"
ATTRIBUTION = "GTA VI Landmarks Data (CC BY 4.0) — https://map.gtadb.org"
COUNTIES = ("Mariana", "Vice-Dale", "Kelly", "Leonard", "Lummox")
# gtadb positions are a pre-launch reconstruction, not surveyed points
IMPORT_RADIUS_M = 75

# What a "landmark" is (Kelvin 2026-11-19 -- not everything can be a landmark):
#   A LANDMARK is a NAMED place people recognise and navigate by, that isn't
#   a service you use: monuments, signs, murals, iconic buildings and towers,
#   named bridges and causeways, plazas, piers. If a place DOES something for
#   the player (sells, fuels, repairs, transports, hosts an activity) it goes
#   in that category. Generic structures ("Bridge", "Parking Lot", "Cell
#   Tower", "Turn 9C") are Infrastructure; lakes/rivers/islands are Nature;
#   homes and office towers are Residences & Offices.
#
# Order: specific '#' tags -> in-game name -> gtadb's broad tags -> landmark.
# #gas first: a 24/7 or LTD with pumps is a gas station, not a convenience store.
TAG_CATEGORY = [
    ("#gas", "fuel_station"),
    ("#nightclub", "nightclub"),
    ("#stripclub", "strip_club"),
    ("#bar", "bar"),
    ("#liquor", "liquor_store"),
    ("#fastfood", "fast_food"),
    ("fastfood", "fast_food"),
    ("#electronics", "electronics"),
    ("#clothes", "clothing"),
    ("#shoes", "shoe_store"),
    ("#fence", "fence"),
    ("fence", "fence"),
    ("#safehouse", "safehouse"),
    ("#hospital", "hospital"),
    ("#pharmacy", "pharmacy"),
    ("#police", "police_station"),
    ("#jail", "police_station"),
    ("#racetrack", "street_race"),
    ("#guns", "ammunation"),
    ("#supermarket", "store"),
    ("supermarket", "store"),
    ("#hair", "barber"),
    ("#tattoos", "tattoo"),
    ("#modshop", "mod_shop"),
    ("#pay'n'spray", "pay_n_spray"),
    ("#carwash", "car_wash"),
    ("#bikeshop", "bike_mod_shop"),
    ("#marina", "marina"),
    ("#bus", "bus_stop"),
    ("#train", "train_station"),
    ("#metro", "train_station"),
    ("#metromover", "train_station"),
    ("#airport", "airport"),
    ("#airbase", "airport"),
    ("#tennis", "tennis"),
    ("#golf", "golf"),
    ("#volleyball", "sports"),
    ("#ferriswheel", "attraction"),
    ("#cinema", "cinema"),
    ("#blimp", "attraction"),
    ("#food", "restaurant"),
    ("#drinks", "bar"),
    ("#vendor", "street_food"),
    ("#gym", "gym"),
]


def visible_tags(tags: list[str]) -> list[str]:
    """gtadb's own public filter: drop //editor-notes and L<n> layer tags."""
    return [t for t in tags if not t.startswith("//") and not (t[:1] in "lL" and t[1:].isdigit())]


# every category the import produces; named records in these are public
PUBLIC_CATEGORIES = {"landmark", "store", "fuel_station", "fence", "police_station", "safehouse",
                     "hospital", "clothing", "gym", "street_race",
                     "nightclub", "bar", "fire_station", "liquor_store", "fast_food", "electronics",
                     "convenience_store", "barber", "tattoo", "mod_shop",
                     # 041
                     "ammunation", "shoe_store", "pharmacy", "atm", "car_wash", "ev_charger",
                     "vehicle_dealer", "vehicle_rental", "marina", "bus_stop", "train_station", "airport",
                     "restaurant", "sports", "attraction", "hotel", "government", "nature",
                     "residential", "infrastructure",
                     # 043/044 in-game icon categories gtadb tags map to
                     "strip_club", "pay_n_spray", "bike_mod_shop", "tennis", "golf", "cinema", "street_food"}

# A bare structure/feature word as the whole name is never a landmark.
GENERIC_INFRA = re.compile(
    r"^(foot|train|rail(road)?|draw|swing)? ?(bridge|tunnel|overpass|underpass|flyover)s?( \(?\d+\)?)?$"
    r"|^parking( lot| garage| structure)?s?( \(?\d+\)?)?$|^(container )?crane( #?\(?\d+\)?)?$|^cell tower"
    r"|^(water |storage |oil |fuel )?tanks?( \(?\d+\)?)?$|^turn \d+\w*$|^\d+\w?$|^fence$|^railyard$|^rail ?yard$"
    r"|^(power|electrical) ?(station|substation|lines?|plant)$|^substation|^warehouse|^silo|^antenna|^radio tower"
    r"|^water tower|^smokestack|^chimney|^pylon|^billboard|^construction( site)?$|^scaffold|^dock$|^loading dock"
    r"|^lifeguard (tower|stand)|^(public )?restrooms?$|^radio mast|^hangars?$|^berths?$|^dam\??$|^breakwater|\bparking garage\b"
    r"|^gate( building)?$|^riverbank$|^seawall$|^jetty$|\b(water|broadcast|radar|control|radio|cell|transmission) tower\b"
    r"|\bparking lot\b|^car park$|^interchange$|^dry ?dock$|^(freight|cargo) terminal$"
    r"|^turn \?$|^tunnel entrance$|^empty lot$|^intersection$|^guard ?(house|booth)$|^lock$"
    r"|\bsubstation\b|^electrical$|^service gate$|\bshipyard\b|\bdistribution\b|\btunnel$",
    re.I)
NATURE = re.compile(r"\b(lake|river|creek|canal|bay|lagoon|swamp|marsh|everglade|island|isle|key|keys|beach|sandbar"
                    r"|reservoir|waterfall|falls|springs?|forest|woods|mount|mt\.?|hill|ridge|cave|sound|straits?|inlet|reef|glades?)\b", re.I)

# gtadb tags few businesses pre-launch, so the in-game name decides when no tag
# does (Kelvin 2026-11-18/19). Checked after the '#' tags, so '#gas' still wins
# for an LTD or 24/7 with pumps.
NAME_CATEGORY = [
    (re.compile(r"\b(fire (rescue )?station|fire department|fire rescue)\b", re.I), "fire_station"),
    (re.compile(r"\b(police (department|station|precinct|hq)|sheriff'?s? (office|department|station)|\bpd\b)", re.I), "police_station"),
    (re.compile(r"\b(ammu-?nation|gun (shop|store|range)|shooting range)\b", re.I), "ammunation"),
    (re.compile(r"\b(burger ?shot|cluckin'? ?bell|taco bomb|up-n-atom|lucky plucker|pizza this|wigwam)\b", re.I), "fast_food"),
    (re.compile(r"\b(night ?club|strip ?club|disco)\b", re.I), "nightclub"),
    (re.compile(r"\b(liquor|rob'?s liquor|three sheets|wine (shop|store)|spirits)\b", re.I), "liquor_store"),
    (re.compile(r"\b(bar|pub|tavern|saloon)\b", re.I), "bar"),
    (re.compile(r"\b(electronics?|digital den)\b", re.I), "electronics"),
    (re.compile(r"\b(barber(shop)?|hair|salon)\b", re.I), "barber"),
    (re.compile(r"\b(tattoos?|ink)\b", re.I), "tattoo"),
    (re.compile(r"\b(customs|mod ?shop|pay ?'?n'? ?spray|body ?shop|auto ?body|tires?|tyres?|auto parts)\b", re.I), "mod_shop"),
    (re.compile(r"\bgas station\b", re.I), "fuel_station"),
    (re.compile(r"\bcar ?wash\b", re.I), "car_wash"),
    (re.compile(r"\b(ev charg\w*|charging station|supercharger)\b", re.I), "ev_charger"),
    (re.compile(r"\b(dealership|motorsports?|motors|auto sales|car lot|boat sales|bike shop)\b", re.I), "vehicle_dealer"),
    (re.compile(r"\b(rentals?|rent-a-\w+|car hire)\b", re.I), "vehicle_rental"),
    (re.compile(r"\b(atm|bank|credit union|fleeca|lombank|maze bank)\b", re.I), "atm"),
    (re.compile(r"\b(shoes?|sneakers?|footwear|kicks)\b", re.I), "shoe_store"),
    (re.compile(r"\b(clothing|apparel|fashion|boutique|binco|suburban|ponsonbys)\b", re.I), "clothing"),
    (re.compile(r"\b(pharmacy|farmacia|drug ?store|apothecary)\b", re.I), "pharmacy"),
    (CONVENIENCE := re.compile(r"(\b24/7\b|\bltd\b|\bconvenience\b|\bmini ?mart\b)", re.I), "convenience_store"),
    (re.compile(r"^hospital\b|\bmedical cent(er|re)\b|\b(health )?clinic\b", re.I), "hospital"),
    (re.compile(r"\b(marina|yacht club|boat (ramp|launch)|harbou?r|sea ?port|cruise terminal)\b", re.I), "marina"),
    (re.compile(r"\b(bus (stop|station|terminal|depot)|transit center)\b", re.I), "bus_stop"),
    (re.compile(r"\b((metro|train|rail|metromover) station|metromover|station platform)\b", re.I), "train_station"),
    (re.compile(r"\b(airport|airfield|airstrip|air ?base|heliport|helipad|seaplane|runway|air hangar|aviation)\b", re.I), "airport"),
    (re.compile(r"\b(hotel|motel|resort|suites|hostel|inn)\b", re.I), "hotel"),
    (re.compile(r"\b(restaurant|grill|diner|cafe|café|seafood|steakhouse|bistro|kitchen|pizzeria|bbq|eatery|bakery|coffee|bean machine|juice|smoothie|taqueria|cantina)\b", re.I), "restaurant"),
    (re.compile(r"\b(trailer park|rv park|mobile home)\b", re.I), "residential"),
    (re.compile(r"\b(stadium|arena|ballpark|golf|tennis|court|speedway|grandstands?|raceway|race ?track|skate ?park|field|marina? sports)\b", re.I), "sports"),
    (re.compile(r"\b(museum|oceanarium|aquarium|zoo|theme park|amusement|ferris|cinema|theat(er|re)|gallery|casino"
                r"|fairground|boardwalk|spa|park|visitor center|observation|stage|concert hall|amphitheat(er|re))\b", re.I), "attraction"),
    (re.compile(r"\b(market|outlet|store|shop|mart|strip mall|mall|shopping|furniture|hardware|pawn|supply|supplies|tools|jewel\w*|joyeria|empe[ñn]os|copyshop|deli|grocery)\b", re.I), "store"),
    (re.compile(r"\b(city hall|town hall|courthouse|court house|prison|penitentiary|correctional|jail|post(al)? office"
                r"|library|school|university|college|academy|capitol|coast guard|community cent(er|re)|service center|county (building|government)|embassy|consulate)\b", re.I), "government"),
    (re.compile(r"\b(residences?|apartments?|apts|condos?|condominiums?|lofts|towers?|offices?|house [a-z])\b", re.I), "residential"),
]

# broad gtadb tags, used only when no '#' tag or name rule decided
BROAD_TAG_CATEGORY = [
    ("landmark", "landmark"),
    ("hotel", "hotel"),
    ("restaurant", "restaurant"),
    ("government", "government"),
    ("natural", "nature"),
    ("events", "attraction"),
    ("leisure", "attraction"),
    ("recreation", "attraction"),
    ("retail", "store"),
    ("residential", "residential"),
    ("office", "residential"),
    ("utilities", "infrastructure"),
    ("industrial", "infrastructure"),
    ("construction", "infrastructure"),
    ("agriculture", "infrastructure"),
]

# categories that say "you can go here and use it" -- a business gtadb marks
# demolished/closed in-game stays a landmark instead.
BUSINESS_039 = {"nightclub", "bar", "fire_station", "liquor_store", "fast_food", "electronics", "convenience_store",
                "barber", "tattoo", "mod_shop",
                "ammunation", "shoe_store", "pharmacy", "atm", "car_wash", "ev_charger", "vehicle_dealer",
                "vehicle_rental", "restaurant", "hotel"}


def category_for(tags: list[str], name: str = "") -> str:
    cat = _category_for(tags, name)
    if cat in BUSINESS_039 and ({"demolished", "closed"} & set(tags)):
        return "landmark"
    return cat


def _category_for(tags: list[str], name: str = "") -> str:
    for tag, cat in TAG_CATEGORY:
        if tag in tags:
            # a #supermarket that is really a 24/7 / LTD corner store
            if cat == "store" and name and CONVENIENCE.search(name):
                return "convenience_store"
            if cat == "store" and name and re.search(r"\bgas station\b", name, re.I):
                return "fuel_station"
            return cat
    bare = re.sub(r"\s*[\(#]?\d+\)?$", "", name.strip().strip('"')).strip()
    if name and GENERIC_INFRA.search(name.strip().strip('"')):
        return "infrastructure"
    for pat, cat in NAME_CATEGORY:
        if name and pat.search(name):
            return cat
    if name and "natural" not in tags and NATURE.fullmatch(bare or ""):
        return "nature"     # a bare "Lake" / "River"
    for tag, cat in BROAD_TAG_CATEGORY:
        if tag in tags:
            return cat
    if "transportation" in tags:
        # a NAMED bridge/causeway is a landmark; any other transport structure is infrastructure
        return "landmark" if re.search(r"\b(bridge|causeway|viaduct)\b", name, re.I) else "infrastructure"
    if name and NATURE.search(name) and len(name.split()) <= 3 and not re.search(r"\b(plaza|tower|center|centre|building)\b", name, re.I):
        return "nature"
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
        # "?", "? (S)", "P?" etc: gtadb hasn't identified the place -- unnamed, not a public pin
        name = parts[0] if parts and not re.fullmatch(r"\??\w?\?( \(\w+\))?", parts[0] or "?") else f"Unnamed {kind}"
        rows.append({
            "external_ref": rid,
            "source_type": "gtadb_import",
            "source": "import",
            "name": name[:200],
            "area_name": ", ".join(p for p in parts[1:] if p and p != "?") or None,
            "description": f"gtadb tags: {', '.join(vis)}" if vis else None,
            "category": category_for(tags, name if not name.startswith("Unnamed ") else ""),
            "tags": vis,
            "x": round(float(x), 2),
            "y": round(float(y), 2),
            "frame": "gtadb_world",
            "coordinates": {},
            "county": explicit_county(address) or by_area.get(parts[-1]),
            # Kelvin 2026-11-18: named gtadb places are public ("Community-mapped (gtadb)");
            # unnamed buildings stay internal (scraper gazetteer only)
            "status": "published" if name and not name.startswith("Unnamed ") and category_for(tags, name) in PUBLIC_CATEGORIES else "approved",
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
