# DecodedSix

DecodedSix (thedecodedsix.com) is a GTA 6 fan-utility website: a dark-editorial
news and reference hub for the game, built around an interactive in-game map
(Leonida) that goes live on launch day behind a feature flag, plus an
automated content pipeline (news articles, guides, YouTube video packages)
that runs through a human-in-the-loop approval queue before anything
publishes. A separate, family-only internal dashboard (GTA/Vice-City themed)
is used to review and approve that content, manage the map's community
markers, and monitor the pipeline.

## Tech stack

**Frontend** — Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS.
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for auth, database,
  realtime, and RLS
- Leaflet / `react-leaflet` / `react-leaflet-cluster` for the interactive map
- Framer Motion for animation
- `next-intl` for internationalization (site is translated into multiple
  locales via `src/app/[locale]/...`)
- `react-markdown` + `remark-gfm` + `rehype-raw` for rendering article/guide
  content

**Backend** — Python 3, FastAPI (`api/`), driving:
- A content pipeline and content agents (`agents/content`, `agents/map`,
  `agents/revenue`, `agents/youtube`) that draft articles, scrape/update map
  markers, and assemble YouTube video packages
- n8n (self-hosted, `n8n/`) for scheduling/triggering the pipeline and for
  post-approval distribution webhooks

**Deployment** — Vercel (frontend). `railway.toml` / `nixpacks.toml` are also
present, indicating the FastAPI backend/agents can be deployed to Railway.

**Database** — Supabase Postgres, with numbered SQL migrations in
`migrations/001` through `008` (core schema, map schema, content pipeline,
YouTube agents, revenue intelligence, gates/learning, articles HITL trigger,
waitlist).

## Project structure

```
src/app/
  [locale]/          Public, translated site: about, characters, guides,
                      gta-6-complete-guide, map, news, rumors, subscribe,
                      vehicles
  dashboard/          Internal family-only dashboard: agents, analytics,
                      content, gates, map, queue (GTA-themed, separate
                      design system from the public site)
  auth/               Supabase auth callback / sign-out routes
  api/                Next.js API routes: agents, articles, dashboard,
                      map-markers, newsletter, track, waitlist
agents/               Python content/map/revenue/YouTube automation agents
api/                  FastAPI backend (main.py, auth.py, routes/)
migrations/           Supabase SQL migrations (001–008)
n8n/                  n8n workflow definitions (e.g. post-approval
                      distribution)
docs/                 Architecture, agents, env setup, gates, map spec,
                      voice/editorial docs, affiliate config
scripts/              Utility scripts (e.g. map tile generation)
messages/             next-intl translation message files
```

## Setup

Requires Node.js 22.x (pinned via `.nvmrc` and `package.json`'s
`engines.node`) and Python 3.11+.

```bash
# Frontend
npm install

# Python backend / agents (separate dependency sets)
pip install -r requirements-api.txt      # FastAPI backend only
pip install -r requirements-agents.txt   # content pipeline agents only
# requirements.txt is the union of both, if you want everything at once
```

Copy `.env.example` to `.env.local` and fill in the values (see
`docs/ENV_SETUP.md` for where to get each one). Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — Supabase project
- `NEXT_PUBLIC_MAP_LIVE` — feature flag; the real interactive map only
  renders when `true` (stays `false` until launch day)
- `NEXT_PUBLIC_MAP_TILE_URL` — self-hosted Leonida tile pyramid; falls back
  to the CARTO dark basemap when empty
- `DECODEDSIX_API_URL`, `DECODEDSIX_API_KEY` — FastAPI backend URL and auth
  key for on-demand agent triggers from the dashboard
- `ANALYTICS_SALT_SECRET` — salt for first-party session-id hashing
  (`src/lib/analytics.ts`)
- `N8N_POST_APPROVAL_WEBHOOK_URL` — fired after an article is published;
  publishing no-ops silently if unset
- `ANTHROPIC_API_KEY`, `ORIGINALITY_API_KEY`, `ELEVENLABS_API_KEY`,
  `INVIDEO_API_KEY` — content generation, originality checking, voiceover,
  and video assembly for the content/YouTube agents
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`,
  `YOUTUBE_CHANNEL_ID` — YouTube upload/analytics
- `SYSTEME_TAG_DS_MAP_WAITLIST`, `SYSTEME_API_KEY` — Systeme.io waitlist
  integration
- `AMAZON_ASSOCIATE_TAG` — affiliate tracking
- `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN` — LinkedIn distribution
  (`api/routes/distribute.py`)

## Running locally

```bash
# Frontend (runs on port 3005, not the Next.js default 3000)
npm run dev

# FastAPI backend
uvicorn api.main:app --reload --port 8001
```

Other frontend scripts: `npm run build`, `npm run start`, `npm run lint`.

The FastAPI backend exposes `GET /health` for a liveness check, plus routes
under `/api/pipeline`, `/api/articles`, `/api/map`, `/api/waitlist`,
`/api/hitl-queue`, `/api/translate`, `/api/distribute`, and
`/agents/decodedsix/*` — see `api/README.md` for the full list. n8n
schedules/triggers most of these; the dashboard calls the article and
publish endpoints directly for the HITL review flow.

---

**Built by** [Kelvin Davis](https://www.linkedin.com/in/kelvin-davis) — flagship product: [Cloud Decoded](https://theclouddecoded.com)
