# DecodedSix Interactive Map Spec
Last Updated: July 10, 2026

## Mission
Build the best GTA 6 interactive map on the internet.
Reference standard: GTALens (gtalens.com) — match interaction model exactly, then exceed.
Full implementation spec: `docs/MAP_SPEC.md`

## Feature Flag
`NEXT_PUBLIC_MAP_LIVE=false` → caution tape placeholder (current state)
`NEXT_PUBLIC_MAP_LIVE=true` → live interactive map
Launch day = one env var change in Vercel → zero code deploy needed.

## Build Checklist
- [ ] Leaflet + react-leaflet installed
- [ ] Base map image sourced (Leonida — search GTAForums/Reddit for high-res recreation)
- [ ] Tile pipeline configured (image pyramid via gdal2tiles → Cloudflare R2, or imageOverlay fallback)
- [ ] MapContainer built — Leaflet init, dark background, centered on Vice City
- [ ] MapControls built — zoom in/out, reset view, 2D/3D toggle
- [ ] MapViewToggle built — Game / Print / Satellite / Decoded skin switcher
- [ ] Icon SVG set created — 7 categories (landmark, mission, business, character, collectible, property, secret)
- [ ] LocationMarker built — renders SVG icon at lat/lng, click handler
- [ ] MarkerCluster built — numbered badge at low zoom, expand on click
- [ ] LocationWidget built — right sidebar, matches GTALens panel layout exactly
- [ ] LayerPanel built — left sidebar, 7-category toggles with color indicators
- [ ] map_locations seeded — trailer-confirmed locations with source citations
- [ ] MapSearch built — search input with fly-to animation
- [ ] MobileBottomSheet built — bottom sheet replaces right sidebar on mobile
- [ ] URL state sync — `/map?lat=X&lng=Y&zoom=Z&layers=...` works
- [ ] 3D perspective mode — 15–20 degree CSS tilt at minimum zoom, flattens on scroll-in
- [ ] Miami Vice "Decoded" skin — 4th map view option, ocean #0A1628, roads cyan #00F5FF
- [ ] Performance — tiles from CDN, <2s desktop, <3s mobile
- [ ] MAP_LIVE flag enabled in Vercel

## What We Match (GTALens Parity)
- Scroll to zoom, click + drag to pan — smooth, no hard zoom limit
- Category icon system — consistent size at all zoom levels
- Location widget right panel — tabular data, navigate between locations
- Layer toggle with hide/show per category
- Dark theme throughout
- View modes: Game / Print / Satellite

## What We Exceed (DecodedSix Differentiators)
1. **Miami Vice "Decoded" skin** — 4th view mode, our visual identity
2. **3D perspective tilt on zoom-out** — wow moment on first load
3. **SVG icons with neon glow** — crisp at all resolutions
4. **Icon clustering** at low zoom — numbered badge, expand on click
5. **Deep linking** — share any map view via URL
6. **7-layer system** vs GTALens ~3 (locations, activities, characters, collectibles, vehicles, properties, secrets)
7. **Search with fly-to animation** — GTALens has no map search
8. **Mobile bottom sheet** vs GTALens stacked sidebar
9. **Community submission queue** (post-launch) — HITL moderation before any pin goes live
10. **GTA 6 Leonida pre-seeded** — trailer-confirmed locations from day one with article links

## Tech Stack
- `react-leaflet` for map rendering
- Custom tile layer — Cloudflare R2 CDN
- Supabase: `map_locations` + `map_location_submissions` tables (RLS enabled)
- SVG icon set: `/public/map-icons/` (7 categories)
- Tile set: `/public/map-tiles/` or R2 bucket

## Pre-Launch Location Data (Trailer-Confirmed)
Districts: Vice City Downtown, Vice City Beach, Leonida Keys, Port Gellhorn, Grassrivers, Ambrosia, Mount Kalaga
Landmarks: Leonida Penitentiary, Ocean View Hotel, Vice City waterfront, Airport

All location pins include: name, source citation ("Spotted in Trailer [1/2] at [timestamp]"), link to DecodedSix article.

## Content Bridge
Map location → DecodedSix article (every pin links to a guide/feature)
Location article → "📍 View on Map" button (every location piece links back to the map)
These two feed each other for SEO and engagement.

## Success Gate (before MAP_LIVE=true)
- User from GTALens can use DecodedSix map with zero learning curve
- All 7 confirmed districts pinned with source citations
- Every location links to at least one DecodedSix article
- Mobile bottom sheet works on iOS Safari + Android Chrome
- Load time: <2s desktop, <3s mobile

→ [[Agent Roster]]
→ [[DecodedSix Master Reference]]
→ [[Visual Strategy]]
