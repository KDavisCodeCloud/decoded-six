-- DecodedSix Migration 001 — Core Tables
-- Run in Supabase SQL Editor (decodedsix-prod project only)

CREATE TABLE IF NOT EXISTS articles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text UNIQUE NOT NULL,
  title            text NOT NULL,
  content          text NOT NULL,
  excerpt          text,
  article_type     text NOT NULL
    CHECK (article_type IN (
      'news','guide','tier_list','weekly','analysis'
    )),
  evergreen        boolean DEFAULT false,
  seo_title        text,
  meta_description text,
  target_keyword   text,
  ai_detect_score  integer,
  humanizer_pass   boolean DEFAULT false,
  aeo_pass         boolean DEFAULT false,
  seo_pass         boolean DEFAULT false,
  copyright_pass   boolean DEFAULT false,
  status           text DEFAULT 'draft'
    CHECK (status IN (
      'draft','pending_review','approved','published','archived'
    )),
  published_at     timestamptz,
  views_total      integer DEFAULT 0,
  ad_revenue_mtd   numeric(10,2) DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliate_programs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name     text NOT NULL,
  network          text,
  commission_type  text CHECK (commission_type IN ('percent','flat')),
  commission_value numeric(8,2),
  cookie_days      integer,
  tracking_url     text,
  active           boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       uuid REFERENCES affiliate_programs(id),
  article_id       uuid REFERENCES articles(id),
  placement_type   text CHECK (placement_type IN (
    'text_link','comparison_table','banner','video_description'
  )),
  clicked_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       uuid REFERENCES affiliate_programs(id),
  article_id       uuid REFERENCES articles(id),
  revenue          numeric(10,2),
  converted_at     timestamptz DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all
CREATE POLICY "service_role_all_articles"
  ON articles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_affiliate_programs"
  ON affiliate_programs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_affiliate_clicks"
  ON affiliate_clicks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_affiliate_conversions"
  ON affiliate_conversions FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can read published articles
CREATE POLICY "public_read_published_articles"
  ON articles FOR SELECT
  USING (status = 'published');
