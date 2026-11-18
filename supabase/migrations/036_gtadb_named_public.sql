-- Migration 036: named gtadb places go public (Kelvin, 2026-11-18).
-- Every gtadb_import record with an in-game name in a public category is
-- shown on /map with a "Community-mapped (gtadb)" badge + CC BY 4.0 credit.
-- Unnamed buildings ("Unnamed building", etc.) stay 'approved' = internal,
-- used only as the scraper's gazetteer. scripts/import_gtadb_landmarks.py
-- applies the same rule on any future (Kelvin-approved) re-import.

UPDATE map_markers
   SET status = 'published', updated_at = now()
 WHERE source_type = 'gtadb_import'
   AND status = 'approved'
   AND name IS NOT NULL AND name !~ '^Unnamed '
   AND category IN ('landmark', 'store', 'fuel_station', 'fence', 'police_station', 'safehouse',
                    'hospital', 'clothing', 'gym', 'street_race');

INSERT INTO audit_log (agent_id, action, result)
SELECT 'hitl:kelvin', 'gtadb_named_published',
       'published ' || count(*) || ' named gtadb_import markers (migration 036)'
  FROM map_markers WHERE source_type = 'gtadb_import' AND status = 'published';

SELECT category, count(*) AS public FROM map_markers
 WHERE source_type = 'gtadb_import' AND status = 'published' GROUP BY 1 ORDER BY 2 DESC;
