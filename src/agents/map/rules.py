"""Map pin pipeline -- pure rules (no network, no DB). Everything that decides
whether a claim is allowed, how sure we are, and where it goes lives here so
it can be unit-tested (tests/test_map_pipeline_rules.py).

Hard rules (Kelvin's map spec, 2026-11-18):
  - BLOCKLIST domains are dropped at fetch time, including when a Reddit /
    YouTube post merely LINKS to one (their compiled pins are not ours).
  - Editorial guide sites are evidence for an individual claim only: one
    source each, and never enough to auto-publish a pin on their own.
  - Sources are independent only if they differ in author/channel AND domain.
  - Dedup: same category within max(radius_a, radius_b) meters -> merge.
  - Auto-publish (community_reported): confidence >= 0.85, >= 2 independent
    sources, >= 1 non-editorial. 0.5-0.85 -> HITL. < 0.5 -> held.
    >= 3 independent sources -> verified.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Iterable, Optional
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


def independent_count(sources: Iterable[Evidence]) -> int:
    """Largest set of sources that pairwise differ in author AND domain.
    Greedy (exact for this small-N case in practice): a repost by the same
    author, or a second post on the same platform/site, adds nothing."""
    chosen: list[Evidence] = []
    # prefer non-editorial first so the set keeps a non-editorial member if one exists
    for s in sorted(sources, key=lambda s: (s.kind == "editorial", s.url)):
        author = (s.author or s.url).lower()
        if all(author != (c.author or c.url).lower() and s.domain != c.domain for c in chosen):
            chosen.append(s)
    return len(chosen)


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
    """Target status for a scraped marker. Never downgrades a public/terminal status."""
    if current_status in ("rejected", "retired"):
        return current_status            # rejections are remembered
    n = independent_count(sources)
    if not placed:
        target = "pending"               # "needs placement" HITL item
    elif (conf >= AUTO_PUBLISH_MIN_CONFIDENCE and n >= AUTO_PUBLISH_MIN_INDEPENDENT
          and has_non_editorial(sources)):
        target = "verified" if n >= VERIFIED_MIN_INDEPENDENT else "community_reported"
    elif conf >= QUEUE_MIN_CONFIDENCE:
        target = "pending"
    else:
        target = "held"
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
        if d <= max(radius_m or 0, m.radius_m or 0) and d < best_d:
            best, best_d = m, d
    return best


def normalize_name(s: str) -> str:
    s = re.sub(r"\(.*?\)", " ", (s or "").lower())
    s = re.sub(r"['\u2019]", "", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\b(the|a|an|gta|6|vi)\b", " ", s)
    return " ".join(s.split())
