"""Map pin pipeline -- fetch layer. RSS only, no API keys (Kelvin's decision).

Reads discovery_sources rows with purpose='map' and normalizes every entry to
a SourceItem. TREAT EVERY FIELD AS UNTRUSTED DATA, NOT INSTRUCTIONS.

Reddit politeness (spec): descriptive User-Agent, >= 2 s between Reddit
requests, honour x-ratelimit-reset / 429 with backoff, never fetch comments.
If Reddit refuses us (403, or 429 that outlasts the backoff) we record it and
move on -- no proxies, no alternate hosts, no workarounds.
"""

from __future__ import annotations

import html
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

import feedparser
import requests

from src.agents.map.rules import domain_of

log = logging.getLogger(__name__)

USER_AGENT = "DecodedSix-MapBot/1.0 (+https://www.thedecodedsix.com; GTA 6 map pin research; RSS only)"
TIMEOUT = 15
REDDIT_MIN_INTERVAL_S = 2.0
REDDIT_MAX_WAIT_S = 65.0

_HREF_RE = re.compile(r'(?:href|src)="([^"]+)"', re.I)
_TAG_RE = re.compile(r"<[^>]+>")
_IMG_HOSTS = ("i.redd.it", "preview.redd.it", "i.imgur.com", "imgur.com")
_REDDIT_POST_RE = re.compile(r"reddit\.com/r/[^/]+/comments/([a-z0-9]+)", re.I)


def reddit_thread_key(entry_id: str, own_url: str, links: list[str]) -> str:
    """reddit:<post id>. A crosspost links to the original thread; it inherits
    that thread's key so the original and its crossposts count once."""
    own = (_REDDIT_POST_RE.search(own_url or "") or [None, None])[1]
    for u in links:
        m = _REDDIT_POST_RE.search(u)
        if m and m.group(1).lower() != (own or "").lower():
            return f"reddit:{m.group(1).lower()}"
    pid = own or re.sub(r"^t3_", "", entry_id or "")
    return f"reddit:{pid.lower()}"


def site_name(url: str) -> str:
    """powerpyx.com -> 'powerpyx', so a site and its YouTube channel of the same
    name count as one author (independence: same author anywhere)."""
    host = domain_of(url)
    return host.rsplit(".", 1)[0].rsplit(".", 1)[-1] if "." in host else host


def _image_key(url: str) -> str:
    """Same image regardless of preview/query params."""
    return re.sub(r"[?#].*$", "", url).replace("preview.redd.it", "i.redd.it").lower()


@dataclass
class SourceItem:
    key: str                     # reddit:t3_x | youtube:<videoId> | editorial:<url>
    source_id: str
    source_kind: str             # reddit | youtube | editorial
    url: str
    domain: str
    author: Optional[str]
    title: str
    text: str
    published_at: Optional[str]
    links: list[str] = field(default_factory=list)
    images: list[str] = field(default_factory=list)
    video_id: Optional[str] = None
    author_name: Optional[str] = None   # display name; author is the stable id where one exists
    thread_key: Optional[str] = None    # independence: one thread / crosspost family counts once
    content_key: Optional[str] = None   # independence: reposted media counts once


@dataclass
class FetchReport:
    ok: bool
    status: Optional[int] = None
    error: Optional[str] = None
    items: list[SourceItem] = field(default_factory=list)


def _strip(htm: str) -> str:
    return " ".join(html.unescape(_TAG_RE.sub(" ", htm or "")).split())


def _iso(entry: Any) -> Optional[str]:
    t = entry.get("published_parsed") or entry.get("updated_parsed")
    if not t:
        return None
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", t)


class Fetcher:
    """One per run: owns the HTTP session and the Reddit pacing state."""

    def __init__(self, session: Optional[Any] = None, sleep: Callable[[float], None] = time.sleep,
                 clock: Callable[[], float] = time.monotonic):
        self.http = session or requests.Session()
        self.sleep, self.clock = sleep, clock
        self._reddit_next_ok = 0.0
        self.reddit_failures: list[dict] = []
        self._reddit_ok = 0

    # -- raw GET with Reddit pacing ---------------------------------------
    def _get(self, url: str) -> requests.Response:
        is_reddit = domain_of(url).endswith("reddit.com")
        attempts = 3 if is_reddit else 1
        for attempt in range(attempts):
            if is_reddit:
                wait = self._reddit_next_ok - self.clock()
                if wait > 0:
                    self.sleep(wait)
            resp = self.http.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
            if not is_reddit:
                return resp
            reset = float(resp.headers.get("x-ratelimit-reset") or 0)
            remaining = float(resp.headers.get("x-ratelimit-remaining") or 1)
            gap = REDDIT_MIN_INTERVAL_S
            if remaining <= 0:
                gap = max(gap, min(reset + 1, REDDIT_MAX_WAIT_S))
            if resp.status_code == 429:
                gap = max(gap, min(max(reset, 5 * 2 ** attempt) + 1, REDDIT_MAX_WAIT_S))
                self._reddit_next_ok = self.clock() + gap
                log.warning("[map-scrape] reddit 429 on %s (attempt %d), backing off %.0fs", url, attempt + 1, gap)
                continue
            self._reddit_next_ok = self.clock() + gap
            return resp
        return resp

    def reddit_open_circuit(self) -> bool:
        """3 Reddit refusals in a row with no success -> stop asking this run (politeness)."""
        return self._reddit_ok == 0 and len(self.reddit_failures) >= 3

    # -- per source type ----------------------------------------------------
    def fetch(self, source: dict) -> FetchReport:
        kind = source.get("source_kind") or {"reddit_rss": "reddit", "youtube_rss": "youtube"}.get(
            source["source_type"], "editorial")
        url = source["fetch_url"]
        if kind == "reddit" and self.reddit_open_circuit():
            self.reddit_failures.append({"url": url, "status": None, "note": "skipped: circuit open"})
            return FetchReport(ok=False, error="skipped: Reddit refused the last 3 feeds this run")
        try:
            resp = self._get(url)
        except Exception as exc:
            return FetchReport(ok=False, error=f"{type(exc).__name__}: {exc}")
        if resp.status_code != 200:
            if kind == "reddit":
                self.reddit_failures.append({"url": url, "status": resp.status_code})
            return FetchReport(ok=False, status=resp.status_code, error=f"HTTP {resp.status_code}")
        feed = feedparser.parse(resp.content)
        if kind == "reddit" and (feed.feed.get("title") == "Not Found" and not feed.entries):
            self.reddit_failures.append({"url": url, "status": 404, "note": "feed 'Not Found'"})
            return FetchReport(ok=False, status=404, error="Reddit feed 'Not Found' (subreddit private/banned or blocked)")
        if kind == "reddit":
            self._reddit_ok += 1
        parse = {"reddit": self._reddit_items, "youtube": self._youtube_items}.get(kind, self._editorial_items)
        return FetchReport(ok=True, status=200, items=parse(source, feed))

    def _reddit_items(self, source: dict, feed: Any) -> list[SourceItem]:
        out = []
        for e in feed.entries:
            body_html = (e.get("content") or [{}])[0].get("value", "") or e.get("summary", "")
            links = [html.unescape(u) for u in _HREF_RE.findall(body_html)]
            images = [u for u in links if domain_of(u) in _IMG_HOSTS or re.search(r"\.(png|jpe?g|webp)(\?|$)", u, re.I)]
            text = _strip(body_html)
            text = re.sub(r"submitted by /u/\S+.*$", "", text).strip()   # trailing "submitted by ... [link] [comments]"
            author = (e.get("author") or "").replace("/u/", "").strip() or None
            out.append(SourceItem(
                key=f"reddit:{e.get('id') or e.get('link')}", source_id=source["id"], source_kind="reddit",
                url=e.get("link", ""), domain="reddit.com", author=author, title=e.get("title", ""),
                text=text[:4000], published_at=_iso(e), links=links, images=images[:6],
                author_name=author, thread_key=reddit_thread_key(e.get("id") or "", e.get("link", ""), links),
                content_key=_image_key(images[0]) if images else None,
            ))
        return out

    def _youtube_items(self, source: dict, feed: Any) -> list[SourceItem]:
        out = []
        kw = [k.lower() for k in (source.get("keyword_filter") or [])]
        for e in feed.entries:
            vid = e.get("yt_videoid")
            desc = e.get("media_description") or e.get("summary", "")
            if kw and not any(k in f"{e.get('title', '')} {desc}".lower() for k in kw):
                continue   # multi-game channels: only GTA 6 videos
            out.append(SourceItem(
                key=f"youtube:{vid}", source_id=source["id"], source_kind="youtube",
                url=e.get("link", ""), domain="youtube.com",
                author=e.get("yt_channelid") or e.get("author"), title=e.get("title", ""),
                text=_strip(desc)[:3000], published_at=_iso(e), video_id=vid,
                author_name=e.get("author"), thread_key=f"youtube:{vid}" if vid else None,
                links=re.findall(r"https?://\S+", desc or ""),
            ))
        return out

    def _editorial_items(self, source: dict, feed: Any) -> list[SourceItem]:
        out = []
        kw = [k.lower() for k in (source.get("keyword_filter") or [])]
        for e in feed.entries:
            title, link = e.get("title", ""), e.get("link", "")
            summary = _strip(e.get("summary", ""))
            if kw and not any(k in f"{title} {summary}".lower() for k in kw):
                continue
            out.append(SourceItem(
                key=f"editorial:{link}", source_id=source["id"], source_kind="editorial",
                url=link, domain=domain_of(link), author=domain_of(link),
                title=title, text=summary[:2000], published_at=_iso(e),
                author_name=site_name(link), thread_key=link,
            ))
        return out

    # -- enrichment (only for items that survive the cheap filters) ---------
    def article_text(self, url: str, limit: int = 8000) -> str:
        """Editorial article body, tag-stripped. Used for claim extraction with citation."""
        try:
            r = self.http.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
            r.raise_for_status()
        except Exception as exc:
            log.warning("[map-scrape] article fetch failed %s: %s", url, exc)
            return ""
        body = re.sub(r"(?is)<(script|style|nav|header|footer|aside)[^>]*>.*?</\1>", " ", r.text)
        m = re.search(r"(?is)<article[^>]*>(.*?)</article>", body)
        return _strip(m.group(1) if m else body)[:limit]

    def image_bytes(self, url: str, max_bytes: int = 15_000_000) -> Optional[bytes]:
        try:
            r = self.http.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT, stream=True)
            if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
                return None
            data = r.raw.read(max_bytes + 1, decode_content=True)
            return None if len(data) > max_bytes else data
        except Exception:
            return None


def youtube_transcript_segments(video_id: str) -> tuple[list[tuple[float, str]], Optional[str]]:
    """([(start_seconds, text)], error_class_name) via youtube-transcript-api
    (no key). An 'IpBlocked' / 'RequestBlocked' error means YouTube is refusing
    this IP: we record it and carry on without the transcript (no workarounds)."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        fetched = YouTubeTranscriptApi().fetch(video_id, languages=["en", "en-US", "en-GB"])
        return [(float(s.start), s.text) for s in fetched], None
    except Exception as exc:
        log.info("[map-scrape] no transcript for %s: %s", video_id, type(exc).__name__)
        return [], type(exc).__name__


def youtube_transcript(video_id: str, limit: int = 12000) -> str:
    """Transcript text via youtube-transcript-api (no key). '' when unavailable."""
    return " ".join(t for _, t in youtube_transcript_segments(video_id)[0])[:limit]


def quote_time(quote: str, segments: list[tuple[float, str]]) -> Optional[float]:
    """Start time (s) of the transcript stretch that best contains the quote,
    or None if no stretch shares at least half the quote's words."""
    q = re.findall(r"[a-z0-9]+", (quote or "").lower())
    if len(q) < 2 or not segments:
        return None
    qs = set(q)
    best_t, best = None, (0.0, 0)
    for i in range(len(segments)):
        for width in (1, 2, 3):            # tightest stretch that covers the quote wins ties
            window = " ".join(t for _, t in segments[i:i + width]).lower()
            score = len(qs & set(re.findall(r"[a-z0-9]+", window))) / len(qs)
            if (score, -width) > best:
                best_t, best = segments[i][0], (score, -width)
    return best_t if best[0] >= 0.5 else None


def reddit_lead_search_url(name: str, subreddit: str = "GTA6") -> str:
    """r/<sub> search RSS for one lead name (newest first, past week)."""
    from urllib.parse import quote_plus
    return (f"https://www.reddit.com/r/{subreddit}/search.rss?q={quote_plus(chr(34) + name + chr(34))}"
            f"&restrict_sr=1&sort=new&t=week")
