'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { soundManager, SoundEvents } from '@/lib/sounds'
import type { Article } from '@/lib/types'

export default function QueuePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [overlay, setOverlay] = useState<OverlayType | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  async function fetchQueue() {
    const supabase = createClient()
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('product_id', 'decodedsix')
      .eq('status', 'draft')
      .order('created_at', { ascending: true })
    setArticles((data as Article[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchQueue() }, [])

  const handleApprove = useCallback(async (article: Article) => {
    setProcessing(article.id)
    const supabase = createClient()
    await supabase
      .from('articles')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', article.id)
    soundManager.play(SoundEvents.ARTICLE_APPROVED)
    setOverlay('mission-passed')
    setArticles(prev => prev.filter(a => a.id !== article.id))
    setProcessing(null)
  }, [])

  const handleReject = useCallback(async (article: Article) => {
    setProcessing(article.id)
    const supabase = createClient()
    await supabase
      .from('articles')
      .update({ status: 'archived' })
      .eq('id', article.id)
    soundManager.play(SoundEvents.ARTICLE_REJECTED_SOFT, { volume: 0.4 })
    setOverlay('wasted')
    setArticles(prev => prev.filter(a => a.id !== article.id))
    setProcessing(null)
  }, [])

  return (
    <>
      <GTAOverlay type={overlay} onDismiss={() => setOverlay(null)} />

      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-pricedown text-gta-gold text-3xl leading-none">HITL QUEUE</h1>
            <p className="text-quiet text-sm mt-1">
              {loading ? 'Loading...' : `${articles.length} article${articles.length !== 1 ? 's' : ''} awaiting review`}
            </p>
          </div>
          <button
            onClick={fetchQueue}
            className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="dash-card p-8 text-center text-quiet text-sm">
            Loading queue...
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="dash-card p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-heading font-bold text-bright mb-2">Queue is empty</h2>
            <p className="text-quiet text-sm">No articles awaiting review. Agents will surface new content here.</p>
          </div>
        )}

        <div className="space-y-4">
          {articles.map(article => (
            <div key={article.id} className="dash-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      article.category === 'news'  ? 'border-ice/30 text-ice' :
                      article.category === 'rumor' ? 'border-neon-pink/30 text-neon-pink' :
                      article.category === 'guide' ? 'border-gta-gold/30 text-gta-gold' :
                      'border-quiet/30 text-quiet'
                    }`}>
                      {article.category}
                    </span>
                    {article.agent_generated && (
                      <span className="text-[10px] text-whisper">🤖 agent</span>
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-bright text-base mb-2 leading-snug">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-quiet text-sm leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                  {article.source_url && (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ice hover:underline mt-2 block truncate"
                    >
                      {article.source_name || article.source_url}
                    </a>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(article)}
                    disabled={processing === article.id}
                    className="dash-btn-approve disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(article)}
                    disabled={processing === article.id}
                    className="dash-btn-reject disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-dash-border text-xs text-whisper">
                Created {new Date(article.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
