"""
api/routes/discovery.py

POST /agents/decodedsix/discovery/run — runs one full fetch+synthesis cycle
  synchronously, returns per-source item counts and the candidate/drop
  summary. Called by the 4-hour n8n cron and available for on-demand runs.
POST /agents/decodedsix/discovery/generate-next — background task, pulls the
  oldest 'queued' topic_queue row and runs the real content agent (or the
  update-block agent, if the row is flagged update_of) against it. Returns
  immediately, same fire-and-forget shape as /agents/decodedsix/content --
  the result lands on the topic_queue row and, for new articles, in
  hitl_queue, same as every other DSX-CA1 run.

Topic-candidate approve/reject is a Next.js API route
(src/app/api/discovery/candidates/[id]/review/route.ts), not here -- those
are plain DB status writes with no LLM/agent work involved, same split as
articles review (Next.js) vs. revise (this backend).
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from api.auth import require_api_key

router = APIRouter(prefix="/agents/decodedsix/discovery", tags=["discovery"])
log = logging.getLogger(__name__)


class RunResponse(BaseModel):
    success: bool
    fetch_counts: dict = {}
    items_clustered: int = 0
    clusters_found: int = 0
    candidates_proposed: int = 0
    candidates_dropped: int = 0
    dropped_details: list = []
    error: Optional[str] = None


class GenerateNextResponse(BaseModel):
    success: bool
    queue_id: Optional[str] = None
    message: Optional[str] = None


def _clients():
    from supabase import create_client
    from anthropic import Anthropic
    sb = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )
    ai = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return sb, ai


@router.post("/run", response_model=RunResponse)
async def run_discovery(_: None = Depends(require_api_key)) -> RunResponse:
    try:
        from src.agents.discovery.run_cycle import run_discovery_cycle
        sb, ai = _clients()
        result = run_discovery_cycle(sb, ai)
        return RunResponse(success=True, **result)
    except Exception as exc:
        log.error("[discovery] /run failed: %s", exc)
        return RunResponse(success=False, error=str(exc))


@router.post("/generate-next", response_model=GenerateNextResponse)
async def generate_next(
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
) -> GenerateNextResponse:
    sb, _ai = _clients()
    row = (
        sb.table("topic_queue").select("*").eq("status", "queued")
        .order("created_at").limit(1).execute().data
    )
    if not row:
        return GenerateNextResponse(success=False, message="topic_queue is empty — nothing to generate")

    queue_row = row[0]
    sb.table("topic_queue").update({"status": "generating"}).eq("id", queue_row["id"]).execute()
    background_tasks.add_task(_run_from_queue, queue_row)
    return GenerateNextResponse(success=True, queue_id=queue_row["id"])


def _run_from_queue(queue_row: dict) -> None:
    from supabase import create_client
    from anthropic import Anthropic

    sb = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    try:
        if queue_row.get("update_of"):
            from src.agents.content.content_agent import run_update_agent
            ai = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
            result = run_update_agent(
                slug=queue_row["update_of"],
                topic=queue_row["topic"],
                fact_brief=queue_row["fact_brief"],
                supabase_client=sb,
                anthropic_client=ai,
            )
            sb.table("topic_queue").update({
                "status": "generated",
                "article_id": result["article_id"],
            }).eq("id", queue_row["id"]).execute()
        else:
            from src.agents.content.content_agent import run_content_agent
            result = run_content_agent(
                article_type=queue_row["article_type"],
                topic_seed=queue_row["topic"],
                fact_brief=queue_row["fact_brief"],
                supabase_client=sb,
            )
            sb.table("topic_queue").update({
                "status": "generated",
                "article_id": result["article_id"],
            }).eq("id", queue_row["id"]).execute()

        sb.table("topic_candidates").update({"status": "used"}).eq("id", queue_row["candidate_id"]).execute()

    except Exception as exc:
        log.error("[discovery] generate-next failed for queue row %s: %s", queue_row["id"], exc)
        sb.table("topic_queue").update({
            "status": "failed",
            "error": str(exc),
        }).eq("id", queue_row["id"]).execute()
