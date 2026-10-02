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

// For ARTICLE routes, where a locale is only a real language variant if a
// completed row exists in article_translations. Unlike localeAlternates,
// which self-canonicalizes every locale unconditionally, this:
//   - canonicals an untranslated locale back to the English URL, and
//   - omits untranslated locales from hreflang entirely.
//
// Why (2026-10-01): /fr/guides/gta-6-pc-graphics-settings-optimization and
// 86 others were serving the English body (the page falls back when no
// translation exists) while declaring themselves canonical and advertising
// all 8 locales as alternates. That tells Google 8 near-identical pages are
// each originals -- the same "Duplicate without user-selected canonical"
// shape already fixed for static chrome routes via unlocalizedAlternates on
// 2026-09-07, just never applied to articles. The sitemap already got this
// right (it filters on translation_status='completed'); the page metadata
// contradicted it.
//
// This is self-healing: the moment ds_translate writes a completed row, the
// locale reappears in hreflang and its canonical flips back to self. No
// backfill step, no manual list to maintain.
export function articleAlternates(path: string, locale: string, translatedLocales: Iterable<string>) {
  const translated = new Set(translatedLocales)
  // The default locale is the source of truth and always "translated".
  const liveLocales = routing.locales.filter(
    (l) => l === routing.defaultLocale || translated.has(l)
  )
  const isLive = locale === routing.defaultLocale || translated.has(locale)
  const englishUrl = `${siteUrl}${path}`

  return {
    canonical: isLive ? `${siteUrl}${localizedPath(path, locale)}` : englishUrl,
    languages: {
      ...Object.fromEntries(liveLocales.map((l) => [l, `${siteUrl}${localizedPath(path, l)}`])),
      'x-default': englishUrl,
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
  // Same '/' + siteUrl concatenation pitfall as localizedPath -- avoid it
  // here too rather than rely on Next's own trailing-slash normalization.
  const canonical = `${siteUrl}${path === '/' ? '' : path}`
  return {
    canonical,
    languages: {
      [routing.defaultLocale]: canonical,
      'x-default': canonical,
    },
  }
}
