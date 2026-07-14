-- Migration 007: Per-article image fields + a media asset catalog table.
--
-- Schema only — deliberately NOT seeded with any Rockstar-sourced assets.
-- See commit message for why: this repo's own CLAUDE.md bans Rockstar/GTA
-- trademarks and game screenshots on the site, which conflicts with
-- docs/VISUAL_STRATEGY.md's Tier 1 asset system. That conflict is already
-- live in production (src/lib/rockstar-images.ts, used by ArticleCard via
-- RockstarImage) — not something this migration introduces or resolves.
-- featured_image_tier stays flexible (1/2/3) so real decisions later don't
-- require another migration.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS featured_image_url    TEXT,
  ADD COLUMN IF NOT EXISTS featured_image_alt    TEXT,
  ADD COLUMN IF NOT EXISTS featured_image_credit TEXT,
  ADD COLUMN IF NOT EXISTS featured_image_tier   INTEGER CHECK (featured_image_tier IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS og_image_url          TEXT;

CREATE TABLE IF NOT EXISTS media_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  TEXT NOT NULL DEFAULT 'gta-hub',
  name        TEXT NOT NULL,
  tier        INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  category    TEXT,
  url         TEXT NOT NULL,
  alt_text    TEXT NOT NULL,
  credit      TEXT,
  width       INTEGER,
  height      INTEGER,
  best_use    TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_tier ON media_assets(tier);
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_assets_service_role ON media_assets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY media_assets_public_read ON media_assets
  FOR SELECT TO anon, authenticated USING (true);
