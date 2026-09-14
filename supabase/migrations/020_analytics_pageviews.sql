-- Migration 020: first-party analytics — replaces visitor_sessions.
--
-- visitor_sessions (008_visitor_sessions.sql) covered a subset of this:
-- client-generated session id, no device/country/source parsing, no bot
-- tracking. Rather than run two parallel pageview trackers (every real
-- pageview double-inserted), this supersedes it going forward. The old
-- table is left in place untouched (2 months of low-volume pre-launch
-- data, harmless) but nothing writes to it after this migration —
-- /api/track and PageviewBeacon.tsx are rewritten to use this table only.
--
-- No PII: no IP stored anywhere, ever. session_id is a one-way SHA-256
-- hash of (secret + UTC date + IP + UA), computed server-side in the API
-- route -- the date component means two sessions from the same
-- visitor+browser on different days always hash differently, so nothing
-- here can correlate a visitor across days even in principle.

CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      TEXT NOT NULL DEFAULT 'gta-hub',
  path            TEXT NOT NULL,
  referrer        TEXT,
  referrer_source TEXT NOT NULL DEFAULT 'direct'
    CHECK (referrer_source IN ('google', 'bing', 'reddit', 'x', 'facebook', 'direct', 'other')),
  country         TEXT,
  device          TEXT NOT NULL DEFAULT 'desktop'
    CHECK (device IN ('mobile', 'desktop', 'tablet')),
  session_id      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_created_at ON analytics_pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_dedupe ON analytics_pageviews(session_id, path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_path ON analytics_pageviews(path);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_product_created ON analytics_pageviews(product_id, created_at DESC);

ALTER TABLE analytics_pageviews ENABLE ROW LEVEL SECURITY;

-- No public read, no authenticated-role policy either -- the dashboard
-- reads this table server-side with the service-role key from within
-- dashboard/layout.tsx's own auth-gated pages (same pattern as
-- /dashboard/map), same reasoning as that migration: a page-level fetch
-- needs no RLS grant at all, and not adding one keeps the surface smaller
-- than granting `authenticated` a blanket read would.
CREATE POLICY analytics_pageviews_service_role ON analytics_pageviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Bot hits: separate table, separate from real visitor counts. Populated
-- by /api/track when the User-Agent matches a known crawler, instead of
-- inserting into analytics_pageviews. Useful for pre-AdSense-review crawl
-- visibility (Googlebot activity pattern, etc.) without polluting real
-- traffic numbers.
CREATE TABLE IF NOT EXISTS analytics_bot_hits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL DEFAULT 'gta-hub',
  path       TEXT NOT NULL,
  bot_name   TEXT NOT NULL,
  hit_date   DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_bot_hits_date ON analytics_bot_hits(hit_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_bot_hits_bot_date ON analytics_bot_hits(bot_name, hit_date DESC);

ALTER TABLE analytics_bot_hits ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_bot_hits_service_role ON analytics_bot_hits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
