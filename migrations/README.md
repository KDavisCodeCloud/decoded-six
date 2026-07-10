# DecodedSix — Root `migrations/` — DEAD, DO NOT RUN

**This directory is not connected to the real database.** The live schema
is built from `supabase/migrations/` instead — that's what
`src/lib/types.ts` and the actual app code (`news/page.tsx`,
`news/[slug]/page.tsx`, `src/agents/content/*`) query against. This has
been confirmed independently by two prior sessions after one of them built
against this folder first and had to redo the work. See
`supabase/migrations/002_content_pipeline_agents.sql`'s header comment for
the `audit_log` instance of the same mistake.

The files below are kept for history, not because they're runnable. If a
future task prompt asks for a migration under `migrations/NNN_*.sql`,
stop and check whether the table already exists in `supabase/migrations/`
first — it very likely does, under a different (usually more current)
schema, and the real target is `supabase/migrations/`, not here.

## What's in this directory

1. `001_decodedsix_core.sql` — articles, affiliate_programs, affiliate_clicks, affiliate_conversions
2. `002_map_schema.sql` — map_markers, map_areas, user_saved_markers
3. `003_content_pipeline.sql` — content_queue, content_calendar, audit_log
4. `004_youtube_agents.sql` — youtube_videos, yt_strategy_cards, agent_schedules
5. `005_revenue_intelligence.sql` — ds_prod_recommendations, ds_aff_recommendations
6. `006_gates_and_learning.sql` — monetization_gates (seeded), learning_outcomes
7. `008_waitlist.sql` — waitlist_emails

There is no `007` — an earlier waitlist migration was written as `007` and
then renumbered to `008` while reconciling a naming conflict; the number
was not reused.

The real, live equivalents live in `supabase/migrations/`:
`001_schema.sql` (articles, map_markers, vehicles, weekly_events,
agents_log), `002_content_pipeline_agents.sql` (audit_log,
articles.ai_detect_score), `003_hitl_queue.sql` (hitl_queue). Read
`src/lib/types.ts` alongside those before writing any query or migration
against this repo's database.

## Reconciliation note (Session 9)

A task ("Session 9 — DecodedSix Supabase Migrations") specified new
migrations for `articles`, `audit_log`, `waitlist_emails`, and
`monetization_gates` under filenames `001`–`005` in this (dead) directory,
plus a genuinely new `hitl_queue` table. All four of the non-new tables
already existed here, each with a schema that diverges from what was
requested:

- **articles** (`001_decodedsix_core.sql`) uses `article_type` (not
  `category`) and a `status` enum of `draft/pending_review/approved/
  published/archived` (no `hitl_review`, `humanizing`, `detecting`,
  `copyright_check`, or `flagged`). No `product_id`, `image_url`,
  `metadata`, `hitl_notified`, or `agent_generated` columns. (The real,
  live `articles` table in `supabase/migrations/001_schema.sql` is
  different again — see that file and `src/lib/types.ts`.)
- **audit_log** (`003_content_pipeline.sql`) uses `article_id`/`result`/
  `error` instead of `resource_id`/`outcome`/`metadata`, and has no
  `product_id`. (A real `audit_log` with the same article_id/result/error
  shape already exists live too, in `supabase/migrations/002_content_pipeline_agents.sql`.)
- **waitlist_emails** (`008_waitlist.sql`) is functionally equivalent to
  what Session 9 wanted, just with different policy names
  (`service_role_all_waitlist_emails` vs `service_role_all`) and no
  `source` column.
- **monetization_gates** (`006_gates_and_learning.sql`) is a materially
  different, already-seeded table: metric-driven gates
  (`gate_code`/`gate_type`/`metric_key`/`metric_target`/`metric_current`,
  e.g. `GATE_1` = "AdSense Ready" tied to `published_articles >= 20`)
  rather than Session 9's build-milestone gates (`GATE_1` = "Content
  Pipeline Live"). These aren't reconcilable as the same table without
  picking one taxonomy and migrating data.

Per owner decision, none of those four were overwritten or duplicated.
`hitl_queue` — the one genuinely missing table — was written correctly to
`supabase/migrations/003_hitl_queue.sql` instead of here, once the
dead-directory issue surfaced mid-task (an earlier pass had incorrectly
placed it in this directory as `009_hitl_queue.sql`; that file was removed).
If the `articles`/`audit_log`/`monetization_gates` schema gaps (e.g. no
`hitl_review` status anywhere yet, no `product_id` on the early tables)
turn out to matter for wiring HITL or n8n automation, that needs a
deliberate `ALTER TABLE` migration against `supabase/migrations/` and a
real decision on which taxonomy wins — not a silent overwrite.
