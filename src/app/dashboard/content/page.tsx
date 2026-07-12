'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { soundManager, SoundEvents } from '@/lib/sounds'
import type { Article } from '@/lib/types'

const CAT_CLASS: Record<string, string> = {
  news:  'border-ice/30 text-ice',
  guide: 'border-gta-gold/30 text-gta-gold',
  rumor: 'border-neon-pink/30 text-neon-pink',
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thedecodedsix.com'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function ContentPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)   // article id pending confirm
  const [overlay, setOverlay] = useState<{ type: OverlayType; reward?: string } | null>(null)

  async function fetchPublished() {
    const supabase = createClient()
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('product_id', 'gta-hub')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
    setArticles((data as Article[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPublished()
    const supabase = createClient()
    const channel = supabase
      .channel('content-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: 'product_id=eq.gta-hub',
      }, () => fetchPublished())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleUnpublish = useCallback(async (article: Article) => {
    setProcessing(article.id)
    setConfirm(null)
    try {
      const res = await fetch(`/api/articles/${article.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'Unpublish failed')
      }
      soundManager.play(SoundEvents.ARTICLE_REJECTED_SOFT, { volume: 0.4 })
      setOverlay({ type: 'wasted' })
      setArticles(prev => prev.filter(a => a.id !== article.id))
    } catch (err) {
      console.error('Unpublish failed:', err)
    } finally {
      setProcessing(null)
    }
  }, [])

  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  )

  const totalWords = articles.reduce((sum, a) => sum + (a.word_count ?? 0), 0)

  return (
    <>
      <GTAOverlay type={overlay?.type ?? null} reward={overlay?.reward} onDismiss={() => setOverlay(null)} />

      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-pricedown text-gta-gold text-3xl leading-none">PUBLISHED ARTICLES</h1>
            <p className="text-quiet text-sm mt-1">
              {loading ? 'Loading...' : `${articles.length} live · ${totalWords.toLocaleString()} total words`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm bg-transparent border border-dash-border rounded-lg px-3 py-2 text-quiet placeholder:text-whisper focus:outline-none focus:border-gta-gold/40 w-56"
            />
            <button
              onClick={fetchPublished}
              className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stat strip */}
        {!loading && articles.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Published', value: articles.length },
              { label: 'Avg. words', value: Math.round(totalWords / articles.length).toLocaleString() },
              { label: 'Agent written', value: articles.filter(a => a.agent_generated).length },
            ].map(stat => (
              <div key={stat.label} className="dash-card p-4">
                <p className="text-whisper text-xs uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="font-pricedown text-gta-gold text-2xl leading-none">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="dash-card p-8 text-center text-quiet text-sm">Loading articles...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="dash-card p-12 text-center">
            <div className="text-4xl mb-4">{search ? '🔍' : '📭'}</div>
            <h2 className="font-heading font-bold text-bright mb-2">
              {search ? 'No results' : 'No published articles'}
            </h2>
            <p className="text-quiet text-sm">
              {search
                ? `Nothing matches "${search}".`
                : 'Approved articles from the HITL queue will appear here.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(article => (
            <div key={article.id} className="dash-card p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      CAT_CLASS[article.category] ?? 'border-quiet/30 text-quiet'
                    }`}>
                      {article.category}
                    </span>
                    {article.article_type && (
                      <span className="text-[10px] text-whisper border border-white/[0.06] px-1.5 py-0.5 rounded uppercase tracking-widest">
                        {article.article_type}
                      </span>
                    )}
                    {article.agent_generated && (
                      <span className="text-[10px] text-whisper">🤖 agent</span>
                    )}
                    {article.word_count && (
                      <span className="text-[10px] text-whisper font-mono">
                        {article.word_count.toLocaleString()} words
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-bright text-base leading-snug mb-1">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="text-quiet text-sm leading-relaxed line-clamp-2 mb-2">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-whisper text-xs">
                    <time dateTime={article.published_at}>{fmtDate(article.published_at)}</time>
                    <a
                      href={`${SITE_URL}/news/${article.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ice hover:underline"
                    >
                      View live →
                    </a>
                    {article.external_citation && (
                      <a
                        href={article.external_citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-flame hover:underline truncate max-w-[240px]"
                      >
                        Source
                      </a>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {confirm === article.id ? (
                    <div className="flex flex-col gap-1.5 items-end">
                      <p className="text-xs text-neon-pink font-semibold text-right">Remove from site?</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleUnpublish(article)}
                          disabled={processing === article.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-neon-pink/20 text-neon-pink border border-neon-pink/40 hover:bg-neon-pink/30 disabled:opacity-40 transition-colors font-semibold"
                        >
                          Yes, remove
                        </button>
                        <button
                          onClick={() => setConfirm(null)}
                          className="text-xs px-3 py-1.5 border border-dash-border text-quiet rounded-lg hover:text-bright transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirm(article.id)}
                      disabled={processing === article.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-neon-pink/30 text-neon-pink hover:bg-neon-pink/10 disabled:opacity-40 transition-colors"
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
