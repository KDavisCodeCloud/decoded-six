# n8n Workflows — DecodedSix

Import each JSON file via n8n Settings > Import workflow.

## Required environment variables in n8n
Set these under Settings > Variables:
- DECODEDSIX_API_URL — FastAPI base URL (no trailing slash)
- DECODEDSIX_API_KEY — API bearer token for FastAPI
- DECODEDSIX_DASHBOARD_URL — https://decodedsix.com
- N8N_WEBHOOK_BASE — n8n public URL for webhook triggers
- SLACK_BOT_TOKEN — Slack bot token (if using Slack node)

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
