-- DecodedSix Migration 006 — Gates and Learning Loop

CREATE TABLE IF NOT EXISTS monetization_gates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_code       text UNIQUE NOT NULL,
  gate_name       text NOT NULL,
  gate_type       text NOT NULL
    CHECK (gate_type IN (
      'adsense','ezoic','affiliate',
      'mediavine','youtube','discord'
    )),
  metric_key      text NOT NULL,
  metric_target   numeric(12,2) NOT NULL,
  metric_current  numeric(12,2) DEFAULT 0,
  status          text DEFAULT 'not_started'
    CHECK (status IN (
      'not_started','in_progress',
      'ready_to_apply','applied','cleared'
    )),
  unlocks         text,
  applied_at      timestamptz,
  cleared_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

INSERT INTO monetization_gates
  (gate_code, gate_name, gate_type, metric_key, metric_target, unlocks)
VALUES
  ('GATE_1','AdSense Ready','adsense',
   'published_articles',20,
   'Apply for AdSense. Enable auto-posting at 2/day.'),
  ('GATE_2','AdSense Approved','adsense',
   'adsense_approved',1,
   'Start affiliate links. Build DS-AFF agent.'),
  ('GATE_B','Affiliate Expand','affiliate',
   'monthly_sessions',25000,
   'Add Secretlab, Razer, NordVPN programs. Build DS-PROD agent.'),
  ('GATE_3','Ezoic Incubator','ezoic',
   'daily_sessions',1000,
   'Apply to Ezoic Incubator.'),
  ('GATE_4','Content Scale','adsense',
   'daily_sessions',5000,
   'Increase to 4 articles/day. Activate video pipeline.'),
  ('GATE_5','Ezoic Full','ezoic',
   'monthly_users',250000,
   'Apply to Ezoic full platform.'),
  ('GATE_6','Mediavine','mediavine',
   'monthly_sessions',50000,
   'Apply to Mediavine or Raptive.'),
  ('GATE_7','Affiliate Optimize','affiliate',
   'monthly_affiliate_revenue',500,
   'A/B test placement. Add comparison tables.'),
  ('GATE_8','Brand Deals','affiliate',
   'monthly_combined_revenue',1500,
   'Approach gaming peripheral brands for sponsorship.'),
  ('GATE_YT1','YouTube Monetized','youtube',
   'yt_subscribers',1000,
   'YouTube Partner Program active.'),
  ('GATE_YT2','Sponsor Ready','youtube',
   'yt_subscribers',10000,
   'Pitch gaming peripheral brand sponsorships.'),
  ('GATE_D1','Discord Launch','discord',
   'monthly_sessions',10000,
   'Launch paid Discord tier at $5/month.');

CREATE TABLE IF NOT EXISTS learning_outcomes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_type        text NOT NULL
    CHECK (outcome_type IN (
      'content','map_marker','yt_video',
      'ds_prod','ds_aff','yt_strategy'
    )),
  reference_id        uuid NOT NULL,
  signal              text NOT NULL
    CHECK (signal IN ('positive','negative','neutral')),
  rejection_category  text,
  metric_value        numeric(12,2),
  notes               text,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE monetization_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_gates"
  ON monetization_gates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_learning"
  ON learning_outcomes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_read_gates"
  ON monetization_gates FOR SELECT
  TO authenticated
  USING (true);
