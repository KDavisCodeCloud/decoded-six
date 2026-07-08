# Session B — Public Site Shell (Phase 2)

Paste this prompt into Claude Code from `/mnt/c/Users/Kelvin/projects/decoded-six`.
Walk away — no input needed.

---

Read CLAUDE.md, EXECUTION_ORDER.md, DESIGN.md in that order.

Build Phase 2 — Public Site Shell. All public routes live in src/app/.

Pages to build:

1. /guides — Guides listing page
   - Same layout as /news/page.tsx (use as reference)
   - Filter by category='guide' from articles table
   - Empty state: "Guide content arrives with GTA 6"

2. /about — Editorial policy page
   - Single column, ~400 words
   - Explains: independent fan site, no affiliation with Rockstar
   - Transparent AI disclosure: content is AI-assisted, human-reviewed
   - Contact: [placeholder email]
   - No Rockstar trademarks mentioned

3. /privacy — Privacy Policy page
   - Standard privacy policy for a content site with Google AdSense
   - Covers: cookies, analytics, affiliate links, user-submitted map markers
   - Plain language, not legalese
   - Generated from template — owner must review before publish

4. Map placeholder section on homepage (src/app/page.tsx)
   - Add between "Coming Soon" grid and Footer
   - NEXT_PUBLIC_MAP_LIVE=false: show placeholder card
     "Interactive map launching with GTA 6 • Join waitlist to get access first"
     Email capture field → POST to /api/waitlist
   - NEXT_PUBLIC_MAP_LIVE=true: show <MapPlaceholder /> component that says
     "Map component — build in Phase 5"

5. /api/waitlist/route.ts
   - POST handler
   - Reads email from body
   - Validates email format (simple regex)
   - Inserts into Supabase: table waitlist_emails
     columns: id uuid default gen_random_uuid(), email text unique,
     created_at timestamptz default now(), product_id text default 'decodedsix'
   - RLS enabled immediately, service_role policy, anon insert policy
   - Returns {success: true} or {error: string}
   - Writes audit_log entry

Design rules from DESIGN.md apply. No Inter or Roboto fonts. No white backgrounds.
Match existing site aesthetic (void bg, flame/ice/gold accents, Rajdhani headings).

Run npx tsc --noEmit before finishing. Fix any errors.

Output ✅ DONE or 🚫 BLOCKED then stop.
