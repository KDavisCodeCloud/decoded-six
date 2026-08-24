import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { ArticleMarkdown } from '@/components/shared/ArticleMarkdown'
import { ShareBar } from '@/components/shared/ShareBar'
import { HeroImage } from '@/components/HeroImage'
import { getArticleFallbackImage, articleTags } from '@/lib/article-utils'
import { routing } from '@/i18n/routing'
import { permanentRedirect } from '@/i18n/navigation'
import { localeAlternates } from '@/lib/seo'
import type { Article } from '@/lib/types'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

const LOCALE_NAMES: Record<string, string> = {
  en: 'English (US)', 'en-GB': 'English (UK)', fr: 'Français', de: 'Deutsch',
  ja: '日本語', zh: '中文', pt: 'Português', es: 'Español',
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}

// Google's structured-data (and OG) image requirements need a fully-qualified
// URL -- confirmed live 2026-07-25 that stored/fallback images are relative
// paths (served from the local image library), which fails rich-results eligibility.
function absoluteUrl(url: string): string {
  return url.startsWith('http') ? url : `${siteUrl}${url}`
}

async function getArticle(slug: string): Promise<Article | null> {
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return (data as Article | null) ?? null
}

// Phase 1A duplicate-article consolidation (2026-08-09): a slug that used to
// be a live article can now be 'archived' with redirect_slug pointing at the
// canonical survivor -- 301 there instead of 404ing a previously-indexed URL.
async function getRedirectTarget(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('articles')
    .select('redirect_slug')
    .eq('slug', slug)
    .eq('status', 'archived')
    .not('redirect_slug', 'is', null)
    .maybeSingle()
  return (data as { redirect_slug: string } | null)?.redirect_slug ?? null
}

interface Translation {
  title: string
  excerpt: string | null
  content: string | null
  faq_pairs: { question: string; answer: string }[] | null
}

// Overlays a completed translation onto the base (English) article --
// every field NOT translated (images, dates, category, source, id, slug)
// stays exactly as the base article has it. Returns null (not a partial
// object) when no completed translation exists yet, so the caller can
// show the "not translated yet" notice and fall back to English cleanly.
async function getTranslation(articleId: string, locale: string): Promise<Translation | null> {
  if (locale === routing.defaultLocale) return null
  const { data } = await supabase
    .from('article_translations')
    .select('title, excerpt, content, faq_pairs')
    .eq('article_id', articleId)
    .eq('locale', locale)
    .eq('translation_status', 'completed')
    .maybeSingle()
  return (data as Translation | null) ?? null
}

async function getRelated(category: string, excludeId: string): Promise<Article[]> {
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .eq('category', category)
    .neq('id', excludeId)
    .order('published_at', { ascending: false })
    .limit(3)
  return (data as Article[]) ?? []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const article = await getArticle(slug)
  if (!article) {
    const redirectTarget = await getRedirectTarget(slug)
    if (redirectTarget) return { title: 'Moved' }
    return { title: 'Not Found' }
  }
  // Guide URL restructuring (2026-08-09): guide-category articles now live
  // at /guides/[slug] -- this route just 301s there. See the matching
  // permanentRedirect below in the page component.
  if (article.category === 'guide') return { title: 'Moved' }

  const translation = await getTranslation(article.id, locale)
  const title = translation?.title ?? article.title
  const excerptText = translation?.excerpt ?? article.excerpt

  const description = excerptText ? truncate(excerptText, 160) : undefined
  const ogImage = absoluteUrl(article.og_image_url ?? article.featured_image_url ?? getArticleFallbackImage(
    articleTags({ category: article.category, article_type: article.article_type, title: article.title }),
    article.slug
  ))

  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  const canonicalPath = `${prefix}/news/${slug}`

  return {
    title,
    description,
    alternates: localeAlternates(`/news/${slug}`, locale),
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}${canonicalPath}`,
      siteName: 'Decoded Six',
      publishedTime: article.published_at,
      modifiedTime: article.created_at,
      authors: ['DecodedSix Editorial Team'],
      section: article.category,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@decodedsix',
      title,
      description,
      images: [ogImage],
    },
  }
}

function fmtLong(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

const CAT_CLASS: Record<string, string> = {
  news: 'badge-news', rumor: 'badge-rumor', guide: 'badge-guide',
  event: 'badge-event', update: 'badge-update',
}

const textShadow = '0 2px 20px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.8)'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  const article = await getArticle(slug)
  if (!article) {
    const redirectTarget = await getRedirectTarget(slug)
    if (redirectTarget) permanentRedirect({ href: `/news/${redirectTarget}`, locale })
    notFound()
  }
  // Guide URL restructuring (2026-08-09): permanent redirect, not a client
  // nav -- next-intl's permanentRedirect issues a real 308 (same mechanism
  // migration 011's redirect_slug path already uses) that carries the
  // locale prefix automatically, so this covers all 8 locales in one path.
  if (article.category === 'guide') {
    permanentRedirect({ href: `/guides/${slug}`, locale })
  }

  const translation = await getTranslation(article.id, locale)
  const isUntranslated = locale !== routing.defaultLocale && !translation
  const title = translation?.title ?? article.title
  const excerptText = translation?.excerpt ?? article.excerpt
  const contentText = translation?.content ?? article.content
  // Defensive: a translation row's faq_pairs has been observed stored as a
  // JSON string instead of a real array on rare bad rows (ds_translate.py
  // now normalizes this at write time, but this guards existing/future
  // data quirks from ever 500ing the page instead of just showing no FAQ).
  const rawFaqPairs = translation?.faq_pairs ?? article.faq_pairs
  const faqPairs = Array.isArray(rawFaqPairs) ? rawFaqPairs : []

  const t = await getTranslations({ locale, namespace: 'article' })
  const tTranslate = await getTranslations({ locale, namespace: 'translate' })

  const related = await getRelated(article.category, article.id)

  const heroImage = getArticleFallbackImage(
    articleTags({ category: article.category, article_type: article.article_type, title: article.title }),
    article.slug
  )

  // articleJsonLd and breadcrumbJsonLd are ALWAYS computed fresh here, never
  // from the stored article.schema_article/schema_breadcrumb columns --
  // confirmed live 2026-07-25 that the stored version had datePublished/
  // dateModified baked in as null (content_agent.py's schema_generator node
  // ran before publish_date was known) and used the wrong domain (its
  // SITE_URL fell back to non-www; this site's real canonical is www).
  // Computing fresh means every article gets correct data with no need to
  // backfill/repair already-stored rows.
  const ogImage = absoluteUrl(article.og_image_url ?? article.featured_image_url ?? getArticleFallbackImage(
    articleTags({ category: article.category, article_type: article.article_type, title: article.title }),
    article.slug
  ))

  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  const canonicalUrl = `${siteUrl}${prefix}/news/${slug}`

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: excerptText ?? undefined,
    image: [ogImage],
    datePublished: article.published_at,
    dateModified: article.published_at,
    inLanguage: locale,
    author: { '@type': 'Organization', name: 'DecodedSix Editorial Team' },
    publisher: { '@type': 'Organization', name: 'Decoded Six', url: siteUrl },
    url: canonicalUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  }

  // FAQ content itself (not a timestamp or URL) is safe to trust from
  // storage -- fall back to computing it from faq_pairs if schema_faq
  // wasn't populated for this row. Only used for the base (English)
  // locale's pre-computed schema; translated locales compute it fresh
  // from the translated faqPairs below.
  const faqJsonLd = (!translation ? article.schema_faq : null) ?? (
    faqPairs && faqPairs.length >= 3
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqPairs.map(pair => ({
            '@type': 'Question',
            name: pair.question,
            acceptedAnswer: { '@type': 'Answer', text: pair.answer },
          })),
        }
      : null
  )

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('home'), item: `${siteUrl}${prefix}/` },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}${prefix}/news` },
      { '@type': 'ListItem', position: 3, name: title, item: canonicalUrl },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Header />

      {/* ── CINEMATIC ARTICLE HERO ───────────────────────────── */}
      <HeroImage src={article.featured_image_url ?? heroImage} credit={article.featured_image_credit ?? '© Rockstar Games'}>
        <div className="max-w-3xl w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-5 text-[11px] font-ibm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <a href={`${prefix}/`} className="hover:text-white transition-colors">{t('home')}</a>
            <span>/</span>
            <a href={`${prefix}/news`} className="hover:text-white transition-colors">News</a>
            <span>/</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }} className="truncate max-w-[200px]">{title}</span>
          </nav>

          <div className="flex items-center gap-2 mb-4">
            <span className={`badge ${CAT_CLASS[article.category] ?? 'badge-news'}`}>
              {article.category}
            </span>
            {article.source_name && (
              <span className="text-white/50 text-sm font-ibm">via {article.source_name}</span>
            )}
          </div>

          <h1
            className="font-heading font-bold text-bright leading-tight mb-4"
            style={{ fontSize: 'clamp(28px, 4vw, 48px)', textShadow }}
          >
            {title}
          </h1>

          <div className="flex items-center gap-4 flex-wrap" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <time dateTime={article.published_at} className="text-sm font-ibm" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
              {fmtLong(article.published_at, locale)}
            </time>
            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-ibm hover:text-white transition-colors"
                style={{ color: '#ec1272' }}
              >
                {t('source')} →
              </a>
            )}
          </div>
        </div>
      </HeroImage>

      {/* ── ARTICLE BODY ─────────────────────────────────────── */}
      <article className="container py-10 max-w-3xl">
        {isUntranslated && (
          <div className="mb-8 p-4 rounded-lg border border-flame/20 text-quiet text-sm" style={{ background: '#0d0d0d' }}>
            {tTranslate('notTranslatedNotice', { language: LOCALE_NAMES[locale] ?? locale })}
          </div>
        )}

        {excerptText && (
          <p className="text-xl text-quiet leading-relaxed mb-6 font-medium border-l-2 border-flame/40 pl-5">
            {excerptText}
          </p>
        )}

        {/* Standard on every article going forward (Kelvin, 2026-08-06) --
            lives in the shared template, not per-article content, so every
            new article gets it automatically. */}
        <div className="mb-8 pb-6 border-b border-white/[0.06]">
          <ShareBar url={canonicalUrl} title={title} image={ogImage} />
        </div>

        {contentText && (
          <ArticleMarkdown content={contentText} stripFaq />
        )}

        {faqPairs && faqPairs.length > 0 && (
          <section className="mt-10 border-t border-white/[0.06] pt-8">
            <h2 className="font-heading font-bold text-2xl text-bright mb-6">{t('faqHeading')}</h2>
            <div className="space-y-5">
              {faqPairs.map((pair, i) => (
                <div key={i} className="border border-white/[0.06] rounded-xl p-5" style={{ background: '#0d0d0d' }}>
                  <h3 className="font-heading font-bold text-base text-bright mb-2">{pair.question}</h3>
                  <p className="text-quiet text-sm leading-relaxed">{pair.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {article.agent_generated && article.external_citation && (
          <div className="mt-10 p-4 rounded-lg border border-white/[0.06] text-whisper text-sm" style={{ background: '#0d0d0d' }}>
            {t('referencesNotice')}{' '}
            <a href={article.external_citation} target="_blank" rel="noopener noreferrer" className="text-flame hover:underline">
              {t('viewSource')} →
            </a>
          </div>
        )}
      </article>

      <div className="container max-w-3xl mb-14">
        <NewsletterSignup variant="article" />
      </div>

      {related.length > 0 && (
        <div className="container pb-20 max-w-3xl">
          <div className="h-px bg-white/[0.06] mb-8" />
          <h2 className="font-heading font-bold text-2xl text-bright mb-5">Related</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {related.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
