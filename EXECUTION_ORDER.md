# DecodedSix — Execution Order

## Current Phase
Phase: PRE-LAUNCH BUILD
Target Launch: November 19 2026 (GTA 6 launch day)
Build Owner: Kelvin Davis
Tuesday Sessions: Son (GTA content + approvals)

## Build Phases

### Phase 1 — Foundation
- [ ] Repo scaffolded with full folder structure
- [ ] CLAUDE.md created and complete
- [ ] EXECUTION_ORDER.md created and complete
- [ ] DESIGN.md created and complete
- [ ] docs/VOICE.md created and complete
- [ ] docs/ARCHITECTURE.md created and complete
- [ ] .claude/product-marketing-context.md created
- [x] Next.js upgraded to 15
- [ ] Supabase project created (isolated — not shared with other products)
- [ ] migrations/001 through 006 run clean
- [ ] Vercel project created and linked to decodedsix.com
- [ ] Environment variables all set (see docs/ENV_SETUP.md)

### Phase 2 — Public Site Shell
- [ ] Homepage with all sections
- [ ] Map placeholder section
  (caution tape animation, countdown, email capture)
- [ ] News section (static — no agent yet)
- [ ] Guides section stub
- [ ] About/editorial policy page
- [ ] Privacy Policy page
- [ ] Contact page
- [ ] AdSense pre-approval checklist met
  (see docs/GATES.md — Gate 1)

### Phase 3 — Content Pipeline (Autonomous)
- [ ] agents/content/ds_draft.py built and tested
- [ ] agents/content/ds_humanizer.py wired to voice file
- [ ] agents/content/ds_aeo.py AEO structure check
- [ ] agents/content/ds_seo.py rules-based SEO check
- [ ] agents/content/ds_detect.py Originality.ai wired
- [ ] agents/content/ds_copyright.py compliance check
- [ ] n8n content pipeline workflow active
- [ ] HITL queue rendering in dashboard
- [ ] First 20 articles published and approved
  → GATE 1 cleared — apply for AdSense

### Phase 4 — Internal Dashboard
- [ ] Dashboard auth (Supabase magic link)
  Owner and son login only
- [ ] GTAOverlay component built
  (Mission Passed, Wasted, Big Score, Wanted)
- [ ] Sound system built (lib/sounds.ts)
  Sound files added manually to public/sounds/
- [ ] Content pipeline view live
- [ ] Gate tracker view (all gates visible with progress)
- [ ] Revenue panel (placeholder until AdSense approved)

### Phase 5 — Interactive Map
- [ ] Leaflet.js base map component built
- [ ] All widget components built:
  CategoryFilter, AreaOverlay, SearchBar,
  MoneyFilter, DailyTracker, MarkerPopup,
  MiniMap, MapPlaceholder
- [ ] Map data schema seeded (migrations/002)
- [ ] Feature flag confirmed working:
  NEXT_PUBLIC_MAP_LIVE=false → placeholder
  NEXT_PUBLIC_MAP_LIVE=true → live map
- [ ] ds_map_scrape.py agent built
- [ ] ds_map_daily.py daily location tracker built
- [ ] Map HITL queue in dashboard

### Phase 6 — YouTube System
BUILD AFTER GATE 1 (AdSense approved)
- [ ] lib/elevenlabs.ts client built
- [ ] agents/youtube/ds_yt_short.py weekly challenge agent
- [ ] agents/youtube/ds_yt_strategy.py optimizer
- [ ] agents/youtube/ds_yt_upload.py YouTube API agent
- [ ] Weekly challenge Short template locked
- [ ] n8n Thursday 6am cron active
- [ ] YouTube panel in dashboard

### Phase 7 — Revenue Intelligence
BUILD AFTER GATE B (25K monthly sessions)
- [ ] agents/revenue/ds_prod.py DS-PROD product scout
- [ ] agents/revenue/ds_aff.py DS-AFF affiliate scout
- [ ] Product scout dashboard panel
- [ ] Affiliate scout dashboard panel
- [ ] Revenue attribution schema live
- [ ] Learning loop outcome logging active

### Phase 8 — Launch Day (November 19 2026)
- [ ] NEXT_PUBLIC_MAP_LIVE flipped to true
- [ ] Map waitlist email sent via systeme.io tag
- [ ] All content pipeline agents running
- [ ] Daily location agent active
- [ ] Weekly challenge Short queued for Friday
- [ ] CEO Decoded dashboard showing live DecodedSix data

## Gate Summary (see docs/GATES.md for full specs)
GATE 1:  20 articles published → Apply AdSense
GATE 2:  AdSense approved → Affiliate links live
GATE B:  25K sessions/month → Add Secretlab, NordVPN, Razer
GATE 3:  1K daily sessions × 7 days → Apply Ezoic Incubator
GATE 4:  5K daily sessions → 4 articles/day + video pipeline
GATE 5:  250K monthly users → Ezoic full platform
GATE 6:  50K monthly sessions → Mediavine/Raptive
GATE 7:  $500/month affiliate → A/B test placements
GATE 8:  $1,500/month combined → Brand deal outreach
GATE YT1: 1K subscribers → YouTube Partner Program
GATE YT2: 10K subscribers → Pitch sponsorships
GATE D1:  10K monthly sessions → Discord paid tier
