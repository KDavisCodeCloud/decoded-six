# Session E — Next.js 14→15 Upgrade

Paste this prompt into Claude Code from `/mnt/c/Users/Kelvin/projects/decoded-six`.
Walk away — no input needed.

---

Read CLAUDE.md and EXECUTION_ORDER.md.

Task: Upgrade Next.js from 14 to 15 and fix any breaking changes.

Step 1 — Upgrade:
npm install next@15 react@19 react-dom@19 @types/react@19 @types/react-dom@19

Step 2 — Fix breaking changes (Next.js 14→15):
- cookies(), headers(), params in Server Components are now async Promises
  Search all files in src/app/ for: cookies(), headers(), params.slug etc
  In src/lib/supabase-server.ts, cookies() is already awaited — verify it works
  In any page.tsx that uses params, update:
    async function Page({ params }: { params: Promise<{ slug: string }> }) {
      const { slug } = await params
    }
- Check src/app/news/[slug]/page.tsx specifically — fix params type if needed
- fetch() caching defaults changed: add { cache: 'force-cache' } or
  { next: { revalidate: 60 } } where needed

Step 3 — Run TypeScript check:
npx tsc --noEmit
Fix ALL errors before continuing.

Step 4 — Run build check:
NODE=/home/kdav2k5/.nvm/versions/node/v20.20.2/bin/node
$NODE ./node_modules/next/dist/bin/next build
Fix any build errors.

Step 5 — Update package.json engines field:
"engines": { "node": ">=22.0.0" }

Step 6 — Update EXECUTION_ORDER.md:
Find "[ ] Next.js upgraded to 15 (currently 14)" and change to "[x] Next.js upgraded to 15"

Do NOT introduce new patterns or abstractions. Only change what breaks.
Do NOT run npm audit fix or upgrade any other packages.

Output ✅ DONE or 🚫 BLOCKED with specific error message then stop.
