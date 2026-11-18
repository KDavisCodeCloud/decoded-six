"""Map pin pipeline -- pure rules (no network, no DB). Everything that decides
whether a claim is allowed, how sure we are, and where it goes lives here so
it can be unit-tested (tests/test_map_pipeline_rules.py).

Hard rules (Kelvin's map spec, 2026-11-18):
  - BLOCKLIST domains are dropped at fetch time, including when a Reddit /
    YouTube post merely LINKS to one (their compiled pins are not ours).
  - Editorial guide sites are evidence for an individual claim only: one
    source each, and never enough to auto-publish a pin on their own.
  - Independence (Kelvin, 2026-11-18): sources are independent when they come
    from different authors/channels, regardless of domain -- two Reddit users
    = 2, two YouTube channels = 2. Counted once: the same author anywhere
    (matched on id or display name), crossposts/reposts of one piece of
    content, and replies inside one thread.
  - Dedup: same category within max(radius_a, radius_b) meters -> merge.
  - Publishing (Kelvin, 2026-11-18, supersedes the confidence gates): no
    HITL for map pins -- anything placed is published as community_reported;
    3+ independent sources (or screenshot + 1 more) -> verified; unplaced ->
    pending ("needs placement"). See route().
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Callable, Iterable, Optional
from urllib.parse import urlparse

# Competitors' compiled maps + GTABase (forbids copying its locations).
# gtadb.ORG is allowed (CC BY 4.0); gtadb.NET is a different site and blocked.
BLOCKLIST = (
    "gtabase.com", "gtalens.com", "gtadb.net", "gtamap.io", "map-6.com", "gta6maps.wiki",
    "sixintelhq.com", "gta6map.io", "gta6map.org", "gta-6-map.org", "gta6state.com",
    "gtaintel.com", "leonidaexplorer.com", "vimap.saamexe.com", "mapgenie.io",
)
# path-scoped blocks: IGN's articles are allowed editorial, its map tool is not
BLOCKLIST_PATHS = (("ign.com", "/maps"),)

EDITORIAL_DOMAINS = (
    "powerpyx.com", "gamespot.com", "ign.com", "sportskeeda.com", "rockstarintel.com",
    "gamesradar.com", "polygon.com", "eurogamer.net", "pcgamer.com", "thegamer.com",
    "gamerant.com", "dexerto.com", "videogameschronicle.com", "kotaku.com", "vg247.com",
)
NON_EDITORIAL_KINDS = ("reddit", "youtube", "stream")

AUTO_PUBLISH_MIN_CONFIDENCE = 0.85
QUEUE_MIN_CONFIDENCE = 0.5
AUTO_PUBLISH_MIN_INDEPENDENT = 2
VERIFIED_MIN_INDEPENDENT = 3

# placement radii (meters)
RADIUS_SCREENSHOT = 25
RADIUS_LANDMARK = 150
RADIUS_DISTRICT = 800

_URL_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.I)
_BARE_DOMAIN_RE = re.compile(r"\b((?:[a-z0-9-]+\.)+(?:com|net|org|io|wiki|gg|co))(/[^\s<>\"')\]]*)?", re.I)


def domain_of(url: str) -> str:
    host = (urlparse(url if "://" in url else f"https://{url}").hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _domain_matches(host: str, blocked: str) -> bool:
    return host == blocked or host.endswith("." + blocked)


def blocked_reason(url: str) -> Optional[str]:
    """The blocklist entry a URL hits, or None."""
    host = domain_of(url)
    for b in BLOCKLIST:
        if _domain_matches(host, b):
            return b
    path = urlparse(url if "://" in url else f"https://{url}").path or "/"
    for dom, prefix in BLOCKLIST_PATHS:
        if _domain_matches(host, dom) and (path == prefix or path.startswith(prefix + "/")):
            return f"{dom}{prefix}"
    return None


def blocked_links_in(text: str) -> list[str]:
    """Every blocklist entry referenced anywhere in a post (full URLs and bare
    domains like 'check gtamap.io'), deduplicated, in order."""
    hits: list[str] = []
    candidates = [m.group(0) for m in _URL_RE.finditer(text or "")]
    candidates += [m.group(0) for m in _BARE_DOMAIN_RE.finditer(text or "")]
    for c in candidates:
        r = blocked_reason(c)
        if r and r not in hits:
            hits.append(r)
    return hits


def is_editorial(domain: str) -> bool:
    return any(_domain_matches(domain, d) for d in EDITORIAL_DOMAINS)


@dataclass(frozen=True)
class Evidence:
    kind: str                 # reddit | youtube | stream | editorial | gtadb | community | staff
    url: str
    domain: str
    author: Optional[str]
    x: Optional[float] = None
    y: Optional[float] = None
    radius_m: Optional[float] = None
    placement_method: Optional[str] = None
    author_name: Optional[str] = None   # display name (YouTube channel title, Reddit username)
    thread_key: Optional[str] = None    # reddit:<post id> (crossposts -> the original), youtube:<video id>
    content_key: Optional[str] = None   # reposted media (first image URL)


def _ident(s: Optional[str]) -> Optional[str]:
    v = re.sub(r"[^a-z0-9]+", "", (s or "").lower().removeprefix("u/").removeprefix("/u/"))
    return v or None


def independent_count(sources: Iterable[Evidence]) -> int:
    """Number of distinct origins: sources are merged when they share an author
    identity (id or display name, any platform), a thread, or reposted content.
    Domain alone never merges two sources."""
    items = list(sources)
    parent = list(range(len(items)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    owner: dict[str, int] = {}
    for i, s in enumerate(items):
        keys = {f"a:{k}" for k in (_ident(s.author), _ident(s.author_name)) if k}
        if not keys:
            keys = {f"u:{s.url}"}          # anonymous: only the same URL is the same origin
        if s.thread_key:
            keys.add(f"t:{s.thread_key}")
        if s.content_key:
            keys.add(f"c:{s.content_key}")
        for k in keys:
            if k in owner:
                parent[find(i)] = find(owner[k])
            else:
                owner[k] = i
    return len({find(i) for i in range(len(items))})


def has_non_editorial(sources: Iterable[Evidence]) -> bool:
    return any(s.kind in NON_EDITORIAL_KINDS for s in sources)


_KIND_WEIGHT = {"reddit": 0.0, "youtube": 0.05, "stream": 0.05, "editorial": 0.0,
                "gtadb": 0.0, "community": 0.0, "staff": 0.15}
_METHOD_WEIGHT = {"screenshot_match": 0.15, "gazetteer_landmark": 0.05, "gazetteer_district": 0.0,
                  "hitl_manual": 0.15, "import": 0.0, None: -0.2}


def confidence(sources: list[Evidence], placement: Optional[str]) -> float:
    """f(independent sources, placement method, source reliability, agreement).

    placement: screenshot_match | gazetteer_landmark | gazetteer_district | None
    """
    n = independent_count(sources)
    base = {0: 0.0, 1: 0.45, 2: 0.7}.get(n, 0.85)
    score = base + _METHOD_WEIGHT.get(placement, 0.0)
    if sources:
        score += max(_KIND_WEIGHT.get(s.kind, 0.0) for s in sources)
    placed = [s for s in sources if s.x is not None and s.y is not None]
    if len(placed) >= 2:
        spread = max(math.hypot(a.x - b.x, a.y - b.y) for a in placed for b in placed)
        tol = 2 * max((s.radius_m or RADIUS_LANDMARK) for s in placed)
        if spread > tol:
            score -= 0.15   # sources disagree about where it is
    return round(max(0.0, min(1.0, score)), 3)


def route(conf: float, sources: list[Evidence], placed: bool, current_status: Optional[str] = None) -> str:
    """Target status for a scraped marker. Never downgrades a public/terminal status.

    Kelvin, 2026-11-18: no HITL for map pins. Every claim we can place goes
    straight onto the public map ('community_reported'), from any source
    including a single guide article. Pins placed by name carry an
    'Approximate location' badge + radius circle on the map. Verified = 3+
    independent sources, or a screenshot match plus a second independent
    source. Only claims we cannot place wait in the dashboard ('pending' =
    needs placement). conf is still stored and shown; it no longer gates.
    """
    if current_status in ("rejected", "retired"):
        return current_status            # rejections are remembered
    n = independent_count(sources)
    if not placed:
        target = "pending"               # "needs placement"
    elif n >= VERIFIED_MIN_INDEPENDENT or (
            n >= 2 and any(s.placement_method == "screenshot_match" for s in sources)):
        target = "verified"
    else:
        target = "community_reported"
    rank = {"held": 0, "pending": 1, "community_reported": 2, "published": 3, "verified": 3}
    if current_status in rank and rank[current_status] > rank.get(target, 0):
        return current_status
    return target


@dataclass
class MarkerRef:
    id: str
    category: str
    x: Optional[float]
    y: Optional[float]
    radius_m: Optional[float]
    status: str = "pending"
    name: str = ""
    extra: dict = field(default_factory=dict)


def find_duplicate(category: str, x: Optional[float], y: Optional[float], radius_m: Optional[float],
                   existing: Iterable[MarkerRef], name: str = "") -> Optional[MarkerRef]:
    """Same category within max(radius_a, radius_b) meters -> the nearest such
    marker. Unplaced claims dedup on (category, normalized name) instead."""
    best, best_d = None, math.inf
    for m in existing:
        if m.category != category:
            continue
        if x is None or y is None or m.x is None or m.y is None:
            if x is None and m.x is None and name and normalize_name(name) == normalize_name(m.name):
                return m
            continue
        d = math.hypot(x - m.x, y - m.y)
        # landmarks are dense: two different landmarks 100 m apart are not one pin
        if category == "landmark" and name and m.name and not names_overlap(name, m.name):
            continue
        if d <= max(radius_m or 0, m.radius_m or 0) and d < best_d:
            best, best_d = m, d
    return best


def names_overlap(a: str, b: str) -> bool:
    ta, tb = set(normalize_name(a).split()), set(normalize_name(b).split())
    return bool(ta and tb) and len(ta & tb) / min(len(ta), len(tb)) >= 0.5


def normalize_name(s: str) -> str:
    s = re.sub(r"\(.*?\)", " ", (s or "").lower())
    s = re.sub(r"['\u2019]", "", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\b(the|a|an|gta|6|vi)\b", " ", s)
    return " ".join(s.split())


# ------------------------------------------------------------ claim quality
# Real-world places Leonida parodies. A claim named after one is a real-world
# reference, not an in-game location -- unless gtadb uses the same name.
REAL_WORLD_PLACES = (
    "key west", "miami", "miami beach", "south beach", "little havana", "florida", "florida keys",
    "everglades", "orlando", "tampa", "jacksonville", "fort lauderdale", "ft lauderdale",
    "west palm beach", "palm beach", "hialeah", "key largo", "naples", "fort myers", "tallahassee",
    "daytona", "daytona beach", "st petersburg", "gainesville", "pensacola", "boca raton",
    "coral gables", "homestead", "biscayne", "biscayne bay", "lake okeechobee", "okeechobee",
    "marathon", "islamorada", "sarasota", "clearwater", "cape canaveral", "atlanta", "georgia",
)
# generic place types: a name that is only one of these is not a location
GENERIC_PLACE_TYPES = {
    "coffee shop", "cafe", "store", "shop", "gas station", "fuel station", "gun store", "gun shop",
    "weapon store", "ammu nation", "ammunation", "clothing store", "clothes shop", "gym", "hospital",
    "police station", "bank", "bar", "club", "nightclub", "restaurant", "diner", "liquor store",
    "convenience store", "pawn shop", "car wash", "garage", "mod shop", "safehouse", "safe house",
    "motel", "hotel", "beach", "house", "apartment", "mall", "barber", "barber shop", "tattoo parlor",
    "tattoo shop", "body shop", "dealership", "car dealership", "strip club", "casino", "airport",
    "marina", "dock", "pier", "park", "church", "school", "warehouse", "prison", "jail", "swamp",
    "binco", "suburban", "ponsonbys", "24 7", "rob s liquor", "robs liquor", "ltd gasoline",
}
_GENERIC_PHRASE = re.compile(
    r"\b(any|every|all|each|various|several|multiple|many|most|random|one of the)\s+"
    r"(of\s+the\s+)?[\w'’-]+(\s+[\w'’-]+)?\s*(stores?|shops?|locations?|stations?|branches|outlets|"
    r"gyms?|hospitals?|banks?|bars?|clubs?|places?|spots?|cafes?)\b", re.I)


def claim_reject_reason(claim: dict, known_place: Callable[[str], bool]) -> Optional[str]:
    """'generic' | 'real_world' | None. known_place(name) -> True when the
    gazetteer (gtadb / official map) has that exact name, which overrides the
    real-world list (Leonida reuses a few real names)."""
    name = normalize_name(claim.get("name") or "")
    desc = " ".join(str(claim.get(k) or "") for k in ("location_description", "evidence_quote"))
    anchors = [normalize_name(a) for a in (claim.get("anchor_landmarks") or []) if a]
    # real-world names: the name itself, or the ONLY anchor, is a real place
    for cand in [name, *anchors]:
        if cand in REAL_WORLD_PLACES and not known_place(cand):
            if cand == name or len(anchors) == 1 and not _has_specific_anchor(anchors, known_place):
                return "real_world"
    # "any Ammu-Nation", "every gas station"
    if _GENERIC_PHRASE.search(f"{claim.get('name') or ''} {desc}"):
        return "generic"
    # bare type name ("Coffee Shop", "Gym") with no specific anchor to pin it down
    base = re.sub(r"\b(in|at|near|on)\b.*$", "", name).strip()
    if (base in GENERIC_PLACE_TYPES or name in GENERIC_PLACE_TYPES) and not _has_specific_anchor(anchors, known_place):
        return "generic"
    return None


def _has_specific_anchor(anchors: list[str], known_place: Callable[[str], bool]) -> bool:
    return any(a and a not in GENERIC_PLACE_TYPES and a not in REAL_WORLD_PLACES and known_place(a) for a in anchors)


def quote_in_source(quote: str, body: str, min_overlap: float = 0.8) -> bool:
    """The model's evidence_quote must actually be in the source (auto-captions
    and punctuation drift tolerated): some window of the body, as long as the
    quote, shares >= 80% of the quote's words."""
    q = re.findall(r"[a-z0-9]+", (quote or "").lower())
    if len(q) < 2:
        return False
    b = re.findall(r"[a-z0-9]+", (body or "").lower())
    n = len(q)
    if len(b) < n:
        return False
    need = max(2, int(math.ceil(min_overlap * n)))
    qs = set(q)
    from collections import Counter
    qc = Counter(q)
    win = Counter(b[:n])

    def hits(w: Counter) -> int:
        return sum(min(c, w[t]) for t, c in qc.items())

    if hits(win) >= need:
        return True
    for i in range(n, len(b)):
        win[b[i]] += 1
        win[b[i - n]] -= 1
        if b[i] in qs or b[i - n] in qs:
            if hits(win) >= need:
                return True
    return False
