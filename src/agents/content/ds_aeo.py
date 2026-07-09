"""DS-AEO — Answer Engine Optimization checker. Rule-based, no LLM call.

Reads an already-inserted article by ID and checks it against AEO rules:
does the content lead with a direct answer, is FAQ/schema markup present,
do FAQ answers avoid hedging. Never modifies the article — audit only.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Optional

log = logging.getLogger(__name__)

AGENT_ID = "ds_aeo"

FIRST_SENTENCE_MIN_WORDS = 20
FAQ_PAIRS_MIN = 3
PASS_SCORE = 70
TOTAL_CHECKS = 5

_HEDGE_OPENERS = ("in this article", "in this guide", "in this post")
_HEDGE_ANSWER_STARTS = ("it depends", "well, first", "well first")
_TAG_RE = re.compile(r"<[^>]+>")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


class AeoAuditError(RuntimeError):
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
            "action": "aeo_audit",
            "article_id": article_id,
            "result": result,
            "error": error,
        }).execute()
    except Exception as e:
        log.error("[%s] audit_log write failed: %s", AGENT_ID, e)


def _first_sentence(content_html: str) -> str:
    text = _TAG_RE.sub(" ", content_html)
    text = re.sub(r"\s+", " ", text).strip()
    sentences = _SENTENCE_SPLIT_RE.split(text)
    return sentences[0] if sentences else ""


def _starts_with_hedge(text: str, hedges: tuple[str, ...]) -> bool:
    lowered = text.strip().lower()
    return any(lowered.startswith(h) for h in hedges)


def audit_aeo(article_id: str, supabase_client: Optional[Any] = None) -> dict:
    """
    Audit article_id against AEO (Answer Engine Optimization) rules.
    Read-only — never modifies the article. Returns {article_id, passed,
    issues, aeo_score}. Raises AeoAuditError only if the article can't be
    read at all.
    """
    sb = supabase_client or _supabase()

    try:
        result = (
            sb.table("articles")
            .select("excerpt,content,faq_pairs,schema_faq")
            .eq("id", article_id)
            .single()
            .execute()
        )
    except Exception as exc:
        _audit(sb, article_id, "failure", str(exc)[:500])
        raise AeoAuditError(f"Article {article_id} not found") from exc

    row = result.data
    if not row:
        _audit(sb, article_id, "failure", "article not found")
        raise AeoAuditError(f"Article {article_id} not found")

    excerpt = (row.get("excerpt") or "").strip()
    content = row.get("content") or ""
    faq_pairs = row.get("faq_pairs") or []
    schema_faq = row.get("schema_faq")

    issues: list[str] = []
    checks_passed = 0

    first_sentence = _first_sentence(content)
    fs_word_count = len(first_sentence.split())
    if fs_word_count > FIRST_SENTENCE_MIN_WORDS and not _starts_with_hedge(first_sentence, _HEDGE_OPENERS):
        checks_passed += 1
    else:
        issues.append(
            f"first sentence ({fs_word_count} words) doesn't read as a direct answer — "
            "too short or opens with a hedge phrase"
        )

    if len(faq_pairs) >= FAQ_PAIRS_MIN:
        checks_passed += 1
    else:
        issues.append(f"faq_pairs has {len(faq_pairs)} — minimum {FAQ_PAIRS_MIN}")

    if schema_faq:
        checks_passed += 1
    else:
        issues.append("schema_faq is not populated")

    bad_answers = [
        pair.get("question", "?")
        for pair in faq_pairs
        if _starts_with_hedge(pair.get("answer", ""), _HEDGE_ANSWER_STARTS)
    ]
    if faq_pairs and not bad_answers:
        checks_passed += 1
    elif not faq_pairs:
        issues.append("no faq_pairs to check answer directness")
    else:
        issues.append(f"{len(bad_answers)} FAQ answer(s) hedge instead of answering directly")

    if excerpt and excerpt[-1] in ".!?" and not excerpt.endswith("..."):
        checks_passed += 1
    else:
        issues.append("excerpt doesn't end as a complete sentence (missing punctuation or truncated)")

    score = round((checks_passed / TOTAL_CHECKS) * 100)
    passed = score >= PASS_SCORE

    # Score is embedded in `result` since audit_log has no dedicated score
    # column — GET /api/articles/{id}/audit parses it back out.
    result_label = f"{'passed' if passed else 'failed'}:score={score}"
    _audit(sb, article_id, result_label, "; ".join(issues) if issues else None)

    return {"article_id": article_id, "passed": passed, "issues": issues, "aeo_score": score}
