import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import type { Article } from '@/lib/types'

export const revalidate = 300

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://decodedsix.com'

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
      publishedTime: article.published_at,
      // No image_url column on articles (checked supabase/migrations/001_schema.sql) —
      // omitted rather than referencing a field that doesn't exist on Article.
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

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.published_at,
    // articles has no updated_at column (supabase/migrations/001_schema.sql) —
    // created_at is the closest real signal available.
    dateModified: article.created_at,
    author: { '@type': 'Organization', name: 'Decoded Six' },
    publisher: {
      '@type': 'Organization',
      name: 'Decoded Six',
      url: siteUrl,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
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
          <div className="text-quiet leading-loose space-y-4 text-base">
            {article.content.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {article.agent_generated && article.source_url && (
          <div className="mt-10 p-4 bg-panel rounded-lg border border-white/[0.06] text-whisper text-sm">
            This article was compiled from publicly available sources.{' '}
            <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-flame hover:underline">
              Read the original.
            </a>
          </div>
        )}
      </article>

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
