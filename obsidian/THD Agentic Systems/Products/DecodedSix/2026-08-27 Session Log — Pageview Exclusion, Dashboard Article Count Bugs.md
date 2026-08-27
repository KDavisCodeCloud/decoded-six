## Context
Kelvin asked two accuracy questions about internal dashboard numbers: whether his own browsing counted in traffic stats, and whether the dashboard's article count was accurate. Both turned out to have real bugs behind them.

## Pageview Tracking Excluded Kelvin's Own Browsing
Traced the actual mechanism (`PageviewBeacon.tsx`, self-hosted first-party tracker, `visitor_sessions` table, not GSC and not any third-party analytics). It excluded the `/dashboard` route itself, but had no way to tell Kelvin's own browsing of the *public* site apart from a real visitor — no auth check, no IP allowlist, nothing. Fixed: the beacon now checks for a Supabase auth session (same cookie `/dashboard`'s own login check reads) before firing, client-side, cached per browser tab. Real limitation, told to Kelvin directly: this only works while logged into `/dashboard` in that browser — logged-out or incognito browsing still counts, no way around that without an IP-based exclusion, not built.

## Dashboard Article Count — 3 Different Implementations, One Completely Broken
Found three separate places the dashboard shows an article count, and they didn't agree in principle even though two happened to match today:

- `/dashboard` overview: live query, excludes `UTILITY_PAGE_SLUGS` (5 placeholder pages that aren't real editorial content) — correct, showed 49.
- `/dashboard/content`: live query, did NOT exclude those same utility slugs — matched the overview today only because zero utility pages happen to be published right now. Would have silently diverged the moment one got published. Fixed to use the same exclusion.
- `/dashboard/gates` (Gate 1: "20 articles published"): read from a `monetization_gates` table. **That table does not exist in the database at all** — confirmed via a direct query, PostgREST schema-cache error. No migration ever created it, nothing else in the repo writes to it. This page has silently shown 0/20 for Gate 1 since it was built, completely disconnected from reality.

**Real finding: Gate 1 is actually cleared.** 49 published editorial articles, well past the 20-article target — just invisible because the page reading it was broken. Fixed by computing Gate 1 live from `articles` (same definition as the overview) instead of the missing table. Gates 2-12 still read the missing table and will keep showing pending — their underlying metrics (AdSense approval, session counts, affiliate revenue) aren't tracked anywhere in this app yet, real remaining scope, not fixed here.

Updated [[Gate System]] to reflect Gate 1's real cleared status.

## Everything Committed
- `src/components/shared/PageviewBeacon.tsx` (commit `60a658e`)
- `src/app/dashboard/content/page.tsx`, `src/app/dashboard/gates/page.tsx` (commit `9b28382`)

## Related Notes
→ [[Gate System]]
→ [[DecodedSix Master Reference]]
