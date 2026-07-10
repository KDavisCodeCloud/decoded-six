"""
api/routes/map_scrape.py — POST /api/map/scrape triggers DS-MAP-SCRAPE's
community map data ingestion as a background task. n8n's daily schedule
(n8n/map_scrape_workflow.json) calls this at 8am MST.

Uses api.auth.require_api_key (Authorization: Bearer) rather than
map_markers.py's require_map_api_key (X-API-Key) — this is an
internal/n8n-triggered route, not a community-submission endpoint.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel

from api.auth import require_api_key

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/map", tags=["map"])


class ScrapeResponse(BaseModel):
    success: bool


@router.post("/scrape", response_model=ScrapeResponse)
async def trigger_map_scrape(
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
) -> ScrapeResponse:
    background_tasks.add_task(_run_scrape_task)
    return ScrapeResponse(success=True)


def _run_scrape_task() -> None:
    try:
        from src.agents.map.ds_map_scrape import scrape_map_data

        scrape_map_data()
    except Exception as exc:
        # Background task — error is already written to audit_log by the agent itself.
        log.error("[ds_map_scrape] background run failed: %s", exc)
