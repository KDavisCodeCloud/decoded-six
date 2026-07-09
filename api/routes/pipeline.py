"""
api/routes/pipeline.py — n8n calls POST /api/pipeline/run to kick off the
content pipeline for a single article. Runs in the background so n8n
gets an immediate 200; the actual draft/humanize/detect/copyright run
happens out-of-process via `python -m src.agents.content.pipeline`.
"""

import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from api.auth import require_api_key

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# api/routes/pipeline.py -> api/routes -> api -> repo root (matches the
# Path(__file__).resolve().parents[N] convention used in src/agents/content/*).
REPO_ROOT = Path(__file__).resolve().parents[2]


class PipelineRequest(BaseModel):
    topic: str
    category: str = "news"


class PipelineResponse(BaseModel):
    success: bool
    article_id: Optional[str] = None
    error: Optional[str] = None


@router.post("/run", response_model=PipelineResponse)
async def run_pipeline(
    body: PipelineRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_api_key),
):
    # DataSanitizationShield-style pre-filter: reject topics with suspicious content
    # before they ever reach the pipeline/LLM.
    if len(body.topic) > 200 or any(c in body.topic for c in ["<", ">", "`", ";"]):
        raise HTTPException(status_code=400, detail="Invalid topic")

    background_tasks.add_task(_run_pipeline_task, body.topic, body.category)
    return PipelineResponse(success=True)


def _run_pipeline_task(topic: str, category: str) -> None:
    try:
        result = subprocess.run(
            [sys.executable, "-m", "src.agents.content.pipeline", "--topic", topic, "--category", category],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=REPO_ROOT,
        )
        if result.returncode != 0:
            _log_error("pipeline_trigger", result.stderr)
    except Exception as exc:  # noqa: BLE001 — background task, never propagate to the request
        _log_error("pipeline_trigger", str(exc))


def _log_error(agent_id: str, message: str) -> None:
    """Best-effort audit log — never raises if Supabase is unavailable.
    Matches audit_log's real columns (migrations/003_content_pipeline.sql):
    id, agent_id, action, article_id, result, error, created_at.
    """
    try:
        from supabase import create_client

        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if url and key:
            client = create_client(url, key)
            client.table("audit_log").insert({
                "agent_id": agent_id,
                "action": "pipeline_trigger_failed",
                "result": "failure",
                "error": message[:500],
            }).execute()
    except Exception:
        pass
