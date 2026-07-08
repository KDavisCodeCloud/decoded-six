# DecodedSix — Architecture

## What It Is
GTA 6 fan utility site. Interactive map, weekly challenge tracker,
news, guides, tier lists, digital products, affiliate marketing.
Launches November 19 2026 — GTA 6 launch day.

## Domain
Public site: decodedsix.com
Internal dashboard: decodedsix.com/dashboard (auth-gated)
Repo: github.com/KDavisCodeCloud/decoded-six

## Stack
- Next.js 15 App Router (frontend + SSR)
- FastAPI Python 3.11 (agent API endpoints)
- Supabase (isolated project — not shared with other products)
- n8n self-hosted (automation crons and workflows)
- Vercel (deployment — public site + dashboard)
- Leaflet.js (interactive map)
- Framer Motion (all animations)
- ElevenLabs API (voiceover for YouTube Shorts)
- InVideo AI (video assembly for YouTube Shorts)
- YouTube Data API v3 (upload + analytics)
- Originality.ai API (AI detection scoring on content)

## Supabase Project
Isolated from all other THD products.
Own project: decodedsix-prod
Auth: Magic link (email only)
Dashboard access: owner + son only

## Revenue Sources (in order of build priority)
1. Display ads — AdSense → Ezoic → Mediavine progression
2. Affiliate marketing — gaming peripherals, VPN, digital goods
3. Digital products — Etsy + Gumroad + direct sale
4. Discord paid tier — $5/month fan community
5. YouTube — ad revenue + brand sponsorships

## Content Architecture
All content goes through the 6-agent pipeline before publish:

ds_draft → ds_humanizer → ds_aeo → ds_seo → ds_detect → ds_copyright → HITL → publish

No content bypasses this pipeline. Ever.

Voice file: .claude/product-marketing-context.md
AI detection target: below 30% on Originality.ai
HITL: every article reviewed before publish

## Map Architecture
Leaflet.js with custom GTA 6 tile layer
All marker data in Supabase map_markers table
Feature flag: NEXT_PUBLIC_MAP_LIVE
  false = placeholder with countdown + email capture
  true = live interactive map
Launch day = flip env var in Vercel. Zero code deploy.

Map data sources:
1. Community submissions (form → HITL)
2. Reddit/Discord scraping (ds_map_scrape agent → HITL)
3. Manual (son Tuesday sessions → HITL)

## YouTube Architecture
Channel: DecodedSix YouTube
One recurring Short format: Weekly challenge verdict (Thursdays)
Agents handle production end-to-end — son approves in 10 minutes

Production pipeline:
ds_yt_short → ElevenLabs (voice) → InVideo AI (video) → HITL → ds_yt_upload

## Dashboard Architecture
Internal only. Magic link auth.
GTA Vice City aesthetic (dark purple + gold + neon pink).
Sound effects on all actions.
Shows: content pipeline, gates, revenue, YouTube, map management,
       product scout, affiliate scout.

## Agent Schedule (n8n)
Pre-launch:    ds_draft weekly Sunday
Post-launch M1: All content agents daily 6am
Post-launch M2+: All content agents 3x/week
ds_yt_short: Thursday 6am (always — follows Rockstar update)
ds_yt_strategy: Sunday 6am (always)

## SEO Strategy
Primary: AEO (Answer Engine Optimization)
  Direct answer sentences, FAQPage schema, semantic headings
Target: GTA 6 queries answered before gaming news sites
No gameplay how-tos — too competitive against IGN/Gamespot
Focus: map locations, money making, weekly challenges, tier lists

## Revenue Projections
Launch week:   $3,000
Month 1:       $4,000
Month 3:       $10,000
Month 6:       $22,000
Month 12:      $38,000
Year 2:        $63,000

Site sale value (Year 2): $1.89M — $2.65M (30–42x monthly)
