import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { routing } from '@/i18n/routing'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

// Was missing 4 real, nav-linked pages (map/vehicles/characters/rumors) --
// they were still crawlable via internal links, but excluding them from the
// sitemap denied Google an explicit discovery/priority signal for them.
const STATIC_ROUTES = ['/', '/news', '/guides', '/about', '/privacy', '/map', '/vehicles', '/characters', '/rumors', '/gta-6-complete-guide']

function localizedUrl(route: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  return `${siteUrl}${prefix}${route}`
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
  // Static routes (nav/footer chrome is translated site-wide) list every
  // locale, since the route genuinely exists and returns 200 for all 8.
  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(route, locale),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '/' ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, localizedUrl(route, l)])),
      },
    }))
  )

  const hasSupabaseCredentials = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  if (!hasSupabaseCredentials) return staticRoutes

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

  return [...staticRoutes, ...articleRoutes]
}
