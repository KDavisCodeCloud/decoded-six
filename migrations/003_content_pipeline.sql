-- DecodedSix Migration 003 — Content Pipeline

CREATE TABLE IF NOT EXISTS content_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id       uuid REFERENCES articles(id),
  stage            text NOT NULL
    CHECK (stage IN (
      'draft','humanizing','aeo_check','seo_check',
      'detect_check','copyright_check','hitl_pending',
      'approved','published'
    )),
  ai_detect_score  integer,
  seo_score        integer,
  compliance_pass  boolean,
  hitl_item_id     uuid,
  approved_by      uuid REFERENCES auth.users(id),
  approved_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_calendar (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_keyword   text NOT NULL,
  search_volume    integer,
  competition      text CHECK (competition IN ('low','medium','high')),
  article_type     text NOT NULL,
  evergreen        boolean DEFAULT false,
  affiliate_flag   text CHECK (affiliate_flag IN (
    'none','low','medium','high'
  )),
  affiliate_notes  text,
  scheduled_date   date,
  article_id       uuid REFERENCES articles(id),
  status           text DEFAULT 'planned'
    CHECK (status IN (
      'planned','in_progress','published','skipped'
    )),
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   text NOT NULL,
  action     text NOT NULL,
  article_id uuid REFERENCES articles(id),
  result     text,
  error      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_content_queue"
  ON content_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_content_calendar"
  ON content_calendar FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_audit_log"
  ON audit_log FOR ALL
  USING (auth.role() = 'service_role');

-- Dashboard users (authenticated) can read queue and calendar
CREATE POLICY "auth_read_content_queue"
  ON content_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_read_content_calendar"
  ON content_calendar FOR SELECT
  TO authenticated
  USING (true);
