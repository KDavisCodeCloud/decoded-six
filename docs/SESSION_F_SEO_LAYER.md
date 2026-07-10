# Session F — SEO + Metadata Layer

Paste this prompt into Claude Code from `/mnt/c/Users/Kelvin/projects/decoded-six`.
Walk away — no input needed.

---

Read CLAUDE.md, EXECUTION_ORDER.md, and DESIGN.md.

Task: Add the complete SEO and metadata layer so every public page is crawlable,
shareable, and structured-data-ready for Google.

**Scope: src/app/ public routes only. Do not touch /dashboard/ routes.**

**Step 1 — Root layout metadata:**
In `src/app/layout.tsx`, update the `export const metadata` (or add it if missing):
```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://decodedsix.com'),
  title: {
    default: 'Decoded Six — GTA 6 News, Rumors & Interactive Map',
    template: '%s | Decoded Six',
  },
  description: 'Independent fan coverage of GTA 6. News, leaks, rumors, guides, and the first interactive map — updated as the game reveals itself.',
  keywords: ['GTA 6', 'Grand Theft Auto 6', 'GTA 6 map', 'GTA 6 news', 'GTA 6 release date'],
  openGraph: {
    type: 'website',
    siteName: 'Decoded Six',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@decodedsix',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```
Import `Metadata` from `'next'`.

**Step 2 — Article page metadata (dynamic):**
In `src/app/news/[slug]/page.tsx` (read first):
- Add `export async function generateMetadata({ params })` that:
  - Fetches the article by slug from Supabase articles table
  - Returns `Metadata` with:
    - `title`: article.title
    - `description`: article.excerpt (truncated to 160 chars)
    - `openGraph.title`: article.title
    - `openGraph.description`: article.excerpt
    - `openGraph.images`: [article.image_url] if present
    - `openGraph.type`: 'article'
    - `openGraph.publishedTime`: article.published_at
- If article not found, return `{ title: 'Not Found' }`

**Step 3 — JSON-LD structured data for articles:**
In `src/app/news/[slug]/page.tsx`, add JSON-LD script tag inside the page component:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description: article.excerpt,
      datePublished: article.published_at,
      dateModified: article.updated_at,
      author: { '@type': 'Organization', name: 'Decoded Six' },
      publisher: {
        '@type': 'Organization',
        name: 'Decoded Six',
        url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://decodedsix.com',
      },
    }),
  }}
/>
```

**Step 4 — Sitemap:**
Create `src/app/sitemap.ts` (NOT sitemap.xml — Next.js generates it):
```ts
import { MetadataRoute } from 'next'
// Fetch published article slugs from Supabase (server-side)
// Return static routes + dynamic article routes
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://decodedsix.com'
  const staticRoutes = ['/', '/news', '/guides', '/about', '/privacy'].map(r => ({
    url: `${base}${r}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: r === '/' ? 1 : 0.8,
  }))
  // Fetch article slugs — use service role key server-side
  // If no credentials, return only static routes
  return [...staticRoutes]
}
```

**Step 5 — robots.txt:**
Create `src/app/robots.ts`:
```ts
import { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://decodedsix.com'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
```

**Step 6 — Canonical URLs:**
In `src/app/news/[slug]/page.tsx` generateMetadata, add:
```ts
alternates: { canonical: `${base}/news/${params.slug}` }
```

**Step 7 — TypeScript check:**
Run: `npx tsc --noEmit`
Fix all errors.

Do NOT change any dashboard routes. Do NOT change DESIGN.md tokens.
Do NOT add any new npm packages.

Output ✅ DONE or 🚫 BLOCKED then stop.
