import Link from 'next/link'
import type { Article } from '@/lib/types'

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
  return (
    <Link
      href={`/news/${article.slug}`}
      className={`group block bg-panel rounded-xl border border-white/[0.06] hover:border-flame/25 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden ${featured ? 'md:flex' : ''}`}
    >
      {/* Top accent bar */}
      <div className={`h-0.5 bg-gradient-to-r from-flame to-ice ${featured ? 'md:w-0.5 md:h-auto' : 'w-full'}`} />

      <div className={`p-5 flex flex-col gap-3 ${featured ? 'md:p-6 flex-1' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`badge ${CAT_CLASS[article.category] ?? 'badge-news'}`}>
            {article.category}
          </span>
          {article.source_name && (
            <span className="text-whisper text-xs">{article.source_name}</span>
          )}
        </div>

        <h3 className={`font-heading font-bold text-bright group-hover:text-flame transition-colors leading-tight ${featured ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
          {article.title}
        </h3>

        {article.excerpt && (
          <p className={`text-quiet leading-relaxed ${featured ? 'text-base' : 'text-sm line-clamp-2'}`}>
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
