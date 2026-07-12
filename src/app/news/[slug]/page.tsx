import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { ArticleMarkdown } from '@/components/shared/ArticleMarkdown'
import type { Article } from '@/lib/types'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedecodedsix.com'

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
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
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Not Found' }

  const description = article.excerpt ? truncate(article.excerpt, 160) : undefined

  return {
    title: article.title,
    description,
    alternates: {
      canonical: `${siteUrl}/news/${slug}`,
    },
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      url: `${siteUrl}/news/${slug}`,
      siteName: 'Decoded Six',
      publishedTime: article.published_at,
      modifiedTime: article.created_at,
      authors: ['DecodedSix Editorial Team'],
      section: article.category,
      // og:image is auto-populated by Next.js from opengraph-image.tsx in this directory
    },
    twitter: {
      card: 'summary_large_image',
      site: '@decodedsix',
      title: article.title,
      description,
    },
  }
}

function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

const CAT_CLASS: Record<string, string> = {
  news: 'badge-news', rumor: 'badge-rumor', guide: 'badge-guide',
  event: 'badge-event', update: 'badge-update',
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  const related = await getRelated(article.category, article.id)

  // Use agent-generated schema if available, otherwise build from article fields
  const articleJsonLd = article.schema_article ?? {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.published_at,
    dateModified: article.created_at,
    author: { '@type': 'Organization', name: 'DecodedSix Editorial Team' },
    publisher: { '@type': 'Organization', name: 'Decoded Six', url: siteUrl },
    url: `${siteUrl}/news/${slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/news/${slug}` },
  }

  const faqJsonLd = article.schema_faq ?? (
    article.faq_pairs && article.faq_pairs.length >= 3
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: article.faq_pairs.map(pair => ({
            '@type': 'Question',
            name: pair.question,
            acceptedAnswer: { '@type': 'Answer', text: pair.answer },
          })),
        }
      : null
  )

  const breadcrumbJsonLd = article.schema_breadcrumb ?? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/news` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${siteUrl}/news/${slug}` },
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

      <article className="container py-10 max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`badge ${CAT_CLASS[article.category] ?? 'badge-news'}`}>
              {article.category}
            </span>
            {article.source_name && (
              <span className="text-whisper text-sm">via {article.source_name}</span>
            )}
          </div>

          <h1 className="font-heading font-bold text-4xl md:text-5xl text-bright leading-tight mb-4">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-whisper text-sm flex-wrap">
            <time dateTime={article.published_at}>{fmtLong(article.published_at)}</time>
            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame hover:underline"
              >
                Source &rarr;
              </a>
            )}
          </div>
        </div>

        <div className="h-px bg-white/[0.06] mb-8" />

        {article.excerpt && (
          <p className="text-xl text-quiet leading-relaxed mb-8 font-medium">
            {article.excerpt}
          </p>
        )}

        {article.content && (
          <ArticleMarkdown content={article.content} stripFaq />
        )}

        {article.faq_pairs && article.faq_pairs.length > 0 && (
          <section className="mt-10 border-t border-white/[0.06] pt-8">
            <h2 className="font-heading font-bold text-2xl text-bright mb-6">Frequently Asked Questions</h2>
            <div className="space-y-5">
              {article.faq_pairs.map((pair, i) => (
                <div key={i} className="border border-white/[0.06] rounded-xl p-5">
                  <h3 className="font-heading font-bold text-base text-bright mb-2">{pair.question}</h3>
                  <p className="text-quiet text-sm leading-relaxed">{pair.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {article.agent_generated && article.external_citation && (
          <div className="mt-10 p-4 bg-panel rounded-lg border border-white/[0.06] text-whisper text-sm">
            This article references publicly available reporting.{' '}
            <a href={article.external_citation} target="_blank" rel="noopener noreferrer" className="text-flame hover:underline">
              View source &rarr;
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
