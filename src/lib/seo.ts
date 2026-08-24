import { routing } from '@/i18n/routing'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

// Builds locale-aware canonical + hreflang alternates for a given path
// (e.g. '/guides', '/news/some-slug'). Mirrors the pattern already used in
// guides/[slug] and news/[slug], with x-default added so Google has a
// fallback target when no hreflang tag matches the visitor's language.
export function localeAlternates(path: string, locale: string) {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  const canonicalPath = `${prefix}${path}`

  return {
    canonical: `${siteUrl}${canonicalPath}`,
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [
          l,
          `${siteUrl}${l === routing.defaultLocale ? '' : `/${l}`}${path}`,
        ])
      ),
      'x-default': `${siteUrl}${path}`,
    },
  }
}
