"""DS-TRANSLATE — translates a published article's title/excerpt/content/
faq_pairs into one of the 7 supported non-default locales, storing the
result in article_translations. Kelvin, 2026-08-07: pre-translate and
store once per article rather than translating live on every page view —
real indexable pages per locale, a one-time cost instead of a repeated one.

'en' (the site's existing default American-English content) is never a
target here — it already lives in articles.* as it always has.

Uses a forced tool call (not free-text JSON) to get reliably structured
output for four fields translated together in one pass, which keeps
terminology consistent across title/excerpt/content/FAQ within a single
article the way translating each field separately would not.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

log = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
AGENT_ID = "ds_translate"

# Guidance per locale so the model doesn't default to a generic/ambiguous
# register. Proper nouns (game titles, character names, place names like
# "Vice City" or "Leonida") must never be translated — called out once
# here rather than repeated per-locale.
SUPPORTED_LOCALES: dict[str, str] = {
    "en-GB": (
        "British English. Use British spelling (colour, favourite, "
        "recognise, licence as a noun) and British terms where natural "
        "(e.g. 'mobile' not 'cell phone')."
    ),
    "fr": "French (France).",
    "de": "German (Germany).",
    "ja": "Japanese, natural gaming-news register (not overly formal keigo).",
    "zh": "Simplified Chinese (Mandarin), mainland gaming-news register.",
    "pt": "Brazilian Portuguese.",
    "es": "Spanish, neutral/Latin American register — avoid Spain-only slang.",
}

_TRANSLATE_TOOL = {
    "name": "submit_translation",
    "description": "Submit the fully translated article fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "excerpt": {"type": "string"},
            "content": {"type": "string"},
            "faq_pairs": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "answer": {"type": "string"},
                    },
                    "required": ["question", "answer"],
                },
            },
        },
        "required": ["title", "excerpt", "content", "faq_pairs"],
    },
}


class TranslateError(RuntimeError):
    """Raised when a translation pass fails at any stage."""


def _get_supabase_client() -> Any:
    from supabase import create_client

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _get_anthropic_client() -> Any:
    from anthropic import Anthropic

    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


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


def _safe_write_audit(supabase: Any, article_id: Optional[str], action: str, result: str, error: Optional[str] = None) -> None:
    try:
        _write_audit(supabase, article_id, action, result, error=error)
    except Exception as audit_exc:  # noqa: BLE001 — a broken audit sink must never mask the real error
        log.error("[ds_translate] failed to write '%s' audit_log entry: %s", action, audit_exc)


def _normalize_faq_pairs(value: Any) -> list:
    """
    The tool_use input schema declares faq_pairs as an array, but the model
    has been observed (caught live 2026-08-07: German and Chinese passes
    for one real article) returning a JSON-encoded *string* for this one
    field instead of a native array on some calls, even though every other
    locale/field came back correctly typed the same run. Storing that
    string as-is into a jsonb column doesn't error (jsonb happily holds a
    scalar string), so this went undetected until the frontend's
    faqPairs.map() call hit it in production. Parse defensively rather
    than trust the declared schema blindly.
    """
    import json

    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (ValueError, TypeError):
            pass
    return []


def _truncate(text: str, max_length: int) -> str:
    if not text or len(text) <= max_length:
        return text
    return f"{text[: max_length - 1].rstrip()}…"


def translate_article(
    article_id: str,
    locale: str,
    supabase_client: Optional[Any] = None,
    anthropic_client: Optional[Any] = None,
) -> dict:
    """
    Translates one article into one locale and upserts the result into
    article_translations. Returns {article_id, locale, status}. Raises
    TranslateError on failure — a 'failed' row and an audit_log entry are
    both written either way, so a failed pass is visible, not silent.
    """
    if locale not in SUPPORTED_LOCALES:
        raise TranslateError(f"Unsupported locale {locale!r} — must be one of {sorted(SUPPORTED_LOCALES)}")

    supabase = supabase_client or _get_supabase_client()

    try:
        row_result = (
            supabase.table("articles")
            .select("title, excerpt, content, faq_pairs")
            .eq("id", article_id)
            .single()
            .execute()
        )
        if not row_result.data:
            raise TranslateError(f"Article {article_id} not found")
        article = row_result.data

        anthropic = anthropic_client or _get_anthropic_client()

        system = (
            f"Translate the GTA 6 fan-site article fields below into {SUPPORTED_LOCALES[locale]}\n\n"
            "CRITICAL rules:\n"
            "- Never translate proper nouns: game titles (Grand Theft Auto VI, GTA VI, GTA 6), "
            "character names (Jason Duval, Lucia Caminos, etc.), place names (Vice City, Leonida, "
            "Port Gellhorn, etc.), company names (Rockstar Games, Take-Two), or platform names "
            "(PS5, Xbox Series X).\n"
            "- The 'content' field is markdown. Preserve every markdown construct exactly: "
            "## headings, ### sub-headings, **bold**, *italic*, - bullet lists, numbered lists, "
            "![caption](url) image embeds, [text](url) links. Translate the caption text inside "
            "an image embed but never the URL itself. Preserve credit lines "
            "(e.g. '*Image credit: Rockstar Games*') in translated form, keeping the studio name "
            "'Rockstar Games' untranslated.\n"
            "- Translate naturally and idiomatically — do not produce a literal word-for-word "
            "translation. Sound like a native gaming-news writer in the target language, not a "
            "machine translation.\n"
            "- Do not add, remove, or change any facts.\n"
            "- Call submit_translation exactly once with all fields fully translated."
        )
        user_content = (
            f"TITLE:\n{article['title']}\n\n"
            f"EXCERPT:\n{article.get('excerpt') or ''}\n\n"
            f"CONTENT (markdown):\n{article.get('content') or ''}\n\n"
            f"FAQ_PAIRS (JSON):\n{article.get('faq_pairs') or []}"
        )

        response = anthropic.messages.create(
            model=MODEL,
            max_tokens=8192,
            system=system,
            tools=[_TRANSLATE_TOOL],
            tool_choice={"type": "tool", "name": "submit_translation"},
            messages=[{"role": "user", "content": user_content}],
        )
        tool_use = next((b for b in response.content if b.type == "tool_use"), None)
        if tool_use is None:
            raise TranslateError("Model did not call submit_translation")
        translated = tool_use.input

        row = {
            "article_id": article_id,
            "locale": locale,
            "title": translated["title"],
            "excerpt": translated.get("excerpt"),
            "content": translated.get("content"),
            "faq_pairs": _normalize_faq_pairs(translated.get("faq_pairs")),
            "meta_description": _truncate(translated.get("excerpt") or "", 160),
            "translation_status": "completed",
            "translation_error": None,
            "translated_at": "now()",
        }
        supabase.table("article_translations").upsert(row, on_conflict="article_id,locale").execute()

        _write_audit(supabase, article_id, f"translate:{locale}", "success")
        return {"article_id": article_id, "locale": locale, "status": "completed"}

    except Exception as exc:
        try:
            supabase.table("article_translations").upsert({
                "article_id": article_id,
                "locale": locale,
                "title": "",
                "translation_status": "failed",
                "translation_error": str(exc),
            }, on_conflict="article_id,locale").execute()
        except Exception as row_exc:  # noqa: BLE001 — best-effort failure record only
            log.error("[ds_translate] failed to write failed-status row: %s", row_exc)
        _safe_write_audit(supabase, article_id, f"translate:{locale}", "failure", error=str(exc))
        if isinstance(exc, TranslateError):
            raise
        raise TranslateError(f"ds_translate failed for locale {locale!r}: {exc}") from exc


def translate_article_all_locales(
    article_id: str,
    supabase_client: Optional[Any] = None,
    anthropic_client: Optional[Any] = None,
) -> dict:
    """
    Fans out translate_article() across every supported locale. One
    locale's failure never stops the rest — same fail-soft-per-item
    principle agents/email_poller.py already applies to individual
    messages within one inbox. Returns {locale: status_or_error}.
    """
    supabase = supabase_client or _get_supabase_client()
    anthropic = anthropic_client or _get_anthropic_client()

    results: dict[str, str] = {}
    for locale in SUPPORTED_LOCALES:
        try:
            translate_article(article_id, locale, supabase_client=supabase, anthropic_client=anthropic)
            results[locale] = "completed"
        except TranslateError as exc:
            log.warning("[ds_translate] locale %s failed for article %s: %s", locale, article_id, exc)
            results[locale] = f"failed: {exc}"
    return results
