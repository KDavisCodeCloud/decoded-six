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

// For ARTICLE routes. ENGLISH IS THE ONLY INDEXED VERSION (2026-10-15).
//
// History: this used to advertise every locale with a completed
// article_translations row as a real hreflang alternate, self-canonicalling
// each one. That was the correct fix for the previous bug (untranslated
// locales serving English while claiming to be originals), but it left 504
// machine-translated article URLs indexable against 72 English ones -- 87%
// of the article surface was machine output.
//
// The site is being suppressed, not merely ranked low: ~0 impressions for
// seven weeks across 248 indexed pages, no manual action in GSC, and the TGG
// exclusive does not surface in Google even on an exact-quote search of its
// own body text. Bulk machine translation at that ratio is the most likely
// cause, so the locale pages come out of the index entirely.
//
// Readers are unaffected -- /fr/news/x still renders the French body at its
// own URL. Only the indexing signals change:
//   - articleRobots() below marks every non-English article page noindex,
//   - hreflang collapses to self + x-default (no cross-locale cluster),
//   - and every page SELF-canonicals, English and non-English alike.
// The sitemap lists English article URLs only.
//
// On that last point: an earlier draft of this plan had non-English pages
// canonical to the English URL. That is wrong once noindex is doing the work.
// Google's guidance is not to combine noindex with a cross-page canonical --
// the two instructions conflict ("drop this page" vs "fold it into that one")
// and the resolution is undefined. noindex + self-canonical says exactly one
// unambiguous thing. The same conflict exists on /news?category=* and was
// accepted there as harmless because /news is indexed on its own merits;
// here there is no reason to introduce it at all.
//
// No longer takes translatedLocales: the hreflang cluster is gone, so the
// article_translations lookup the call sites used to do is dead weight.
export function articleAlternates(path: string, locale: string) {
  const englishUrl = `${siteUrl}${path}`
  const isEnglish = locale === routing.defaultLocale

  return {
    canonical: isEnglish ? englishUrl : `${siteUrl}${localizedPath(path, locale)}`,
    languages: {
      [locale]: `${siteUrl}${localizedPath(path, locale)}`,
      'x-default': englishUrl,
    },
  }
}

// Robots directive for an article page. Non-English stays crawlable and
// link-following (so internal links still pass through it) but out of the
// index. English is left undefined so it inherits the site-wide
// `index: true, follow: true` from the root layout.
export function articleRobots(locale: string) {
  return locale === routing.defaultLocale
    ? undefined
    : { index: false, follow: true }
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
