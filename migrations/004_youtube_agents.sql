-- DecodedSix Migration 004 — YouTube Agents

CREATE TABLE IF NOT EXISTS youtube_videos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id       text,
  title            text NOT NULL,
  format           text NOT NULL
    CHECK (format IN (
      'short_weekly_challenge','short_trending',
      'long_tier_list','long_meta_report','long_news_breakdown'
    )),
  script           text,
  voiceover_url    text,
  video_url        text,
  thumbnail_url    text,
  status           text DEFAULT 'draft'
    CHECK (status IN (
      'draft','pending_review','approved',
      'scheduled','published','archived'
    )),
  approved_by      uuid REFERENCES auth.users(id),
  scheduled_for    timestamptz,
  published_at     timestamptz,
  views            integer DEFAULT 0,
  watch_time_hrs   numeric(10,2) DEFAULT 0,
  ctr              numeric(5,4) DEFAULT 0,
  ad_revenue       numeric(10,2) DEFAULT 0,
  affiliate_clicks integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS yt_strategy_cards (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of              date NOT NULL,
  phase                text NOT NULL,
  shorts_ratio         integer,
  longform_ratio       integer,
  recommended_formats  jsonb,
  trending_topics      jsonb,
  top_performer        text,
  agent_notes          text,
  approved             boolean DEFAULT false,
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text NOT NULL,
  phase           text NOT NULL,
  cron_expression text NOT NULL,
  active          boolean DEFAULT true,
  phase_start     date,
  phase_end       date,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE yt_strategy_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_youtube_videos"
  ON youtube_videos FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_yt_strategy_cards"
  ON yt_strategy_cards FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_agent_schedules"
  ON agent_schedules FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_read_youtube_videos"
  ON youtube_videos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_read_yt_strategy_cards"
  ON yt_strategy_cards FOR SELECT
  TO authenticated
  USING (true);
