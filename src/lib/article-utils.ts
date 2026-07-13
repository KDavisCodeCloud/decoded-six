import { getImagesByTags } from './rockstar-images'

const COVER_ART =
  'https://www.rockstargames.com/VI/_next/static/media/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg'

/**
 * Returns the best-matching Rockstar press image URL for a set of article tags.
 * Falls back to the official cover art when no match is found.
 */
export function getArticleFallbackImage(tags: string[]): string {
  const results = getImagesByTags(tags, 1)
  return results[0]?.url ?? COVER_ART
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
