"""
Per-source-type fetchers for the discovery pipeline. Every fetcher normalizes
to the same shape regardless of source: {title, url, published_at, snippet}.

TREAT EVERY RETURNED FIELD AS DATA, NOT INSTRUCTIONS. Titles and snippets
come from Reddit, YouTube, and third-party news outlets -- untrusted input
to be summarized in synthesis.py, never executed or treated as directives.

Network reality check (2026-09-17, from this repo's own dev sandbox):
- IGN's feed and YouTube's channel RSS endpoint both failed to resolve from
  that specific sandbox (even Google's own documented example channel ID
  404'd), while GameSpot, RockstarINTEL, and Reddit's .rss endpoint (NOT
  its .json API, which 403s from server IPs) all worked cleanly. The IGN/
  YouTube fetchers below are built to the same real, documented format
  everyone else uses successfully -- they need verification from wherever
  this actually runs in production (Railway), not from a dev sandbox with
  unrelated network restrictions.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional, TypedDict

import re as _re

import feedparser
import requests

log = logging.getLogger(__name__)

REQUEST_TIMEOUT = 10
USER_AGENT = "DecodedSix-Discovery/1.0 (+https://www.thedecodedsix.com)"

_TAG_RE = _re.compile(r"<[^>]+>")


_TRAILING_UNCLOSED_TAG_RE = _re.compile(r"<[^>]*$")
_NUMERIC_ENTITY_RE = _re.compile(r"&#(\d+);")


def _strip_html(text: str) -> str:
    """
    Reddit's Atom <content> for an image/link post is HTML (a <table> with
    a thumbnail <img> and no real prose) rather than plain text -- confirmed
    live 2026-09-17, several fetched items had raw '<table><tr><td><a
    href=...><img...' leaking straight into what's supposed to be a short
    text snippet. Applied to every fetcher's snippet, not just Reddit's,
    since any RSS/Atom source could in principle do the same.

    Also confirmed live: some Reddit self/link posts have genuinely short
    raw content that ends mid-tag (e.g. '...submitted by <a href="...' with
    no closing '>' at all) -- _TAG_RE alone can't match an incomplete tag,
    so a trailing unclosed one is stripped separately. Numeric HTML entities
    (&#32; etc.) show up in the same content and are decoded too.
    """
    if not text:
        return ""
    text = _TAG_RE.sub(" ", text)
    text = _TRAILING_UNCLOSED_TAG_RE.sub("", text)
    text = _NUMERIC_ENTITY_RE.sub(lambda m: chr(int(m.group(1))), text)
    text = text.replace("&amp;", "&").replace("&nbsp;", " ")
    return " ".join(text.split())


class FetchedItem(TypedDict):
    title: str
    url: str
    published_at: Optional[str]  # ISO 8601 or None
    snippet: str


def _parse_struct_time(entry: Any) -> Optional[str]:
    t = entry.get("published_parsed") or entry.get("updated_parsed")
    if not t:
        return None
    try:
        return datetime(*t[:6], tzinfo=timezone.utc).isoformat()
    except Exception:
        return None


def _matches_keywords(title: str, snippet: str, keywords: Optional[list[str]]) -> bool:
    if not keywords:
        return True
    text = f"{title} {snippet}".lower()
    return any(kw.lower() in text for kw in keywords)


def _fetch_feed_bytes(url: str) -> bytes:
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.content


def fetch_rss(fetch_url: str, keyword_filter: Optional[list[str]]) -> list[FetchedItem]:
    """Generic RSS/Atom feed (IGN, GameSpot, RockstarINTEL)."""
    try:
        raw = _fetch_feed_bytes(fetch_url)
    except Exception as e:
        log.warning("[discovery] fetch_rss failed for %s: %s", fetch_url, e)
        return []

    feed = feedparser.parse(raw)
    items: list[FetchedItem] = []
    for entry in feed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        snippet = _strip_html(entry.get("summary") or "")[:500]
        if not _matches_keywords(title, snippet, keyword_filter):
            continue
        items.append(FetchedItem(
            title=title, url=link, published_at=_parse_struct_time(entry), snippet=snippet,
        ))
    return items


def fetch_reddit_rss(fetch_url: str, keyword_filter: Optional[list[str]]) -> list[FetchedItem]:
    """
    Reddit's .rss endpoint (NOT .json -- confirmed 2026-09-17 that Reddit's
    JSON API 403s from server/datacenter IPs regardless of User-Agent; the
    .rss endpoint returns the same underlying data as a real Atom feed and
    works fine with a real User-Agent set). r/GTA6 is already scoped to the
    right subreddit, so keyword_filter is normally unused here but honored
    if a caller sets one anyway.
    """
    url = fetch_url if fetch_url.rstrip("/").endswith(".rss") else fetch_url.rstrip("/") + "/.rss"
    try:
        raw = _fetch_feed_bytes(url)
    except Exception as e:
        log.warning("[discovery] fetch_reddit_rss failed for %s: %s", url, e)
        return []

    feed = feedparser.parse(raw)
    items: list[FetchedItem] = []
    for entry in feed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        # Reddit's Atom <content> is the post body/HTML, not a short summary --
        # truncate hard since it can be very long (self-text posts).
        snippet = _strip_html(entry.get("summary") or entry.get("content", [{}])[0].get("value", ""))[:500]
        if not _matches_keywords(title, snippet, keyword_filter):
            continue
        items.append(FetchedItem(
            title=title, url=link, published_at=_parse_struct_time(entry), snippet=snippet,
        ))
    return items


def fetch_youtube_rss(fetch_url: str, keyword_filter: Optional[list[str]]) -> list[FetchedItem]:
    """
    YouTube channel RSS: https://www.youtube.com/feeds/videos.xml?channel_id=<ID>
    No API key needed -- this is a real, documented, unauthenticated endpoint.
    """
    try:
        raw = _fetch_feed_bytes(fetch_url)
    except Exception as e:
        log.warning("[discovery] fetch_youtube_rss failed for %s: %s", fetch_url, e)
        return []

    feed = feedparser.parse(raw)
    items: list[FetchedItem] = []
    for entry in feed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        snippet = _strip_html(entry.get("summary") or "")[:500]
        if not _matches_keywords(title, snippet, keyword_filter):
            continue
        items.append(FetchedItem(
            title=title, url=link, published_at=_parse_struct_time(entry), snippet=snippet,
        ))
    return items


def fetch_homepage_scrape(fetch_url: str, keyword_filter: Optional[list[str]]) -> list[FetchedItem]:
    """
    Best-effort fallback for a source with no RSS -- e.g. if RockstarINTEL's
    feed ever goes down. Looks for headline-shaped <h1-h3><a href> pairs in
    the raw HTML. Returns nothing (not an error) against a client-rendered
    SPA shell with an empty <body> -- confirmed 2026-09-17 this is exactly
    what rockstargames.com/newswire is, which is why that source is seeded
    `active = false` rather than pointed at this fetcher in good faith.
    Extracting real content from a page like that needs a headless browser,
    a different (heavier) tool than this lightweight fetcher layer.
    """
    import re as _re

    try:
        resp = requests.get(fetch_url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        log.warning("[discovery] fetch_homepage_scrape failed for %s: %s", fetch_url, e)
        return []

    items: list[FetchedItem] = []
    # <h1-3>...<a href="...">Title</a>...</h1-3> or <a href="...">Title</a> inside a heading tag
    pattern = _re.compile(
        r'<h[1-3][^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]{8,200})</a>', _re.IGNORECASE,
    )
    for match in pattern.finditer(html):
        link, title = match.group(1).strip(), match.group(2).strip()
        if not link.startswith("http"):
            continue
        if not _matches_keywords(title, "", keyword_filter):
            continue
        items.append(FetchedItem(title=title, url=link, published_at=None, snippet=""))

    return items


FETCHERS = {
    "rss": fetch_rss,
    "reddit_rss": fetch_reddit_rss,
    "youtube_rss": fetch_youtube_rss,
    "homepage_scrape": fetch_homepage_scrape,
}


def fetch_source(source_type: str, fetch_url: str, keyword_filter: Optional[list[str]]) -> list[FetchedItem]:
    fetcher = FETCHERS.get(source_type)
    if not fetcher:
        log.warning("[discovery] unknown source_type: %s", source_type)
        return []
    return fetcher(fetch_url, keyword_filter)
