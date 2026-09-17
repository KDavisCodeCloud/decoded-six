"""
Full discovery cycle: fetch all active sources -> cluster unclustered items
-> synthesize (dedup/angle/score) -> store topic_candidates. This is what
the 4-hour cron (and the FastAPI trigger route, for on-demand/manual runs)
calls.
"""

from __future__ import annotations

import logging
from typing import Any

from src.agents.discovery.fetchers import fetch_source  # noqa: F401 -- re-exported for callers/tests
from src.agents.discovery.run_fetch import run_fetch_cycle
from src.agents.discovery.synthesis import cluster_items, synthesize

log = logging.getLogger(__name__)


def run_discovery_cycle(sb: Any, anthropic_client: Any) -> dict:
    fetch_counts = run_fetch_cycle(sb)

    items = sb.table("discovery_items").select("*").eq("clustered", False).execute().data or []
    if not items:
        return {
            "fetch_counts": fetch_counts,
            "items_clustered": 0,
            "clusters_found": 0,
            "candidates_proposed": 0,
            "candidates_dropped": 0,
            "dropped_details": [],
        }

    clusters = cluster_items(items)

    published = (
        sb.table("articles").select("title, slug")
        .eq("product_id", "gta-hub").eq("status", "published")
        .execute().data or []
    )
    rejected_rows = (
        sb.table("topic_candidates").select("topic").eq("status", "rejected").execute().data or []
    )
    rejected_topics = [r["topic"] for r in rejected_rows]

    source_rows = sb.table("discovery_sources").select("id, default_tier").execute().data or []
    sources_by_id = {s["id"]: s for s in source_rows}

    results = synthesize(clusters, published, rejected_topics, sources_by_id, anthropic_client)

    proposed = 0
    dropped = 0
    dropped_details: list[dict] = []

    for r in results:
        cluster = clusters[r["cluster_index"]]
        item_ids = [item["id"] for item in cluster["items"]]

        try:
            sb.table("discovery_items").update({"clustered": True}).in_("id", item_ids).execute()
        except Exception as e:
            log.warning("[discovery] failed to mark items clustered: %s", e)

        if r["dropped"]:
            dropped += 1
            dropped_details.append({
                "title": cluster["representative_title"],
                "reason": r["drop_reason"],
            })
            continue

        try:
            sb.table("topic_candidates").insert({
                "product_id": "gta-hub",
                "topic": r["topic"],
                "angle": r["angle"],
                "source_item_ids": r["source_item_ids"],
                "source_urls": r["source_urls"],
                "score": r["score"],
                "suggested_article_type": r["suggested_article_type"],
                "suggested_template_variant": r["suggested_template_variant"],
                "update_of": r["update_of"],
                "status": "proposed",
            }).execute()
            proposed += 1
        except Exception as e:
            log.error("[discovery] failed to insert topic_candidate: %s", e)

    return {
        "fetch_counts": fetch_counts,
        "items_clustered": len(items),
        "clusters_found": len(clusters),
        "candidates_proposed": proposed,
        "candidates_dropped": dropped,
        "dropped_details": dropped_details,
    }
