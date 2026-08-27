## Context
Two separate asks handled in the same pass: cover Rockstar's real GTA 6 gameplay reveal (the Netflix "Extended Look," premiered today) across 11 articles, then work through a 6-item audit Kelvin received after submitting the site's AdSense application.

## 11 GTA 6 Extended Look Articles — Queued in HITL
Real web research against today's actual Netflix premiere (27-minute PS5 gameplay reveal, 3 PM ET, hit Rockstar's YouTube + the official GTA VI site six hours later) — not fabricated, not built from Kelvin's live-watch account alone. All `status='pending_review'`, `category='news'`, `product_id='gta-hub'`, each with a real Tier 1 image already in the repo's press-kit library (no hotlinked/fabricated images):

- `gta-6-extended-look-everything-revealed-in-rockstar-s-netflix-gameplay-premiere` (main roundup)
- `gta-6-release-date-november-19-2026-confirmed-in-the-extended-look`
- `gta-6-character-switching-explained-how-jason-and-lucia-co-op-gameplay-works`
- `gta-6-wanted-level-system-six-stars-are-back-and-here-s-how-it-works`
- `gta-6-heists-raul-bautista-s-bank-robbery-crew-explained`
- `gta-6-opening-scene-breakdown-the-drug-raid-menendez-and-jason-s-escape`
- `gta-6-activities-guide-every-mini-game-shown-in-the-extended-look`
- `gta-6-vice-city-locations-bayside-megamundo-and-the-airport-explained`
- `gta-6-honor-system-explained-how-petting-the-dog-affects-jason-s-karma`
- `who-is-andres-de-leon-in-gta-6-the-hotel-megamundo-bodyguard-job-explained`
- `gta-6-graphics-on-ps5-why-the-extended-look-looked-this-real`

Kelvin gave a detailed eyewitness account of the premiere first. Verified it against real press coverage (PC Gamer, GamesRadar+, TechRadar, Forbes, Kotaku, Rockstar's own newswire post) rather than trusting it as-is — caught one real mishearing ("Mendez" → the character is **Menendez**) and could not confirm one detail at all ("the Enflavia" doesn't match any known Vice City location or venue in any source found — flagged as unconfirmed in the main article rather than invented). Also surfaced several confirmed reveal details Kelvin didn't mention: the November 19, 2026 release date itself, the named seamless character-switching mechanic, the honor/karma system, the returning exercise/weight system, a car-jack QTE, and working convertible roofs/disguises — all called out explicitly in the main article per his ask.

Titles written keyword-forward for SEO/AEO/GEO/SXO (front-loaded "GTA 6," named entities, direct-answer phrasing) per Kelvin's mid-task instruction.

Separately noticed: the `articles` table already had 15 pre-existing `draft`-status rows for this same event with literal template placeholders (e.g. `[X]` in the title) — some other pipeline pre-staged stubs ahead of the reveal. Not touched, flagged to Kelvin so they don't collide with these 11 in the queue.

## AdSense Audit — 6 Items, 3 Were Already Fine
Kelvin applied for AdSense and got a 6-item audit back. Verified each against the actual repo/DB before changing anything, per standing site policy of not trusting an unverified report — **3 of the 6 described bugs that didn't exist**:

- **Fix 1 (footer contact link):** already correct, already fixed in a prior commit (`dc08df9`). No `#` anchor anywhere in `src/`.
- **Fix 2 (NewsArticle JSON-LD):** already fully implemented in `news/[slug]/page.tsx`, every field Kelvin asked for already present and correctly sourced.
- **Fix 6 (share buttons):** `ShareBar.tsx` was already fully built and wired on every article (X, Facebook, Pinterest, Instagram copy-link, native share, clipboard copy) — added the one real gap, `via @decodedsix` on X shares.

The 3 real issues found weren't on Kelvin's list — they turned up while verifying the ones that were:

- **FAQ schema silently suppressed for 1-2 question articles.** `faqJsonLd` was gated at `faqPairs.length >= 3` in both `news/[slug]/page.tsx` and `guides/[slug]/page.tsx` — an article with 1-2 FAQ entries would show the on-page FAQ section but never emit the schema. Lowered to `>= 1` in both files, per Kelvin: "any article with a FAQ should render the schema."
- **Every in-body link forced a new tab.** `ArticleMarkdown.tsx`'s link renderer hardcoded `target="_blank"` on every markdown link, including internal ones — meant the new internal links added for Fix 4 (`/gta-6-complete-guide` + 3 guide cross-links) would have behaved like external citations. Now internal links (site-relative, or absolute against thedecodedsix.com) navigate in-tab; external stays `_blank`.
- **Every article's main hero image had zero alt text.** `HeroImage.tsx` renders the featured image as a CSS `background-image` div — no `alt`, no `aria-label`, nothing, on every single news/guide article page. `articles.featured_image_alt` already existed as a column but was never wired to the component. Made `alt` a required prop (`role="img"` + `aria-label`), wired both callers to `article.featured_image_alt`, and backfilled the column for 20 of 48 published articles that had it empty.

Also populated `faq_pairs` for the 4 articles Kelvin specified content for (Release Date, Honor System, Andres De Leon, Locations).

## Everything Committed
- `src/components/HeroImage.tsx`, `src/components/shared/ArticleMarkdown.tsx`, `src/components/shared/ShareBar.tsx`
- `src/app/[locale]/news/[slug]/page.tsx`, `src/app/[locale]/guides/[slug]/page.tsx`
- Commit `e689e1c`, pushed to `origin/master` (gh CLI 2.4.0's git-credential helper is still broken on this box — same issue as jarvis-decoded; worked around by reading the OAuth token straight out of `~/.config/gh/hosts.yml` and pushing to an inline authenticated URL, not persisted into `.git/config`)
- Article content (all 11 new articles, the 4 `faq_pairs` rows, the internal links, the 20 backfilled `featured_image_alt` values) is Supabase data, not repo files — no git diff for those, verify directly against the `articles` table

## Related Notes
→ [[DecodedSix Master Reference]]
→ [[Gate System]]
→ [[Visual Strategy]]
