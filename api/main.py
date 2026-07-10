"""
api/main.py — DecodedSix FastAPI backend.

n8n calls POST /api/pipeline/run to trigger the content pipeline.
n8n calls POST /agents/decodedsix/content to trigger DSX-CA1 (Session G).
Dashboard HITL approval calls POST /agents/decodedsix/publish/{article_id}.
The dashboard calls GET/PATCH /api/articles/{id} to review and approve/reject articles.
The map page calls GET /api/map/markers (public) and community/scraper
callers use POST/PATCH /api/map/markers (X-API-Key). n8n's daily schedule
calls POST /api/map/scrape (Bearer) to run DS-MAP-SCRAPE in the background.
The waitlist signup form calls POST /api/waitlist. GET /api/events is a
read-only stub for the future weekly events feature. POST
/api/distribute/linkedin posts a published article to LinkedIn; POST
/api/distribute/reddit only ever creates a reddit_drafts row (draft-only,
never auto-posts — ban risk).
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.articles import router as articles_router
from api.routes.content_agent import router as content_agent_router
from api.routes.distribute import router as distribute_router
from api.routes.events import router as events_router
from api.routes.map_markers import router as map_markers_router
from api.routes.map_scrape import router as map_scrape_router
from api.routes.pipeline import router as pipeline_router
from api.routes.waitlist import router as waitlist_router

app = FastAPI(title="DecodedSix API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("NEXT_PUBLIC_SITE_URL", "https://thedecodedsix.com"),
        "http://localhost:3000",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
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
app.include_router(map_scrape_router)
app.include_router(waitlist_router)
app.include_router(events_router)
app.include_router(distribute_router)
