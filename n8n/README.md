# DecodedSix — n8n Workflows

All automation crons for DecodedSix run through the self-hosted n8n instance.

## Workflows

| File | Agent Triggered | Schedule |
|---|---|---|
| content-pipeline.json | DS-DRAFT → full pipeline | Sun 6am (pre-launch), Daily 6am (post-launch M1) |
| map-scraper.json | DS-MAP-SCRAPE → DS-MAP-DRAFT | Daily 6am |
| daily-locations.json | DS-MAP-DAILY | Daily 8am |
| weekly-challenge-short.json | DS-YT-SHORT → ElevenLabs → InVideo → HITL | Thursday 6am |
| yt-strategy-optimizer.json | DS-YT-STRATEGY | Sunday 6am |
| agent-schedules.json | All schedule metadata | Reference only — not executed |

## Import Instructions
1. Open n8n dashboard
2. Workflows → Import from File
3. Select the JSON file
4. Activate the workflow
5. Verify first run in execution log

## Environment Variables (n8n)
Add these in n8n Settings → Variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ORIGINALITY_API_KEY
- ELEVENLABS_API_KEY
- INVIDEO_API_KEY
- YOUTUBE_REFRESH_TOKEN
- YOUTUBE_CHANNEL_ID

## HITL Integration
All agent outputs write to Supabase content_queue table.
n8n polls content_queue for stage = 'hitl_pending'.
Dashboard renders HITL items from that table.
Approval in dashboard updates stage to 'approved'.
n8n picks up approved items and triggers publish.
