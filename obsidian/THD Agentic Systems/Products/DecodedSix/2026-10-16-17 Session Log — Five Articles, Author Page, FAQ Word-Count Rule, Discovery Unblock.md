## Context
Resumed from the 2026-10-15/16 session, which had **stopped at a decision gate without writing anything**. Kelvin had commissioned 5 articles plus an author page; that session ran research and the dedup gate, surfaced two open questions (were #4/#5 new articles or updates, plus three author-page questions), and ended. Nothing was in the HITL queue — confirmed against Supabase at the start of this session: newest article was the 2026-10-06 Florida research piece, and all 35 drafts were old stubs.

Kelvin then resolved the open question himself and widened it into a standing editorial policy. Later in the session he asked for a permanent CLAUDE.md rule on FAQ word counts, and finally brought a CEO Decoded dashboard screenshot showing topic discovery BLOCKED.

## Editorial Decision — Overlapping Topics Ship as New Articles
Kelvin: *"I don't want to suppress the site or any more articles. Just like IGN and other blog sites, there are going to be articles that come up initially on a topic, and then get confirmed later or have more specifics in another article."*

He also corrected a premise carried from the previous session: the ~0-impression suppression signal was **Google Search**, not AdSense, and AdSense was never deducting for similar content. Overlap is not what he is optimising against.

**Consequence:** the dedup gate's UPDATE verdict — which hard-redirected topics into `run_update_agent` with no bypass — was blocking 4 of the 5 commissioned topics from being written at all. Stage 2 (English content merges) stays cancelled permanently. Stage 1 (locale noindex, English-only sitemap) stays as shipped.

Recorded as a Claude memory so it survives future sessions: overlapping topics ship as new articles, do not propose pruning/merging again.

## Dedup Override — Added, Logged, and Deliberately Partial
`run_content_agent(dedup_override_reason="...")` now proceeds as a NEW article on an UPDATE verdict and writes a `dedup_override` row to `audit_log` naming the matched slugs, the gate's own reason, and the owner's reason. An override leaves a trail; it is never silent.

**DUPLICATE verdicts remain non-overridable by that flag, by design.** That restraint immediately paid off — see #4 below.

## The Five Articles
Generated through the real DSX-CA1 pipeline (research → dedup gate → images → writer → FAQ → schema → internal links → validator → humanizer → SEO/AEO audit), not hand-written. All landed `pending_review`.

| # | Slug | Type | Words | Floor |
|---|---|---|---|---|
| 1 | `gta-6-launch-trailer-breakdown-jason-lucia-story-details` | feature | 1,258 | 1,200 |
| 2 | `gta-6-radio-stations-confirmed-hosts-flash-fm-return` | evergreen | 2,065 | 1,500 |
| 3 | `how-long-is-gta-6-80-hour-playtime-explained` | evergreen | 1,574 | 1,500 |
| 4 | `gta-6-preload-guide-november-12-launch-day` | evergreen | 1,532 | 1,500 |
| 5 | `gta-6-money-guide-confirmed-ways-to-make-money` | evergreen | 1,655 | 1,500 |

**#4 came back DUPLICATE, and the gate was right.** It matched five published articles: release-date/pricing, Ultimate-vs-Standard, physical/no-disc, pre-order worth-it, and a 1,945-word SSD storage guide. Rather than widening the override to force it, the topic was **narrowed** to the one thing none of those cover — what preloading actually does on Nov 12 and the launch-day sequence on Nov 19 — with the other five cross-linked instead of re-covered. It then passed cleanly and is a better article for it.

**Two originality hooks Kelvin asked for could not be delivered and were not faked.** No trailer frame grabs (no video access) and no verdict on the radio previews (no audio). The radio brief explicitly forbade writing a first-person listening verdict; the section was left out rather than invented. Credited Tier 1 stash art used throughout, never described as our own frame grabs.

**Accuracy call:** the "228GB confirmed" install size circulating on aggregator domains (gtaintel.com, viceheist.com, 56vicelane.com, staticcoast.com, grindout.com) is **not** from Rockstar. It is explicitly debunked in both articles that mention it rather than repeated. Rockstar has published no install size, no download size, and no regional unlock times.

## Three Pipeline Bugs Found While Generating
1. **Writer `max_tokens` was 4096 against a 1,500-word evergreen floor.** A long article was cut mid-string and surfaced as *"LLM returned invalid JSON"*; the retry prompt ("fix ONLY the JSON syntax") then ran against the same ceiling and truncated again, failing the whole run. The floor and the token ceiling were in direct tension. Raised to 8192, and truncation now logs as truncation instead of masquerading as a JSON error.
2. **`[anchor](INTERNAL_LINK:slug)` placeholders shipped into a finished body.** `_node_internal_link_injector` only matched the bare `[INTERNAL_LINK:slug]` form; the markdown-shaped variant matched neither it nor `_node_link_validator` (whose `_MD_LINK_RE` only considers hrefs starting with `/`). Five literal placeholders survived into the preload guide, two pointing at slugs that do not exist. Both forms now handled, writer anchor text preserved, and resolved links use `/guides/` for guide-category targets instead of always `/news/`. The already-generated article was repaired in place (word count unchanged at 1,532).
3. **`featured_image_credit` / `_tier` / `_alt` were never written by the pipeline.** Every hero rendered with no credit badge and no alt text. The in-body `*Image credit: Rockstar Games*` lines do not cover the hero or the listing-card thumbnail, and the visible credit is a condition of using Rockstar's press art at all ([[Visual Strategy]]). Now set at the source, added to the insert, and backfilled onto all five.

**Also:** the GTA VI: The Album art and the gas-station-robbery key art had been committed weeks earlier but were scanned by nothing — `_build_local_registry()` only walked characters/locations/keyart. All five unrelated topics were resolving to the same two Vice City images, the exact collision the code's own comment warns about. Registered them (+5 images, 136 → 141); each topic now draws a distinct, relevant set.

## Author Page + Named Byline
Every article carried `author: {'@type': 'Organization', name: 'DecodedSix Editorial Team'}` — a faceless byline with no bio page behind it, which is the pattern a quality classifier reads as low-effort content. With the site under search suppression, a named author is one of the few concrete E-E-A-T signals available.

- `/author/kelvin-davis` — Kelvin's bio as supplied, lightly polished, with "thdagentic LLC" corrected to **THD Agentic Systems LLC**. `Person` schema (name, jobTitle, worksFor, knowsAbout). Official cover art hero with visible credit and a not-affiliated disclaimer.
- **No `image` on the Person schema, deliberately** — the only art we can show is Rockstar's, and attaching it would imply it depicts him.
- `src/lib/author.ts` holds the identity so the page, both article routes, and the OG tags cannot drift apart.
- Visible "By Kelvin L. Davis II" byline on `/news` and `/guides`, locale-aware via next-intl `Link`, `rel="author"`. `/about` links to it.
- Prerendered across all 8 locales; build and typecheck clean.

Attribution reflects the real workflow: Kelvin reviews and signs off on every article through the HITL queue before it publishes. **Open question not resolved:** whether this is the right framing for the 71 pre-existing articles drafted by the agent — it was offered as a three-way choice (retroactive author / new-only / editor credit) and never answered. Current state applies the named byline sitewide.

## Permanent Rule — FAQs Never Count Toward Word Count
Kelvin: *"I need a hard and permanent rule placed in claude.MD meaning that for every article that is created, FAQs are not a part of the word count."*

The behaviour **was already enforced in code** since 2026-09-17 (`_body_word_count()` strips the FAQ section before counting, feeding both the `_node_validator` gate and the stored `word_count` column) but had never been written down, so nothing stopped a future change from quietly reintroducing FAQ padding.

Added a dedicated section to repo `CLAUDE.md` plus a Non-Negotiables line, and a line in the **global** `~/.claude/CLAUDE.md` so it holds for every product that generates articles. Four enforcement clauses: `_body_word_count` is the single source of truth; the stricter-than-asked trailing-text exclusion must not be loosened; a missed floor is fixed with **more body**, never a lower floor or a smaller-bar `article_type`; new writers must call the helper rather than reimplement a raw count.

Verified against all five articles — stored `word_count` equals the body-only count exactly in every case (e.g. radio: 2,227 raw, 2,065 body, 162 FAQ words correctly excluded).

## Topic Discovery — BLOCKED Since 2026-09-17, Root-Caused and Unblocked
Kelvin brought a CEO Decoded dashboard card: *STEP 1 · FIND TOPICS — BLOCKED. No new topic since 2026-09-17 (expected every 4 hours).* The dashboard was accurate.

**Evidence:** `topic_candidates` stops at 2026-09-17T15:03 UTC and `discovery_items.fetched_at` at 15:01 — so the **fetch** layer stopped, not just synthesis. All eight `discovery_sources` were still `active: true`.

**The pipeline code was never broken.** A manual `POST /agents/decodedsix/discovery/run` against production on 2026-10-17 ran clean: 69 items across 7 sources → 46 clusters → **6 candidates proposed**, 40 dropped with correct reasoning (the GTA Online blackout rule caught three; an ending-spoiler leak was rejected on editorial policy). Newest candidate timestamp is now 2026-10-17T22:14, so the dashboard reads current.

**Root cause: nothing was calling it.**
- No Railway cron — the service config has no `cronSchedule`, it is a web service only.
- No Vercel cron — there is no `vercel.json` at all.
- The only intended scheduler is the n8n 4-hour cron (`n8n/discovery_fetch_cron.json`), which the route's own docstring names.

**And a hard bug in that spec:** its HTTP Request node sends only `Content-Type` — **no `Authorization` header at all**. The route is behind `require_api_key`, which wants `Bearer <DECODEDSIX_API_KEY>`, so the workflow gets a flat 401 and routes straight to its "Discovery Failed" Slack branch. Same defect in `decodedsix_content_workflow.json`. Both were written 2026-09-16; every older July spec (map scrape, post-approval distribution, weekly shorts) has the header. Fixed both to send `Bearer {{ $vars.DECODEDSIX_API_KEY }}`, keeping each file's own `$vars` convention.

The fetch stopping ~15 minutes after the last discovery fix commit on Sep 17 fits the Sep 16–17 runs having been manual development runs that stopped when attention moved on, with the cron never actually carrying the load.

**Could not be verified from here:** whether that workflow was ever imported or activated in the self-hosted n8n, or its execution history. Per [[n8n repo is not deployed state]] the repo is a spec, not deployed state, and Railway retains only ~1 hour of HTTP metrics so call history was unavailable.

### Action required from Kelvin, in the n8n UI
1. Re-import `discovery_fetch_cron.json` and confirm it is **Active**.
2. Set `DECODEDSIX_API_KEY` in n8n **Variables** to the value **as rotated on 2026-10-02** — if n8n still holds the pre-rotation key it will 401 even with the header fix. Variables is the tab on the **Overview page**, not Settings.

Alternative worth considering: move the schedule to a Railway cron hitting the same endpoint — in-repo, versioned, and no three-sided shared secret to drift.

## Kelvin's Review Outcomes
Reviewed 4 of the 5 on 2026-10-17 between 18:33 and 18:34:
- **Published:** launch trailer breakdown, how-long/80-hour, preload guide.
- **Archived:** `gta-6-money-guide-confirmed-ways-to-make-money` (not published — reason not recorded in-session).
- **Still `pending_review`:** `gta-6-radio-stations-confirmed-hosts-flash-fm-return`.

## Committed / Deployed
Pushed `941988e..5cb68e4` to master; Railway build triggered on `5cb68e4`.
- `cda47fd` — feat(author): named author page and Person byline, replacing the Editorial Team
- `84f3980` — fix(content): owner-authorized dedup override, plus three bugs it surfaced
- `c243802` — fix(n8n): discovery and content workflows send no Authorization header
- `5cb68e4` — docs: FAQs never count toward an article's word count, permanent rule

Article content and the `dedup_override` audit rows are Supabase data — no git diff; verify against the `articles` / `audit_log` tables directly.

## Flagged, Not Fixed
- **10 archived articles 301 into a 404.** Their `redirect_slug` is `decoded-six-is-live`, which resolves to `/news/decoded-six-is-live`; that row is archived with a null `redirect_slug`, so it 404s. The Stage 1 edge redirect in `next.config.mjs` only covers `/guides/decoded-six-is-live`. Affects `gta-6-fastest-cars`, `gta-6-radio-stations-music-guide`, `best-gaming-setup-gta-6-pc`, `gta-6-real-estate-property-guide`, `gta-6-ps5-vs-xbox-series-x-which-to-buy`, `best-capture-card-gta-6-4k-ps5`, `gta-6-online-prep-router-upgrade-reduces-lag`, `gta-6-cheat-codes-guide`, `gta-6-remote-play-pc-backbone-one-guide`, `gta-6-zoo-wildlife-system-guide`.
- **Archived `gta-6-radio-stations-music-guide` (1,572w)** should be repointed at the new radio article once it is published — not done now, because pointing a redirect at an unpublished article would 404.
- **IGN returned 0 items** on the discovery run while the dashboard card advertises IGN as a source. Feed is `feeds.ign.com/ign/games-all` with a `["gta","grand theft auto","rockstar"]` keyword filter — may simply be no matches that day, or the filter may be too tight. Not investigated.
- **Retroactive byline question unanswered** — see Author Page above.
- `supabase/migrations/024_page_views_rollup.sql` is untracked and predates this session; left alone.

## Related Notes
→ [[DecodedSix Master Reference]]
→ [[Gate System]]
→ [[Visual Strategy]]
→ [[Agent Roster]]
→ [[2026-09-07 Session Log — GSC Indexing Audit, Locale Canonical Fixes, AdSense Near-Miss]]
→ [[2026-08-27 Session Log — GTA6 Extended Look Coverage, AdSense Audit Fixes]]
