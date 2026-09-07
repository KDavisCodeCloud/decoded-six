## Context
Kelvin brought 7 Google Search Console "Page indexing" screenshots showing 71 not-indexed pages across 6 reasons (Page with redirect, Alternate page with proper canonical tag, Not found 404, Crawled - currently not indexed, Blocked by robots.txt, Duplicate without user-selected canonical). Asked for root cause + remediation, not just a description of the symptoms.

## Root Cause 1 — Trailing-Slash Bug on Every Non-Default Locale Homepage
`localeAlternates()` (`lib/seo.ts`) and `sitemap.ts`'s `localizedUrl()` built locale-prefixed URLs as `prefix + path`. For the homepage (`path === '/'`), that produced `/de/`, `/fr/`, `/en-GB/`, etc. — URLs that don't match the app's real route (`/de`) and get 308-redirected by Next's default trailing-slash behavior. Confirmed live: `/de` returned 200 but its own canonical tag pointed at `/de/`, which redirects back to `/de`. Directly explained "Page with redirect" (5 locale homepages) and part of "Alternate page with proper canonical tag" (6 locale homepages disowning themselves).

**Fix:** extracted `localizedPath()` — special-cases `path === '/'` — used by both `seo.ts` and `sitemap.ts` so they can't drift apart again. Commit `aa8c0cc`.

## Root Cause 2 — Untranslated Static Pages Claiming to Be Real Language Variants
Every static page on the site (`/`, `/about`, `/vehicles`, `/news`, `/privacy`, `/characters`, `/subscribe`, `/map`, `/guides`, `/rumors`) renders 100% hardcoded English body copy regardless of locale — zero `useTranslations`/`getTranslations` calls anywhere in any of them, confirmed by grep. Only nav/footer chrome is actually translated. Despite that, each still self-canonicalized and declared hreflang alternates per locale, telling Google 7 near-identical pages were legitimate language variants. Google's own duplicate-content detection was already overriding that — this produced most of the "Duplicate without user-selected canonical" and "Alternate page with proper canonical tag" entries (`/fr/privacy`, `/en-GB/subscribe`, `/pt/rumors`, `/de/guides`, etc).

**Decision (Kelvin):** canonicalize away rather than translate — these are either legal/utility chrome not worth localizing (privacy, subscribe, map) or real content better translated post-launch once locale traffic data exists (characters, guides, rumors, homepage, about, vehicles, news). Presented both options with tradeoffs; Kelvin chose canonicalize-away for all of them.

**Fix:** added `unlocalizedAlternates()` — every locale variant of these routes now canonicals to the single English URL, no false hreflang claims. Sitemap lists one URL per route instead of 8. Locale-prefixed pages still render (chrome still localizes) — only the signal to Google changed. Done in two approval passes: `/privacy /characters /subscribe /map /guides /rumors` (commit `7684944`), then `/` `/about` `/vehicles` `/news` (commit `4de24be`) once the pattern was confirmed site-wide.

**Not yet done:** `/gta-6-complete-guide` has the identical issue but wasn't covered by either approval — flagged in code, left alone.

**HITL note:** no dashboard mechanism exists to approve a code/SEO change like this (it's built for content-article approval, not this class of action). Kelvin approved verbally in chat both times; logged as `audit_log` rows (`canonicalize_untranslated_locale_variant:<path>`, result `owner_approved_deployed_commit_<sha>`) since the dashboard has nothing to record it.

## Root Cause 3 — Query-Filtered Listing Views Left Ambiguous
`/news?category=X` and `/rumors?status=X` already canonicalized to the bare listing page but had no explicit `robots` directive, so Google's duplicate-content algorithm bucketed them inconsistently. Added explicit `noindex, follow` on the filtered variants. Commit `aa8c0cc`.

## Root Cause 4 (404s) — Mixed Bag, Traced Individually
Queried the `articles` table directly rather than guessing:
- 5 slugs (`gta-6-money-spots`, `gta-6-tier-list`, `gta-6-weekly-challenges`, `gta-6-trailer-breakdown`, `gta-6-system-requirements`) existed with real content but `status: 'draft'` — see the AdSense near-miss below, this was **not** a bug to fix.
- 3 slugs (`gta-6-map-locations`, `gta-6-online-money-spots-tracker`, `gta-6-edition-comparison-which-to-buy`) don't exist in the table at all — genuinely removed content, correctly 404ing, nothing to fix.
- `gta-6-pre-order-guide-editions-price` already had a `redirect_slug` set and 308s correctly — already fixed before this session.
- `/&` — a single malformed URL, almost certainly a crawler artifact (matches a React SSR streaming-boundary comment marker `<!--&-->` seen in the raw page source), not a real link anywhere in the codebase.
- `/vehicles` reported 404 in GSC but returns 200 live now (last GSC crawl was Jul 11, long before recent fixes) — likely already resolved, needs a GSC re-validate rather than a code change.

## AdSense Near-Miss — Republished, Then Reverted
Kelvin approved publishing the 5 draft utility-page slugs above "to stop the 404s." Did it (audit-logged), verified live, moved on — **without checking why they were draft in the first place.** They'd been published then explicitly unpublished same-day back on 2026-07-25/26 (see that session log) specifically because live thin/placeholder content was judged a risk to the AdSense application, with a documented restore date of **2026-11-26, not before**. Kelvin submitted the actual AdSense application on 2026-08-27 (see that session log) — still pending today, confirmed by Kelvin directly (no live status tracked anywhere in the DB; `monetization_gates` table doesn't exist).

Kelvin caught it by asking "what's the benefit" rather than accepting the republish. Investigated properly this time before acting:
- 2 of the 5 slugs (`gta-6-tier-list`, `gta-6-trailer-breakdown`, `gta-6-system-requirements` — actually 3) had **zero** live internal references — no real benefit to publishing, pure stale-GSC-crawl noise that self-clears over time.
- 2 of the 5 (`gta-6-money-spots`, `gta-6-weekly-challenges`) **were** referenced by currently-published articles — a real dead-link problem, but separate from the GSC framing, and not a reason to republish thin stub content mid-AdSense-review.

**Resolution:** reverted all 5 back to `draft` (restoring Kelvin's original decision), and fixed the actual dead-link problem the same way the 2026-07-25/26 pass did — by removing the dead links/sentences from the 3 referencing articles instead of keeping stub pages live to serve them:
- `gta-6-heist-missions-guide` — deleted a 3-line bare-link block; all 3 links in it were dead (one had a typo'd slug, `gta-6-money-spots-guide`, that never existed at all; the third, `gta-6-map-locations`, is also gone from the table entirely).
- `gta-6-vice-city-location-details-3` — removed a full sentence containing 3 links; **all 3 turned out dead** (`gta-6-money-spots-guide` typo, `gta-6-interactive-map`, `gta-6-lucia-jason-character-guide` — the latter two don't exist in the table at all, a pre-existing issue unrelated to today's revert, found while fixing this line).
- `gta-6-vice-city-location-guide` — removed one trailing dead link, kept the surrounding sentence (reads fine without it).

Logged the revert + reasoning to `audit_log` (`revert_utility_page_publish_self_correction`) as a visible self-correction, not silently overwriting the earlier "approved" entries.

**Flagged, not fixed:** `gta-6-interactive-map` and `gta-6-lucia-jason-character-guide` are dead links referenced from `gta-6-vice-city-location-details-3` (now removed from that article) but likely referenced elsewhere too — found by accident, not from a systematic check. Worth a real site-wide dead-internal-link audit at some point, same category as the 31 dead links found and fixed on 2026-08-27.

## Everything Committed / Deployed
- `aa8c0cc` — trailing-slash fix + query-param noindex
- `7684944` — canonicalize-away for privacy/characters/subscribe/map/guides/rumors
- `4de24be` — canonicalize-away for homepage/about/vehicles/news
- All three deployed to production (`vercel --prod`, aliased to `www.thedecodedsix.com`), each verified live via curl against the actual served HTML, not just a clean build.
- Article content changes (5 status reverts, 3 dead-link removals, all `audit_log` rows) are Supabase data — no git diff, verify against the `articles`/`audit_log` tables directly.

## Related Notes
→ [[DecodedSix Master Reference]]
→ [[Gate System]]
→ [[2026-07-25-26 Session Log — Indexing, Content, Characters Page]]
→ [[2026-08-27 Session Log — GTA6 Extended Look Coverage, AdSense Audit Fixes]]
