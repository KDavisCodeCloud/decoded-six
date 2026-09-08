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

  // Only list a translated locale for an article if a completed
  // translation actually exists -- otherwise that URL just re-serves the
  // English fallback with a notice, and declaring it as a real language
  // variant to Google would be misleading (unlike the static chrome
  // pages, where the underlying content genuinely is the same page).
  const { data: translationRows } = await supabase
    .from('article_translations')
    .select('article_id, locale')
    .eq('translation_status', 'completed')
  const translatedLocalesByArticle = new Map<string, Set<string>>()
  for (const row of (translationRows as { article_id: string; locale: string }[] | null) ?? []) {
    if (!translatedLocalesByArticle.has(row.article_id)) {
      translatedLocalesByArticle.set(row.article_id, new Set())
    }
    translatedLocalesByArticle.get(row.article_id)!.add(row.locale)
  }

  const articleRoutes: MetadataRoute.Sitemap = articles.flatMap((article) => {
    const availableLocales = [routing.defaultLocale, ...(translatedLocalesByArticle.get(article.id) ?? [])]
    // Guide URL restructuring (2026-08-09): guide-category articles are
    // canonical at /guides/[slug] now -- list the redirect target here,
    // not the old /news/ URL that 301s away from it.
    const route = article.category === 'guide' ? `/guides/${article.slug}` : `/news/${article.slug}`
    return availableLocales.map((locale) => ({
      url: localizedUrl(route, locale),
      lastModified: new Date(article.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      alternates: {
        languages: Object.fromEntries(availableLocales.map((l) => [l, localizedUrl(route, l)])),
      },
    }))
  })

  return [...enOnlyRoutes, ...articleRoutes]
}
