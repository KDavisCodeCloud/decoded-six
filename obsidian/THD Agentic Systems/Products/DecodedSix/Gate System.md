# DecodedSix — Monetization Gate System

Same pattern as MSE $4K MRR floor.
Gates enforce sequenced monetization.
All gates tracked live in internal dashboard.

## Gate 1 — AdSense Ready
Metric: 20 published articles
All: AI detection below 30%
All: humanizer passed + human reviewed
Unlocks: Apply for Google AdSense
Status (2026-08-21): AdSense site-verification script live in production
  (`src/app/layout.tsx`, client ca-pub-5317430228631558, confirmed in raw
  HTML) — this is verification only, not the gate. Published-article count
  and human-review status unchanged by this. See session log.
Status (2026-08-27): Kelvin submitted the AdSense application. Got a
  6-item site audit back and worked through it same-day — 3 of the 6 were
  already fine (footer link, NewsArticle schema, share buttons all already
  correct/built), 3 were real (FAQ schema threshold, forced-new-tab
  internal links, missing hero image alt text) and got fixed. See session
  log for the full breakdown. This is application review remediation, not
  a new gate metric — approval status itself still pending.
Status (2026-08-27, later): Gate 1's article-count condition (20 published)
  is actually CLEARED — 49 published editorial articles, confirmed live
  against the real `articles` table. This was invisible on the dashboard's
  own Gate Tracker page until today: it read from a `monetization_gates`
  table that turned out to not exist in the database at all (no migration
  ever created it), so Gate 1 silently showed 0/20 regardless of real
  state. Fixed — Gate 1 now computes live from `articles`, same definition
  the dashboard overview uses. AI-detection/human-review sub-conditions on
  Gate 1 aren't independently verified (no tooling checks those), but the
  article-count condition itself is real and cleared.

## Gate 2 — AdSense Approved
Metric: AdSense account approved
Unlocks: Affiliate links live across all articles
         DS-AFF agent build starts

## Gate B — Affiliate Expand (runs parallel)
Metric: 25,000 monthly sessions
Unlocks: Secretlab + NordVPN + Razer + G2A + Fanatical
         DS-PROD product scout agent build starts

## Gate 3 — Ezoic Incubator
Metric: 1,000 daily sessions × 7 consecutive days
Unlocks: Apply to Ezoic Incubator (2–3x AdSense RPM)

## Gate 4 — Content Scale
Metric: 5,000 daily sessions
Unlocks: 4 articles/day + video pipeline activation

## Gate 5 — Ezoic Full
Metric: 250,000 monthly users
Unlocks: Ezoic full platform application

## Gate 6 — Mediavine (or Raptive)
Metric: 50,000 monthly sessions
Unlocks: Premium ad network (3–5x AdSense RPM)

## Gate 7 — Affiliate Optimize
Metric: $500/month affiliate revenue
Unlocks: A/B test placements + comparison tables + brand talks

## Gate 8 — Brand Deals
Metric: $1,500/month combined revenue
Unlocks: Sponsored content $500–$2,000/post

## YouTube Gates
Gate YT1: 1,000 subscribers → YouTube Partner Program
Gate YT2: 10,000 subscribers → Brand sponsorship outreach

## Discord Gate
Gate D1: 10,000 monthly sessions → Paid Discord $5/month

## Expected Timeline
Month 1: Gate 1 → AdSense apply
Month 2: Gate 2 → Affiliates live
Month 3: Gate 3 → Ezoic apply
Month 4: Gate B → Affiliate expand
Month 6: Gates 7 + YT1
Month 9: Gate 5 → Ezoic full
Month 12: Gate 6 → Mediavine
Year 2: Gates 8 + YT2 + D1

→ [[DecodedSix Master Reference]]
