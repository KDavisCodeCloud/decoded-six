"""
Fetch stage: reads active discovery_sources, runs each through its fetcher,
dedupes by URL (both within this run and against already-stored items via
the DB's UNIQUE constraint on discovery_items.url), inserts new rows.
"""

from __future__ import annotations

import logging
from typing import Any

from src.agents.discovery.fetchers import fetch_source

log = logging.getLogger(__name__)


def run_fetch_cycle(sb: Any) -> dict[str, int]:
    """Returns {source_name: new_item_count} for reporting."""
    sources = sb.table("discovery_sources").select("*").eq("active", True).execute().data or []

    counts: dict[str, int] = {}
    seen_urls_this_run: set[str] = set()

    for source in sources:
        try:
            items = fetch_source(source["source_type"], source["fetch_url"], source.get("keyword_filter"))
        except Exception as e:
            log.error("[discovery] fetch failed for source %s: %s", source["name"], e)
            counts[source["name"]] = 0
            continue

        inserted = 0
        for item in items:
            if item["url"] in seen_urls_this_run:
                continue
            seen_urls_this_run.add(item["url"])

            row = {
                "product_id": "gta-hub",
                "source_id": source["id"],
                "title": item["title"][:500],
                "url": item["url"][:1000],
                "published_at": item.get("published_at"),
                "snippet": (item.get("snippet") or "")[:1000],
            }
            try:
                # UNIQUE(url) does the cross-run dedupe -- a duplicate URL
                # from a prior fetch cycle just fails this insert, which is
                # the correct outcome, not an error worth surfacing.
                sb.table("discovery_items").insert(row).execute()
                inserted += 1
            except Exception as e:
                if "duplicate key" not in str(e) and "23505" not in str(e):
                    log.warning("[discovery] item insert failed (%s): %s", item["url"], e)

        counts[source["name"]] = inserted

    return counts
