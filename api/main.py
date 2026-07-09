"""
api/main.py — DecodedSix FastAPI backend.

n8n calls POST /api/pipeline/run to trigger the content pipeline.
n8n calls POST /agents/decodedsix/content to trigger DSX-CA1 (Session G).
Dashboard HITL approval calls POST /agents/decodedsix/publish/{article_id}.
The dashboard calls GET/PATCH /api/articles/{id} to review and approve/reject articles.
The map page calls GET /api/map/markers (public) and community/scraper
callers use POST/PATCH /api/map/markers (X-API-Key). The waitlist signup
form calls POST /api/waitlist. GET /api/events is a read-only stub for the
future weekly events feature.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.articles import router as articles_router
from api.routes.content_agent import router as content_agent_router
from api.routes.events import router as events_router
from api.routes.map_markers import router as map_markers_router
from api.routes.pipeline import router as pipeline_router
from api.routes.waitlist import router as waitlist_router

app = FastAPI(title="DecodedSix API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("NEXT_PUBLIC_SITE_URL", "https://thedecodedsix.com"),
        "http://localhost:3000",
        "http://localhost:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "decodedsix-api"}


app.include_router(pipeline_router)
app.include_router(content_agent_router)
app.include_router(articles_router)
app.include_router(map_markers_router)
app.include_router(waitlist_router)
app.include_router(events_router)
