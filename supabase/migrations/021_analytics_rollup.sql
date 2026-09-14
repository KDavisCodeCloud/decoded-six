-- Migration 021: nightly rollup + purge for analytics_pageviews.
--
-- Rows older than 90 days get aggregated into analytics_daily_rollup
-- (one row per product/date/path, with a per-source view-count breakdown)
-- and the raw rows are deleted. Runs via pg_cron at 03:00 UTC daily --
-- confirmed available on this Supabase project (pg_available_extensions).
-- Pure-SQL job (no pg_net/edge-function call needed), so nothing external
-- to keep running.

CREATE TABLE IF NOT EXISTS analytics_daily_rollup (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       TEXT NOT NULL DEFAULT 'gta-hub',
  date             DATE NOT NULL,
  path             TEXT NOT NULL,
  views            INTEGER NOT NULL DEFAULT 0,
  uniques          INTEGER NOT NULL DEFAULT 0,
  source_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, date, path)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_rollup_date ON analytics_daily_rollup(date DESC);

ALTER TABLE analytics_daily_rollup ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_daily_rollup_service_role ON analytics_daily_rollup
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION analytics_rollup_and_purge() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - INTERVAL '90 days';
BEGIN
  INSERT INTO analytics_daily_rollup (product_id, date, path, views, uniques, source_breakdown)
  WITH old_rows AS (
    SELECT * FROM analytics_pageviews WHERE created_at < cutoff
  ),
  by_source AS (
    SELECT product_id, created_at::date AS date, path, referrer_source, COUNT(*) AS cnt
    FROM old_rows
    GROUP BY product_id, created_at::date, path, referrer_source
  ),
  totals AS (
    SELECT product_id, created_at::date AS date, path,
           COUNT(*) AS views, COUNT(DISTINCT session_id) AS uniques
    FROM old_rows
    GROUP BY product_id, created_at::date, path
  ),
  sources_json AS (
    SELECT product_id, date, path, jsonb_object_agg(referrer_source, cnt) AS source_breakdown
    FROM by_source
    GROUP BY product_id, date, path
  )
  SELECT t.product_id, t.date, t.path, t.views, t.uniques, sj.source_breakdown
  FROM totals t
  JOIN sources_json sj USING (product_id, date, path)
  ON CONFLICT (product_id, date, path) DO UPDATE SET
    views = EXCLUDED.views,
    uniques = EXCLUDED.uniques,
    source_breakdown = EXCLUDED.source_breakdown;

  DELETE FROM analytics_pageviews WHERE created_at < cutoff;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: unschedule-then-reschedule so re-running this migration
-- (or a future edit to the cron expression) doesn't error on a duplicate
-- job name.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'analytics-rollup-nightly';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('analytics-rollup-nightly', '0 3 * * *', $$SELECT analytics_rollup_and_purge();$$);
