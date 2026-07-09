"""
DSX-CA1 — DecodedSix Content Agent

Produces 3 articles/week: Tuesday=news, Thursday=evergreen, Saturday=conversion.
Triggered by n8n via POST /agents/decodedsix/content.

Node pipeline (mirrors LangGraph pattern, no external graph dependency):
  topic_picker → [news_scraper] → writer → faq_generator → schema_generator
  → internal_link_injector → [affiliate_link_injector] → validator → output_formatter

DataSanitizationShield applied before any user-supplied data reaches the LLM.
Every run writes to audit_log. Status always lands on 'pending_review' — never
skips HITL.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional

from slugify import slugify

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
VOICE_CONTEXT_PATH = REPO_ROOT / ".claude" / "product-marketing-context.md"
KEYWORD_LIST_PATH = REPO_ROOT / "docs" / "evergreen_keywords.txt"
AFFILIATE_LIST_PATH = REPO_ROOT / "docs" / "affiliate_products.json"

MODEL = "claude-sonnet-4-6"
AGENT_ID = "dsx-ca1"

SITE_URL = os.getenv("NEXT_PUBLIC_SITE_URL", "https://thedecodedsix.com")


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

def _node_topic_picker(state: dict) -> dict:
    """
    Selects or validates the topic seed for the article type.
    For news: topic_seed comes from caller (n8n passes RSS headline).
    For evergreen: picks from docs/evergreen_keywords.txt if no seed given.
    For conversion: picks from docs/affiliate_products.json if no seed given.
    """
    article_type = state["article_type"]
    topic_seed = shield.sanitize(state.get("topic_seed", "").strip())

    if topic_seed:
        state["topic"] = topic_seed
        return state

    if article_type == "evergreen":
        if KEYWORD_LIST_PATH.exists():
            lines = [l.strip() for l in KEYWORD_LIST_PATH.read_text().splitlines() if l.strip()]
            # Rotate through keywords by using article count as index
            idx = state.get("article_count", 0) % len(lines) if lines else 0
            state["topic"] = lines[idx] if lines else "GTA 6 guide"
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

    else:  # news — n8n should always supply a seed; fallback to a general topic
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


# ── Node 3: writer ────────────────────────────────────────────────────────────

def _node_writer(state: dict, anthropic_client: Any) -> dict:
    """
    Drafts the full article body using claude-sonnet-4-6.
    Returns title, slug, excerpt, content (HTML), word_count.
    Enforces all 10 content quality rules in the system prompt.
    """
    voice = _voice_context()
    article_type = state["article_type"]
    topic = state["topic"]
    scraped = state.get("scraped_context", "")
    affiliate_products = state.get("affiliate_products", [])

    type_instructions = {
        "news": (
            "Write a GTA 6 news article (1,200–1,500 words). "
            "Category: 'news'. Lead with the most newsworthy fact. "
            "Label any unconfirmed information as 'reportedly' or 'according to leakers'. "
            "Cite at least one official source (Rockstar Newswire, Take-Two, or major outlet)."
        ),
        "evergreen": (
            "Write a GTA 6 evergreen reference article (1,500–2,500 words). "
            "Category: 'guide'. Cover the topic comprehensively. "
            "Use H2 and H3 headings throughout. Include a comparison table if relevant."
        ),
        "conversion": (
            "Write a GTA 6 conversion article (1,200–2,000 words) recommending products. "
            "Category: 'guide'. Include a 'Quick Picks' affiliate section in the first 300 words. "
            "Repeat the primary affiliate recommendation in the conclusion. "
            f"Available products to recommend: {json.dumps(affiliate_products[:5])}. "
            "Make product recommendations natural and specific to GTA 6 gaming use cases."
        ),
    }

    context_block = f"\n\nRecent related content for context:\n{scraped}" if scraped else ""

    system = (
        f"{voice}\n\n"
        "You are DSX-CA1, the DecodedSix content agent. "
        f"{type_instructions[article_type]}\n\n"
        "CONTENT QUALITY RULES (enforce all 10):\n"
        "1. First paragraph answers search intent immediately — no preamble.\n"
        "2. Never write 'In this article we will explore' or similar meta-commentary.\n"
        "3. No unsubstantiated claims. Label speculation as 'reportedly' or 'according to leakers'.\n"
        "4. Conversion articles: affiliate links in first 300 words AND conclusion.\n"
        "5. Link to at least 3 other DecodedSix articles by slug (use [INTERNAL_LINK:slug] placeholder).\n"
        "6. Cite at least 1 official source by URL.\n"
        "7. FAQ section: minimum 3 questions as real search queries (People Also Ask format).\n"
        "8. Excerpt (meta description): 150–160 characters, includes primary keyword.\n"
        "9. Slug: lowercase, hyphenated, includes primary keyword, max 60 characters.\n"
        "10. Word count floor: 1,200 words minimum.\n\n"
        "Return ONLY valid JSON with exactly these keys: "
        '"title", "slug", "excerpt", "content_html", "external_citation". '
        "content_html must be full article HTML with H2/H3 tags, <p> tags, and "
        "a <section class='faq'> block containing the FAQ questions/answers. "
        "No markdown fences or commentary outside the JSON."
        + context_block
    )

    user = f"Article type: {article_type}\nTopic: {topic}\n\nWrite the article now."

    response = anthropic_client.messages.create(
        model=MODEL,
        max_tokens=4096,
        temperature=0.7,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = "".join(b.text for b in response.content if b.type == "text")

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.MULTILINE).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ContentAgentError("writer", None, ValueError(f"LLM returned invalid JSON: {e} — raw[:300]: {raw[:300]}"))

    for field in ("title", "slug", "excerpt", "content_html"):
        if field not in parsed:
            raise ContentAgentError("writer", None, ValueError(f"LLM output missing field '{field}'"))

    # Enforce slug constraints
    slug = slugify(parsed["slug"])[:60]

    # Rough word count from stripped HTML
    text_only = re.sub(r"<[^>]+>", " ", parsed["content_html"])
    word_count = len(text_only.split())

    state["title"] = parsed["title"]
    state["slug"] = slug
    state["excerpt"] = parsed["excerpt"][:160]
    state["content_html"] = parsed["content_html"]
    state["external_citation"] = parsed.get("external_citation", "")
    state["word_count"] = word_count

    return state


# ── Node 4: faq_generator ─────────────────────────────────────────────────────

def _node_faq_generator(state: dict, anthropic_client: Any) -> dict:
    """
    Extracts FAQ pairs from the drafted content.
    Returns list of {question, answer} dicts (minimum 3).
    """
    content = state["content_html"]

    system = (
        "Extract the FAQ section from this article HTML. "
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
    publish_date = state.get("publish_date", datetime.now(timezone.utc).isoformat())
    article_url = f"{SITE_URL}/news/{slug}"

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
    content = state["content_html"]

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
            return f'<a href="/news/{slug}">{title}</a>'

        content = re.sub(r'\[INTERNAL_LINK:([^\]]+)\]', replace_link, content)

    state["content_html"] = content
    state["internal_links_used"] = used_slugs
    return state


# ── Node 7: affiliate_link_injector (conversion type only) ───────────────────

def _node_affiliate_link_injector(state: dict) -> dict:
    """
    For conversion articles: builds the affiliate_links list from products
    referenced in content_html. Matches product names against affiliate_products.
    """
    if state["article_type"] != "conversion":
        state["affiliate_links"] = []
        return state

    products = state.get("affiliate_products", [])
    content = state["content_html"]
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
    Gates: word count ≥ 1200, FAQ count ≥ 3, slug ≤ 60 chars, excerpt ≤ 160 chars.
    """
    errors: list[str] = []

    if state.get("word_count", 0) < 1200:
        errors.append(f"word_count={state.get('word_count')} is below 1,200 minimum")

    faq = state.get("faq_pairs") or []
    if len(faq) < 3:
        errors.append(f"faq_pairs has {len(faq)} items — minimum 3 required")

    if len(state.get("slug", "")) > 60:
        errors.append(f"slug is {len(state['slug'])} chars — maximum 60")

    if len(state.get("excerpt", "")) > 160:
        errors.append(f"excerpt is {len(state['excerpt'])} chars — maximum 160")

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
        "content": state["content_html"],
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
    }

    result = sb.table("articles").insert(row).execute()
    if not result.data:
        raise ContentAgentError("output_formatter", None, RuntimeError("Supabase insert returned no data"))

    article_id = result.data[0]["id"]
    state["article_id"] = article_id
    return state


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
        article_type: 'news' | 'evergreen' | 'conversion'
        topic_seed: headline, keyword, or product name (n8n passes this from RSS/list)
        publish_date: ISO date string for scheduled publish (optional)
        supabase_client: injectable for testing
        anthropic_client: injectable for testing
    """
    if article_type not in ("news", "evergreen", "conversion"):
        raise ValueError(f"article_type must be news/evergreen/conversion, got {article_type!r}")

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
        state = _node_topic_picker(state)
        state = _node_news_scraper(state)
        state = _node_writer(state, ai)
        state = _node_faq_generator(state, ai)
        state = _node_schema_generator(state)
        state = _node_internal_link_injector(state, sb)
        state = _node_affiliate_link_injector(state)
        state = _node_validator(state)
        state = _node_output_formatter(state, sb)

        article_id = state["article_id"]
        _audit(sb, article_id, "content_agent_run", "success")

        return {
            "article_id": article_id,
            "slug": state["slug"],
            "status": "pending_review",
        }

    except ContentAgentError as exc:
        _audit(sb, exc.article_id or article_id, "content_agent_run", "failure", error=str(exc))
        raise
    except Exception as exc:
        _audit(sb, article_id, "content_agent_run", "failure", error=str(exc))
        raise ContentAgentError("unknown", article_id, exc) from exc
