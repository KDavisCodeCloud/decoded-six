import Link from 'next/link'
import type { Article } from '@/lib/types'
import { RockstarImage } from '@/components/shared/RockstarImage'
import { getArticleFallbackImage, articleTags } from '@/lib/article-utils'

const CAT_CLASS: Record<string, string> = {
  news:   'badge-news',
  rumor:  'badge-rumor',
  guide:  'badge-guide',
  event:  'badge-event',
  update: 'badge-update',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function ArticleCard({
  article,
  featured = false,
}: {
  article: Article
  featured?: boolean
}) {
  const tags = articleTags({
    category: article.category,
    article_type: article.article_type,
    title: article.title,
  })
  const thumbUrl = getArticleFallbackImage(tags)

  if (featured) {
    return (
      <Link
        href={`/news/${article.slug}`}
        className="group block rounded-xl border border-white/[0.06] hover:border-flame/25 transition-all duration-300 overflow-hidden"
        style={{ background: '#0d0d0d' }}
      >
        <div className="md:flex">
          {/* Image — left panel on desktop */}
          <div className="relative md:w-[45%] h-52 md:h-auto overflow-hidden shrink-0">
            <RockstarImage
              src={thumbUrl}
              alt={article.title}
              priority
              className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent 60%, rgba(13,13,13,0.9) 100%)' }}
            />
          </div>

          {/* Text */}
          <div className="p-6 flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2">
              <span className={`badge ${CAT_CLASS[article.category] ?? 'badge-news'}`}>
                {article.category}
              </span>
              {article.source_name && (
                <span className="text-whisper text-xs">{article.source_name}</span>
              )}
            </div>

            <h3 className="font-heading font-bold text-bright group-hover:text-flame transition-colors leading-tight text-2xl md:text-3xl">
              {article.title}
            </h3>

            {article.excerpt && (
              <p className="text-quiet leading-relaxed text-base line-clamp-3">
                {article.excerpt}
              </p>
            )}

            <div className="text-whisper text-xs mt-auto pt-1">
              {fmtDate(article.published_at)}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group block rounded-xl border border-white/[0.06] hover:border-flame/25 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden flex flex-col"
      style={{ background: '#0d0d0d' }}
    >
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden shrink-0">
        <RockstarImage
          src={thumbUrl}
          alt={article.title}
          className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(13,13,13,0.85) 100%)' }}
        />
        {/* Category badge overlaid on image */}
        <span className={`absolute top-3 left-3 badge ${CAT_CLASS[article.category] ?? 'badge-news'}`}>
          {article.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {article.source_name && (
          <span className="text-whisper text-xs">{article.source_name}</span>
        )}

        <h3 className="font-heading font-bold text-bright group-hover:text-flame transition-colors leading-tight text-lg">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="text-quiet text-sm leading-relaxed line-clamp-2">
            {article.excerpt}
          </p>
        )}

        <div className="text-whisper text-xs mt-auto pt-1">
          {fmtDate(article.published_at)}
        </div>
      </div>
    </Link>
  )
}
