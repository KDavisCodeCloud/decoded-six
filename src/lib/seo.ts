import { routing } from '@/i18n/routing'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

// Locale-prefixed path for a route. Naively concatenating `/${locale}` with
// path === '/' produces a trailing-slash URL ('/de/') that doesn't match the
// app's actual route ('/de') -- Next's default trailingSlash:false then 308s
// '/de/' back to '/de', so anywhere this got emitted as a canonical/hreflang/
// sitemap URL, Google was crawling a page whose own canonical tag pointed at
// a redirect of itself. Confirmed live 2026-09-07 (GSC "Page with redirect" +
// "Alternate page with proper canonical tag" on every non-default locale
// homepage). Route everything needing this concatenation through here.
export function localizedPath(path: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  if (path === '/') return prefix || '/'
  return `${prefix}${path}`
}

// Builds locale-aware canonical + hreflang alternates for a given path
// (e.g. '/guides', '/news/some-slug'). Mirrors the pattern already used in
// guides/[slug] and news/[slug], with x-default added so Google has a
// fallback target when no hreflang tag matches the visitor's language.
export function localeAlternates(path: string, locale: string) {
  return {
    canonical: `${siteUrl}${localizedPath(path, locale)}`,
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [l, `${siteUrl}${localizedPath(path, l)}`])
      ),
      'x-default': `${siteUrl}${path}`,
    },
  }
}

// For routes whose body content is hardcoded English regardless of locale
// (no article_translations-style pipeline backing them) -- unlike
// localeAlternates, this does NOT self-canonicalize per locale or declare
// hreflang alternates, because that would tell Google 7 near-identical
// pages are legitimate language variants. Google's own duplicate-content
// detection was already collapsing them (GSC: "Duplicate without
// user-selected canonical" / "Alternate page with proper canonical tag" on
// /fr/privacy, /fr/characters, /en-GB/subscribe, /en-GB/map, /pt/rumors,
// /de/guides). Every locale variant of the route now canonicals to the one
// real (English) page instead. The page itself keeps rendering at the
// locale-prefixed URL (nav/footer chrome still localizes) -- this only
// changes what we tell Google about it. Kelvin, 2026-09-07.
export function unlocalizedAlternates(path: string) {
  return {
    canonical: `${siteUrl}${path}`,
    languages: {
      [routing.defaultLocale]: `${siteUrl}${path}`,
      'x-default': `${siteUrl}${path}`,
    },
  }
}
