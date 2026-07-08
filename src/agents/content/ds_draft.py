"""DS-DRAFT — generates a new article draft from a topic + category.

Sanitizes the topic through DataSanitizationShield before it reaches the LLM,
drafts the article with Anthropic using the voice rules in
.claude/product-marketing-context.md, and inserts the result into the
articles table as a pending draft. Writes an audit_log entry either way.
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

VALID_CATEGORIES = ("news", "rumor", "guide", "event")
MODEL = "claude-sonnet-4-6"
AGENT_ID = "ds_draft"


class DraftError(RuntimeError):
    """Raised when drafting fails at any stage (sanitize/LLM/parse/DB)."""


class DataSanitizationShield:
    """Strips PII from text before it reaches an LLM. Non-negotiable per CLAUDE.md."""

    _EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
    _PHONE_RE = re.compile(
        r"(?<!\d)(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)"
    )
    _SSN_RE = re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")

    def sanitize(self, text: str) -> str:
        text = self._EMAIL_RE.sub("[REDACTED_EMAIL]", text)
        text = self._PHONE_RE.sub("[REDACTED_PHONE]", text)
        text = self._SSN_RE.sub("[REDACTED_SSN]", text)
        return text


shield = DataSanitizationShield()


def _get_supabase_client() -> Any:
    from supabase import create_client

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _get_anthropic_client() -> Any:
    from anthropic import Anthropic

    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def _load_voice_context() -> str:
    if not VOICE_CONTEXT_PATH.exists():
        raise DraftError(f"Voice file not found at {VOICE_CONTEXT_PATH} — cannot draft without it")
    return VOICE_CONTEXT_PATH.read_text()


def _write_audit(
    supabase: Any,
    article_id: Optional[str],
    action: str,
    result: str,
    error: Optional[str] = None,
) -> None:
    supabase.table("audit_log").insert({
        "agent_id": AGENT_ID,
        "action": action,
        "article_id": article_id,
        "result": result,
        "error": error,
    }).execute()


def _build_prompt(topic: str, category: str, voice_context: str) -> tuple[str, str]:
    system = (
        f"{voice_context}\n\n"
        "You are drafting a new article for DecodedSix. Follow the voice rules "
        "above exactly. Respond with strict JSON with exactly these keys: "
        '"title", "excerpt", "content". No markdown fences, no commentary '
        "outside the JSON."
    )
    user = f"Category: {category}\nTopic: {topic}\n\nDraft the article now."
    return system, user


def _parse_llm_json(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise DraftError(f"LLM did not return valid JSON: {exc} — raw: {raw[:300]}") from exc


def draft_article(
    topic: str,
    category: str,
    supabase_client: Optional[Any] = None,
    anthropic_client: Optional[Any] = None,
) -> dict:
    """
    Draft a new article and insert it into the articles table as status='draft'.

    Returns {article_id, title, excerpt, content, slug, category}.
    Raises DraftError on any failure — an audit_log entry is written either way.
    """
    if category not in VALID_CATEGORIES:
        raise DraftError(f"category must be one of {VALID_CATEGORIES}, got {category!r}")

    supabase = supabase_client or _get_supabase_client()

    try:
        anthropic = anthropic_client or _get_anthropic_client()
        voice_context = _load_voice_context()

        sanitized_topic = shield.sanitize(topic)

        system, user = _build_prompt(sanitized_topic, category, voice_context)
        response = anthropic.messages.create(
            model=MODEL,
            max_tokens=2048,
            temperature=0.7,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        raw_text = "".join(block.text for block in response.content if block.type == "text")
        parsed = _parse_llm_json(raw_text)

        for field in ("title", "excerpt", "content"):
            if field not in parsed:
                raise DraftError(f"LLM output missing required field '{field}'")

        slug = slugify(parsed["title"])

        row = {
            "product_id": "gta-hub",
            "slug": slug,
            "title": parsed["title"],
            "content": parsed["content"],
            "excerpt": parsed["excerpt"],
            "category": category,
            "status": "draft",
            "agent_generated": True,
        }
        insert_result = supabase.table("articles").insert(row).execute()
        if not insert_result.data:
            raise DraftError(f"Insert into articles returned no data: {row}")
        article_id = insert_result.data[0]["id"]

        _write_audit(supabase, article_id, "draft", "success")

        return {
            "article_id": article_id,
            "title": parsed["title"],
            "excerpt": parsed["excerpt"],
            "content": parsed["content"],
            "slug": slug,
            "category": category,
        }

    except Exception as exc:
        try:
            _write_audit(supabase, None, "draft", "failure", error=str(exc))
        except Exception as audit_exc:
            log.error("[ds_draft] failed to write failure audit_log entry: %s", audit_exc)
        if isinstance(exc, DraftError):
            raise
        raise DraftError(f"ds_draft failed: {exc}") from exc
