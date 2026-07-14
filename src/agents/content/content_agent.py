"""
DSX-CA1 — DecodedSix Content Agent

Produces 3 articles/week: Tuesday=news, Thursday=evergreen, Saturday=conversion.
Triggered by n8n via POST /agents/decodedsix/content.

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

from src.agents.content.ds_detect import DetectError, detect_article
from src.agents.content.ds_humanizer import HumanizeError, humanize_article

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
            output.append(f'<li>{_md_inline(re.sub(r"^\d+\. ", "", s))}</li>')
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
            "Write a GTA 6 news article (1,200–1,500 words). "
            "Category: 'news'. Lead with the most newsworthy fact. "
            "Label any unconfirmed information as 'reportedly' or 'according to leakers'. "
            "Cite at least one official source (Rockstar Newswire, Take-Two, or major outlet)."
        ),
        "evergreen": (
            "Write a GTA 6 evergreen reference article (1,500–2,500 words). "
            "Category: 'guide'. Cover the topic comprehensively. "
            "Use ## and ### headings throughout. Include a comparison table if relevant."
        ),
        "conversion": (
            "Write a GTA 6 conversion article (1,200–2,000 words) recommending products. "
            "Category: 'guide'. Include a 'Quick Picks' affiliate section in the first 300 words. "
            "Repeat the primary affiliate recommendation in the conclusion. "
            f"Available products to recommend: {json.dumps(affiliate_products[:5])}. "
            "Make product recommendations natural and specific to GTA 6 gaming use cases."
        ),
    }

    # Select contextually relevant images from the official Rockstar press kit
    keywords = extract_article_keywords(topic, article_type, scraped)
    press_images = get_images_by_tags(keywords, limit=4)

    img_list_lines = "\n".join(
        f"  - Caption: \"{img['caption']}\"  →  {img['url']}"
        for img in press_images
    )
    image_instruction = (
        "\n\nIMAGE EMBEDDING RULES — You MUST embed 2–4 images in this article.\n"
        "Use this exact markdown syntax for each image (two lines, no blank line between them):\n\n"
        "![Caption text here](image_url)\n"
        "*Image credit: Rockstar Games*\n\n"
        "Placement rules:\n"
        "- Place the FIRST image after the intro paragraph (before the first ## section heading).\n"
        "- Place subsequent images at natural section breaks — after introducing a location, "
        "character, or feature, NEVER back-to-back with no text between them.\n"
        "- Match image to content: Vice City article → use a Vice City image; "
        "character article → use that character's image; Ultimate Edition → use edition images.\n\n"
        "Available official Rockstar press images for this article:\n"
        + img_list_lines
        + "\n\nUse these exact URLs. Do not invent or modify image URLs."
    )

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
        "7. End with a '## Frequently Asked Questions' section with minimum 3 Q&A pairs.\n"
        "8. Excerpt (meta description): 150–160 characters, includes primary keyword.\n"
        "9. Slug: lowercase, hyphenated, includes primary keyword, max 60 characters.\n"
        "10. Word count floor: 1,200 words minimum.\n\n"
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
    Gates: word count ≥ 1200, FAQ count ≥ 3, slug ≤ 60 chars, excerpt ≤ 160 chars.
    """
    errors: list[str] = []

    if state.get("word_count", 0) < 1000:
        errors.append(f"word_count={state.get('word_count')} is below 1,000 minimum")

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
    }

    result = sb.table("articles").insert(row).execute()
    if not result.data:
        raise ContentAgentError("output_formatter", None, RuntimeError("Supabase insert returned no data"))

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


# ── Node: detect (Terminal 2) ─────────────────────────────────────────────────

def _node_detect(state: dict, sb: Any) -> dict:
    """
    Runs ds_detect (Originality.ai) against the just-humanized article. A
    flagged_for_review result is informational only — the HITL queue surfaces
    it, this node doesn't block the pipeline on it. Only a genuine DetectError
    (the check itself failing to run) stops the pipeline.
    """
    article_id = state["article_id"]

    try:
        result = detect_article(article_id, supabase_client=sb)
    except DetectError as exc:
        raise ContentAgentError("detect", article_id, exc) from exc

    state["detect_result"] = result
    _audit(sb, article_id, "detect_pass", "success" if result.get("checked") else "skipped_no_key")
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
        state = _node_detect(state, sb)
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
