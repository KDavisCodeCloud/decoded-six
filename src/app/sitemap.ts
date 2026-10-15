import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { routing } from '@/i18n/routing'
import { localizedPath } from '@/lib/seo'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

// Every static page on the site turned out to render hardcoded English body
// copy regardless of locale (no article_translations-style pipeline backs
// any of them) -- listing 7 untranslated duplicates per route as if they
// were real language pages is what produced GSC's "Duplicate without
// user-selected canonical" / "Alternate page with proper canonical tag" on
// /fr/privacy, /en-GB/subscribe, /pt/rumors, etc. Sitemap lists only the one
// real (English) URL per route; the locale-prefixed pages still render
// (nav/footer chrome localizes) but canonical back to this URL -- see
// unlocalizedAlternates in lib/seo.ts. Kelvin, 2026-09-07, in three
// approval passes: /privacy /map /characters /guides /rumors /subscribe,
// then / /news /about /vehicles, then /gta-6-complete-guide.
const EN_ONLY_ROUTES: { route: string; priority: number }[] = [
  { route: '/', priority: 1 },
  { route: '/news', priority: 0.8 },
  { route: '/about', priority: 0.8 },
  { route: '/vehicles', priority: 0.8 },
  { route: '/gta-6-complete-guide', priority: 0.8 },
  { route: '/privacy', priority: 0.6 },
  { route: '/map', priority: 0.6 },
  { route: '/characters', priority: 0.6 },
  { route: '/guides', priority: 0.6 },
  { route: '/rumors', priority: 0.6 },
  { route: '/subscribe', priority: 0.6 },
]

// Was previously concatenating `/${locale}` + route directly, which for the
// homepage route ('/') produced trailing-slash URLs ('/de/') on every
// non-default locale -- a URL that immediately 308s to '/de'. Delegates to
// localizedPath so the sitemap and the canonical/hreflang tags (seo.ts) can
// never drift out of sync on this again.
function localizedUrl(route: string, locale: string): string {
  return `${siteUrl}${localizedPath(route, locale)}`
}

// Without this, Next.js treats this route as static (no dynamic API used
// in the function body) and generates it once at build time -- confirmed
// live 2026-07-25: the deployed sitemap was missing an article published
// 2 days after the last deploy. force-dynamic makes it query
// `articles` fresh on every request instead of needing a redeploy to
// pick up new content -- this alone covers "auto-regenerate on publish"
// without needing a separate webhook/rebuild trigger.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const enOnlyRoutes: MetadataRoute.Sitemap = EN_ONLY_ROUTES.map(({ route, priority }) => ({
    url: `${siteUrl}${route === '/' ? '' : route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority,
  }))

  const hasSupabaseCredentials = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  if (!hasSupabaseCredentials) return enOnlyRoutes

  const { data } = await supabase
    .from('articles')
    .select('id, slug, category, published_at')
    .eq('status', 'published')
  const articles = (data as { id: string; slug: string; category: string; published_at: string }[] | null) ?? []

  // ENGLISH ONLY (2026-10-15). This previously listed one URL per completed
  // translation, which put 504 machine-translated article URLs in the sitemap
  // against 72 English ones -- 87% of the indexable article surface was
  // machine output. With impressions flat at ~0 across 248 indexed pages for
  // seven weeks, no manual action, and the TGG exclusive absent from Google
  // even on an exact-quote search of its own body text, the site is being
  // suppressed rather than merely ranked low, and bulk machine translation at
  // that ratio is the most likely single cause. The locale pages still render
  // for readers at their own URLs; they are simply no longer advertised for
  // indexing (and now carry robots noindex -- see articleAlternates and the
  // generateMetadata in news/[slug] and guides/[slug]).
  //
  // Deliberately no `alternates.languages` either: declaring an hreflang
  // cluster whose members are all noindex is a contradictory signal.
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => {
    // Guide URL restructuring (2026-08-09): guide-category articles are
    // canonical at /guides/[slug] now -- list the redirect target here,
    // not the old /news/ URL that 301s away from it.
    const route = article.category === 'guide' ? `/guides/${article.slug}` : `/news/${article.slug}`
    return {
      url: `${siteUrl}${route}`,
      lastModified: new Date(article.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }
  })

  return [...enOnlyRoutes, ...articleRoutes]
}
