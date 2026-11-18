-- Migration 032: map_alerts -- things Mission Control (/dashboard) must see.
-- Written by the gtadb watcher (new upstream SHA awaiting Kelvin's approval)
-- and the map scraper (e.g. Reddit blocking Railway's IP). Service role only;
-- the dashboard reads server-side behind its auth gate.

CREATE TABLE IF NOT EXISTS map_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL DEFAULT 'gta-hub',
  kind            text NOT NULL,                 -- gtadb_update | source_blocked | scraper_failed
  severity        text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ref             text,                          -- dedupe key, e.g. the new gtadb SHA
  title           text NOT NULL,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_map_alerts_open ON map_alerts (created_at DESC) WHERE acknowledged_at IS NULL;
ALTER TABLE map_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS map_alerts_service_role ON map_alerts;
CREATE POLICY map_alerts_service_role ON map_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
