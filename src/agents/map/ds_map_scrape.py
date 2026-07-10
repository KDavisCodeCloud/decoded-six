"""DS-MAP-SCRAPE — community map data ingestor for the interactive GTA 6 map.

Scrapes Reddit r/GTA6 (public search.json, no auth) and Rockstar's official
Newswire (best-effort HTML fetch — no confirmed RSS endpoint exists for it,
so a failure here is logged and skipped, never fatal to the run) for posts
that name a specific in-game location. Each candidate text is sanitized,
then passed to claude-haiku-4-5 (high volume — CLAUDE.md model routing rule,
never sonnet here) to decide whether it names a location with confident
coordinates. Confident extractions are inserted into map_markers as
source='agent_scraped', status='pending', verified=false — a human/HITL
pass promotes them from there. Writes one audit_log entry per run.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Optional

import requests

log = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
AGENT_ID = "ds_map_scrape"

REDDIT_SEARCH_URL = "https://www.reddit.com/r/GTA6/search.json"
NEWSWIRE_URL = "https://www.rockstargames.com/newswire"

VALID_CATEGORIES = (
    "money_spot", "vehicle_spawn", "property", "heist", "mission_start",
    "weapon_pickup", "health_armor", "collectible", "landmark", "daily_location",
)

_EXTRACTION_SYSTEM_PROMPT = (
    "You are a GTA 6 map data extractor. Given a single Reddit post or news "
    "announcement, decide whether it names a specific in-game map location "
    "(a money spot, vehicle spawn, property, heist, mission start, weapon "
    "pickup, health/armor pickup, collectible, landmark, or daily-reset "
    "location) with enough detail to place a map marker.\n\n"
    "Respond with ONLY a JSON object, no markdown fences, no commentary.\n\n"
    "If a specific location is named with real confidence:\n"
    '{"has_location": true, "name": "string", '
    f'"category": one of {list(VALID_CATEGORIES)!r}, '
    '"coordinates": {"lat": number, "lng": number} or null, '
    '"area_name": "string or null", '
    '"source_description": "one sentence describing what the source said"}\n\n'
    "Never guess coordinates you are not confident in — set coordinates to "
    "null instead. If no specific location is named at all:\n"
    '{"has_location": false}'
)


class MapScrapeError(RuntimeError):
    """Raised when the scrape run fails before per-item processing can happen
    (e.g. Anthropic client can't be constructed). Per-item extraction/insert
    failures are caught, counted, and logged — they never raise this."""


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


def _write_audit(
    supabase: Any,
    result: str,
    error: Optional[str] = None,
) -> None:
    supabase.table("audit_log").insert({
        "agent_id": AGENT_ID,
        "action": "scrape",
        "article_id": None,
        "result": result,
        "error": error,
    }).execute()


def _fetch_reddit_posts(http_client: Optional[Any] = None) -> list[str]:
    client = http_client or requests
    try:
        resp = client.get(
            REDDIT_SEARCH_URL,
            params={"q": "location map marker", "sort": "new", "limit": 25},
            headers={"User-Agent": "decodedsix-map-scraper/1.0"},
            timeout=15,
        )
        resp.raise_for_status()
        children = resp.json().get("data", {}).get("children", [])
    except Exception as exc:
        log.warning("[%s] Reddit fetch failed: %s", AGENT_ID, exc)
        return []

    posts = []
    for child in children:
        data = child.get("data", {})
        text = f"{data.get('title', '')}\n{data.get('selftext', '')}".strip()
        if text:
            posts.append(text)
    return posts


def _fetch_newswire_text(http_client: Optional[Any] = None) -> list[str]:
    """Best-effort — no confirmed RSS feed for the official Newswire, so this
    does a crude tag-strip of the HTML. Any failure (network, page layout
    change) is logged and treated as zero candidates, never fatal."""
    client = http_client or requests
    try:
        resp = client.get(
            NEWSWIRE_URL, timeout=15, headers={"User-Agent": "decodedsix-map-scraper/1.0"}
        )
        resp.raise_for_status()
        stripped = re.sub(r"<[^>]+>", " ", resp.text)
        stripped = re.sub(r"\s+", " ", stripped).strip()
        return [stripped[:4000]] if stripped else []
    except Exception as exc:
        log.warning("[%s] Newswire fetch failed: %s", AGENT_ID, exc)
        return []


def _parse_llm_json(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise MapScrapeError(f"LLM did not return valid JSON: {exc} — raw: {raw[:300]}") from exc


def _extract_marker(text: str, anthropic_client: Any) -> Optional[dict]:
    """Returns a validated extraction dict, or None if the item should be skipped
    (no location named, invalid category, or no confident coordinates)."""
    sanitized = shield.sanitize(text)[:2000]

    response = anthropic_client.messages.create(
        model=MODEL,
        max_tokens=512,
        temperature=0.2,
        system=_EXTRACTION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": sanitized}],
    )
    raw_text = "".join(block.text for block in response.content if block.type == "text")
    parsed = _parse_llm_json(raw_text)

    if not parsed.get("has_location"):
        return None
    if parsed.get("category") not in VALID_CATEGORIES:
        return None

    coordinates = parsed.get("coordinates")
    if not coordinates or coordinates.get("lat") is None or coordinates.get("lng") is None:
        return None

    return parsed


def scrape_map_data(
    supabase_client: Optional[Any] = None,
    anthropic_client: Optional[Any] = None,
    http_client: Optional[Any] = None,
) -> dict:
    """
    Runs one full scrape pass: Reddit + Newswire -> sanitize -> haiku extract
    -> insert confident markers as pending/agent_scraped.

    Returns {"inserted_count": int, "skipped_count": int, "errors": list[str]}.
    Writes exactly one audit_log entry for the batch run.
    """
    supabase = supabase_client or _get_supabase_client()

    try:
        anthropic = anthropic_client or _get_anthropic_client()
    except Exception as exc:
        try:
            _write_audit(supabase, "failure", error=str(exc))
        except Exception as audit_exc:
            log.error("[%s] failed to write failure audit_log entry: %s", AGENT_ID, audit_exc)
        raise MapScrapeError(f"ds_map_scrape failed to initialize Anthropic client: {exc}") from exc

    candidates: list[str] = []
    candidates.extend(_fetch_reddit_posts(http_client))
    candidates.extend(_fetch_newswire_text(http_client))

    inserted = 0
    skipped = 0
    errors: list[str] = []

    for text in candidates:
        try:
            extracted = _extract_marker(text, anthropic)
        except Exception as exc:
            skipped += 1
            errors.append(str(exc))
            log.warning("[%s] extraction failed, skipping item: %s", AGENT_ID, exc)
            continue

        if extracted is None:
            skipped += 1
            continue

        row = {
            "name": extracted["name"],
            "category": extracted["category"],
            "coordinates": extracted["coordinates"],
            "area_name": extracted.get("area_name"),
            "description": extracted.get("source_description"),
            "source": "agent_scraped",
            "status": "pending",
            "verified": False,
        }

        try:
            result = supabase.table("map_markers").insert(row).execute()
            if not result.data:
                raise MapScrapeError(f"Insert returned no data for marker {row['name']!r}")
            inserted += 1
        except Exception as exc:
            skipped += 1
            errors.append(str(exc))
            log.warning("[%s] insert failed for %r: %s", AGENT_ID, row.get("name"), exc)

    summary = {"inserted_count": inserted, "skipped_count": skipped, "errors": errors}

    try:
        audit_result = f"inserted={inserted}:skipped={skipped}"
        _write_audit(
            supabase,
            audit_result if not errors else f"{audit_result}:errors={len(errors)}",
            error="; ".join(errors[:5]) if errors else None,
        )
    except Exception as audit_exc:
        log.error("[%s] failed to write audit_log entry: %s", AGENT_ID, audit_exc)

    return summary


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    result = scrape_map_data()
    log.info(
        "Map scrape complete — inserted=%d skipped=%d errors=%d",
        result["inserted_count"], result["skipped_count"], len(result["errors"]),
    )


if __name__ == "__main__":
    main()
