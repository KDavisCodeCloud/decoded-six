# DecodedSix Interactive Map — Claude Code Session Prompt
## Session Type: Product Spec + Architecture + Implementation
## Feature Flag: MAP_LIVE (currently false — do not enable until spec is complete)
## Priority: HIGH — Launch Differentiator
## Reference Standard: GTALens (gtalens.com) — Match then Exceed

---

## MISSION STATEMENT

Build the best GTA 6 interactive map on the internet.

GTALens is the current gold standard for GTA Online map tooling. DecodedSix's map must:
1. **Match GTALens exactly** on core map behavior, interaction model, icon system, and location widget design
2. **Exceed GTALens** on visual quality, usability, performance, and 2026 feature set
3. **Be built for GTA 6 from day one** — the Leonida map, not Los Santos

Do not deviate from the GTALens interaction standard without a clear reason to make it better. Users who come from GTALens must feel immediately at home. Then they discover it's better.

---

## PHASE 1: GTALens AUDIT — WHAT WE ARE MATCHING

### Core Map Behavior (must match exactly)

Based on manual audit of GTALens (gtalens.com), July 10, 2026:

**Map Rendering:**
- Full game map rendered as a dark-themed base layer
- Three view modes: Game (stylized game art), Print (clean high-contrast), Satellite (aerial photo style)
- Map fills the viewport — no dead space around edges
- Dark ocean/background surrounds the landmass
- The landmass itself renders with road networks, terrain features, district boundaries visible at appropriate zoom levels

**Navigation:**
- Mouse scroll to zoom in/out (smooth, not stepped)
- Click + drag to pan
- Zoom reveals more detail — at low zoom: landmass outline + major districts; at mid zoom: roads + neighborhood names; at high zoom: individual streets + building footprints
- No hard zoom limit — users can zoom until streets are clear
- Current zoom level and coordinates optionally displayed

**Location Markers / Icons:**
- Category-based icon system — each location type has its own icon
- Icons are consistent size at any zoom level (they don't scale with the map)
- Clicking an icon opens a location widget panel (right sidebar)
- Multiple icons can be visible simultaneously
- Icon categories can be toggled on/off via filter controls

**Location Widget Panel (right sidebar):**
- Shows location number/name as header
- Tabular data: Product | Max Qty | Unit Price | Total Price
- Star icon on best-value item for that location
- Arrows to navigate between locations (← Today →)
- "Watch video" link with thumbnail for locations that have associated video guides
- "Reveal coordinates" button at bottom
- "Remove all checkmarks" to clear selections
- Patreon/support prompt non-intrusively above the data panel
- "Hide" and "Hide others" controls per layer

**Header / Nav:**
- Logo top-left
- Top nav: Jobs, Collections & Playlists, Map, Weather, Support Us, overflow menu
- Log In / Register buttons top-right
- Clean dark theme — near-black background, white text, orange/red accent for logo

**Filter System:**
- Breadcrumb: Map / [Category] / [Subcategory] / [Count]
- Example: Map / FEATURED · BUSINESSES MISSIONS / STREET DEALERS (50)
- Filters collapse into the right panel
- Layer toggling with "Hide" per category

---

## PHASE 2: WHERE DECODEDSIX EXCEEDS GTALENS

### Visual Enhancements

**2.1 — Miami Vice Map Skin (DecodedSix Default)**
- GTALens uses a flat dark grayscale map base
- DecodedSix default: same map base with Miami Vice color treatment — ocean in deep teal (#0A1628), landmass in charcoal with warm undertones, roads in cyan (#00F5FF) at high zoom, district labels in Bebas Neue
- Game / Print / Satellite toggle still available — Miami Vice is a 4th option: "Decoded"

**2.2 — 3D Perspective Mode on Zoom Out**
- At minimum zoom (full map view), offer a subtle isometric tilt — 15–20 degree perspective angle
- Implemented via CSS perspective transform on the map container, not actual 3D tile rendering
- On scroll-in, perspective flattens to standard 2D — smooth transition

**2.3 — Icon Quality**
- SVG-based, crisp at all resolutions, with a subtle neon glow on hover
- Category color-coded icons: cyan (missions), orange (businesses), pink (characters), gold (collectibles)
- Icon cluster behavior at low zoom: group nearby icons into a numbered cluster badge, expand on click

### Feature Enhancements

**2.4 — GTA 6 Location Database Integration**
- Pre-built for Leonida — populated with trailer-confirmed locations immediately
- Current state (pre-launch): confirmed locations from trailers with "Spotted in Trailer" badges
- Each trailer-confirmed location links to the corresponding DecodedSix article

**2.5 — Layer System (More Granular Than GTALens)**
- Locations (Districts, Landmarks, Interiors)
- Activities (Missions, Heists, Side Quests)
- Characters (Story NPCs, Random Events)
- Collectibles (Hidden Packages, Graffiti, etc.)
- Vehicles (Spawn Points, Car Meets)
- Properties (Safehouses, Businesses)
- Secrets (Easter Eggs, Hidden Areas)
- Layer state persists in URL params for shareable filtered views

**2.6 — Coordinate System + Deep Linking**
- URL structure: `/map?lat=X&lng=Y&zoom=Z&layers=missions,collectibles`
- "Copy Link" button on every location widget
- Users can share any exact map view to Discord, Reddit

**2.7 — User Contributions (Post-Launch)**
- Registered users can submit new location pins
- Submitted pins go into HITL moderation queue (Kelvin/wife approval)
- Approved pins get "Community Verified" badge

**2.8 — Search**
- Search bar in map header — no equivalent on GTALens
- Search by: location name, district, activity type, landmark
- Results highlight on map + fly-to animation

**2.9 — Mobile Experience**
- Bottom sheet pattern — location widget slides up from the bottom on pin tap
- Map fills full screen, controls float as FABs
- Layer toggle accessible via bottom sheet tab

**2.10 — Performance**
- Map tiles served from CDN, lazy-loaded by viewport
- Progressive loading — low-res base loads first, detail tiles load as user zooms
- Target: <2s to interactive on desktop, <3s on mobile

---

## PHASE 3: TECHNICAL ARCHITECTURE

### Map Rendering Stack

**Leaflet.js + Custom Tile Layer**

```bash
npm install leaflet react-leaflet
npm install @types/leaflet
```

**Tile Strategy:**

Option A — Image Pyramid (recommended for launch):
- Slice Leonida map image into standard tile pyramid using `gdal2tiles`
- Host tiles on Cloudflare R2
- Leaflet loads only tiles currently in viewport

Option B — Single Image Fallback (for early development):
- Single high-res map image via Leaflet's `imageOverlay`
- Use this until a proper tile set is available

**Community tile source:** Search "GTA 6 Leonida map high resolution" on Reddit/GTAForums — fan communities typically produce high-res recreations within weeks of trailer releases.

### Component Architecture

```
/src/components/map/
  MapContainer.tsx          — root component, initializes Leaflet
  MapControls.tsx           — zoom in/out, reset view, 2D/3D toggle
  MapSearch.tsx             — search bar with autocomplete
  LayerPanel.tsx            — left sidebar, layer toggles with color indicators
  LocationWidget.tsx        — right sidebar, location detail panel (matches GTALens widget)
  LocationMarker.tsx        — individual map pin with icon
  MarkerCluster.tsx         — cluster badge for grouped markers
  MapViewToggle.tsx         — Game / Print / Satellite / Decoded skin switcher
  MobileBottomSheet.tsx     — mobile location detail panel

/src/hooks/
  useMapState.ts            — zoom level, center, active layers (synced to URL params)
  useLocationData.ts        — fetches location data from Supabase by bounding box
  useMapSearch.ts           — search logic

/public/map-tiles/          — tile pyramid (or symlink to CDN)
/public/map-icons/          — SVG icon set, one per category
```

### Supabase Schema — Map Tables

```sql
CREATE TABLE IF NOT EXISTS map_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  -- 'landmark','mission','business','character','collectible','property','secret'
  subcategory TEXT,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  description TEXT,
  image_url TEXT,
  source TEXT DEFAULT 'trailer', -- 'trailer','official','community'
  trailer_timestamp TEXT,        -- e.g. "0:47" in Trailer 2
  article_slug TEXT,             -- links to DecodedSix article
  confirmed BOOLEAN DEFAULT false,
  community_submitted BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT true,
  game TEXT DEFAULT 'gta6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_map_locations" ON map_locations FOR SELECT USING (approved = true);
CREATE INDEX idx_map_locations_lat_lng ON map_locations (lat, lng);
CREATE INDEX idx_map_locations_category ON map_locations (category);

CREATE TABLE IF NOT EXISTS map_location_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  description TEXT,
  source_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Icon System

```
Base: 32x32px SVG, rounded square, white symbol on colored background
  Landmark:    gold (#FFD700) background, flag icon
  Mission:     cyan (#00F5FF) background, crosshair icon
  Business:    orange (#FF6B35) background, briefcase icon
  Character:   hot pink (#FF2D78) background, person icon
  Collectible: purple (#9B59B6) background, star icon
  Property:    green (#2ECC71) background, building icon
  Secret:      dark (#1A1A2E) background, question mark icon

Hover: box-shadow: 0 0 8px currentColor (neon glow)
Active: scale(1.2) + ring
```

---

## PHASE 4: IMPLEMENTATION SEQUENCE

Complete in this exact order:

1. Install dependencies — Leaflet, react-leaflet, types
2. Source map base image — highest resolution Leonida map available
3. Set up tile pipeline — slice tiles or configure imageOverlay fallback
4. Build MapContainer — Leaflet init, dark background, centered on Vice City
5. Build MapControls — zoom in/out buttons (match GTALens style), reset view
6. Build MapViewToggle — Game / Print / Satellite / Decoded skin switcher
7. Create icon SVG set — all 7 categories
8. Build LocationMarker — renders SVG icon at lat/lng, click handler
9. Build MarkerCluster — groups markers at low zoom
10. Build LocationWidget — right sidebar, matches GTALens panel layout exactly
11. Build LayerPanel — left sidebar, category toggles
12. Seed initial map_locations — trailer-confirmed locations with source citations
13. Build MapSearch — search input with result fly-to
14. Build MobileBottomSheet — mobile location panel
15. Implement URL state sync — lat/lng/zoom/layers in URL params
16. 3D perspective mode — CSS transform on zoom-out
17. Miami Vice "Decoded" skin — custom tile color treatment
18. Performance audit — tile CDN, lazy loading, <2s target
19. Enable MAP_LIVE flag — `MAP_LIVE=true` in Vercel env

---

## PHASE 5: PRE-LAUNCH MAP CONTENT

**Districts / Areas (confirmed in Trailer 1 & 2):**
- Vice City (Downtown)
- Vice City Beach / Ocean Drive equivalent
- Leonida Keys
- Port Gellhorn
- Grassrivers
- Ambrosia
- Mount Kalaga

**Confirmed Landmarks:**
- Leonida Penitentiary
- Ocean View Hotel
- Vice City waterfront/marina
- Airport (aerial trailer shots)

**Every location pin includes:**
- Name + description
- Source: "Spotted in GTA 6 Trailer [1/2] at [timestamp]"
- Link to DecodedSix article about that location
- "More details coming after launch" disclaimer where appropriate

**Content bridge:** Every map location → DecodedSix article. Every location article → "📍 View on Map" button.

---

## SUCCESS CRITERIA

Before enabling MAP_LIVE:

- [ ] User from GTALens can use DecodedSix map with zero learning curve
- [ ] Zoom/pan feels as smooth or smoother than GTALens
- [ ] Location widget panel shows same data structure as GTALens
- [ ] All 7 confirmed GTA 6 districts pinned with source citations
- [ ] 3D perspective mode works on zoom-out without layout breaks
- [ ] Map loads <2s desktop, <3s mobile
- [ ] MAP_LIVE=true renders correctly on /map route and embedded homepage preview
- [ ] Every map location links to at least one DecodedSix article
- [ ] Mobile bottom sheet works on iOS Safari and Android Chrome
- [ ] URL sharing works — `/map?lat=X&lng=Y&zoom=Z` loads correct view

---

*Generated: July 10, 2026 | THD Agentic Systems | DecodedSix Map Spec*
*Reference: GTALens manual audit July 10, 2026 | MAP_LIVE flag: currently false*
