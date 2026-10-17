/**
 * Site author identity, in one place.
 *
 * Added 2026-10-16. Articles previously carried
 * `author: { '@type': 'Organization', name: 'DecodedSix Editorial Team' }`,
 * a faceless byline with no bio page behind it. These constants back both
 * the author page (/author/kelvin-davis) and the NewsArticle author schema,
 * so the name, URL and org can never drift apart between them.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedecodedsix.com'

export const AUTHOR_NAME = 'Kelvin L. Davis II'
export const AUTHOR_PATH = '/author/kelvin-davis'
export const AUTHOR_URL = `${siteUrl}${AUTHOR_PATH}`
export const AUTHOR_ORG = 'THD Agentic Systems LLC'
export const AUTHOR_TITLE = 'Founder & Editor'
