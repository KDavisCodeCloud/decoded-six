-- 042: launch gameplay guides (Kelvin, 2026-11-23)
-- 26 step-by-step guides (missables, robberies, unique weapons, rare cars).
-- Extends `articles`, which already has product_id and RLS (migrations
-- 001/005). No new table is created here.
--
-- New article_type values:
--   guide      body floor 1,200 words
--   guide_hub  body floor 1,800 words (hub page that links every spoke)
--
-- New columns:
--   sources            [{url, outlet, published}] research URLs. Shown to the
--                      HITL reviewer; rendered on the page as a source list.
--   claim_verification [{claim, sources[], status:'verified'|'single_source'|'conflict'}]
--                      the 2-source check per key claim, for the HITL card.
--   video_embeds       [{video_id, start_seconds, channel_name, channel_url,
--                      title, status:'ok'|'broken', checked_at}]
--                      rendered as a youtube-nocookie lite facade.
--   screenshot_slots   [{slot, shot, filename, alt, status:'needed'|'filled',
--                      url, width, height}]
--                      Kelvin's console captures. Each slot matches a
--                      {{screenshot:<filename>}} marker in the content.
--   hub_slug           a spoke points at its hub (hubs leave this null).
--   guide_group        'missables' | 'robberies' | 'weapons' | 'vehicles'.
--   date_modified      bumped only on real content edits. Feeds JSON-LD
--                      dateModified and the visible "Updated" line.

ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_article_type_check;
ALTER TABLE articles ADD CONSTRAINT articles_article_type_check
  CHECK (article_type IN ('news', 'evergreen', 'conversion', 'exclusive', 'deep_dive',
                          'breaking_news', 'feature', 'guide', 'guide_hub'));

ALTER TABLE articles ADD COLUMN IF NOT EXISTS sources jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS claim_verification jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS video_embeds jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS screenshot_slots jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hub_slug text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS guide_group text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS date_modified timestamptz;

CREATE INDEX IF NOT EXISTS articles_guide_group_idx ON articles (guide_group) WHERE guide_group IS NOT NULL;

-- RLS is already enabled on articles (001). Re-assert it so the policy is
-- never silently missing.
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
