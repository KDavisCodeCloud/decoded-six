# DecodedSix — Interactive Map Specification

## Tech Stack
Leaflet.js with custom GTA 6 tile layer
Custom SVG markers per category (color-coded)
Supabase map_markers table for all data
Supabase Realtime for daily location updates

## Feature Flag
NEXT_PUBLIC_MAP_LIVE=false → caution tape placeholder
NEXT_PUBLIC_MAP_LIVE=true → live interactive map
Launch day = one env var change in Vercel → zero code deploy

## Pre-Launch Placeholder (visible until Nov 19 2026)
Full-screen dark section on homepage
Blurred Vice City aerial silhouette background
Caution tape SVG — Framer Motion loop (slow)
Countdown timer to November 19
Email capture field → systeme.io ds-map-waitlist tag
Feature preview badges for all widgets

## Map Widgets (all built behind the flag)
1. Category filter — left sidebar on desktop, bottom sheet on mobile
2. Area name overlay — GeoJSON polygon regions
3. Search bar — full text across all marker names/descriptions
4. Money making filter — $/hr sort + difficulty + crew size filters
5. Daily locations tracker — realtime updates, highlighted differently
6. Marker popup card — 21st.dev component, linked article, verified badge
7. Mini map navigator — bottom right corner
8. Coordinate display — bottom bar, updates on cursor position

## Marker Categories
money_spot (#3fd17a) — grind spots with $/hr data
vehicle_spawn (#5a96ff) — rare/valuable vehicle locations
property (#C8A84B) — purchasable real estate
heist (#f5a623) — heist start locations and staging
mission_start (#FF2D6B) — story/side mission triggers
weapon_pickup (#e05d5d) — weapon and ammo locations
health_armor (#3fd17a) — medkit/armor pickups
collectible (#9aa2ab) — hidden items, easter eggs
landmark (#aab4bd) — notable locations (no gameplay value)
daily_location (#f5a623) — time-sensitive, daily reset

## Benchmark
GTALens.com — match features, exceed on:
- Design quality (editorial dark vs generic map UI)
- Mobile experience (bottom sheet widgets, touch-first)
- Money making filters ($/hr, crew size, difficulty)
- Area name overlays (GeoJSON regions labeled)
- Real-time daily location updates (Supabase Realtime)
- Article linking (popup card links to full guide)
- User saved markers (requires free account)

## Data Sources
1. Community submissions (form → HITL review)
2. Reddit/Discord scraping (DS-MAP-SCRAPE agent → HITL)
3. Manual curation (son Tuesday sessions → HITL)

All sources require HITL approval before publishing.
No community data goes live without human review.

→ [[Agent Roster]]
→ [[DecodedSix Master Reference]]
