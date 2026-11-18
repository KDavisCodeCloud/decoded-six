-- Migration 033: map pin pipeline sources (discovery_sources, purpose='map').
--
-- Reddit: public RSS only, no API keys (Kelvin). Subreddit /new feeds plus
-- r/GTA6 search feeds for location-type terms. Comments are never fetched.
-- YouTube: the channels the content pipeline already follows. The 15-20
-- added guide / NZ-AU channels are PROPOSED to Kelvin, not added here.
-- Editorial: allowed guide/news sites only -- evidence for individual claims,
-- never enough to auto-publish alone (enforced in src/agents/map/rules.py).
-- Blocklisted domains never appear here and are dropped at fetch time.

INSERT INTO discovery_sources (name, source_type, source_kind, purpose, fetch_url, keyword_filter, default_tier) VALUES
  ('Map: r/GTA6 new',             'reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA6/new/.rss', NULL, 3),
  ('Map: r/GTAVI new',            'reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTAVI/new/.rss', NULL, 3),
  ('Map: r/GTA new',              'reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA/new/.rss', NULL, 3),
  ('Map: r/GTA6 search location', 'reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA6/search.rss?q=location&restrict_sr=1&sort=new', NULL, 3),
  ('Map: r/GTA6 search found',    'reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA6/search.rss?q=found&restrict_sr=1&sort=new', NULL, 3),
  ('Map: r/GTA6 search gas station','reddit_rss','reddit','map', 'https://www.reddit.com/r/GTA6/search.rss?q=gas%20station&restrict_sr=1&sort=new', NULL, 3),
  ('Map: r/GTA6 search safehouse','reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA6/search.rss?q=safehouse&restrict_sr=1&sort=new', NULL, 3),
  ('Map: r/GTA6 search gun store','reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA6/search.rss?q=gun%20store&restrict_sr=1&sort=new', NULL, 3),
  ('Map: r/GTA6 search money',    'reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA6/search.rss?q=money&restrict_sr=1&sort=new', NULL, 3),
  ('Map: r/GTA6 search map',      'reddit_rss', 'reddit', 'map', 'https://www.reddit.com/r/GTA6/search.rss?q=map&restrict_sr=1&sort=new', NULL, 3),
  ('Map: YouTube TGG',            'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC72PuhDwKtZ5MikpGNhPAtA', NULL, 1),
  ('Map: YouTube Rockstar Games', 'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1BFKHv_LMiObkPw5PqIXtA', NULL, 0),
  ('Map: YouTube MrBossFTW',      'youtube_rss', 'youtube', 'map', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0PMQXAwF6O6aeTpv962miA', NULL, 3),
  ('Map: PowerPyx',               'rss', 'editorial', 'map', 'https://www.powerpyx.com/feed/', ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2),
  ('Map: GameSpot',               'rss', 'editorial', 'map', 'https://www.gamespot.com/feeds/game-news/', ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2),
  ('Map: IGN',                    'rss', 'editorial', 'map', 'https://feeds.ign.com/ign/games-all', ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2),
  ('Map: RockstarINTEL',          'rss', 'editorial', 'map', 'https://rockstarintel.com/feed/', ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2)
ON CONFLICT (fetch_url, purpose) DO NOTHING;
