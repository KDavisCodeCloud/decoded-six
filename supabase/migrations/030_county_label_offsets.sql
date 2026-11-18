-- Migration 030: move two county labels off gtadb's baked-in place names.
--
-- Temporary placement only. The 5 county labels from 029 are name-only
-- points; two of them landed on top of text printed into the gtadb Yanis
-- V18 tiles: "Vice-Dale" sat on "VICE CITY (MIAMI)" and "Mariana" sat on
-- "GRASSRIVERS (EVERGLADES)". Both move into open water on the correct side
-- of gtadb's dashed Vice-Dale / Mariana county line (y ~ -2900 m), clear of
-- any printed label at zooms 0-3 (labels hide above zoom 3). Phase 4 swaps
-- these points for real county polygons traced from Rockstar's official map.

UPDATE map_areas
   SET geojson = '{"type":"Point","coordinates":[975,-2257]}'::jsonb
 WHERE name = 'Vice-Dale County' AND kind = 'label' AND frame = 'gtadb_world';

UPDATE map_areas
   SET geojson = '{"type":"Point","coordinates":[295,-4068]}'::jsonb
 WHERE name = 'Mariana County' AND kind = 'label' AND frame = 'gtadb_world';
