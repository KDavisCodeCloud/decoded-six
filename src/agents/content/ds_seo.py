"""DS-SEO — on-page SEO auditor. Rule-based, no LLM call.

Reads an already-inserted article by ID and checks it against on-page SEO
rules. Never modifies the article — audit only. Writes a result row to
audit_log either way.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Optional

log = logging.getLogger(__name__)

AGENT_ID = "ds_seo"

TITLE_MIN, TITLE_MAX = 50, 60
EXCERPT_MIN, EXCERPT_MAX = 150, 160
SLUG_MAX = 60
WORD_COUNT_MIN = 1200
INTERNAL_LINKS_MIN = 3
FAQ_PAIRS_MIN = 3
PASS_SCORE = 70
TOTAL_CHECKS = 10

_STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "for", "to", "and", "or", "is",
    "are", "how", "what", "your", "you", "with", "at", "by", "from",
}
_H2_RE = re.compile(r"<h2[\s>]", re.IGNORECASE)
_WORD_RE = re.compile(r"[a-z0-9]+")


class SeoAuditError(RuntimeError):
    """Raised only when the audit itself can't run (e.g. article not found)."""


def _supabase() -> Any:
    from supabase import create_client
    return create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _audit(sb: Any, article_id: Optional[str], result: str, error: Optional[str] = None) -> None:
    try:
        sb.table("audit_log").insert({
            "agent_id": AGENT_ID,
            "action": "seo_audit",
            "article_id": article_id,
            "result": result,
            "error": error,
        }).execute()
    except Exception as e:
        log.error("[%s] audit_log write failed: %s", AGENT_ID, e)


def _significant_words(text: str) -> set[str]:
    words = _WORD_RE.findall(text.lower())
    return {w for w in words if len(w) > 2 and w not in _STOPWORDS}


def _shares_keywords(title: str, slug: str) -> bool:
    """
    No dedicated target-keyword column exists on `articles` (checked against
    supabase/migrations/001_schema.sql + 005_articles_agent_fields.sql — see
    project memory). Approximate "includes the primary keyword" by checking
    that title and slug share meaningful words: slug is derived from title
    at creation time in both content pipelines, so a low overlap usually
    means one was hand-edited without the other, or the title drifted from
    what the article is actually targeting.
    """
    slug_words = _significant_words(slug.replace("-", " "))
    if not slug_words:
        return False
    title_words = _significant_words(title)
    overlap = slug_words & title_words
    return len(overlap) >= max(1, len(slug_words) // 2)


def audit_seo(article_id: str, supabase_client: Optional[Any] = None) -> dict:
    """
    Audit article_id against on-page SEO rules. Read-only — never modifies
    the article. Returns {article_id, passed, issues, score}. Raises
    SeoAuditError only if the article can't be read at all.
    """
    sb = supabase_client or _supabase()

    try:
        result = (
            sb.table("articles")
            .select("title,slug,excerpt,content,word_count,faq_pairs,internal_links_used,external_citation")
            .eq("id", article_id)
            .single()
            .execute()
        )
    except Exception as exc:
        _audit(sb, article_id, "failure", str(exc)[:500])
        raise SeoAuditError(f"Article {article_id} not found") from exc

    row = result.data
    if not row:
        _audit(sb, article_id, "failure", "article not found")
        raise SeoAuditError(f"Article {article_id} not found")

    title = row.get("title") or ""
    slug = row.get("slug") or ""
    excerpt = row.get("excerpt") or ""
    content = row.get("content") or ""
    word_count = row.get("word_count") or 0
    faq_pairs = row.get("faq_pairs") or []
    internal_links = row.get("internal_links_used") or []
    external_citation = row.get("external_citation")

    keyword_match = _shares_keywords(title, slug)
    issues: list[str] = []
    checks_passed = 0

    if TITLE_MIN <= len(title) <= TITLE_MAX:
        checks_passed += 1
    else:
        issues.append(f"title is {len(title)} chars — target {TITLE_MIN}-{TITLE_MAX}")

    if keyword_match:
        checks_passed += 1
    else:
        issues.append("title does not share keywords with slug")

    if EXCERPT_MIN <= len(excerpt) <= EXCERPT_MAX:
        checks_passed += 1
    else:
        issues.append(f"excerpt is {len(excerpt)} chars — target {EXCERPT_MIN}-{EXCERPT_MAX}")

    if len(slug) <= SLUG_MAX:
        checks_passed += 1
    else:
        issues.append(f"slug is {len(slug)} chars — max {SLUG_MAX}")

    if keyword_match:
        checks_passed += 1
    else:
        issues.append("slug does not share keywords with title")

    if word_count >= WORD_COUNT_MIN:
        checks_passed += 1
    else:
        issues.append(f"word_count={word_count} — minimum {WORD_COUNT_MIN}")

    if len(internal_links) >= INTERNAL_LINKS_MIN:
        checks_passed += 1
    else:
        issues.append(f"internal_links_used has {len(internal_links)} — minimum {INTERNAL_LINKS_MIN}")

    if external_citation:
        checks_passed += 1
    else:
        issues.append("external_citation is missing")

    if len(faq_pairs) >= FAQ_PAIRS_MIN:
        checks_passed += 1
    else:
        issues.append(f"faq_pairs has {len(faq_pairs)} — minimum {FAQ_PAIRS_MIN}")

    if _H2_RE.search(content):
        checks_passed += 1
    else:
        issues.append("no <h2> tags found in content")

    score = round((checks_passed / TOTAL_CHECKS) * 100)
    passed = score >= PASS_SCORE

    # Score is embedded in `result` since audit_log has no dedicated score
    # column — GET /api/articles/{id}/audit parses it back out.
    result_label = f"{'passed' if passed else 'failed'}:score={score}"
    _audit(sb, article_id, result_label, "; ".join(issues) if issues else None)

    return {"article_id": article_id, "passed": passed, "issues": issues, "score": score}
