'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { soundManager, SoundEvents } from '@/lib/sounds'
import type { Article } from '@/lib/types'

type QueueStatus = 'pending_review' | 'needs_revision'

const TYPE_LABEL: Record<string, string> = {
  news: 'NEWS',
  evergreen: 'EVERGREEN',
  conversion: 'CONVERSION',
}

const TYPE_CLASS: Record<string, string> = {
  news: 'border-ice/30 text-ice',
  evergreen: 'border-gta-gold/30 text-gta-gold',
  conversion: 'border-neon-pink/30 text-neon-pink',
}

export default function QueuePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [overlay, setOverlay] = useState<OverlayType | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all')

  async function fetchQueue() {
    const supabase = createClient()
    let query = supabase
      .from('articles')
      .select('*')
      .eq('product_id', 'gta-hub')
      .in('status', ['pending_review', 'needs_revision'])
      .order('created_at', { ascending: true })

    const { data } = await query
    setArticles((data as Article[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchQueue() }, [])

  const handleApprove = useCallback(async (article: Article) => {
    setProcessing(article.id)
    try {
      const apiKey = process.env.NEXT_PUBLIC_DECODEDSIX_API_KEY
      if (apiKey) {
        // Call FastAPI publish endpoint to set published_at + status=published
        const res = await fetch(`/agents/decodedsix/publish/${article.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!res.ok) throw new Error(await res.text())
      } else {
        // Fallback: direct Supabase update (dashboard-only, no FastAPI running)
        const supabase = createClient()
        await supabase
          .from('articles')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', article.id)
      }
      soundManager.play(SoundEvents.ARTICLE_APPROVED)
      setOverlay('mission-passed')
      setArticles(prev => prev.filter(a => a.id !== article.id))
    } finally {
      setProcessing(null)
    }
  }, [])

  const handleRevision = useCallback(async (article: Article) => {
    const notes = revisionNotes[article.id]?.trim()
    if (!notes) return
    setProcessing(article.id)
    const supabase = createClient()
    await supabase
      .from('articles')
      .update({ status: 'needs_revision', hitl_notes: notes, hitl_reviewer: 'owner' })
      .eq('id', article.id)
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'needs_revision', hitl_notes: notes } : a))
    setRevisionNotes(prev => { const n = { ...prev }; delete n[article.id]; return n })
    setExpanded(null)
    setProcessing(null)
  }, [revisionNotes])

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

  const visible = statusFilter === 'all'
    ? articles
    : articles.filter(a => a.status === statusFilter)

  const pending = articles.filter(a => a.status === 'pending_review').length
  const revision = articles.filter(a => a.status === 'needs_revision').length

  return (
    <>
      <GTAOverlay type={overlay} onDismiss={() => setOverlay(null)} />

      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-pricedown text-gta-gold text-3xl leading-none">HITL QUEUE</h1>
            <p className="text-quiet text-sm mt-1">
              {loading ? 'Loading...' : `${pending} pending review · ${revision} needs revision`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {(['all', 'pending_review', 'needs_revision'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    statusFilter === f
                      ? 'border-gta-gold/60 text-gta-gold bg-gta-gold/10'
                      : 'border-dash-border text-quiet hover:text-bright'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : 'Needs Revision'}
                </button>
              ))}
            </div>
            <button
              onClick={fetchQueue}
              className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="dash-card p-8 text-center text-quiet text-sm">Loading queue...</div>
        )}

        {!loading && visible.length === 0 && (
          <div className="dash-card p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-heading font-bold text-bright mb-2">Queue is empty</h2>
            <p className="text-quiet text-sm">No articles awaiting review.</p>
          </div>
        )}

        <div className="space-y-4">
          {visible.map(article => (
            <div key={article.id} className={`dash-card p-6 ${
              article.status === 'needs_revision' ? 'border-l-2 border-l-neon-pink' : ''
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {article.article_type && (
                      <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                        TYPE_CLASS[article.article_type] ?? 'border-quiet/30 text-quiet'
                      }`}>
                        {TYPE_LABEL[article.article_type] ?? article.article_type}
                      </span>
                    )}
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      article.category === 'news'  ? 'border-ice/30 text-ice' :
                      article.category === 'guide' ? 'border-gta-gold/30 text-gta-gold' :
                      'border-quiet/30 text-quiet'
                    }`}>
                      {article.category}
                    </span>
                    {article.status === 'needs_revision' && (
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-neon-pink/30 text-neon-pink">
                        Needs Revision
                      </span>
                    )}
                    {article.word_count && (
                      <span className="text-[10px] text-whisper font-mono">{article.word_count.toLocaleString()} words</span>
                    )}
                    {article.agent_generated && (
                      <span className="text-[10px] text-whisper">🤖 agent</span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-bright text-base mb-2 leading-snug">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="text-quiet text-sm leading-relaxed line-clamp-2 mb-2">
                      {article.excerpt}
                    </p>
                  )}

                  {article.hitl_notes && (
                    <div className="text-xs text-neon-pink bg-neon-pink/5 border border-neon-pink/20 rounded p-2 mb-2">
                      <span className="font-bold">Revision notes:</span> {article.hitl_notes}
                    </div>
                  )}

                  {article.external_citation && (
                    <a
                      href={article.external_citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ice hover:underline block truncate"
                    >
                      Source: {article.external_citation}
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
                    onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                    disabled={processing === article.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gta-gold/40 text-gta-gold hover:bg-gta-gold/10 transition-colors"
                  >
                    {expanded === article.id ? 'Cancel' : 'Revise'}
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

              {expanded === article.id && (
                <div className="mt-4 pt-4 border-t border-dash-border">
                  <textarea
                    value={revisionNotes[article.id] ?? ''}
                    onChange={e => setRevisionNotes(prev => ({ ...prev, [article.id]: e.target.value }))}
                    placeholder="What needs to change? Be specific — the agent reads this on the next run."
                    rows={3}
                    className="w-full bg-transparent border border-dash-border rounded-lg p-3 text-sm text-quiet placeholder:text-whisper focus:outline-none focus:border-gta-gold/40 resize-none"
                  />
                  <button
                    onClick={() => handleRevision(article)}
                    disabled={!revisionNotes[article.id]?.trim() || processing === article.id}
                    className="mt-2 text-xs px-4 py-2 rounded-lg bg-gta-gold/20 text-gta-gold border border-gta-gold/30 hover:bg-gta-gold/30 disabled:opacity-40 transition-colors"
                  >
                    Send for Revision
                  </button>
                </div>
              )}

              {article.faq_pairs && article.faq_pairs.length > 0 && (
                <details className="mt-3 pt-3 border-t border-dash-border">
                  <summary className="text-xs text-whisper cursor-pointer hover:text-quiet">
                    {article.faq_pairs.length} FAQ pairs · {article.internal_links_used?.length ?? 0} internal links
                  </summary>
                  <div className="mt-2 space-y-2">
                    {article.faq_pairs.map((faq, i) => (
                      <div key={i} className="text-xs">
                        <div className="text-quiet font-medium">Q: {faq.question}</div>
                        <div className="text-whisper mt-0.5">A: {faq.answer}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <div className="mt-3 pt-3 border-t border-dash-border text-xs text-whisper">
                Created {new Date(article.created_at).toLocaleString()}
                {article.publish_date && ` · Scheduled ${article.publish_date}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
