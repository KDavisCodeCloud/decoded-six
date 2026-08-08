import { defineRouting } from 'next-intl/routing'

// Kelvin, 2026-08-07: translate the whole public site so it reaches more
// people worldwide. 'en' is the site's existing default American-English
// content (articles.* / hand-authored copy) -- every other locale here has
// a matching CHECK constraint in supabase/migrations/010_article_translations.sql.
export const routing = defineRouting({
  locales: ['en', 'en-GB', 'fr', 'de', 'ja', 'zh', 'pt', 'es'],
  defaultLocale: 'en',
  // 'as-needed': the default locale ('en') gets no URL prefix at all, so
  // every existing published URL (thedecodedsix.com/news/foo) keeps
  // working unchanged. Every other locale gets a real prefixed URL
  // (thedecodedsix.com/fr/news/foo) -- a genuine indexable page per
  // language, not a client-side-only toggle.
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
