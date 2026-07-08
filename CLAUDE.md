# DecodedSix — Claude Code Rules

## Product
decodedsix.com — GTA 6 fan utility site
Owner: Kelvin Davis (King Kelz)
Son participates in Tuesday build sessions
Launch: November 19 2026

## Read First — Every Session
Read in this exact order before touching anything:
1. CLAUDE.md (this file)
2. EXECUTION_ORDER.md (repo root)
3. DESIGN.md (repo root)
4. docs/VOICE.md (content voice file)
5. docs/ARCHITECTURE.md (full system spec)

If any of these files do not exist, stop and flag
as BLOCKED before writing any application code.

## Stack — Never Deviate
- Next.js 15 App Router
- FastAPI (Python 3.11+)
- Supabase (auth, database, realtime, RLS)
- n8n self-hosted (automation crons)
- Vercel (deployment)
- Leaflet.js (interactive map)
- Framer Motion (all animations)
- ElevenLabs API (voiceover generation)
- InVideo AI API (video assembly)
- YouTube Data API v3 (upload + analytics)
- Originality.ai API (AI detection scoring)

Do not introduce new frameworks or libraries
without explicit instruction from owner.

## Design System — Non-Negotiable Base
Background:    #070910
Primary blue:  #5a96ff
Amber accent:  #f5a623 (expanded use — primary accent here)
Green:         #3fd17a
Fonts:         Space Grotesk (headings)
               IBM Plex Sans (body)
               JetBrains Mono (data/code)

## DecodedSix Design Personality
Industry: Gaming / Fan Utility
ICP: GTA 6 players 18-35
Feel: Dark editorial meets sports stats
Reference: ESPN dark mode + The Verge
Motion: Expressive — Framer Motion throughout
Density: Medium — editorial breathing room

## Internal Dashboard Design
Background: #0D0014 (Vice City dark)
Accent: #C8A84B (GTA gold)
Alert: #FF2D6B (neon pink)
Font headers: Pricedown (GTA font)
  — dashboard only, never on public site
Sound: GTA audio feedback on all actions
  Read lib/sounds.ts before any dashboard work

## Content Rules
Voice file: .claude/product-marketing-context.md
ALWAYS read voice file before generating
any content for the site.
Run humanizer skill after every draft.
Run AI detection before HITL queue.
Target detection score: below 30%.
Never publish without HITL approval.

## Map Feature Flag
NEXT_PUBLIC_MAP_LIVE controls map visibility
false = show placeholder with countdown
true = show live interactive map
Build full map behind the flag.
Launch day = one env variable change only.
No code deploy needed at launch.

## Folder Structure
src/
  app/
    (site)/          Public site routes
    (dashboard)/     Internal dashboard — family only
  agents/            All Python agents
  components/
    map/             Leaflet map components
    dashboard/       GTA aesthetic components
    shared/          Shared article/stat components
  lib/               API clients and utilities
migrations/          SQL migration files (001-006)
n8n/                 n8n workflow JSON files
docs/                Architecture, voice, agents, gates
.claude/             Voice file (auto-read by humanizer)

## Session Behavior
Output exactly one of these when done or blocked:
✅ DONE — [what was completed]
🚫 BLOCKED — [what is needed]
👀 REVIEW — [what needs eyes]
Then stop and wait.

## Non-Negotiables
- RLS enabled on every Supabase table immediately after creation
- product_id on every table (product_id = 'decodedsix')
- Every agent action writes to audit_log table
- DataSanitizationShield before any LLM call
- HITL approval before any content publishes
- AI detection check (Originality.ai) before HITL queue
- Copyright/trademark check before any publish
- No Rockstar/GTA trademarks on the site
- No game asset screenshots used anywhere
- Sound files in public/sounds/ only — never external URLs
- No hardcoded API keys anywhere — always os.getenv() or process.env

## LLM Routing
Default: claude-sonnet-4-6 (all agents)
High volume scraping: claude-haiku-4-5 (map scraper, news scraper)
Never use Opus unless explicitly instructed.

## Design Plugins Active
- anthropic/frontend-design
- nextlevelbuilder/ui-ux-pro-max-skill
- mistyhx/frontend-design-audit
- motion-framer (Framer Motion)
- 21st.dev Magic MCP (component generation)
- blader/humanizer + jpeggdev/humanize-writing

Before building any UI component:
1. Read DESIGN.md for exact token values
2. Check which surface (public site vs dashboard)
3. Apply correct motion rules for that surface
