-- Migration 008: visitor_sessions — anonymous pageview tracking, self-hosted
--
-- Scoped-down version of CLAUDE.md's full visitor_sessions spec (this repo's
-- global THD rules describe a self-hosted pixel.js pattern, not third-party
-- analytics — no Vercel Analytics/GA/Plausible). One row per pageview rather
-- than one row per session with aggregated pages_viewed/time_on_site, which
-- would need session-correlation logic beyond what a first real traffic
-- counter needs. No PII: no IP address stored, no cookies, session_id is a
-- random client-generated token with no identity behind it.

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   TEXT NOT NULL DEFAULT 'gta-hub',
  session_id   TEXT NOT NULL,
  path         TEXT NOT NULL,
  referrer     TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_product ON visitor_sessions(product_id, created_at DESC);

ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;

-- All writes go through /api/track using the service-role key server-side —
-- no direct client-side inserts, so no anon policy needed at all.
CREATE POLICY visitor_sessions_service_role ON visitor_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
