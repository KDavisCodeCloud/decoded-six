-- DecodedSix Migration 005 — Revenue Intelligence

CREATE TABLE IF NOT EXISTS ds_prod_recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name        text NOT NULL,
  category            text,
  platform            text,
  demand_score        integer,
  competition_score   integer,
  suggested_price_low numeric(8,2),
  suggested_price_high numeric(8,2),
  production_effort   text CHECK (production_effort IN ('low','medium','high')),
  est_monthly_low     numeric(10,2),
  est_monthly_mid     numeric(10,2),
  est_monthly_high    numeric(10,2),
  confidence_score    integer,
  verdict             text CHECK (verdict IN ('build','watch','pass')),
  verdict_reason      text,
  outcome_signal      text CHECK (outcome_signal IN ('positive','negative','pending')),
  actual_monthly      numeric(10,2),
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ds_aff_recommendations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name          text NOT NULL,
  program_id            uuid REFERENCES affiliate_programs(id),
  commission_per_sale   numeric(8,2),
  est_conversion_rate   numeric(5,4),
  est_monthly_revenue   numeric(10,2),
  best_articles         jsonb,
  placement_type        text,
  verdict               text CHECK (verdict IN ('add','test','pass')),
  priority              text CHECK (priority IN ('high','medium','low')),
  outcome_signal        text CHECK (outcome_signal IN ('positive','negative','pending')),
  actual_monthly        numeric(10,2),
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE ds_prod_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_aff_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ds_prod"
  ON ds_prod_recommendations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_ds_aff"
  ON ds_aff_recommendations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_read_ds_prod"
  ON ds_prod_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_read_ds_aff"
  ON ds_aff_recommendations FOR SELECT
  TO authenticated
  USING (true);
