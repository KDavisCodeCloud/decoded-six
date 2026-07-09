# DecodedSix API

FastAPI backend n8n calls to trigger the content pipeline, and the
internal dashboard calls to review/approve/reject/publish articles.

## Start locally

```
pip install -r requirements-api.txt
uvicorn api.main:app --reload --port 8001
```

## Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
DECODEDSIX_API_KEY   (leave empty in dev for no auth)
```

## Endpoints

- `GET /health` — liveness check, no auth
- `POST /api/pipeline/run` — `{"topic": str, "category": str}`, runs the
  content pipeline in the background, returns immediately
- `GET /api/articles/{id}` — fetch one article
- `PATCH /api/articles/{id}` — update `status` and/or `published_at`
  only (schema-derived allowlist — see api/routes/articles.py)

n8n points `DECODEDSIX_API_URL` to wherever this runs.
