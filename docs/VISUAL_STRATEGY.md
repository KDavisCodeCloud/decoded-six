# DecodedSix Visual Strategy — Claude Code Session Prompt
## Session Type: Research + Architecture + Implementation
## Priority: HIGH — Pre-Launch Blocker
## Deadline: July 27, 2026

---

## CONTEXT LOAD — READ THIS FIRST

You are building **DecodedSix** (thedecodedsix.com) — a GTA 6 fan/editorial site built by THD Agentic Systems. The site is a FastAPI + Next.js 15 + Supabase stack. The content model is editorial: news articles, features, database pages (vehicles, weapons, characters, map, gangs, animals, properties), and speculation/analysis.

The site currently has **zero images**. This is a critical competitive gap. Every major GTA 6 competitor site — GTABase, Rockstar Intel, GTA Fandom, GTALens — uses images aggressively and is fully monetized with display ads alongside that imagery. DecodedSix must match and exceed this visual standard before launch.

**This session has three phases:**
1. **Research** — Audit competitor visual strategy and catalog what we're missing
2. **Architecture** — Design the image pipeline, asset tiers, and content voice system
3. **Implementation** — Build the components, update agent prompts, and create the Obsidian brief

---

## PHASE 1: COMPETITIVE VISUAL RESEARCH

### Competitor Audit — July 10, 2026

**GTABase (gtabase.com)**
- Uses official Rockstar press art on every category page
- Category grid thumbnails: official game screenshot as background + GTA VI logo overlay + category label in styled font
- Article list pages: thumbnail left-aligned next to every headline — no article runs without an image
- Features page hero: transformed/stylized version of the Jason & Lucia key art
- Fully monetized with display ads alongside all this imagery — no penalty observed
- Navigation: Overview, News, Features, Game Editions, Screenshots, Map Locations, Vehicles, Weapons, Characters, Animals, Missions, Activities, Properties, Gangs, Cheats, Artworks, Videos, Soundtrack

**Rockstar Intel (rockstarintel.com)**
- Every article has a featured image (official trailer screenshots, character artwork, promotional materials)
- Sidebar "Latest" section shows thumbnail + headline for every story
- Article pages: large hero image above the fold, then inline images throughout
- Uses official Rockstar screenshots directly — labeled editorial commentary, not raw copies
- Monetized with display ads throughout

**GTA Fandom / GTA Wiki**
- Character profile pages: official character artwork as profile image, screenshots from trailers as inline evidence
- Artworks page catalogs all official Rockstar releases: cover art, character renders, location backgrounds, postcards, trailer stills

**GTALens (gtalens.com)**
- Interactive map tool — uses in-game map imagery
- Monetized (Patreon + display ads)

### Research Tasks for This Session

```bash
# Audit current image state
grep -r "Image\|<img\|placeholder\|thumbnail\|hero" /mnt/c/Users/Kelvin/projects/decoded-six/src --include="*.tsx" --include="*.jsx" --include="*.ts" -l

# Check image columns in schema
grep -r "image_url\|thumbnail\|featured_image\|hero_image\|cover" /mnt/c/Users/Kelvin/projects/decoded-six/supabase/migrations/

# Check agent prompts for visual instructions
grep -r "image\|visual\|thumbnail\|photo" /mnt/c/Users/Kelvin/projects/decoded-six/src/agents/ --include="*.py" --include="*.txt" --include="*.md" -l
```

After running the audit, document:
- Every page/component that needs an image and currently has none
- Every agent prompt that needs image sourcing instructions added
- Every Supabase table that needs an image_url column added

---

## PHASE 2: VISUAL ARCHITECTURE

### Image Tier System

DecodedSix uses a **three-tier image system**. Every image on the site falls into exactly one tier. No article, no category page, no feature publishes without a Tier 1 or Tier 2 image assigned.

---

**TIER 1 — Official Rockstar Press Assets**
*Use freely. Caption as "© Rockstar Games." Released for media coverage.*

| Asset Name | Type | Best Use |
|---|---|---|
| GTA 6 Official Cover Art | Key Art | Game edition pages, homepage hero |
| GTA 6 Cover Artwork (variant) | Key Art | Article headers, og:image |
| Jason & Lucia 1 | Character Key Art | Homepage hero, features page |
| Jason & Lucia 1 (No Logos) | Character Key Art | Clean editorial use |
| Jason & Lucia 2 | Character Key Art | Article headers |
| Jason & Lucia 2 (No Logos) | Character Key Art | Clean editorial use |
| Jason & Lucia 3 | Character Key Art | Article headers |
| Jason & Lucia 3 (No Logos) | Character Key Art | Clean editorial use |
| Jason & Lucia — Motel | Scene Art | Story/narrative articles |
| Jason Duval — Character Render | Character Art | Jason character profile page |
| Lucia Caminos — Character Render | Character Art | Lucia character profile page |
| Cal Hampton | Character Art | Supporting character page |
| Boobie Ike | Character Art | Supporting character page |
| Dre'Quan Priest | Character Art | Supporting character page |
| Raul Bautista | Character Art | Supporting character page |
| Brian Heder | Character Art | Supporting character page |
| Real Dimez | Character Art | Supporting character page |
| Background — Vice City | Location Art | Map page, Vice City section |
| Background — Leonida Keys | Location Art | Map page, Leonida Keys section |
| Background — Grassrivers | Location Art | Map page, Grassrivers section |
| Background — Port Gellhorn | Location Art | Map page, Port Gellhorn section |
| Background — Ambrosia | Location Art | Map page, Ambrosia section |
| Background — Mount Kalaga | Location Art | Map page, Mount Kalaga section |
| Postcard — Vice City | Postcard Art | Location feature cards |
| Postcard — Leonida Keys | Postcard Art | Location feature cards |
| Postcard — Grassrivers | Postcard Art | Location feature cards |
| Postcard — Port Gellhorn | Postcard Art | Location feature cards |
| Postcard — Ambrosia | Postcard Art | Location feature cards |
| Postcard — Mount Kalaga | Postcard Art | Location feature cards |
| GTA 6 Logo (Official) | Logo | Nav, footer, category labels |
| Trailer Announcement 16:9 | Promo Still | Article headers |
| Trailer Announcement 9:16 | Promo Still | Mobile hero, social cards |

**Trailer screenshots:** Any screenshot from official Rockstar GTA 6 trailers (Trailer 1, Trailer 2) is fair use for reporting/editorial commentary. Caption: "Screenshot: GTA 6 Trailer [1/2] © Rockstar Games"

---

**TIER 2 — Transformed Editorial Art (DecodedSix Original)**
*Official art processed with our visual identity applied — looks like DecodedSix, not Rockstar.*

**Visual Identity:**
- **Aesthetic:** Miami Vice 2026 — saturated neons on deep night backgrounds
- **Colors:**
  - Deep Navy Background: `#06080F`
  - Hot Pink / Neon Magenta: `#FF2D78`
  - Electric Cyan: `#00F5FF`
  - Sunset Orange: `#FF6B35`
  - Palm Gold: `#FFD700`
  - Off-White Text: `#F0F0F0`
- **Typography:** Bebas Neue (headlines), Inter (body), JetBrains Mono (stats)
- **Treatment:** Duotone + neon glow edge — official art desaturated then re-tinted pink/cyan split tone

**Transformation Workflow (Adobe Firefly preferred):**
1. Start with Tier 1 official press image
2. Apply: desaturate → duotone (pink high / cyan shadow) → neon glow edge filter → DecodedSix label in Bebas Neue
3. Export: 1200x630 (og:image) and 800x450 (article card)
4. Save to `/public/images/editorial/[category]/[slug].webp`

**Category Thumbnails to Create (Priority Order):**
1. `category-news.webp` — Jason & Lucia 1 transformed + "NEWS" label
2. `category-features.webp` — Jason & Lucia 3 transformed + "FEATURES" label
3. `category-vehicles.webp` — vehicles trailer screenshot + "VEHICLES" label
4. `category-weapons.webp` — weapons screenshot + "WEAPONS" label
5. `category-map.webp` — Vice City background + "MAP & LOCATIONS" label
6. `category-characters.webp` — Lucia render + "CHARACTERS" label
7. `category-gangs.webp` — Jason & Lucia scene + "GANGS & FACTIONS" label
8. `category-animals.webp` — Leonida Keys background + "ANIMALS" label
9. `category-properties.webp` — Port Gellhorn background + "PROPERTIES" label
10. `category-speculation.webp` — Grassrivers background + "DEEP DIVE" label

---

**TIER 3 — Original DecodedSix Branded Assets**
*Built from scratch. No official art.*
- Site logo lockup
- Author avatars
- Infographic templates
- Data visualization backgrounds
- Social card templates (og:image fallback)

---

### Image Schema — Supabase Changes Required

```sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_alt TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_credit TEXT DEFAULT '© Rockstar Games';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_tier INTEGER DEFAULT 2
  CHECK (featured_image_tier IN (1, 2, 3));
ALTER TABLE articles ADD COLUMN IF NOT EXISTS og_image_url TEXT;

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  category TEXT, -- 'character','location','keyart','logo','editorial'
  url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  credit TEXT DEFAULT '© Rockstar Games',
  width INTEGER,
  height INTEGER,
  best_use TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Seed `media_assets` with all Tier 1 assets from the catalog above.

---

## PHASE 3: CONTENT VOICE SYSTEM

### The DecodedSix Voice

Written by a fan, for fans. Kelvin's voice — a grown man who grew up on GTA, knows the culture, respects Rockstar's craft, and is genuinely hyped about GTA 6 the way you get hyped when something you've waited years for is almost here.

**NOT:**
- Dry game journalism ("Rockstar Games has confirmed that...")
- Hype-bro YouTube energy ("YO THIS IS INSANE BRO")
- SEO-stuffed listicles with no personality

**IS:**
- Informed fan excitement — "I've been watching every frame of that trailer and here's what caught my eye"
- Respectful speculation — "Rockstar hasn't said anything yet, but based on what we saw in Trailer 2..."
- Real anticipation — "If they pull this off, it's going to change what we expect from open world games"
- Honest hype — "I don't know when the next teaser drops but I'm checking every week"

### Content Category Voice Map

**BREAKING NEWS** — Fast, excited, authoritative
- Lead with the news in sentence one
- Featured image: Tier 1 official screenshot
- Example: "Rockstar Confirms [X] — Here's Everything We Know"

**FEATURES / DEEP DIVE** — Thoughtful, obsessive fan
- 800–1500 words, headers, cite trailers as evidence
- End with "What we're still waiting to find out"
- Featured image: Tier 2 editorial art
- Example: "Every Confirmed Vehicle in GTA 6 (And What They Tell Us About Leonida)"

**SPECULATION / ANALYSIS** — Can't sleep, been thinking about this
- ALWAYS label "SPECULATION" on every post
- Frame as "here's what the evidence suggests"
- Close with open question for the community
- Featured image: Tier 2 with "SPECULATION" badge

**DATABASE PAGES** — Reference + flavor, facts first
- Official confirmed information only, cite source
- Featured image: Character render (Tier 1) or location background (Tier 1)

### Agent Prompt Updates Required

Add to every content agent system prompt:

```
VISUAL REQUIREMENTS — MANDATORY

Every article output JSON MUST include:
{
  "featured_image_url": "<url>",
  "featured_image_alt": "<descriptive alt text>",
  "featured_image_credit": "© Rockstar Games",
  "featured_image_tier": 1,
  "og_image_url": "<same or og-specific crop>"
}

IMAGE SELECTION RULES:
1. News about a specific character → use that character's official render
   from /public/images/tier1/characters/
2. News about a location → use that location's background art
   from /public/images/tier1/locations/
3. General GTA 6 news → use Jason & Lucia 1 or the official cover art
4. Speculation articles → use Tier 2 editorial asset
   from /public/images/editorial/speculation/
5. NEVER publish an article with featured_image_url = null

TONE CALIBRATION:

WRONG: "Rockstar Games has announced that Grand Theft Auto VI will feature dual protagonists."
RIGHT: "After years of waiting, Rockstar finally confirmed it — GTA 6 gives us two protagonists
for the first time since GTA V, and this time Jason and Lucia aren't just playable, they're equal
leads in what looks like a Bonnie and Clyde story set in modern Vice City."

WRONG: "The game is scheduled for release in Fall 2025."
RIGHT: "The release date has shifted more than once, but right now the target window is Fall 2025
— and honestly, after what we saw in Trailer 2, I'd wait another year if Rockstar needs it."

WRONG: "This article will discuss the confirmed features of GTA 6."
RIGHT: "Rockstar has been unusually quiet since Trailer 2 dropped. So let's go back through
everything we've confirmed so far — because there's more in there than most people caught."
```

---

## PHASE 4: IMPLEMENTATION TASKS

### Task 1 — Image Directory Structure
```bash
mkdir -p public/images/tier1/keyart
mkdir -p public/images/tier1/characters
mkdir -p public/images/tier1/locations
mkdir -p public/images/tier1/logos
mkdir -p public/images/tier1/trailers
mkdir -p public/images/editorial/news
mkdir -p public/images/editorial/features
mkdir -p public/images/editorial/speculation
mkdir -p public/images/editorial/categories
mkdir -p public/images/branded
```

### Task 2 — ArticleImage Component
Create `/src/components/ArticleImage.tsx`:
- Props: `src, alt, credit, tier, priority`
- Tier 1: renders "© Rockstar Games" credit badge bottom-right
- Tier 2: renders DecodedSix watermark (subtle, bottom-right)
- Tier 3: no credit
- Always uses `next/image`

### Task 3 — CategoryGrid Component
Create `/src/components/CategoryGrid.tsx`:
- 2-column thumbnail grid (like GTABase)
- Each cell: Tier 2 background + category label in Bebas Neue
- Hover: brightness increase + label slides up
- Mobile: single column
- Categories: News, Features, Vehicles, Weapons, Map, Characters, Gangs, Animals, Properties, Speculation

### Task 4 — ArticleCard Component (update existing)
Update `/src/components/ArticleCard.tsx`:
- Image left (40%) + headline/excerpt right (60%) on desktop
- Mobile: image top, text below
- Shows: category badge, date, read time, featured image
- REQUIRED: show placeholder with category color if image missing — never render without visual

### Task 5 — HeroImage Component
Create `/src/components/HeroImage.tsx`:
- Full-width hero for article and category pages
- CSS filter applies Miami Vice duotone (supplement to actual transformed art)
- Headline overlaid on bottom third
- Credit badge: bottom-right, semi-transparent

### Task 6 — Supabase Migration
Create `supabase/migrations/007_media_assets.sql` (after confirming 006 ran):
- Add 5 image columns to `articles` table
- Create `media_assets` catalog table
- Seed Tier 1 assets

### Task 7 — SEO/OG Meta
Update `src/app/news/[slug]/page.tsx` `generateMetadata`:
```tsx
openGraph: {
  images: [{ url: article.og_image_url, width: 1200, height: 630 }]
},
twitter: {
  images: [article.og_image_url]
}
```

---

## SUCCESS CRITERIA

Before closing this session:

- [ ] Every article list page has `ArticleCard` with image rendering
- [ ] Every article page has `HeroImage` above the fold
- [ ] CategoryGrid renders with all 10 Tier 2 thumbnails wired
- [ ] `media_assets` table seeded with all Tier 1 assets
- [ ] `articles` table has all 5 new image columns
- [ ] `og_image_url` appears in `<meta>` tags on article pages
- [ ] Agent system prompts updated with image selection rules and voice requirements
- [ ] No article can publish without `featured_image_url` — enforce at API level

---

*Generated: July 10, 2026 | THD Agentic Systems | DecodedSix Pre-Launch Sprint*
