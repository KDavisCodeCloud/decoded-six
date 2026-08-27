"""
DSX-CA1 — DecodedSix Content Agent

Produces 3 articles/week on the existing n8n cadence: Tuesday=news,
Thursday=evergreen, Saturday=conversion. As of 2026-08-27, run_content_agent
also accepts 'feature', 'breaking_news', 'exclusive', and 'deep_dive' as
article_type -- these aren't part of that fixed weekly cadence yet (that's a
separate change, in whatever caller decides which type to request on a given
day); 'exclusive'/'deep_dive' specifically are always manually triggered
(topic_seed supplied directly), same pattern as the TGG exclusive published
2026-08-27. Triggered by n8n via POST /agents/decodedsix/content.

Node pipeline (mirrors LangGraph pattern, no external graph dependency):
  topic_picker → [news_scraper] → writer → faq_generator → schema_generator
  → internal_link_injector → [affiliate_link_injector] → validator
  → output_formatter → humanizer → detect → seo_aeo_audit
  (humanizer/detect: Terminal 2; seo_aeo_audit: Session 13)

DataSanitizationShield applied before any user-supplied data reaches the LLM.
Every run writes to audit_log. Status lands on 'pending_review' by default,
downgraded to 'needs_revision' by seo_aeo_audit if either score is below
threshold — never skips HITL either way.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional

from slugify import slugify

from src.agents.content.ds_humanizer import HumanizeError, humanize_article

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
VOICE_CONTEXT_PATH = REPO_ROOT / ".claude" / "product-marketing-context.md"
KEYWORD_LIST_PATH = REPO_ROOT / "docs" / "evergreen_keywords.txt"
AFFILIATE_LIST_PATH = REPO_ROOT / "docs" / "affiliate_products.json"

MODEL = "claude-sonnet-4-6"
AGENT_ID = "dsx-ca1"

SITE_URL = os.getenv("NEXT_PUBLIC_SITE_URL", "https://www.thedecodedsix.com")

# Word-count floors are MINIMUMS the writer prompt is told to reach, and the
# actual enforcement point (_node_validator checks these, not just the
# prompt). Added 2026-08-27 -- the old validator hardcoded a flat <1000
# check regardless of type, which didn't match its own docstring (said
# 1200) and had no concept of a short breaking-news piece or a genuine
# long-form exclusive.
WORD_COUNT_FLOORS = {
    "news": 800,
    "feature": 1200,
    "evergreen": 1500,
    "conversion": 1200,
    "exclusive": 2000,
    "deep_dive": 2000,
    "breaking_news": 400,
}

# Confirmed-systems knowledge base, sourced from TGG's July 13, 2026 visit to
# Rockstar North (2.5 hours of gameplay watched with Rob Nelson, co-head of
# GTA 6 development). Real, attributed, on-record source -- same tier as the
# Dazed exclusive, not raw leak/speculation. Injected into the writer's
# system prompt for 'feature' articles and any article whose topic matches
# one of these systems, so the agent cites real specifics instead of
# generating another generic piece with no real facts behind it. Every claim
# from this block must be attributed to TGG/Rob Nelson in the article body --
# never presented as Rockstar's own official statement.
CONFIRMED_SYSTEMS_KB = """
CRIMINAL PROFILE SYSTEM (not "honor system"):
- No visible bar -- tracked in a Jason/Lucia menu tab
- High profile = being a good criminal (clean jobs, no unnecessary kills)
- Low profile = chaotic/excessive violence
- Point of no return: logo cracks/shatters, cannot recover for that playthrough
- Rob Nelson: "You have to make a lot more decisions. Yes, all the time."

RELATIONSHIP SYSTEM:
- Jason/Lucia relationship status, same menu tab as Criminal Profile, no visible bar
- Built through texting, dates, gym visits together, holding hands while walking

MAP SIZE (Rob Nelson confirmed figures):
- Full map: 2x GTA 5, 3x Red Dead Redemption 2
- Vice City alone: 2x the size of Los Santos
- Vice City and surrounds: 11x Los Santos and surrounds

HUD:
- Top left: Health, Stamina, Focus bars (permanently + temporarily upgradeable)
- Top right: Bank (purple icon), Cash, Duffel bag -- three separate money states
- Focus = slow time + see weak points on NPCs/vehicles (not Dead Eye)

MONEY / ECONOMY:
- Bank deposits require a physical ATM visit -- no phone deposits
- Cash lost on death; duffel bag loot needs a fence before it's usable
- Fence system is relationship-based, unlocks capabilities over time (e.g. tracker removal)

POLICE SYSTEM:
- Police NOT on minimap
- 1-5 stars: inner dark search circle + larger outer search area -- escape both to lose cops
- 6 stars: map-wide search, hard to reach
- Cars have GPS trackers (all cop cars, many civilian cars)
- Cops recognize car driven, outfit, weapon held, whether Jason+Lucia were together
- Tires matter -- blown tires make driving dramatically harder
- Pay and sprays return but unlock progressively

FUEL SYSTEM: Confirmed, exists, EV charging exists, designed not to be a major inconvenience.

GYM SYSTEM:
- Buy membership at front desk, vending machines sell temporary-boost consumables
- 3 exercises of the same type = full workout ring = timed stat boost
- Fully optional, never required for story completion

PHONE APPS: Buckme (banking), Ride Me (Uber equivalent), Scooter Bros (call your
personal vehicle -- new for single player), What Up (texting), Fitness app.
In-game social media: NPCs post geotagged content; you can go watch it unfold.

GUNPLAY: No auto-aim, aim assist only. Kill cams (RDR2/Max Payne style).

DRIVING: Heavier/weightier than GTA 5, higher top speeds. Rear-wheel-drive cars
spin out under hard acceleration -- physics matter. Rob Nelson: "a mix between
GTA 4 and GTA 5 but even better."

Source for all of the above: TGG (YouTube), July 13, 2026 visit to Rockstar
North with Rob Nelson, published August 27, 2026.
"""

_CONFIRMED_SYSTEM_KEYWORDS = (
    "criminal profile", "relationship system", "map size", "hud",
    "money and economy", "police system", "fuel", "gym system",
    "phone apps", "gunplay", "driving physics",
)

# One 'feature' deep-dive per system -- rotated the same way evergreen
# keywords rotate, but sourced from CONFIRMED_SYSTEMS_KB instead of a
# generic keyword list, so 'feature' articles go deep on something Pulse
# actually has real sourced facts for, not another generic guide.
CONFIRMED_SYSTEM_TOPICS = [
    "GTA 6 Criminal Profile system explained",
    "GTA 6 relationship system between Jason and Lucia",
    "GTA 6 map size compared to GTA 5 and Red Dead Redemption 2",
    "GTA 6 HUD explained: health, stamina, focus, and the three money states",
    "GTA 6 money and economy: bank, cash, duffel bag, and the fence system",
    "GTA 6 police system: search circles, trackers, and losing a wanted level",
    "GTA 6 fuel and electric vehicle charging",
    "GTA 6 gym system: memberships, workouts, and stat boosts",
    "GTA 6 phone apps: Buckme, Ride Me, Scooter Bros, and in-game social media",
    "GTA 6 gunplay: aim assist and kill cams explained",
    "GTA 6 driving physics: weight, top speed, and rear-wheel-drive handling",
]


class ContentAgentError(RuntimeError):
    """Raised when any node fails. Includes node name and article_id if available."""

    def __init__(self, node: str, article_id: Optional[str], original: Exception):
        self.node = node
        self.article_id = article_id
        self.original = original
        super().__init__(f"DSX-CA1 failed at node '{node}' (article_id={article_id}): {original}")


class DataSanitizationShield:
    _EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
    _PHONE = re.compile(r"(?<!\d)(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)")
    _SSN = re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")

    def sanitize(self, text: str) -> str:
        text = self._EMAIL.sub("[REDACTED_EMAIL]", text)
        text = self._PHONE.sub("[REDACTED_PHONE]", text)
        text = self._SSN.sub("[REDACTED_SSN]", text)
        return text


shield = DataSanitizationShield()


# ── Clients ──────────────────────────────────────────────────────────────────

def _supabase() -> Any:
    from supabase import create_client
    return create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _anthropic() -> Any:
    from anthropic import Anthropic
    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def _voice_context() -> str:
    if not VOICE_CONTEXT_PATH.exists():
        raise ContentAgentError("topic_picker", None,
            FileNotFoundError(f"Voice file missing: {VOICE_CONTEXT_PATH}"))
    return VOICE_CONTEXT_PATH.read_text()


# ── Audit log ────────────────────────────────────────────────────────────────

def _audit(sb: Any, article_id: Optional[str], action: str, result: str, error: Optional[str] = None) -> None:
    try:
        sb.table("audit_log").insert({
            "agent_id": AGENT_ID,
            "action": action,
            "article_id": article_id,
            "result": result,
            "error": error,
        }).execute()
    except Exception as e:
        log.error("[%s] audit_log write failed: %s", AGENT_ID, e)


# ── Node 1: topic_picker ─────────────────────────────────────────────────────

def _node_topic_picker(state: dict, sb: Any) -> dict:
    """
    Selects or validates the topic seed for the article type.
    For news/breaking_news: topic_seed comes from caller (n8n passes RSS headline).
    For exclusive/deep_dive: always caller-supplied (manually triggered --
      see module docstring); this function only passes it through.
    For feature: rotates through CONFIRMED_SYSTEM_TOPICS (real sourced
      systems, not a generic keyword list).
    For evergreen: picks from docs/evergreen_keywords.txt if no seed given.
    For conversion: picks from docs/affiliate_products.json if no seed given.

    Two things added 2026-08-27 to fix the confirmed root cause of near-
    duplicate rejected articles (the old version had zero awareness of what
    was already published/archived, so the same keyword phrase could get
    picked twice -- e.g. gta-6-online-multiplayer-features and its "-guide"
    twin, both later rejected):

    1. Thin-article expansion check (feature/news, no seed only): looks for
       an existing published article under its type's word-count floor
       before generating anything new. Priority #3 from the 2026-08-27 spec.
    2. Duplicate-topic check (feature/evergreen auto-picks only -- never
       overrides a caller-supplied seed): skips a candidate topic if its
       title-word overlap with any existing article title exceeds 50%.
    """
    article_type = state["article_type"]
    topic_seed = shield.sanitize(state.get("topic_seed", "").strip())

    if topic_seed:
        state["topic"] = topic_seed
        return state

    if article_type in ("news", "feature"):
        floor = WORD_COUNT_FLOORS.get(article_type, 800)
        try:
            thin = (
                sb.table("articles")
                .select("id, title, slug, content, word_count")
                .eq("product_id", "gta-hub")
                .eq("status", "published")
                .lt("word_count", floor)
                .not_.is_("word_count", "null")
                .order("word_count")
                .limit(1)
                .execute()
            )
            if thin.data:
                target = thin.data[0]
                state["topic"] = f"Expand existing article: {target['title']}"
                state["expand_article_id"] = target["id"]
                state["expand_existing_content"] = target["content"]
                return state
        except Exception as e:
            log.warning("[%s] thin-article lookup failed (non-blocking): %s", AGENT_ID, e)

    def _topic_already_covered(candidate: str) -> bool:
        try:
            existing = (
                sb.table("articles")
                .select("title")
                .eq("product_id", "gta-hub")
                .in_("status", ["published", "archived", "pending_review"])
                .execute()
            )
        except Exception as e:
            log.warning("[%s] duplicate-topic lookup failed (non-blocking): %s", AGENT_ID, e)
            return False
        candidate_words = set(candidate.lower().split())
        for row in existing.data or []:
            title_words = set((row.get("title") or "").lower().split())
            if not candidate_words or not title_words:
                continue
            overlap = len(candidate_words & title_words) / len(candidate_words | title_words)
            if overlap > 0.5:
                return True
        return False

    if article_type == "feature":
        lines = CONFIRMED_SYSTEM_TOPICS
        idx = state.get("article_count", 0) % len(lines)
        for offset in range(len(lines)):
            candidate = lines[(idx + offset) % len(lines)]
            if not _topic_already_covered(candidate):
                state["topic"] = candidate
                return state
        state["topic"] = lines[idx]  # every system already covered -- fall through, still caught downstream

    elif article_type == "evergreen":
        if KEYWORD_LIST_PATH.exists():
            lines = [l.strip() for l in KEYWORD_LIST_PATH.read_text().splitlines() if l.strip()]
            idx = state.get("article_count", 0) % len(lines) if lines else 0
            if lines:
                for offset in range(len(lines)):
                    candidate = lines[(idx + offset) % len(lines)]
                    if not _topic_already_covered(candidate):
                        state["topic"] = candidate
                        return state
                state["topic"] = lines[idx]
            else:
                state["topic"] = "GTA 6 guide"
        else:
            state["topic"] = "GTA 6 complete beginner guide"

    elif article_type == "conversion":
        if AFFILIATE_LIST_PATH.exists():
            products = json.loads(AFFILIATE_LIST_PATH.read_text())
            idx = state.get("article_count", 0) % len(products) if products else 0
            product = products[idx] if products else {"name": "Best PS5 gaming headset", "category": "headset"}
            state["topic"] = product.get("name", "Best gaming gear for GTA 6")
            state["affiliate_products"] = products
        else:
            state["topic"] = "Best gaming setup for GTA 6"
            state["affiliate_products"] = []

    else:  # news / breaking_news / exclusive / deep_dive — n8n or caller should always supply a seed
        state["topic"] = "GTA 6 latest news"

    return state


# ── Node 2: news_scraper (news type only) ─────────────────────────────────────

def _node_news_scraper(state: dict) -> dict:
    """
    For news articles: fetches context from r/GTA6 RSS and Rockstar Newswire RSS.
    Appends scraped context to state so writer_node can use real details.
    Skipped for evergreen/conversion.
    """
    if state["article_type"] != "news":
        state["scraped_context"] = ""
        return state

    context_lines: list[str] = []

    feeds = [
        "https://www.reddit.com/r/GTA6/.rss?limit=5",
        "https://www.gamesradar.com/rss/gta-6/",
    ]

    try:
        import feedparser
        for url in feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:3]:
                    title = entry.get("title", "")
                    summary = entry.get("summary", "")[:300]
                    context_lines.append(f"- {title}: {summary}")
            except Exception as e:
                log.warning("[%s] RSS feed %s failed: %s", AGENT_ID, url, e)
    except ImportError:
        log.warning("[%s] feedparser not installed — skipping news scrape", AGENT_ID)

    state["scraped_context"] = "\n".join(context_lines[:9])
    return state


# ── Markdown → HTML safety converter ─────────────────────────────────────────

def _md_inline(text: str) -> str:
    text = re.sub(r'\*\*([^*\n]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'__([^_\n]+)__', r'<strong>\1</strong>', text)
    text = re.sub(r'\*([^*\n]+)\*', r'<em>\1</em>', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r"<a href='\2'>\1</a>", text)
    return text


def _md_to_html(text: str) -> str:
    """Convert markdown → HTML. Runs after writer and after humanizer as a safety net."""
    if re.search(r'<(h[23]|ul|ol|section|figure)\b', text, re.IGNORECASE):
        # Already has structural HTML — only fix stray inline markdown in text nodes
        return re.sub(r'(?<=>)[^<]+(?=<)', lambda m: _md_inline(m.group(0)), text)

    lines = text.split('\n')
    output: list[str] = []
    in_ul = in_ol = False
    para: list[str] = []

    def flush() -> None:
        if para:
            output.append(f'<p>{_md_inline(" ".join(para))}</p>')
            para.clear()

    for line in lines:
        s = line.strip()
        if s.startswith('### '):
            flush()
            if in_ul: output.append('</ul>'); in_ul = False
            if in_ol: output.append('</ol>'); in_ol = False
            output.append(f'<h3>{_md_inline(s[4:])}</h3>')
        elif s.startswith('## ') or s.startswith('# '):
            flush()
            if in_ul: output.append('</ul>'); in_ul = False
            if in_ol: output.append('</ol>'); in_ol = False
            txt = s[3:] if s.startswith('## ') else s[2:]
            output.append(f'<h2>{_md_inline(txt)}</h2>')
        elif s.startswith('- ') or s.startswith('* '):
            flush()
            if in_ol: output.append('</ol>'); in_ol = False
            if not in_ul: output.append('<ul>'); in_ul = True
            output.append(f'<li>{_md_inline(s[2:])}</li>')
        elif re.match(r'^\d+\. ', s):
            flush()
            if in_ul: output.append('</ul>'); in_ul = False
            if not in_ol: output.append('<ol>'); in_ol = True
            list_item_text = re.sub(r'^\d+\. ', '', s)
            output.append(f'<li>{_md_inline(list_item_text)}</li>')
        elif s == '':
            flush()
            if in_ul: output.append('</ul>'); in_ul = False
            if in_ol: output.append('</ol>'); in_ol = False
        else:
            if in_ul: output.append('</ul>'); in_ul = False
            if in_ol: output.append('</ol>'); in_ol = False
            para.append(s)

    flush()
    if in_ul: output.append('</ul>')
    if in_ol: output.append('</ol>')
    return '\n'.join(output)


# ── Node 2b: image_fetcher ────────────────────────────────────────────────────

def _node_image_fetcher(state: dict) -> dict:
    """
    Fetches the og:image (and twitter:image fallback) from the article's source URL.
    Runs BEFORE the writer so the URL can be passed into the writer prompt.
    Skips gracefully if unreachable or no image found.
    """
    # For news, topic_seed is the source URL passed from n8n; use it before
    # external_citation exists (which only gets set after the writer runs).
    url = state.get("topic_seed", "") or state.get("external_citation", "")

    if not url or not url.startswith("http"):
        state["hero_image_url"] = None
        return state

    try:
        import httpx
        response = httpx.get(
            url, timeout=8, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; DecodedSixBot/1.0)"},
        )
        html = response.text

        patterns = [
            r'<meta[^>]+property=["\']og:image["\'][^>]+content="([^"]+)"',
            r'<meta[^>]+content="([^"]+)"[^>]+property=["\']og:image["\']',
            r"<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']",
            r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:image[\"']",
            r'<meta[^>]+name=["\']twitter:image["\'][^>]+content="([^"]+)"',
        ]
        image_url = None
        for pattern in patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip()
                if candidate.startswith('/'):
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    candidate = f"{parsed.scheme}://{parsed.netloc}{candidate}"
                image_url = candidate
                break

        state["hero_image_url"] = image_url
        log.info("[%s] image_fetcher: %s", AGENT_ID, image_url or "none found")

    except Exception as exc:
        log.warning("[%s] image_fetcher failed (non-blocking): %s", AGENT_ID, exc)
        state["hero_image_url"] = None

    return state


# ── Node 3: writer ────────────────────────────────────────────────────────────

def _node_writer(state: dict, anthropic_client: Any) -> dict:
    """
    Drafts the full article body using claude-sonnet-4-6.
    Outputs clean markdown so react-markdown can render it properly.
    Embeds 2-4 official Rockstar press images at natural section breaks.
    """
    from src.agents.content.rockstar_images import (
        extract_article_keywords,
        get_images_by_tags,
    )

    voice = _voice_context()
    article_type = state["article_type"]
    topic = state["topic"]
    scraped = state.get("scraped_context", "")
    affiliate_products = state.get("affiliate_products", [])

    type_instructions = {
        "news": (
            f"Write a GTA 6 news article. Minimum {WORD_COUNT_FLOORS['news']} words -- "
            "reach that floor, don't treat it as a ceiling. "
            "Category: 'news'. Lead with the most newsworthy fact. "
            "Cite at least one official source (Rockstar Newswire, Take-Two, or major outlet)."
        ),
        "breaking_news": (
            f"Write a GTA 6 breaking-news article. Minimum {WORD_COUNT_FLOORS['breaking_news']} "
            "words. Only for a SAME-DAY confirmed announcement -- if the news isn't from "
            "today, this is the wrong type, use 'news' instead. Category: 'news'. Must "
            "include a '## What This Means' section, even if brief. Lead with the confirmed "
            "fact itself as the first sentence, no preamble."
        ),
        "feature": (
            f"Write a GTA 6 feature breakdown: one confirmed gameplay system, mechanic, or "
            f"character, covered in depth. Minimum {WORD_COUNT_FLOORS['feature']} words -- "
            "reach that floor, don't treat it as a ceiling. Category: 'news' or 'guide' "
            "(pick whichever fits -- a mechanic breakdown tied to today's news is 'news', a "
            "durable reference piece is 'guide'). Go deep on ONE system -- do not spread "
            "thin across several unrelated systems in one article."
        ),
        "evergreen": (
            f"Write a GTA 6 evergreen reference article ({WORD_COUNT_FLOORS['evergreen']}–2,500 words). "
            "Category: 'guide'. Cover the topic comprehensively. "
            "Use ## and ### headings throughout. Include a comparison table if relevant."
        ),
        "conversion": (
            f"Write a GTA 6 conversion article ({WORD_COUNT_FLOORS['conversion']}–2,000 words) "
            "recommending products. "
            "Category: 'guide'. Include a 'Quick Picks' affiliate section in the first 300 words. "
            "Repeat the primary affiliate recommendation in the conclusion. "
            f"Available products to recommend: {json.dumps(affiliate_products[:5])}. "
            "Make product recommendations natural and specific to GTA 6 gaming use cases. "
            "Only write conversion content tied to a confirmed GTA 6 feature -- not generic "
            "gaming gear with no GTA 6 connection."
        ),
        "exclusive": (
            f"Write a GTA 6 exclusive deep-dive. Minimum {WORD_COUNT_FLOORS['exclusive']} words "
            "-- reach that floor, don't treat it as a ceiling. Category: 'news'. Required "
            "structure, in order: intro, 4+ '##' sections, a "
            "'## Frequently Asked Questions' section (minimum 3 Q&A pairs), a "
            "'## What's Still Unknown' section, and a closing '## What This Means for "
            "Launch' section. Cross-link to at least 3 existing DecodedSix articles using "
            "[INTERNAL_LINK:slug] placeholders."
        ),
        "deep_dive": (
            f"Write a GTA 6 deep-dive. Minimum {WORD_COUNT_FLOORS['deep_dive']} words -- reach "
            "that floor, don't treat it as a ceiling. Category: 'guide' or 'news' (pick "
            "whichever fits the topic). Required structure, in order: intro, 4+ '##' "
            "sections, a '## Frequently Asked Questions' section (minimum 3 Q&A pairs), a "
            "'## What's Still Unknown' section, and a closing '## What This Means for "
            "Launch' section. Cross-link to at least 3 existing DecodedSix articles using "
            "[INTERNAL_LINK:slug] placeholders."
        ),
    }

    # Real sourced material for the 11 confirmed systems (TGG / Rob Nelson,
    # Rockstar North, 2026-07-13) -- given to the writer whenever the topic
    # is actually one of these systems, so it writes from real facts instead
    # of generating another generic piece with nothing behind it. Must be
    # attributed to TGG/Rob Nelson in the article body, never presented as
    # Rockstar's own official statement (enforced by instruction here, same
    # as every other confirmed-vs-speculation rule -- there's no code-level
    # check that an attribution phrase is present).
    knowledge_block = ""
    if article_type == "feature" or any(kw in topic.lower() for kw in _CONFIRMED_SYSTEM_KEYWORDS):
        knowledge_block = (
            "\n\nCONFIRMED SOURCE MATERIAL -- TGG (YouTube), July 13, 2026 visit to "
            "Rockstar North with Rob Nelson (co-head of GTA 6 development). Use this as "
            "real fact for this article. Attribute every claim from it to TGG and/or Rob "
            "Nelson explicitly (e.g. 'Rob Nelson confirmed to TGG that...') -- never "
            "present it as Rockstar's own official statement, since it wasn't published "
            "through Rockstar's own channels:\n" + CONFIRMED_SYSTEMS_KB
        )

    # Select contextually relevant images from the official Rockstar press kit.
    # No fixed cap (raised from the old limit=4) -- Kelvin's standing rule as of
    # 2026-07-25: every named person/place/thing that is the main subject of a
    # paragraph gets its matching image if one exists in the registry, however
    # many that ends up being for a given article. limit=12 here just bounds
    # how many candidates get listed in the prompt, not how many the article
    # can actually use.
    keywords = extract_article_keywords(topic, article_type, scraped)
    press_images = get_images_by_tags(keywords, limit=12)

    img_list_lines = "\n".join(
        f"  - Caption: \"{img['caption']}\"  →  {img['url']}"
        for img in press_images
    )
    image_instruction = (
        "\n\nIMAGE EMBEDDING RULES — no fixed image count for this article. "
        "Embed an image every time a named person, place, or thing from the list below "
        "is the main subject of a paragraph or section -- not just once per article. "
        "If a character, location, vehicle, or item gets its own paragraph or heading "
        "and a matching image exists below, that image belongs right after that paragraph. "
        "An article covering 8 characters with images for all 8 available should use all 8.\n\n"
        "Use this exact markdown syntax for each image (two lines, no blank line between them):\n\n"
        "![Caption text here](image_url)\n"
        "*Image credit: Rockstar Games*\n\n"
        "Placement rules:\n"
        "- Place an image after the intro paragraph (before the first ## section heading) if one fits the overall topic.\n"
        "- Place every other image immediately after the paragraph introducing the specific "
        "character, location, vehicle, or item it depicts — never batch multiple images "
        "back-to-back with no text between them.\n"
        "- Only use an image for a subject it actually depicts. Do not attach an image to a "
        "paragraph about something else just to hit a quota — there is no quota.\n\n"
        "Available official Rockstar press images for this article:\n"
        + img_list_lines
        + "\n\nUse these exact URLs. Do not invent or modify image URLs."
    )

    context_block = f"\n\nRecent related content for context:\n{scraped}" if scraped else ""

    content_standard = (
        "CONTENT STANDARD (applies to every article regardless of type):\n"
        "- Confirmed facts: label as confirmed and name the source (Rockstar Newswire, "
        "Take-Two, or the specific outlet/person who confirmed it -- e.g. 'Rob Nelson "
        "confirmed to TGG'). Do not present a third-party outlet's report as if it came "
        "from Rockstar directly.\n"
        "- Speculation: label it as speculation explicitly ('reportedly', 'according to "
        "leakers', 'unconfirmed'). Never present speculation as confirmed fact.\n"
        "- Every article must answer, somewhere in the body: what is this, how does it "
        "work, what does it mean for the player, and what's still unknown. Don't skip "
        "the last one just because it's less exciting to write.\n"
        "- Do not write a generic 'everything we know' article unless it is genuinely "
        "comprehensive -- 1,500+ words across multiple distinct subsections. A short "
        "'everything we know' piece is exactly the thin, generic content this standard "
        "exists to prevent.\n\n"
    )

    system = (
        f"{voice}\n\n"
        "You are DSX-CA1, the DecodedSix content agent. "
        f"{type_instructions[article_type]}\n\n"
        + content_standard
        + knowledge_block
        + "\n\n"
        "CONTENT QUALITY RULES (enforce all 9):\n"
        "1. First paragraph answers search intent immediately — no preamble.\n"
        "2. Never write 'In this article we will explore' or similar meta-commentary.\n"
        "3. Conversion articles: affiliate links in first 300 words AND conclusion.\n"
        "4. Link to at least 3 other DecodedSix articles by slug (use [INTERNAL_LINK:slug] placeholder).\n"
        "5. Cite at least 1 official source by URL.\n"
        "6. End with a '## Frequently Asked Questions' section with minimum 3 Q&A pairs.\n"
        "7. Excerpt (meta description): 150–160 characters, includes primary keyword.\n"
        "8. Slug: lowercase, hyphenated, includes primary keyword, max 60 characters.\n"
        f"9. Word count floor for this article_type ({article_type}): "
        f"{WORD_COUNT_FLOORS.get(article_type, 800)} words minimum -- this is enforced by "
        "the validator, not just requested here. Reach it.\n\n"
        "MARKDOWN FORMAT RULES (non-negotiable):\n"
        "- content MUST be clean markdown — use ## for major sections, ### for sub-sections.\n"
        "- Put a blank line between every paragraph. NEVER write multiple paragraphs as one block.\n"
        "- Use - for bullet lists, **text** for bold, *text* for italic.\n"
        "- Do NOT use HTML tags inside content. Pure markdown only.\n"
        + image_instruction
        + "\n\n"
        "Return ONLY valid JSON with exactly these keys: "
        '"title", "slug", "excerpt", "content", "external_citation". '
        "content is the full article body in markdown. "
        "No markdown fences around the JSON. No commentary outside the JSON object."
        + context_block
    )

    user = f"Article type: {article_type}\nTopic: {topic}\n\nWrite the article now."

    raw = ""
    parsed = None
    for attempt in range(2):
        if attempt == 0:
            messages = [{"role": "user", "content": user}]
            temp = 0.7
        else:
            messages = [
                {"role": "user", "content": user},
                {"role": "assistant", "content": raw},
                {"role": "user", "content": (
                    "The JSON you returned has a syntax error. "
                    "Fix ONLY the JSON syntax without changing any content. "
                    "Make sure newlines inside the content string are escaped as \\n. "
                    "Return the corrected JSON only, no commentary."
                )},
            ]
            temp = 0.0

        response = anthropic_client.messages.create(
            model=MODEL,
            max_tokens=4096,
            temperature=temp,
            system=system,
            messages=messages,
        )
        raw = "".join(b.text for b in response.content if b.type == "text")
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.MULTILINE).strip()

        try:
            parsed = json.loads(cleaned)
            if attempt > 0:
                log.info("[%s] writer JSON fixed on retry %d", AGENT_ID, attempt)
            break
        except json.JSONDecodeError as e:
            if attempt == 1:
                raise ContentAgentError("writer", None, ValueError(f"LLM returned invalid JSON after 2 attempts: {e}"))

    for field in ("title", "slug", "excerpt", "content"):
        if field not in parsed:
            raise ContentAgentError("writer", None, ValueError(f"LLM output missing field '{field}'"))

    slug = slugify(parsed["slug"])[:60]
    content = parsed["content"]
    word_count = len(content.split())

    state["title"] = parsed["title"]
    state["slug"] = slug
    state["excerpt"] = parsed["excerpt"][:160]
    state["external_citation"] = parsed.get("external_citation", "")
    state["word_count"] = word_count
    state["content"] = content
    # featured_image_url was never actually written by this pipeline despite
    # docs/VISUAL_STRATEGY.md mandating it -- confirmed 2026-07-26, the column
    # was always null, so every article rendered its list-card thumbnail via
    # the tag-guessed fallback at request time instead, and unrelated articles
    # with overlapping keywords kept colliding on the same guessed image.
    # Reusing the writer's own best-scoring press image closes that gap at
    # the source for every future article.
    if press_images:
        state["featured_image_url"] = press_images[0]["url"]
    return state


# ── Node 4: faq_generator ─────────────────────────────────────────────────────

def _node_faq_generator(state: dict, anthropic_client: Any) -> dict:
    """
    Extracts FAQ pairs from the drafted content.
    Returns list of {question, answer} dicts (minimum 3).
    """
    content = state["content"]

    system = (
        "Extract the FAQ section from this article (markdown format). "
        "Return ONLY valid JSON: a list of objects with keys 'question' and 'answer'. "
        "Minimum 3 items. Questions must be written as real search queries. "
        "Each answer must be 2–4 sentences and answer the question directly in sentence one. "
        "No markdown fences."
    )
    response = anthropic_client.messages.create(
        model=MODEL,
        max_tokens=1024,
        temperature=0.1,
        system=system,
        messages=[{"role": "user", "content": content[:6000]}],
    )
    raw = "".join(b.text for b in response.content if b.type == "text").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()

    try:
        pairs = json.loads(raw)
        if not isinstance(pairs, list) or len(pairs) < 3:
            raise ValueError(f"Expected list of ≥3 FAQ pairs, got: {raw[:200]}")
    except (json.JSONDecodeError, ValueError) as e:
        log.warning("[%s] faq_generator parse error: %s — using empty list", AGENT_ID, e)
        pairs = []

    state["faq_pairs"] = pairs
    return state


# ── Node 5: schema_generator ──────────────────────────────────────────────────

def _node_schema_generator(state: dict) -> dict:
    """
    Builds Article, FAQPage, and BreadcrumbList JSON-LD schemas from article data.
    """
    from datetime import datetime, timezone

    title = state["title"]
    excerpt = state["excerpt"]
    slug = state["slug"]
    faq_pairs = state.get("faq_pairs", [])
    # `state.get("publish_date", default)` only uses `default` when the KEY
    # is missing -- if an earlier node explicitly sets state["publish_date"]
    # = None (true here: publish_date isn't known until HITL approval, well
    # after this node runs), .get() returns that None, not the fallback.
    # Confirmed live 2026-07-25: a real published article's stored
    # schema_article had datePublished/dateModified baked in as literal
    # null. `or` catches both "key missing" and "key present but falsy".
    publish_date = state.get("publish_date") or datetime.now(timezone.utc).isoformat()
    article_url = f"{SITE_URL}/news/{slug}"

    # No image field here: no image URL exists in state at this point in the
    # pipeline (assigned later, outside this agent) and this stored schema
    # is no longer what actually renders anyway -- src/app/news/[slug]/
    # page.tsx computes articleJsonLd fresh at render time using the real
    # image/published_at once they're known, rather than trusting whatever
    # was baked in here at draft time.
    schema_article = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": title,
        "description": excerpt,
        "datePublished": publish_date,
        "dateModified": publish_date,
        "author": {"@type": "Organization", "name": "DecodedSix Editorial Team"},
        "publisher": {"@type": "Organization", "name": "Decoded Six", "url": SITE_URL},
        "url": article_url,
        "mainEntityOfPage": {"@type": "WebPage", "@id": article_url},
    }

    schema_faq = None
    if faq_pairs:
        schema_faq = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": pair["question"],
                    "acceptedAnswer": {"@type": "Answer", "text": pair["answer"]},
                }
                for pair in faq_pairs
            ],
        }

    schema_breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL},
            {"@type": "ListItem", "position": 2, "name": "News", "item": f"{SITE_URL}/news"},
            {"@type": "ListItem", "position": 3, "name": title, "item": article_url},
        ],
    }

    state["schema_article"] = schema_article
    state["schema_faq"] = schema_faq
    state["schema_breadcrumb"] = schema_breadcrumb
    return state


# ── Node 6: internal_link_injector ───────────────────────────────────────────

def _node_internal_link_injector(state: dict, sb: Any) -> dict:
    """
    Replaces [INTERNAL_LINK:slug] placeholders in content_html with real <a> tags.
    Also queries the articles table for up to 10 published slugs for the LLM to pick from.
    """
    content = state["content"]

    # Find all requested slugs from writer output
    requested = re.findall(r'\[INTERNAL_LINK:([^\]]+)\]', content)
    used_slugs: list[str] = []

    if requested:
        # Fetch real slugs from DB to validate
        try:
            result = sb.table("articles") \
                .select("slug, title") \
                .eq("status", "published") \
                .in_("slug", requested) \
                .execute()
            slug_map = {row["slug"]: row["title"] for row in (result.data or [])}
        except Exception as e:
            log.warning("[%s] internal_link fetch failed: %s", AGENT_ID, e)
            slug_map = {}

        def replace_link(m: re.Match) -> str:
            slug = m.group(1)
            title = slug_map.get(slug, slug.replace("-", " ").title())
            used_slugs.append(slug)
            return f'[{title}](/news/{slug})'

        content = re.sub(r'\[INTERNAL_LINK:([^\]]+)\]', replace_link, content)

    state["content"] = content
    state["internal_links_used"] = used_slugs
    return state


AMAZON_AFFILIATE_TAG = "decodedsix-20"

# Matches a markdown link whose URL is an amazon.com/.co.uk/etc host --
# broad domain match (not just /dp/ or /s?k=) since a future draft could
# link an Amazon page shape this doesn't anticipate yet, and the whole
# point of this check is to not depend on anticipating every shape.
_AMAZON_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://(?:www\.)?amazon\.[a-z.]+[^\)]*)\)")


def _ensure_amazon_affiliate_tags(content: str) -> tuple[str, list[str]]:
    """
    Real bug found 2026-07-22: a currently-published article had 5 Amazon
    links with zero affiliate tag, because the tag only ever existed if
    the source docs/affiliate_products.json's url field already had it --
    nothing enforced it structurally. This closes that gap at the code
    level: every amazon.* link in the final drafted content gets the
    decodedsix-20 tag appended if missing, regardless of article_type
    (an Amazon link could appear in a news or evergreen article too, not
    just conversion) and regardless of whether the source data was
    correct. Never trust upstream data alone for something this easy to
    verify structurally -- same principle CLAUDE.md applies elsewhere in
    this codebase to MRR floors and confidence scores.

    Returns (corrected_content, list of urls that were auto-tagged) --
    the list is for audit_log visibility, not for gating anything; a
    missing tag is fixed here, never just flagged and left broken.
    """
    fixed_urls: list[str] = []

    def _fix(match: re.Match) -> str:
        text, url = match.group(1), match.group(2)
        if f"tag={AMAZON_AFFILIATE_TAG}" in url:
            return match.group(0)
        separator = "&" if "?" in url else "?"
        new_url = f"{url}{separator}tag={AMAZON_AFFILIATE_TAG}"
        fixed_urls.append(url)
        return f"[{text}]({new_url})"

    corrected = _AMAZON_MD_LINK_RE.sub(_fix, content)
    return corrected, fixed_urls


# ── Node 7: affiliate_link_injector ───────────────────────────────────────────

def _node_affiliate_link_injector(state: dict) -> dict:
    """
    Runs the Amazon tag-enforcement pass on every article type (see
    _ensure_amazon_affiliate_tags -- an Amazon link isn't exclusive to
    conversion articles). Only conversion articles additionally build the
    affiliate_links metadata list, matching product names referenced in
    content against docs/affiliate_products.json.
    """
    state["content"], auto_tagged = _ensure_amazon_affiliate_tags(state["content"])
    if auto_tagged:
        log.warning(
            "[%s] %d Amazon link(s) were missing tag=%s and were auto-corrected: %s",
            AGENT_ID, len(auto_tagged), AMAZON_AFFILIATE_TAG, auto_tagged,
        )
        state["affiliate_tag_auto_fixed"] = auto_tagged

    if state["article_type"] != "conversion":
        state["affiliate_links"] = []
        return state

    products = state.get("affiliate_products", [])
    content = state["content"]
    links: list[dict] = []

    for product in products:
        name = product.get("name", "")
        url = product.get("url", "")
        if name and url and name.lower() in content.lower():
            links.append({
                "product_name": name,
                "url": url,
                "placement": "body",
            })

    state["affiliate_links"] = links
    return state


# ── Node 8: validator ─────────────────────────────────────────────────────────

def _node_validator(state: dict) -> dict:
    """
    Enforces hard quality gates. Raises ContentAgentError if gates fail.
    This is the actual enforcement mechanism -- the writer prompt's word-count
    instructions are a request the model can ignore; this is what makes the
    floor real. Rebuilt 2026-08-27: was a flat <1000 check regardless of
    article_type (and didn't even match its own docstring, which said 1200)
    -- now keys off WORD_COUNT_FLOORS per type, plus structural gates for
    exclusive/deep_dive and breaking_news per the 2026-08-27 content standard.

    Gates:
    - word count >= WORD_COUNT_FLOORS[article_type]
    - FAQ count >= 3 (all types except breaking_news, which the spec doesn't
      require a FAQ section for -- forcing one onto a 400-word floor would
      make the floor meaningless)
    - slug <= 60 chars, excerpt <= 160 chars
    - exclusive/deep_dive only: 4+ '##' sections, a "still unknown" section,
      a "what this means" section, 3+ real cross-links (from
      internal_link_injector's state["internal_links_used"])
    - breaking_news only: a "what this means" section
    """
    errors: list[str] = []
    article_type = state.get("article_type", "news")
    floor = WORD_COUNT_FLOORS.get(article_type, 800)

    if state.get("word_count", 0) < floor:
        errors.append(
            f"word_count={state.get('word_count')} is below the {floor}-word "
            f"minimum for article_type={article_type!r}"
        )

    faq = state.get("faq_pairs") or []
    if article_type != "breaking_news" and len(faq) < 3:
        errors.append(f"faq_pairs has {len(faq)} items — minimum 3 required")

    if len(state.get("slug", "")) > 60:
        errors.append(f"slug is {len(state['slug'])} chars — maximum 60")

    if len(state.get("excerpt", "")) > 160:
        errors.append(f"excerpt is {len(state['excerpt'])} chars — maximum 160")

    content = state.get("content", "")
    content_lower = content.lower()

    if article_type in ("exclusive", "deep_dive"):
        h2_count = len(re.findall(r"^## ", content, flags=re.MULTILINE))
        if h2_count < 4:
            errors.append(f"{article_type} requires 4+ '##' sections, found {h2_count}")
        if "still unknown" not in content_lower:
            errors.append(f"{article_type} requires a \"What's Still Unknown\" section")
        if "what this means" not in content_lower:
            errors.append(f"{article_type} requires a \"What This Means for Launch\" section")
        links_used = state.get("internal_links_used") or []
        if len(links_used) < 3:
            errors.append(
                f"{article_type} requires 3+ cross-links to existing articles, "
                f"found {len(links_used)}"
            )

    if article_type == "breaking_news" and "what this means" not in content_lower:
        errors.append("breaking_news requires a \"What This Means\" section")

    if errors:
        raise ContentAgentError("validator", state.get("article_id"),
            ValueError("Quality gate failed: " + "; ".join(errors)))

    return state


# ── Node 9: output_formatter ──────────────────────────────────────────────────

def _node_output_formatter(state: dict, sb: Any) -> dict:
    """
    Inserts the final article into the articles table with status='pending_review'.
    Returns {article_id, slug, status}.
    """
    from datetime import datetime, timezone

    row = {
        "product_id": "gta-hub",
        "title": state["title"],
        "slug": state["slug"],
        "excerpt": state["excerpt"],
        "content": state["content"],
        "category": {"news": "news", "evergreen": "guide", "conversion": "guide"}[state["article_type"]],
        "status": "pending_review",
        "agent_generated": True,
        "published_at": state.get("publish_date") or datetime.now(timezone.utc).isoformat(),
        # Agent-only columns
        "article_type": state["article_type"],
        "publish_date": state.get("publish_date"),
        "faq_pairs": state.get("faq_pairs"),
        "internal_links_used": state.get("internal_links_used"),
        "external_citation": state.get("external_citation") or None,
        "affiliate_links": state.get("affiliate_links") or None,
        "schema_article": state.get("schema_article"),
        "schema_faq": state.get("schema_faq"),
        "schema_breadcrumb": state.get("schema_breadcrumb"),
        "word_count": state.get("word_count"),
        "featured_image_url": state.get("featured_image_url"),
    }

    # The writer's LLM-generated slug can collide with a previously published
    # article's slug -- observed live 2026-08-08 ("gta-6-release-date-price-
    # editions-guide" already existed), which killed the whole day's run with
    # a raw unique-violation. The topic pool is a small rotating list of
    # evergreen subjects, so this recurs rather than being a one-off. Same
    # duplicate-key-catch-and-retry shape as the idempotency handling
    # elsewhere in this codebase, but retried with a modified slug instead of
    # skipped, since a content run should still produce an article.
    base_slug = row["slug"][:56]
    for attempt in range(1, 6):
        try:
            result = sb.table("articles").insert(row).execute()
            break
        except Exception as exc:
            if attempt == 5 or not ("duplicate key" in str(exc) or "23505" in str(exc)):
                raise
            row["slug"] = f"{base_slug}-{attempt + 1}"

    if not result.data:
        raise ContentAgentError("output_formatter", None, RuntimeError("Supabase insert returned no data"))
    state["slug"] = row["slug"]

    article_id = result.data[0]["id"]
    state["article_id"] = article_id

    # Additive: creates the real hitl_queue row for this article, alongside
    # the articles.status='pending_review' state above. Nothing previously
    # read/wrote this table for an article's initial entry into review — the
    # dashboard's approve/reject flow (review/route.ts) only updated
    # articles+audit_log. Both are now kept in sync; articles.status stays
    # the source of truth for the dashboard UI, hitl_queue exists for
    # whatever reads the real queue table (api/routes/hitl_queue.py).
    hitl_result = sb.table("hitl_queue").insert({
        "product_id": "gta-hub",
        "article_id": article_id,
        "status": "pending",
    }).execute()
    if not hitl_result.data:
        raise ContentAgentError("output_formatter", article_id,
            RuntimeError("hitl_queue insert returned no data"))

    return state


# ── Node: humanizer (Terminal 2) ──────────────────────────────────────────────

def _node_humanizer(state: dict, sb: Any, ai: Any) -> dict:
    """
    Runs ds_humanizer against the just-inserted article, rewriting its content
    in place (VOICE.md rewrite pass + mechanical no-em-dash/no-buzzword pass)
    before AI-detection scoring runs.
    """
    article_id = state["article_id"]

    try:
        result = humanize_article(article_id, supabase_client=sb, anthropic_client=ai)
    except HumanizeError as exc:
        raise ContentAgentError("humanizer", article_id, exc) from exc

    state["humanizer_result"] = result
    _audit(sb, article_id, "humanizer_pass", "success")
    return state


# ── Node 10: seo_aeo_audit (Session 13) ───────────────────────────────────────

def _node_seo_aeo_audit(state: dict, sb: Any) -> dict:
    """
    Runs after output_formatter, against the now-real article_id — ds_seo and
    ds_aeo both read committed columns (word_count, faq_pairs, schema_faq,
    internal_links_used, external_citation) that only exist once the row is
    inserted, so this can't run any earlier in the pipeline.

    output_formatter already set status='pending_review'. If either audit
    scores below the pass threshold, this downgrades status to
    'needs_revision' and records why in hitl_notes. If both pass, the row is
    left exactly as output_formatter set it — no extra write.
    """
    from src.agents.content.ds_aeo import audit_aeo
    from src.agents.content.ds_seo import audit_seo

    article_id = state["article_id"]

    seo_result = audit_seo(article_id, supabase_client=sb)
    aeo_result = audit_aeo(article_id, supabase_client=sb)

    state["seo_result"] = seo_result
    state["aeo_result"] = aeo_result

    if seo_result["passed"] and aeo_result["passed"]:
        return state

    notes = (
        f"SEO score {seo_result['score']}: {'; '.join(seo_result['issues']) or 'none'}\n"
        f"AEO score {aeo_result['aeo_score']}: {'; '.join(aeo_result['issues']) or 'none'}"
    )
    update_result = (
        sb.table("articles")
        .update({"status": "needs_revision", "hitl_notes": notes})
        .eq("id", article_id)
        .execute()
    )
    if not update_result.data:
        raise ContentAgentError("seo_aeo_audit", article_id,
            RuntimeError("Failed to downgrade status to needs_revision"))

    state["status"] = "needs_revision"
    return state


# ── HITL webhook ─────────────────────────────────────────────────────────────

def _fire_hitl_webhook(state: dict) -> None:
    """POST article metadata to n8n HITL notification webhook. Non-blocking."""
    url = os.getenv("N8N_HITL_WEBHOOK_URL", "")
    if not url:
        log.warning("[%s] N8N_HITL_WEBHOOK_URL not set — HITL notification skipped", AGENT_ID)
        return
    try:
        import httpx
        cat_map = {"news": "news", "evergreen": "guide", "conversion": "guide"}
        httpx.post(url, json={
            "status": state.get("status", "pending_review"),
            "article_id": state.get("article_id"),
            "title": state.get("title", ""),
            "slug": state.get("slug", ""),
            "category": cat_map.get(state.get("article_type", ""), "news"),
            "article_type": state.get("article_type", ""),
            "word_count": state.get("word_count", 0),
        }, timeout=5)
    except Exception as exc:
        log.warning("[%s] HITL webhook fire failed (non-blocking): %s", AGENT_ID, exc)


# ── Main agent entry point ────────────────────────────────────────────────────

def run_content_agent(
    article_type: str,
    topic_seed: str = "",
    publish_date: Optional[str] = None,
    supabase_client: Optional[Any] = None,
    anthropic_client: Optional[Any] = None,
) -> dict:
    """
    Run DSX-CA1 for one article. Returns {article_id, slug, status}.
    Raises ContentAgentError if any node fails.

    Args:
        article_type: 'news' | 'evergreen' | 'conversion' | 'feature' |
            'exclusive' | 'deep_dive' | 'breaking_news' (added 2026-08-27;
            'exclusive'/'deep_dive' are always manually seeded -- see module
            docstring -- not part of the automated n8n cadence)
        topic_seed: headline, keyword, or product name (n8n passes this from RSS/list)
        publish_date: ISO date string for scheduled publish (optional)
        supabase_client: injectable for testing
        anthropic_client: injectable for testing
    """
    valid_types = ("news", "evergreen", "conversion", "feature", "exclusive", "deep_dive", "breaking_news")
    if article_type not in valid_types:
        raise ValueError(f"article_type must be one of {valid_types}, got {article_type!r}")

    sb = supabase_client or _supabase()
    ai = anthropic_client or _anthropic()

    # Fetch article count for keyword rotation
    try:
        count_result = sb.table("articles").select("id", count="exact").eq("product_id", "gta-hub").execute()
        article_count = count_result.count or 0
    except Exception:
        article_count = 0

    state: dict = {
        "article_type": article_type,
        "topic_seed": topic_seed,
        "publish_date": publish_date,
        "article_count": article_count,
    }

    article_id: Optional[str] = None

    try:
        state = _node_topic_picker(state, sb)
        state = _node_news_scraper(state)
        state = _node_image_fetcher(state)   # before writer — passes hero_image_url to prompt
        state = _node_writer(state, ai)
        state = _node_faq_generator(state, ai)
        state = _node_schema_generator(state)
        state = _node_internal_link_injector(state, sb)
        state = _node_affiliate_link_injector(state)
        state = _node_validator(state)
        state = _node_output_formatter(state, sb)

        article_id = state["article_id"]

        state = _node_humanizer(state, sb, ai)
        state = _node_seo_aeo_audit(state, sb)

        _audit(sb, article_id, "content_agent_run", "success")
        _fire_hitl_webhook(state)

        return {
            "article_id": article_id,
            "slug": state["slug"],
            "status": state.get("status", "pending_review"),
        }

    except ContentAgentError as exc:
        _audit(sb, exc.article_id or article_id, "content_agent_run", "failure", error=str(exc))
        raise
    except Exception as exc:
        _audit(sb, article_id, "content_agent_run", "failure", error=str(exc))
        raise ContentAgentError("unknown", article_id, exc) from exc
