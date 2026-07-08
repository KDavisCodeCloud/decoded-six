# DecodedSix — Agent Roster

## Content Pipeline Agents

| Agent ID | File | Model | Trigger |
|---|---|---|---|
| DS-DRAFT | agents/content/ds_draft.py | sonnet-4-6 | n8n cron / manual |
| DS-HUM | agents/content/ds_humanizer.py | sonnet-4-6 | After DS-DRAFT |
| DS-AEO | agents/content/ds_aeo.py | sonnet-4-6 | After DS-HUM |
| DS-SEO | agents/content/ds_seo.py | sonnet-4-6 | After DS-AEO |
| DS-DETECT | agents/content/ds_detect.py | haiku-4-5 | After DS-SEO |
| DS-COPYRIGHT | agents/content/ds_copyright.py | sonnet-4-6 | After DS-DETECT |

Pipeline: DS-DRAFT → DS-HUM → DS-AEO → DS-SEO → DS-DETECT → DS-COPYRIGHT → HITL → publish

## Map Agents

| Agent ID | File | Model | Trigger |
|---|---|---|---|
| DS-MAP-SCRAPE | agents/map/ds_map_scrape.py | haiku-4-5 | Daily 6am |
| DS-MAP-DRAFT | agents/map/ds_map_draft.py | sonnet-4-6 | After scrape |
| DS-MAP-DAILY | agents/map/ds_map_daily.py | sonnet-4-6 | Daily 8am |

## Revenue Agents (build after gates)

| Agent ID | File | Model | Build Trigger |
|---|---|---|---|
| DS-PROD | agents/revenue/ds_prod.py | sonnet-4-6 | Gate B cleared |
| DS-AFF | agents/revenue/ds_aff.py | sonnet-4-6 | Gate 2 cleared |

## YouTube Agents (build after Gate 1)

| Agent ID | File | Model | Trigger |
|---|---|---|---|
| DS-YT-SHORT | agents/youtube/ds_yt_short.py | sonnet-4-6 | Thursday 6am |
| DS-YT-STRATEGY | agents/youtube/ds_yt_strategy.py | sonnet-4-6 | Sunday 6am |
| DS-YT-UPLOAD | agents/youtube/ds_yt_upload.py | haiku-4-5 | After approval |

## Agent Schedules

### Pre-launch
DS-DRAFT: weekly Sunday 6am (build content bank)
All others: on-demand or after pipeline trigger

### Launch week
All content agents: every 6 hours
Map agents: daily

### Post-launch Month 1
All content agents: daily 6am
DS-YT-SHORT: Thursday 6am (always)
DS-YT-STRATEGY: Sunday 6am (always)

### Post-launch Month 2+
Content agents: 3x/week (Mon/Wed/Fri)
YouTube agents: unchanged

## LLM Routing
Default (analysis, drafting, AEO, humanizing): claude-sonnet-4-6
High volume (scraping, detection calls, upload): claude-haiku-4-5
Never use Opus unless explicitly instructed.

## HITL Requirements
Every agent output requires HITL approval before publish.
No autonomous publish path exists.
HITL queue renders in internal dashboard.
Dashboard path: /dashboard/content

## Audit Log
Every agent action writes to audit_log table.
Schema: agent_id, action, article_id, result, error, created_at
No silent failures — raise with descriptive message.
