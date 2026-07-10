# Session G — n8n Automation Workflows

Paste this prompt into Claude Code from `/mnt/c/Users/Kelvin/projects/decoded-six`.
Walk away — no input needed.

---

Read CLAUDE.md and EXECUTION_ORDER.md.

Task: Create the n8n workflow JSON files for DecodedSix automation. These are workflow
definitions only — no n8n UI access needed. Files go in `n8n/` directory.

**Context:**
n8n is self-hosted and can import workflow JSON directly. Each file is a complete
n8n workflow that can be imported via Settings > Import workflow.
Read any existing files in `n8n/` first.

---

**Workflow 1 — `n8n/daily_content_cron.json`**

Purpose: Trigger the content pipeline every day at 6 AM ET.

Nodes to include (in order):
1. **Schedule Trigger** — cron: `0 11 * * *` (6 AM ET = 11 UTC)
2. **Set** — defines `topic` from a list of 5 rotating GTA 6 topic strings:
   - "GTA 6 Vice City location details"
   - "GTA 6 character and story rumors"
   - "GTA 6 online multiplayer features"
   - "GTA 6 release date and pricing news"
   - "GTA 6 gameplay mechanics leaked details"
   Use `{{ $now.format('d') | int % 5 }}` to rotate by day of week.
3. **HTTP Request** — POST to `{{ $env.DECODEDSIX_API_URL }}/api/pipeline/run`
   Body: `{ "topic": "{{ $json.topic }}", "category": "news" }`
   Headers: `Authorization: Bearer {{ $env.DECODEDSIX_API_KEY }}`
4. **IF** — check `{{ $json.success }}` is true
5. **Slack** (on success) — send to `#decodedsix-content`:
   `✅ Draft queued: {{ $json.article_id }}`
6. **Slack** (on failure) — send to `#decodedsix-alerts`:
   `🚨 Content pipeline failed: {{ $json.error }}`

Output schema for each node: use n8n v1 JSON format with `id` (UUID), `name`, `type`,
`typeVersion`, `position`, `parameters`, `connections`.

---

**Workflow 2 — `n8n/hitl_notification.json`**

Purpose: Notify on Slack when a new article enters the HITL queue needing approval.

Nodes:
1. **Supabase Trigger** (or Webhook if Supabase trigger unavailable) — watch for
   INSERT on `articles` table where `status = 'hitl_review'`.
   If using Webhook: POST webhook URL is `{{ $env.N8N_WEBHOOK_BASE }}/decodedsix/hitl`
2. **HTTP Request** — GET `{{ $env.DECODEDSIX_API_URL }}/api/articles/{{ $json.record.id }}`
   to fetch full article details.
3. **Slack** — send to `#decodedsix-hitl`:
   ```
   👀 Article needs review
   Title: {{ $json.title }}
   Category: {{ $json.category }}
   Detection score: {{ $json.metadata.detection_score ?? 'not run' }}%
   Dashboard: {{ $env.DECODEDSIX_DASHBOARD_URL }}/dashboard/queue
   ```
4. **Supabase Update** — update `articles.hitl_notified = true` for the record

---

**Workflow 3 — `n8n/weekly_shorts_trigger.json`**

Purpose: Trigger YouTube Shorts generation every Tuesday at 9 AM ET.

Nodes:
1. **Schedule Trigger** — cron: `0 14 * * 2` (9 AM ET Tuesday = 14 UTC)
2. **HTTP Request** — POST to `{{ $env.DECODEDSIX_API_URL }}/api/shorts/generate`
   Body: `{ "week": "{{ $now.format('YYYY-[W]WW') }}" }`
   Headers: `Authorization: Bearer {{ $env.DECODEDSIX_API_KEY }}`
3. **IF** — check success
4. **Slack** (success) — `#decodedsix-content`: `🎬 Weekly short queued for week {{ $json.week }}`
5. **Slack** (failure) — `#decodedsix-alerts`: `🚨 Shorts trigger failed: {{ $json.error }}`

---

**Workflow 4 — `n8n/README.md`**

Create a README.md in the n8n/ directory:
```md
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
```

---

After writing all 4 files, verify valid JSON:
`python3 -c "import json; json.load(open('n8n/daily_content_cron.json')); print('OK')"`
`python3 -c "import json; json.load(open('n8n/hitl_notification.json')); print('OK')"`
`python3 -c "import json; json.load(open('n8n/weekly_shorts_trigger.json')); print('OK')"`

Do NOT install n8n. Do NOT start any servers. Do NOT modify any src/ files.

Output ✅ DONE or 🚫 BLOCKED then stop.
