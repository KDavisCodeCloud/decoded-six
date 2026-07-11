# DecodedSix Visual Strategy
Last Updated: July 10, 2026

## The Gap
The site currently has zero images. Every major GTA 6 competitor — GTABase, Rockstar Intel, GTA Fandom, GTALens — uses images aggressively and is fully monetized. DecodedSix must match and exceed this before AdSense application.
Full implementation spec: `docs/VISUAL_STRATEGY.md`

## Build Checklist
- [ ] Image directory structure created (`/public/images/tier1/`, `/public/images/editorial/`, `/public/images/branded/`)
- [ ] ArticleImage component built (tier-aware, credit badge)
- [ ] CategoryGrid component built (10 category thumbnails, hover effect)
- [ ] ArticleCard updated with featured image (placeholder if image missing)
- [ ] HeroImage component built (full-width, Miami Vice CSS filter, credit badge)
- [ ] Migration 007 applied — 5 image columns on `articles` + `media_assets` table
- [ ] Agent system prompts updated with image selection rules + voice requirements
- [ ] Tier 1 asset catalog seeded in `media_assets` table
- [ ] Tier 2 editorial assets created (10 category thumbnails)
- [ ] OG image meta implemented on article pages
- [ ] No article can publish without `featured_image_url` — enforced at API level

## Three-Tier Image System

**Tier 1 — Official Rockstar Press Assets**
Use freely. Caption "© Rockstar Games."
Includes: GTA 6 cover art, Jason & Lucia key art (3 versions), character renders (Jason, Lucia, Cal Hampton, Boobie Ike, Dre'Quan Priest, Raul Bautista, Brian Heder, Real Dimez), location backgrounds (Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia, Mount Kalaga), location postcards (6), GTA 6 logo, trailer stills (16:9 + 9:16).
Trailer screenshots: fair use for editorial commentary — caption "Screenshot: GTA 6 Trailer [1/2] © Rockstar Games"

**Tier 2 — Transformed Editorial Art (DecodedSix Original)**
Official art + Miami Vice duotone treatment = looks like us, not Rockstar's PR deck.
Treatment: desaturate → pink/cyan duotone → neon glow edge → Bebas Neue category label
Output: 1200x630 (og:image) + 800x450 (article card), saved as `.webp`
10 category thumbnails needed: news, features, vehicles, weapons, map, characters, gangs, animals, properties, speculation

**Tier 3 — Original Branded Assets**
No official art. Logo lockup, author avatars, infographic templates, social card fallbacks.

## Visual Identity (for Tier 2 transforms)
```
Background:   #06080F
Hot Pink:     #FF2D78
Electric Cyan: #00F5FF
Sunset Orange: #FF6B35
Palm Gold:    #FFD700
Off-White:    #F0F0F0
Display font: Bebas Neue
Body font:    Inter
Data font:    JetBrains Mono
```

## Content Voice
Fan excitement + informed analysis. Kelvin's voice.

**NOT:** Dry game journalism or hype-bro YouTube energy.
**IS:** Informed fan excitement. Respectful speculation. Real anticipation.

Calibration examples:
- WRONG: "Rockstar Games has announced dual protagonists."
- RIGHT: "After years of waiting, Rockstar finally confirmed it — GTA 6 gives us two protagonists for the first time since GTA V..."

- WRONG: "The game is scheduled for Fall 2025."
- RIGHT: "The release date has shifted more than once, but the current target is Fall 2025 — and honestly, after what we saw in Trailer 2, I'd wait another year if Rockstar needs it."

## Competitor Audit (July 10, 2026)
- **GTABase:** Category grid thumbnails, article thumbnail on every post, official art + editorial label overlays
- **Rockstar Intel:** Hero image on every article, sidebar thumbnails, in-article screenshots
- **GTA Fandom:** Character renders, artworks catalog, trailer screenshots as evidence
- **GTALens:** Interactive map with game imagery (map spec handled separately)

## Revenue Connection
- Images → AdSense eligibility (image-rich pages = stronger application)
- Images → social sharing (og:image = rich previews on X, Discord, Reddit = traffic)
- Images → time on site (visual pages = lower bounce = better ad RPM)

## Supabase Schema Changes
```sql
-- articles table additions
featured_image_url TEXT
featured_image_alt TEXT
featured_image_credit TEXT DEFAULT '© Rockstar Games'
featured_image_tier INTEGER CHECK (tier IN (1, 2, 3))
og_image_url TEXT

-- new table
media_assets (id, name, tier, category, url, alt_text, credit, width, height, best_use[], created_at)
```

## Session Scope (before July 27)
- Day 1: Schema migration, image directory structure, ArticleImage component
- Day 2: CategoryGrid, updated ArticleCard, HeroImage, OG meta
- Day 3: Tier 2 editorial asset creation (10 thumbnails), agent prompt updates, integration QA

→ [[DecodedSix Master Reference]]
→ [[Map Specification]]
→ [[Gate System]]
