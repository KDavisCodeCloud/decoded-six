## Context
Three separate asks handled in the same pass: get the AdSense verification snippet live on the site, cover the real GTA 6 leak news breaking that week (Cyberleek footage/map leak, DMCA takedowns), and build out three affiliate hardware buying guides (SSD/controller/headset) ahead of the November 19 launch.

## Google AdSense Verification — Live, Not Gate-Cleared
Added Google's AdSense verification script (`client=ca-pub-5317430228631558`) to `src/app/layout.tsx`'s `<head>` — the one true root layout, so it renders on every route. Confirmed live by curling `www.thedecodedsix.com` directly and finding the script tag in the raw HTML (verification crawlers don't execute JS, so this matters).

**This is site verification only, not Gate 1/2 clearance** — see [[Gate System]]. Gate 1 still needs 20 published, human-reviewed articles; Gate 2 still needs the AdSense account itself approved. This just unblocks Kelvin from starting that application.

## 3 GTA 6 Leak-Coverage Articles — Queued in HITL
Real web research (Cyberleek gameplay/map leak, Rockstar DMCA takedowns, confirmed Aug 27 Netflix Extended Look timing) written into 3 news articles, all `status='pending_review'`, `category='news'`, ~1,000-1,060 words each, per-`docs/VOICE.md` speculation-labeling throughout:
- `gta-6-leaked-gameplay-why-we-wont-show-it`
- `gta-6-leaked-map-leonida-why-we-wont-post-it`
- `gta-6-leaked-features-karma-6-star-wanted-level`

Editorial stance stated explicitly in-article: no embedded/hosted leak footage or map images while Rockstar is actively DMCA-ing reposts — described, not shown. Ties into the Aug 27 reveal as the actual confirmable source.

## 3 Affiliate Hardware Guides — Queued in HITL
`category='guide'`, `article_type='conversion'` (matches `docs/AFFILIATE.md`'s Amazon Associates placement rules — conversion-type is what `_node_affiliate_link_injector` in `content_agent.py` actually builds `affiliate_links` metadata for; no `Affiliate Registry.md` exists yet in this vault despite `docs/OBSIDIAN_SYNC.md` listing one — worth creating if affiliate content keeps growing):
- `best-ssd-for-gta-6-ps5` (1,989 words)
- `best-controller-for-gta-6-ps5` (1,820 words)
- `best-headset-for-gta-6-ps5-tempest-3d-audio` (1,776 words)

**Real ASIN sourcing, not guessed.** `affiliate/products.json` had every ASIN blank for these products. Kelvin supplied 7 real ASINs (Samsung 990 Pro w/heatsink, WD Black SN850X w/heatsink, DualSense standard + Edge + Charging Station, Sony Pulse Elite, SteelSeries Arctis Nova Pro) — wired into both the article body links (`amazon.com/dp/{ASIN}?tag=decodedsix-20`) and `affiliate_links` JSONB, and saved back into `affiliate/products.json` for reuse (4 new entries added, 3 existing entries filled in). Products without a confirmed ASIN (FireCuda 530, Crucial T700, Scuf Reflex Pro, Victrix Pro BFG, HyperX Cloud III Wireless, Pulse Explore, Astro A50X) still use `amazon.com/s?k=...` tagged search links rather than a guessed ASIN — a wrong guess risks linking the wrong product entirely.

**Real accuracy correction, not a rename for its own sake:** the ASIN Kelvin found for "Arctis Nova Pro" (`B09ZLRCH1H`) is the PS5/PC-only SKU, not the tri-platform "Omni" model the article originally described with Xbox-simultaneous-connectivity claims. Renamed throughout the article + `products.json` entry and dropped the Xbox claim so the copy matches what's actually linked, rather than overselling a different SteelSeries SKU.

**Real product images sourced — Amazon itself doesn't work for this.** Tried scraping Amazon product pages directly (same `og:image` technique `content_agent.py`'s `_node_image_fetcher` already uses for news sources) — Amazon serves a CAPTCHA page to non-browser requests, confirmed live, and product images load via JS anyway. Pivoted to each manufacturer's own official product page instead, which worked cleanly for 4 of 13 products (verified HTTP 200 + real image bytes, not just a found URL):
- Sony DualSense, DualSense Edge, Pulse Elite — all from `gmedia.playstation.com` via playstation.com's own `og:image`
- WD Black SN850X — from sandisk.com's own `og:image`

Set as both inline body images (`![alt](url)` + `*Image credit: ...*` caption, same convention `ArticleMarkdown.tsx` already special-cases) and each article's `featured_image_url`/`featured_image_alt`/`featured_image_credit`/`og_image_url`. Used `featured_image_tier = 3` for lack of a better fit — [[Visual Strategy]]'s 3-tier system is Rockstar-asset-specific (Tier 1 official press, Tier 2 transformed editorial, Tier 3 original DecodedSix-built); there's no defined tier for third-party manufacturer product photography. Worth a real tier-system decision later if affiliate hardware content becomes a recurring category, not solved here.

Samsung's and SteelSeries' own product pages, and the DualSense Charging Station's, only serve a generic site-wide social thumbnail via `og:image`, not the actual product photo — no automated path found for those. Remaining 9 products (those 3 plus the 7 without a confirmed ASIN) still need Kelvin's own Amazon SiteStripe pass per `affiliate/README.md`'s existing manual process.

## Everything Committed
- `src/app/layout.tsx` (AdSense script)
- `affiliate/products.json` (7 real ASINs)
Article content/images/affiliate_links are Supabase data, not repo files — no git diff for those, verify directly against the `articles` table.

## Related Notes
→ [[DecodedSix Master Reference]]
→ [[Gate System]]
→ [[Visual Strategy]]
