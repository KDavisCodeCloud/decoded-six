import { getImagesByTags, hashSeed } from './rockstar-images'
import type { Article } from './types'

// Guide URL restructuring (2026-08-09): guide-category articles live at
// /guides/[slug] now, everything else stays at /news/[slug]. Single source
// of truth for that split so ArticleCard, sitemap.ts, and any future caller
// never hand-roll the /news/ prefix and drift out of sync with the redirect
// in news/[slug]/page.tsx.
export function articlePath(article: Pick<Article, 'category' | 'slug'>): string {
  return article.category === 'guide' ? `/guides/${article.slug}` : `/news/${article.slug}`
}

// Placeholder pages created to fix dead internal links (2026-07-25) — real
// content, but not Gate 1 editorial output and not "news." Excluded from the
// /news feed and from Gate 1 article-count stats. Add future utility-page
// slugs here.
export const UTILITY_PAGE_SLUGS = new Set([
  'gta-6-money-spots',
  'gta-6-tier-list',
  'gta-6-weekly-challenges',
  'gta-6-trailer-breakdown',
  'gta-6-system-requirements',
])

const COVER_ART =
  'https://www.rockstargames.com/VI/_next/static/media/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg'

/**
 * Returns a matching Rockstar press image URL for a set of article tags.
 * Falls back to the official cover art when no match is found.
 *
 * `seed` (typically the article's slug) spreads different articles across
 * the pool of similarly-scored candidates instead of every article with
 * overlapping keywords collapsing onto the single top-ranked image -- pass
 * it whenever multiple articles' images render on the same page (list
 * views, category grids). Omit it only for truly one-off, single-image
 * contexts where no sibling collision is possible.
 */
export function getArticleFallbackImage(tags: string[], seed?: string): string {
  const results = getImagesByTags(tags, seed ? 6 : 1)
  if (results.length === 0) return COVER_ART
  const index = seed ? hashSeed(seed) % results.length : 0
  return results[index].url
}

/**
 * Derives a tag list from an Article-like object for use with getArticleFallbackImage.
 */
export function articleTags(opts: {
  category: string
  article_type?: string | null
  title: string
}): string[] {
  const words = opts.title
    .toLowerCase()
    .split(/[\s\-_,]+/)
    .filter(w => w.length > 3)
  return [
    opts.category,
    ...(opts.article_type ? [opts.article_type] : []),
    ...words,
  ]
}
