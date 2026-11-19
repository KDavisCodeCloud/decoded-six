-- Migration 038: twice-daily Vercel usage check vs Hobby limits (Kelvin, 2026-11-18).
-- src/agents/ops/vercel_usage.py writes one row per check; Mission Control
-- (VercelUsageCard) shows the latest and alerts when any metric is >= 70%
-- of its Hobby limit. Unacknowledged rows with alerts are the open alerts.

CREATE TABLE IF NOT EXISTS vercel_usage_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL DEFAULT 'gta-hub',
  checked_at      timestamptz NOT NULL DEFAULT now(),
  trigger         text NOT NULL DEFAULT 'schedule',
  threshold_pct   numeric NOT NULL DEFAULT 70,
  metrics         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{key,label,used,limit,unit,pct,window}]
  unavailable     jsonb NOT NULL DEFAULT '[]'::jsonb,   -- Hobby metrics the API doesn't expose
  alerts          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- metrics at/over threshold_pct
  max_pct         numeric,
  error           text,
  acknowledged_at timestamptz,
  acknowledged_by text
);
ALTER TABLE vercel_usage_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vercel_usage_checks_service_role ON vercel_usage_checks;
CREATE POLICY vercel_usage_checks_service_role ON vercel_usage_checks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_vercel_usage_checks_at ON vercel_usage_checks (product_id, checked_at DESC);
