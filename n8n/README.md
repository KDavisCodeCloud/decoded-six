# n8n Workflows — DecodedSix

Import each JSON file via n8n Settings > Import workflow.

## Required environment variables in n8n
Set these under Settings > Variables:
- DECODEDSIX_API_URL — FastAPI base URL (no trailing slash)
- DECODEDSIX_API_KEY — API bearer token for FastAPI
- DECODEDSIX_DASHBOARD_URL — https://decodedsix.com
- N8N_WEBHOOK_BASE — n8n public URL for webhook triggers
- SLACK_BOT_TOKEN — Slack bot token (if using Slack node)

### DECODEDSIX_API_KEY is a THREE-sided shared secret
The same value must be identical in all three places or workflows 401:

1. **Railway** `decoded-six` service — the authoritative copy; this is what
   `api/auth.py:require_api_key` compares `Authorization: Bearer <key>`
   against, and what `api/routes/map_markers.py` compares `X-API-Key`
   against.
2. **Vercel** production + preview — the HITL approve route sends it when
   triggering translation and revision.
3. **n8n Cloud** (thedecodedsix.app.n8n.cloud) — only for whichever workflows
   are actually imported AND actually reference the key. See the warning
   below: the JSON in this directory is NOT the deployed state.

n8n Cloud variables cannot be set from the CLI or from this repo — they are
a manual dashboard edit, under the **Variables tab on the Overview page**
(alongside Workflows / Credentials / Executions), NOT under Settings or the
Admin Panel. Rotate all three in the same sitting, and remember the Railway
and Vercel sides each need a redeploy to pick the new value up. Rotated
2026-10-01 from a 21-char passphrase to 32 random bytes
(`openssl rand -base64 32`).

## WARNING — this directory is a spec, not the deployed state
Confirmed 2026-10-02 against the live n8n Cloud instance: the workflows
running there do not match these files. The instance showed 8 workflows
including "DecodedSix — Daily Content Cron" (still Published, even though
`daily_content_cron.json` was retired from this repo in c35e2e4) and
"decodedsix_content_flow" (no file here by that name), while
`discovery_fetch_cron.json` ("DSX-Discovery Fetch + Synthesis — Every 4h")
and `map_scrape_workflow.json` ("DecodedSix — Daily Map Scrape") did not
appear at all — consistent with `topic_candidates` having received no rows
since 2026-09-17.

Never quote a cron schedule or an active-workflow claim out of these JSON
files as if it were live. Check the n8n instance.

Also note these files use `{{ $env.NAME }}`. On n8n **Cloud**, custom values
are the Variables feature (`$vars.NAME`, Pro/Enterprise plans); `$env` reads
the instance's own config env, which Cloud users cannot set and which is
gated by `N8N_BLOCK_ENV_ACCESS_IN_NODE`. If an imported workflow fails on a
credentials/auth step, suspect `$env` resolving to nothing before suspecting
the key value itself.

If the key is UNSET on Railway the API runs with no auth at all (dev mode,
see api/auth.py) — a mismatch there fails open, not closed.

## Workflows
- daily_content_cron.json — triggers content pipeline at 6 AM ET daily
- hitl_notification.json — Slack alert when article enters HITL queue
- weekly_shorts_trigger.json — triggers YouTube Shorts generation Tuesdays

## Activate after import
Each workflow must be manually activated after import.
Set all credentials before activating.

## Workflow details

### daily_content_cron.json
Fires a Schedule Trigger at `0 11 * * *` (11 UTC = 6 AM ET). Picks one of five
rotating GTA 6 topics by day of month (`$now.format('d') % 5`), POSTs it to
`{{ DECODEDSIX_API_URL }}/api/pipeline/run` with `category: "news"`, then
branches on `{{ $json.success }}`: success posts the queued article id to
`#decodedsix-content`, failure posts the error to `#decodedsix-alerts`.

### hitl_notification.json
Triggered by a Webhook at `{{ N8N_WEBHOOK_BASE }}/decodedsix/hitl` — point a
Supabase database webhook at this URL for INSERT/UPDATE on `articles` where
`status` moves into review. Fetches the full article via
`GET {{ DECODEDSIX_API_URL }}/api/articles/{id}`, posts a review summary
(title, category, detection score, dashboard link) to `#decodedsix-hitl`,
then `PATCH`es the article with `hitl_notified: true` so the same record
doesn't re-notify on a later unrelated update.

### weekly_shorts_trigger.json
Fires a Schedule Trigger at `0 14 * * 2` (14 UTC = 9 AM ET Tuesday). POSTs
the current ISO week (`YYYY-[W]WW`) to
`{{ DECODEDSIX_API_URL }}/api/shorts/generate`, then branches on
`{{ $json.success }}` the same way the daily content cron does, posting to
`#decodedsix-content` or `#decodedsix-alerts`.

## Import instructions
1. Open the n8n dashboard.
2. Workflows → Import from File.
3. Select the JSON file.
4. Attach a Slack credential to each Slack node (Bot Token). The HTTP
   Request nodes read `DECODEDSIX_API_URL`/`DECODEDSIX_API_KEY` directly
   from environment variables — no separate credential object needed there.
5. Activate the workflow.
6. Trigger a manual test run and check the execution log before relying on
   the schedule/webhook.

## Known gap — hitl_notification.json's trigger condition
This workflow (and the FastAPI/Supabase side it depends on) assumes
`articles.status` can become `'hitl_review'`. The real schema
(`migrations/001_decodedsix_core.sql`) has no such value — its `status`
CHECK constraint is `('draft','pending_review','approved','published','archived')`.
Before wiring the actual Supabase database webhook that calls this
workflow, either add `'hitl_review'` to that CHECK constraint or point the
webhook at `status = 'pending_review'` instead and update this doc.
Not fixed here — `migrations/` and `src/` were out of scope for this task
(workflow JSON only).

## Superseded — older content_queue-based README
This README previously documented a different, more elaborate workflow set
(`content-pipeline.json`, `map-scraper.json`, `daily-locations.json`,
`weekly-challenge-short.json`, `yt-strategy-optimizer.json`,
`agent-schedules.json`) built around a `content_queue` table with a `stage`
field, none of which existed as actual files in this directory — only this
README described them. That architecture may still be the long-term plan;
the three workflows above are what's actually built and importable today,
using a simpler pattern (n8n → FastAPI REST endpoints → Slack) instead of
n8n polling Supabase directly.
