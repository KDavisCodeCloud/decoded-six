"""DS-HUM — humanizer pass, applies docs/VOICE.md rules to reduce AI-detectability.

Takes an article_id, reads the current draft content, rewrites it via
Anthropic using the VOICE.md rules as a system prompt, then runs a
deterministic pass that guarantees the two purely mechanical rules (no em
dashes, no banned buzzwords) hold even if the rewrite misses one. Updates
articles.content in place; writes an audit_log entry as the record of the pass.
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
VOICE_MD_PATH = REPO_ROOT / "docs" / "VOICE.md"

MODEL = "claude-sonnet-4-6"
AGENT_ID = "ds_humanizer"

# Mechanically enforceable regardless of what the LLM rewrite produces —
# docs/VOICE.md "Words That Never Appear" + rule 3.
BANNED_WORDS = [
    "ultimate", "comprehensive", "everything you need to know", "deep dive",
    "game-changing", "revolutionary", "incredible", "amazing", "awesome",
    "excited", "thrilled", "journey", "leverage",
]

_EM_DASH_RE = re.compile(r"[—–]")  # em dash + en dash — classic AI tell
_UTILIZE_RE = re.compile(r"\butilize\b", re.IGNORECASE)
_IN_ORDER_TO_RE = re.compile(r"\bin order to\b", re.IGNORECASE)
_WHITESPACE_RE = re.compile(r"[ \t]{2,}")
_BLANK_LINES_RE = re.compile(r"\n{3,}")


def _md_inline(text: str) -> str:
    text = re.sub(r'\*\*([^*\n]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'__([^_\n]+)__', r'<strong>\1</strong>', text)
    text = re.sub(r'\*([^*\n]+)\*', r'<em>\1</em>', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r"<a href='\2'>\1</a>", text)
    return text


def _md_to_html(text: str) -> str:
    """Convert markdown → HTML. Safety net: if LLM ignores HTML instructions."""
    if re.search(r'<(h[23]|ul|ol|section|figure)\b', text, re.IGNORECASE):
        # Already has structural HTML — only fix any stray inline markdown
        return re.sub(r'(?<=>)[^<]+(?=<)', lambda m: _md_inline(m.group(0)), text)

    lines = text.split('\n')
    output: list[str] = []
    in_ul = in_ol = False
    para: list[str] = []

    def flush():
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


class HumanizeError(RuntimeError):
    """Raised when the humanizer pass fails at any stage."""


def _get_supabase_client() -> Any:
    from supabase import create_client

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _get_anthropic_client() -> Any:
    from anthropic import Anthropic

    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def _load_voice_rules() -> str:
    if not VOICE_MD_PATH.exists():
        raise HumanizeError(f"VOICE.md not found at {VOICE_MD_PATH}")
    return VOICE_MD_PATH.read_text()


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


def _mechanical_pass(text: str) -> str:
    """Deterministic guarantee for the two purely mechanical VOICE.md rules."""
    text = _EM_DASH_RE.sub(",", text)
    text = _UTILIZE_RE.sub("use", text)
    text = _IN_ORDER_TO_RE.sub("to", text)
    for word in BANNED_WORDS:
        text = re.sub(re.escape(word), "", text, flags=re.IGNORECASE)
    text = _WHITESPACE_RE.sub(" ", text)
    text = _BLANK_LINES_RE.sub("\n\n", text)
    return text.strip()


def humanize_article(
    article_id: str,
    supabase_client: Optional[Any] = None,
    anthropic_client: Optional[Any] = None,
) -> dict:
    """
    Rewrite articles.content for article_id to sound human per VOICE.md, in place.

    Returns {article_id, content}. Raises HumanizeError on failure — an
    audit_log entry is written either way.
    """
    supabase = supabase_client or _get_supabase_client()

    try:
        row_result = (
            supabase.table("articles").select("content").eq("id", article_id).single().execute()
        )
        if not row_result.data:
            raise HumanizeError(f"Article {article_id} not found")
        draft_content = row_result.data["content"]

        voice_rules = _load_voice_rules()
        anthropic = anthropic_client or _get_anthropic_client()

        system = (
            f"{voice_rules}\n\n"
            "Rewrite the article below to follow every voice rule above exactly. "
            "Do not add new facts. Do not change the meaning. Sound like a human "
            "player wrote it, not an AI.\n\n"
            "CRITICAL — markdown preservation rules:\n"
            "- The input is markdown. Your output MUST also be markdown.\n"
            "- Preserve all markdown formatting exactly: ## headings, ### sub-headings, "
            "**bold**, *italic*, - bullet lists, numbered lists, ![img](url) image embeds, "
            "[text](url) links.\n"
            "- Preserve every image embed line (![caption](url)) exactly as written.\n"
            "- Preserve every credit line (*Image credit: Rockstar Games*) exactly as written.\n"
            "- Do not modify, remove, or paraphrase image or credit lines.\n"
            "- Put a blank line between every paragraph. Never collapse paragraphs.\n"
            "- Keep ## and ### headings on their own lines with blank lines before and after.\n"
            "- Return ONLY the rewritten article body — no commentary, no code fences."
        )
        response = anthropic.messages.create(
            model=MODEL,
            max_tokens=2048,
            temperature=0.5,
            system=system,
            messages=[{"role": "user", "content": draft_content}],
        )
        rewritten = "".join(block.text for block in response.content if block.type == "text")

        final_content = _mechanical_pass(rewritten)

        update_result = (
            supabase.table("articles")
            .update({"content": final_content})
            .eq("id", article_id)
            .execute()
        )
        if not update_result.data:
            raise HumanizeError(f"Update to articles failed for {article_id}")

        _write_audit(supabase, article_id, "humanize", "success")

        return {"article_id": article_id, "content": final_content}

    except Exception as exc:
        try:
            _write_audit(supabase, article_id, "humanize", "failure", error=str(exc))
        except Exception as audit_exc:
            log.error("[ds_humanizer] failed to write failure audit_log entry: %s", audit_exc)
        if isinstance(exc, HumanizeError):
            raise
        raise HumanizeError(f"ds_humanizer failed: {exc}") from exc
