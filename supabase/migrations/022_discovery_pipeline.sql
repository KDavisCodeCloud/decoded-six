-- Migration 022: multi-source topic discovery pipeline.
--
-- Fixes the discovery side of DSX-CA1. Traced 2026-09-17: topic_picker's
-- news/breaking_news/exclusive/deep_dive auto-pick falls through to the
-- literal string "GTA 6 latest news" (no live source drives it at all),
-- feature/evergreen/conversion rotate small hardcoded local lists, and the
-- topic_queue param on run_content_agent() has never been reachable from
-- production -- api/routes/content_agent.py's ContentRequest model never
-- accepted it. Two separate n8n workflows independently trigger content
-- generation on the same days with their own (weak) topic logic. This
-- migration adds the tables; the actual fetch/synthesis/approval code is
-- separate.
--
-- All four tables: service-role only, same reasoning as every other
-- dashboard-adjacent table this project has added (map_markers,
-- analytics_pageviews) -- the dashboard reads server-side via
-- dashboard/layout.tsx's existing auth gate, so no RLS grant to
-- `authenticated` is needed at all.

CREATE TABLE IF NOT EXISTS discovery_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      TEXT NOT NULL DEFAULT 'gta-hub',
  name            TEXT NOT NULL,
  source_type     TEXT NOT NULL CHECK (source_type IN ('rss', 'reddit_rss', 'youtube_rss', 'homepage_scrape')),
  fetch_url       TEXT NOT NULL UNIQUE,
  keyword_filter  TEXT[],
  -- Starting-point classification only -- the writer's existing Tier 0-3
  -- system (content_agent.py) still applies real per-claim nuance; this
  -- just seeds a sane default so the dashboard can show something before
  -- a human reviews the actual link.
  default_tier    INTEGER NOT NULL DEFAULT 2 CHECK (default_tier IN (0, 1, 2, 3)),
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovery_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    TEXT NOT NULL DEFAULT 'gta-hub',
  source_id     UUID NOT NULL REFERENCES discovery_sources(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL UNIQUE,
  published_at  TIMESTAMPTZ,
  snippet       TEXT,
  raw_payload   JSONB,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clustered     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_discovery_items_fetched_at ON discovery_items(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_items_source ON discovery_items(source_id);
CREATE INDEX IF NOT EXISTS idx_discovery_items_unclustered ON discovery_items(clustered) WHERE clustered = false;

CREATE TABLE IF NOT EXISTS topic_candidates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id               TEXT NOT NULL DEFAULT 'gta-hub',
  topic                    TEXT NOT NULL,
  angle                    TEXT NOT NULL,
  source_item_ids          UUID[] NOT NULL DEFAULT '{}',
  source_urls              TEXT[] NOT NULL DEFAULT '{}',
  score                    NUMERIC NOT NULL DEFAULT 0,
  suggested_article_type   TEXT,
  suggested_template_variant TEXT CHECK (suggested_template_variant IN ('A', 'B', 'C', 'D')),
  update_of                TEXT,  -- slug of an existing article, if this is an update rather than a new post
  status                   TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'rejected', 'used')),
  rejected_reason          TEXT,
  reviewed_by              TEXT,
  reviewed_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topic_candidates_status ON topic_candidates(status, created_at DESC);

CREATE TABLE IF NOT EXISTS topic_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       TEXT NOT NULL DEFAULT 'gta-hub',
  candidate_id     UUID NOT NULL REFERENCES topic_candidates(id),
  topic            TEXT NOT NULL,
  fact_brief       TEXT NOT NULL,
  article_type     TEXT NOT NULL,
  template_variant TEXT CHECK (template_variant IN ('A', 'B', 'C', 'D')),
  update_of        TEXT,
  status           TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'generating', 'generated', 'failed')),
  article_id       UUID REFERENCES articles(id),
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topic_queue_status ON topic_queue(status, created_at);

ALTER TABLE discovery_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY discovery_sources_service_role ON discovery_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY discovery_items_service_role ON discovery_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY topic_candidates_service_role ON topic_candidates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY topic_queue_service_role ON topic_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed the source registry. RockstarINTEL needs the trailing slash --
-- confirmed live 2026-09-17, the bare /feed path 301s to /feed/.
-- GameSpot/IGN are general gaming feeds, so they get a keyword_filter;
-- RockstarINTEL and Reddit's r/GTA6 feed are already GTA-6-scoped, no
-- filter needed. YouTube channel IDs looked up and verified against their
-- real, current channels (TGG = "The Gaming Gorilla", confirmed via its
-- own Rockstar North studio-visit coverage -- the same TGG already cited
-- as a Tier 1 source in content_agent.py's CONFIRMED_SYSTEMS_KB).
INSERT INTO discovery_sources (name, source_type, fetch_url, keyword_filter, default_tier) VALUES
  ('IGN Games Feed', 'rss', 'https://feeds.ign.com/ign/games-all', ARRAY['gta', 'grand theft auto', 'rockstar'], 1),
  ('GameSpot Game News', 'rss', 'https://www.gamespot.com/feeds/game-news/', ARRAY['gta', 'grand theft auto', 'rockstar'], 2),
  ('RockstarINTEL', 'rss', 'https://rockstarintel.com/feed/', NULL, 2),
  ('Reddit r/GTA6', 'reddit_rss', 'https://www.reddit.com/r/GTA6/.rss', NULL, 3),
  ('YouTube — TGG', 'youtube_rss', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC72PuhDwKtZ5MikpGNhPAtA', NULL, 1),
  ('YouTube — Rockstar Games Official', 'youtube_rss', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1BFKHv_LMiObkPw5PqIXtA', NULL, 0),
  ('YouTube — MrBossFTW', 'youtube_rss', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0PMQXAwF6O6aeTpv962miA', NULL, 3)
ON CONFLICT DO NOTHING;

-- Rockstar Newswire: kept as one entry among many per spec, but seeded
-- INACTIVE. Checked live 2026-09-17 -- rockstargames.com has no RSS feed
-- (rockstargames.com/newswire/feed, .rss, and /feeds/newswire all 404) and
-- the newswire page itself is an empty <body> hydrated client-side via a
-- SystemJS module-federation shell with no embedded JSON/__NEXT_DATA__ to
-- read statically. A real scrape would need a headless browser, out of
-- scope for this fetcher layer. Flip `active` once a real fetch path
-- exists (or if Rockstar ever ships an actual feed).
INSERT INTO discovery_sources (name, source_type, fetch_url, keyword_filter, default_tier, active) VALUES
  ('Rockstar Newswire', 'homepage_scrape', 'https://www.rockstargames.com/newswire', NULL, 0, false)
ON CONFLICT DO NOTHING;
