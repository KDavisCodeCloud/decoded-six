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

// Mirrors src/app/[locale]/news/[slug]/page.tsx exactly (data fetching,
// translation overlay, JSON-LD, layout) -- the only differences are the
// category='guide' filter on getArticle and the /guides path everywhere
// /news appeared. Guide URL restructuring (2026-08-09): the 13 published
// guide-category articles now live here; /news/[slug] 301s old links in.

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

function absoluteUrl(url: string): string {
  return url.startsWith('http') ? url : `${siteUrl}${url}`
}

async function getArticle(slug: string): Promise<Article | null> {
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('category', 'guide')
    .single()
  return (data as Article | null) ?? null
}

// Same redirect_slug consolidation mechanism as news/[slug]/page.tsx
// (migration 011) -- an archived guide can point at a canonical survivor
// instead of 404ing a previously-indexed /guides/ URL.
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

  const translation = await getTranslation(article.id, locale)
  const title = translation?.title ?? article.title
  const excerptText = translation?.excerpt ?? article.excerpt

  const description = excerptText ? truncate(excerptText, 160) : undefined
  const ogImage = absoluteUrl(article.og_image_url ?? article.featured_image_url ?? getArticleFallbackImage(
    articleTags({ category: article.category, article_type: article.article_type, title: article.title }),
    article.slug
  ))

  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  const canonicalPath = `${prefix}/guides/${slug}`

  return {
    title,
    description,
    alternates: localeAlternates(`/guides/${slug}`, locale),
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

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  const article = await getArticle(slug)
  if (!article) {
    const redirectTarget = await getRedirectTarget(slug)
    if (redirectTarget) permanentRedirect({ href: `/guides/${redirectTarget}`, locale })
    notFound()
  }

  const translation = await getTranslation(article.id, locale)
  const isUntranslated = locale !== routing.defaultLocale && !translation
  const title = translation?.title ?? article.title
  const excerptText = translation?.excerpt ?? article.excerpt
  const contentText = translation?.content ?? article.content
  const rawFaqPairs = translation?.faq_pairs ?? article.faq_pairs
  const faqPairs = Array.isArray(rawFaqPairs) ? rawFaqPairs : []

  const t = await getTranslations({ locale, namespace: 'article' })
  const tTranslate = await getTranslations({ locale, namespace: 'translate' })

  const related = await getRelated(article.category, article.id)

  const heroImage = getArticleFallbackImage(
    articleTags({ category: article.category, article_type: article.article_type, title: article.title }),
    article.slug
  )

  const ogImage = absoluteUrl(article.og_image_url ?? article.featured_image_url ?? getArticleFallbackImage(
    articleTags({ category: article.category, article_type: article.article_type, title: article.title }),
    article.slug
  ))

  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  const canonicalUrl = `${siteUrl}${prefix}/guides/${slug}`

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
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${siteUrl}${prefix}/guides` },
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
            <a href={`${prefix}/guides`} className="hover:text-white transition-colors">Guides</a>
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
