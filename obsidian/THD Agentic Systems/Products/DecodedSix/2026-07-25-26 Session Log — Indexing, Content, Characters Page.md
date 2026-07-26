## Context
Kelvin's own framing at the start of this pass: "decodedsix isn't indexed by Google at the moment and traffic is low — the indexing audit is the highest-leverage ask right now." Everything below traces back to that, plus follow-on content and site-quality work done in the same session.

## Google Indexing Audit — Closed
- **robots.txt** — confirmed already correct, not blocking Googlebot.
- **Sitemap staleness** — `sitemap.ts` had no `dynamic` export, so Next.js generated it once per deploy. A live check found it missing an article published 2 days after the last deploy. Fixed with `export const dynamic = 'force-dynamic'`.
- **JSON-LD null dates** — `datePublished`/`dateModified` were literal `null` in production. Root cause: `state.get("publish_date", default)` only falls back when the *key* is missing, not when the value is explicitly `None` (which it always was — the true publish date isn't known until HITL approval). Fixed in `content_agent.py`'s `_node_schema_generator` with `state.get("publish_date") or default`, and defensively at render time — `page.tsx` no longer trusts stored `schema_article`/`schema_breadcrumb` columns at all, computing both fresh from live article fields on every request.
- **Wrong domain in JSON-LD** — code defaulted to non-www against the site's real www canonical. Fixed the code default AND updated Vercel's actual production `NEXT_PUBLIC_SITE_URL` (was still non-www, 17 days stale).
- **Missing/relative image field** — JSON-LD `image` was absent, then found relative once added. Both the OG image and JSON-LD image are now absolutized.
- All of the above verified against the live site's actual HTML/sitemap.xml after deploy, not just passing tests.

## Broken Links / Content Integrity Pass
- Footer Contact link (`href="#"`) → `mailto:hello@decodedsix.com`.
- Header's Subscribe CTA pointed to a `/subscribe` page that never existed → built one on the existing `NewsletterSignup` component.
- DB-wide scan found 16 dead `/news/<slug>` links across 8 published articles. 5 became real stub pages (money spots, tier list, weekly challenges, trailer breakdown, system requirements) with honest "not live until launch" copy; the rest repointed to real existing pages.
- 3 published articles + 3 published slugs still said "2025" as the confirmed GTA 6 release year — fixed to November 19, 2026, while leaving every *genuine* historical 2025 reference alone (trailer drops, Take-Two earnings calls, real leak timestamps).

## Stub Pages — Unpublished Same Day
Kelvin flagged that live placeholder/thin-content pages hurt the AdSense application. All 5 stub pages above flipped back to `status: draft` (404 live, out of sitemap) same day, and all 11 links pointing to them removed from the referencing articles — standalone CTA lines deleted, sentence-embedded links removed with their whole sentence to avoid dangling fragments.
**Restore date: 2026-11-26 (launch + 7 days), not before.** See `project_decodedsix.md` memory for the exact restore procedure and which 7 articles need their links re-added.

## Dashboard Article-Count Bug
The dashboard's "ART" stat and a stale hardcoded "7/20 articles — Gate 1" note were both wrong — the stat counted the 5 utility stub pages alongside real editorial content (17 instead of the real 12), and the note never updated at all. Same root bug was about to surface harder: homepage "latest," `/news`, and `/guides` all sort by `published_at` descending, so the stub pages (newest rows in the DB) were about to display ahead of real content. Added a shared `UTILITY_PAGE_SLUGS` exclusion list, applied everywhere articles are queried by recency or counted toward Gate 1.

## 4 New Articles Written and Published
Full editorial briefs from Kelvin for: GTA 6 Characters, Ultimate Edition vs Standard, Vintage Vice City Pack, Weapons List. Written to spec (word count, structure, FAQ, confirmed-vs-speculation labeling), every image cross-checked against the real 120-image registry rather than trusting the brief's assumed filenames (several requested images — Dinka Enduro, Crest Kayak, several weapon-in-action screenshots — don't actually exist in the registry; described in text, not illustrated with a fabricated URL). All 4 approved and published by Kelvin via the dashboard.

**Revision pass same day**, per Kelvin's follow-up:
- Removed all 3 Amazon affiliate links across the 4 articles — Amazon doesn't carry a real GTA 6 pre-order product; the tagged search-URL fallback was surfacing an unrelated Portuguese-edition result.
- Added pictures for every character requested (Boobie Ike, Real Dimez, Dre'Quan Priest) plus 2 more that were also missing one (Lucia, Brian Heder) despite being the main subject of their own section.
- New standing rule from Kelvin, applied retroactively across all 4 articles and going forward: any named person/place/thing that's the main subject of a paragraph gets its image if one exists in the registry — no cap on image count per article. Updated `content_agent.py`'s writer prompt to match (removed the old 2–4 image ceiling).

## Characters Directory Page
Built `/characters` — all 8 confirmed characters, name + picture grid, click opens a bio card sourced to official Rockstar material. Linked from Header nav and a new BROWSE-grid tile positioned directly under Vehicles. Mirrors the existing `/vehicles` click-to-detail pattern rather than inventing new UI. Also fixed the homepage's pre-existing 2-character "Protagonists" teaser: it was using stale hotlinked image URLs (from before the local-file migration) and pointing "Coming Soon" at a dead-end — now uses local paths and links to the new full page.

## Image Redundancy — Fixed at the Root
Two separate bugs, both found by actually executing the real matching logic rather than eyeballing:
1. BROWSE grid's News/Guides/Rumors tiles guessed an image by keyword tag; none of those words matched anything in the registry, so all three silently fell back to the same default key art. Replaced with an explicit, distinct image per tile (6 tiles total now, including Characters).
2. Article list cards never read the `featured_image_url`/`og_image_url` columns already on the schema — always re-guessed from the title's keywords, so any two articles sharing generic words (anything with "vice"+"city") converged on the identical thumbnail. Backfilled `featured_image_url` for all 16 published articles with distinct, verified images; cards now prefer that column; the pipeline (`content_agent.py`) now sets it on every future article instead of leaving it null forever (confirmed it always had been, despite Visual Strategy's own spec requiring it).

## Verified After Kelvin's Follow-Up Audit
Two items Kelvin flagged as "remaining concerns before applying" (AdSense) were checked directly against live state, not assumed:
- PC Graphics Settings article's speculative-content disclaimer — already present, first paragraph, predates this session.
- Two "still live" 2025-dated slugs Kelvin flagged — confirmed both actually 404 live and don't exist in the DB; they were the exact two slugs renamed earlier in this same pass. Likely a stale reference on Kelvin's end (cached crawl/saved list), not a real site issue.

## Related Notes
→ [[DecodedSix Master Reference]]
→ [[Visual Strategy]]
→ [[Gate System]]
