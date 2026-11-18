-- Migration 037: map pins publish without HITL + more guide feeds (Kelvin, 2026-11-18).
--
-- Rule change (src/agents/map/rules.py route()): every scraper claim we can
-- place goes straight to the public map as 'community_reported' -- including
-- from a single guide article. Name-placed pins show "Approximate location"
-- + a dashed radius circle. 3+ independent sources (or screenshot + 1) ->
-- 'verified'. Only claims we can't place wait in /dashboard/map.
--
-- Feeds: verified 2026-11-18 to return RSS to our bot UA. Sportskeeda answers
-- 405 to RSS clients, so it is not added (no workaround). Blocklisted map
-- sites remain excluded.

INSERT INTO discovery_sources (name, source_type, source_kind, purpose, fetch_url, keyword_filter, default_tier) VALUES
  ('Map: GamesRadar', 'rss', 'editorial', 'map', 'https://www.gamesradar.com/feeds/all/', ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2),
  ('Map: Dexerto',    'rss', 'editorial', 'map', 'https://www.dexerto.com/feed/',        ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2),
  ('Map: PC Gamer',   'rss', 'editorial', 'map', 'https://www.pcgamer.com/rss/',         ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2),
  ('Map: GameRant',   'rss', 'editorial', 'map', 'https://gamerant.com/feed/',           ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2),
  ('Map: TheGamer',   'rss', 'editorial', 'map', 'https://www.thegamer.com/feed/',       ARRAY['gta 6','gta vi','grand theft auto vi','leonida'], 2)
ON CONFLICT (fetch_url, purpose) DO NOTHING;

-- Existing placed scraper pins waiting in HITL follow the new rule now.
UPDATE map_markers SET status = 'community_reported', updated_at = now()
 WHERE source_type = 'scraper' AND status IN ('pending', 'held') AND x IS NOT NULL AND y IS NOT NULL;

INSERT INTO audit_log (agent_id, action, result)
VALUES ('hitl:kelvin', 'map_rule_change',
        'map pins publish without HITL (placed -> community_reported); 5 guide feeds added (migration 037)');

SELECT status, count(*) FROM map_markers WHERE source_type = 'scraper' GROUP BY 1;
