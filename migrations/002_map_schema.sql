-- DecodedSix Migration 002 — Map Schema

CREATE TABLE IF NOT EXISTS map_markers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text,
  category          text NOT NULL
    CHECK (category IN (
      'money_spot','vehicle_spawn','property',
      'heist','mission_start','weapon_pickup',
      'health_armor','collectible','landmark',
      'daily_location'
    )),
  coordinates       jsonb NOT NULL,
  area_name         text,
  payout_per_hour   integer,
  difficulty        text CHECK (difficulty IN (
    'solo','small_crew','full_crew'
  )),
  verified          boolean DEFAULT false,
  source            text CHECK (source IN (
    'community','agent_scraped','manual'
  )),
  linked_article_id uuid REFERENCES articles(id),
  status            text DEFAULT 'pending'
    CHECK (status IN (
      'pending','approved','published','retired'
    )),
  daily_reset       boolean DEFAULT false,
  last_confirmed    timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS map_areas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  geojson    jsonb NOT NULL,
  color      text DEFAULT '#f5a623',
  opacity    numeric(3,2) DEFAULT 0.15,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_saved_markers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id),
  marker_id  uuid REFERENCES map_markers(id),
  found      boolean DEFAULT false,
  notes      text,
  saved_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, marker_id)
);

ALTER TABLE map_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_map_markers"
  ON map_markers FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_map_areas"
  ON map_areas FOR ALL
  USING (auth.role() = 'service_role');

-- Public read on published markers
CREATE POLICY "public_read_published_markers"
  ON map_markers FOR SELECT
  USING (status = 'published');

CREATE POLICY "public_read_map_areas"
  ON map_areas FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can manage their own saved markers
CREATE POLICY "users_manage_own_saved_markers"
  ON user_saved_markers FOR ALL
  USING (auth.uid() = user_id);
