-- Migration 035: YouTube channels for the map pipeline (Kelvin pre-approved up to 20, 2026-11-18).
-- Vetted 2026-11-18 ~23:00 UTC against each channel's public RSS: every one has
-- uploaded GTA 6 videos since the NZ unlock (2026-11-18T11:00Z), none is a
-- re-upload/compilation channel, and no video description links to a
-- blocklisted or competing interactive map. NZ/AU creators get tier 1.
-- keyword_filter: these channels also post other games -- only GTA 6 titles
-- reach transcript fetch / extraction.

INSERT INTO discovery_sources (name, source_type, source_kind, purpose, fetch_url, keyword_filter, default_tier) VALUES
  ('Map: YouTube DarkViperAU', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCV6mNrW8CrmWtcxWfQXy11g', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 1),  -- AU
  ('Map: YouTube Loserfruit', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIOrUVVyfoWnmcwG6IwCULQ', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 1),  -- AU
  ('Map: YouTube Lachlan', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCh7EqOZt7EvO2osuKbIlpGg', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 1),  -- AU
  ('Map: YouTube PowerPyx', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWBA1-H9A5IldSb3tNwQmtQ', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- location/trophy guides
  ('Map: YouTube GTA Series Videos', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCuWcjpKbIDAbZfHoru1toFg', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- walkthroughs, encounters
  ('Map: YouTube Dan Allen Gaming', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCcTa20zpKM6CkcvocFXVe6A', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- encounters, easter eggs
  ('Map: YouTube MKIceAndFire', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1bwliGvJogr7cWK0nT2Eag', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- walkthroughs, collectible guides
  ('Map: YouTube Gtamen', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4zMEl8Qh_nE5nDnp0cxRFQ', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- random events
  ('Map: YouTube Shirrako', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7eAfUjR9gdIjoaoQaS0W-A', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- walkthroughs
  ('Map: YouTube theRadBrad', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpqXJOEqGS-TCnazcHCo0rA', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- walkthroughs
  ('Map: YouTube Hollow', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCmp5y07YIV6i2jPX4x82hVQ', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2),  -- walkthroughs
  ('Map: YouTube Typical Gamer', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2wKfjlioOCLP4xQMOWNcgg', ARRAY['gta 6','gta vi','gta6','gtavi','grand theft auto vi','leonida','vice city'], 2)  -- free roam
ON CONFLICT (fetch_url, purpose) DO NOTHING;
