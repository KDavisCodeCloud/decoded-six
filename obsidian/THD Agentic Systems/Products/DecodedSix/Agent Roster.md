# DecodedSix — Agent Roster

## Content Pipeline (6 agents, always active)
DS-DRAFT     → Draft generation (sonnet-4-6)
DS-HUM       → Humanizer (reads .claude/product-marketing-context.md)
DS-AEO       → AEO structure check
DS-SEO       → SEO rules-based check
DS-DETECT    → AI detection via Originality.ai (haiku-4-5)
DS-COPYRIGHT → Trademark/copyright compliance check

Pipeline: DRAFT → HUM → AEO → SEO → DETECT → COPYRIGHT → HITL → publish

## Map Agents (active from Phase 5)
DS-MAP-SCRAPE  → Reddit/Discord community scraper (haiku-4-5, daily 6am)
DS-MAP-DRAFT   → Marker draft from scraped data (sonnet-4-6)
DS-MAP-DAILY   → Daily location tracker (sonnet-4-6, daily 8am)

## Revenue Agents (build after gates)
DS-PROD  → Product Scout (sonnet-4-6, Gate B)
DS-AFF   → Affiliate Scout (sonnet-4-6, Gate 2)

## YouTube Agents (build after Gate 1)
DS-YT-SHORT    → Weekly challenge Short script (sonnet-4-6, Thursday 6am)
DS-YT-STRATEGY → Shorts vs long-form optimizer (sonnet-4-6, Sunday 6am)
DS-YT-UPLOAD   → YouTube API upload handler (haiku-4-5)

## LLM Routing
Default: claude-sonnet-4-6
High volume / scraping / uploads: claude-haiku-4-5
Never Opus unless explicitly instructed.

## HITL Requirement
Every agent output requires HITL before publish.
No autonomous publish path exists.

## n8n Schedule
Pre-launch:     DS-DRAFT weekly Sunday 6am
Post-launch M1: All content agents daily 6am
Post-launch M2+: Content agents Mon/Wed/Fri
DS-YT-SHORT:    Thursday 6am (always)
DS-YT-STRATEGY: Sunday 6am (always)

→ [[DecodedSix Master Reference]]
→ [[Gate System]]
