'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { soundManager, SoundEvents } from '@/lib/sounds'

type Status =
  | 'held' | 'draft' | 'rendering' | 'pending_review' | 'approved'
  | 'rejected' | 'regenerating' | 'needs_revision' | 'scheduled' | 'posted'

interface Account { id: string; platform: 'tiktok' | 'youtube'; handle: string; label: string | null }

interface Short {
  id: string
  day_number: number
  post_date: string
  hook: string
  voiceover: string
  post_caption: string | null
  hashtags: string | null
  status: Status
  reviewer_notes: string | null
  reviewed_by: string | null
  duration_s: number | null
  video_url: string | null
  tiktok_account_id: string | null
  tiktok_account: { id: string; handle: string; label: string | null } | null
  linked_article: { slug: string; title: string; category: string } | null
  tiktok_posted_at: string | null
  youtube_posted_at: string | null
  tiktok_url: string | null
  youtube_url: string | null
  local_delivered_at: string | null
  retry_mode: 'same' | 'new' | null
}

type Filter = 'pending_review' | 'needs_revision' | 'approved' | 'scheduled' | 'posted' | 'rejected' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending_review', label: 'Pending' },
  { key: 'needs_revision', label: 'Revising' },
  { key: 'approved', label: 'Approved' },
  { key: 'scheduled', label: 'Part-posted' },
  { key: 'posted', label: 'Posted' },
  { key: 'rejected', label: 'Remaking' },
  { key: 'all', label: 'All' },
]

const STATUS_STYLE: Record<Status, { label: string; cls: string; cell: string }> = {
  held:           { label: 'Held',      cls: 'border-quiet/30 text-quiet',             cell: 'bg-white/[0.06] text-whisper' },
  draft:          { label: 'Draft',     cls: 'border-quiet/30 text-quiet',             cell: 'bg-white/10 text-quiet' },
  rendering:      { label: 'Rendering', cls: 'border-ice/30 text-ice',                 cell: 'bg-ice/20 text-ice' },
  pending_review: { label: 'Pending',   cls: 'border-gta-gold/40 text-gta-gold',       cell: 'bg-gta-gold/25 text-gta-gold' },
  needs_revision: { label: 'Revising',  cls: 'border-neon-pink/30 text-neon-pink',     cell: 'bg-neon-pink/20 text-neon-pink' },
  approved:       { label: 'Approved',  cls: 'border-[#3fd17a]/40 text-[#3fd17a]',     cell: 'bg-[#3fd17a]/25 text-[#3fd17a]' },
  scheduled:      { label: 'Part-posted', cls: 'border-[#5a96ff]/40 text-[#5a96ff]',   cell: 'bg-[#5a96ff]/25 text-[#5a96ff]' },
  posted:         { label: 'Posted',    cls: 'border-[#5a96ff]/60 text-[#5a96ff]',     cell: 'bg-[#5a96ff]/50 text-bright' },
  rejected:       { label: 'Remaking',  cls: 'border-neon-pink/40 text-neon-pink',     cell: 'bg-neon-pink/10 text-neon-pink' },
  regenerating:   { label: 'Remaking',  cls: 'border-neon-pink/40 text-neon-pink',     cell: 'bg-neon-pink/10 text-neon-pink' },
}

function fmtDay(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data
}

const btn = 'text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40'
const input = 'w-full bg-transparent border border-dash-border rounded-lg px-3 py-2 text-quiet placeholder:text-whisper focus:outline-none focus:border-gta-gold/50'

// Bonus shorts (one-off posts next to the countdown) use day_number 101+.
const isBonus = (s: Short) => s.day_number > 100

// ---------------------------------------------------------------- calendar
function CalendarStrip({ shorts }: { shorts: Short[] }) {
  // countdown rows only; bonus shorts (day 101+) share a date with one
  const byDate = useMemo(() => new Map(shorts.filter(s => !isBonus(s)).map(s => [s.post_date, s])), [shorts])
  const days = useMemo(() => {
    const start = new Date()
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i)
      return localISO(d)
    })
  }, [])
  const gaps = days.filter(d => !byDate.has(d)).length

  return (
    <div className="dash-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-whisper">Next 30 days</span>
        <span className={`text-[10px] font-mono uppercase tracking-widest ${gaps ? 'text-neon-pink' : 'text-[#3fd17a]'}`}>
          {gaps ? `${gaps} empty day${gaps === 1 ? '' : 's'}` : 'No gaps'}
        </span>
      </div>
      <div className="grid grid-cols-10 sm:grid-cols-15 gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))' }}>
        {days.map(d => {
          const s = byDate.get(d)
          const style = s ? STATUS_STYLE[s.status] : null
          return (
            <div
              key={d}
              title={`${fmtDay(d)}: ${s ? `${style!.label} · ${s.hook}` : 'nothing scheduled'}`}
              className={`rounded-md h-11 flex flex-col items-center justify-center font-mono text-[10px] leading-tight ${
                style ? style.cell : 'border border-dashed border-neon-pink/40 text-neon-pink/70'
              }`}
            >
              <span>{new Date(`${d}T12:00:00`).getDate()}</span>
              <span className="text-[8px] uppercase opacity-80">{style ? style.label.slice(0, 4) : 'gap'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- settings: posting account
// One optional label for where approved shorts get posted. It is written into
// the approvals-folder caption file and shown on approved cards. Nothing is
// ever posted automatically.
function PostingAccount({ account, onSave }: {
  account: Account | null
  onSave: (handle: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [handle, setHandle] = useState(account?.handle ?? '')
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <button onClick={() => { setHandle(account?.handle ?? ''); setEditing(true) }} style={{ minHeight: 44 }}
        className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors">
        Posting account: <span className="font-mono text-bright">{account?.handle ?? 'not set'}</span> · edit
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <input autoFocus value={handle} onChange={e => setHandle(e.target.value)} placeholder="@yourhandle (optional)"
        style={{ fontSize: 16, minHeight: 44 }} className={`${input} w-56`} />
      <button disabled={saving || !handle.trim()} style={{ minHeight: 44 }}
        onClick={async () => { setSaving(true); if (await onSave(handle)) setEditing(false); setSaving(false) }}
        className={`${btn} border-[#3fd17a]/40 text-[#3fd17a] hover:bg-[#3fd17a]/10`}>Save</button>
      <button onClick={() => setEditing(false)} style={{ minHeight: 44 }} className={`${btn} border-dash-border text-quiet hover:text-bright`}>Cancel</button>
    </div>
  )
}

// ---------------------------------------------------------------- revise: script editor
function RevisePanel({ short, busy, onSubmit, onCancel }: {
  short: Short
  busy: boolean
  onSubmit: (edits: { hook: string; voiceover: string; post_caption: string; hashtags: string; notes: string }) => void
  onCancel: () => void
}) {
  const [hook, setHook] = useState(short.hook)
  const [voiceover, setVoiceover] = useState(short.voiceover)
  const [caption, setCaption] = useState(short.post_caption ?? '')
  const [hashtags, setHashtags] = useState(short.hashtags ?? '')
  const [notes, setNotes] = useState('')
  const words = voiceover.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-2 border border-gta-gold/30 rounded-lg p-3 bg-gta-gold/[0.04]">
      <div className="text-[10px] font-mono uppercase tracking-widest text-gta-gold">Revise script · re-renders on next factory run</div>
      <input value={hook} onChange={e => setHook(e.target.value)} placeholder="HOOK" style={{ fontSize: 16, minHeight: 44 }} className={`${input} uppercase`} />
      <textarea value={voiceover} onChange={e => setVoiceover(e.target.value)} rows={5} style={{ fontSize: 16 }} className={input} />
      <div className={`text-[10px] font-mono ${words > 45 ? 'text-neon-pink' : 'text-whisper'}`}>{words} words (aim for 30–45)</div>
      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} placeholder="Post caption" style={{ fontSize: 16 }} className={input} />
      <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#GTA6 #GTAVI" style={{ fontSize: 16, minHeight: 44 }} className={input} />
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note (what changed or what's wrong, e.g. clip is too dark)" style={{ fontSize: 16, minHeight: 44 }} className={input} />
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => onSubmit({ hook, voiceover, post_caption: caption, hashtags, notes })}
          style={{ minHeight: 44 }}
          className={`${btn} flex-1 bg-gta-gold/20 text-gta-gold border-gta-gold/30 hover:bg-gta-gold/30 font-semibold`}
        >
          Send for revision
        </button>
        <button onClick={onCancel} style={{ minHeight: 44 }} className={`${btn} border-dash-border text-quiet hover:text-bright`}>Cancel</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- card
type Panel = 'revise' | 'reject' | null

const RETRY_TEXT = {
  same: 'Video deleted. Making a new one on the same subject with different footage…',
  new: 'Video deleted. Writing a new script on a new subject…',
}

function ShortCard({ short, busy, act }: {
  short: Short
  busy: boolean
  act: (s: Short, body: Record<string, unknown>) => Promise<boolean>
}) {
  const [panel, setPanel] = useState<Panel>(null)
  const [note, setNote] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const st = STATUS_STYLE[short.status]
  const copyText = [short.post_caption, short.hashtags].filter(Boolean).join(' ')
  const remaking = short.status === 'rejected' || short.status === 'regenerating'
  const postable = short.status === 'approved' || short.status === 'scheduled'

  const run = async (body: Record<string, unknown>) => {
    if (await act(short, body)) { setPanel(null); setNote(''); setPostUrl('') }
  }

  return (
    <div className={`dash-card overflow-hidden flex flex-col ${short.status === 'needs_revision' ? 'border-l-2 border-l-neon-pink' : ''}`}>
      <div className="bg-black aspect-[9/16] w-full">
        {short.video_url ? (
          <video src={short.video_url} controls preload="metadata" playsInline className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center px-6 text-whisper text-xs font-mono uppercase tracking-widest">
            {remaking ? (short.retry_mode === 'new' ? 'Writing a new subject…' : 'Making a new cut…')
              : short.status === 'needs_revision' ? 'Waiting for re-render'
              : short.status === 'rendering' ? 'Rendering…' : 'Not rendered yet'}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
          <span className="text-[10px] font-mono text-whisper">{isBonus(short) ? 'Bonus' : `Day ${short.day_number}`} · {fmtDay(short.post_date)}</span>
          {short.duration_s && <span className="text-[10px] font-mono text-whisper">{Math.round(short.duration_s)}s</span>}
        </div>

        <div className="font-heading font-bold text-bright text-lg leading-tight">{short.hook}</div>

        {short.linked_article && (
          <a href={`/${short.linked_article.category === 'guide' ? 'guides' : 'news'}/${short.linked_article.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-ice hover:underline truncate">
            → {short.linked_article.title}
          </a>
        )}

        {remaking && (
          <div className="text-xs text-neon-pink">{RETRY_TEXT[short.retry_mode ?? 'same']}</div>
        )}

        {postable && (
          <div className={`text-[11px] font-mono ${short.local_delivered_at ? 'text-[#3fd17a]' : 'text-whisper'}`}>
            {short.local_delivered_at ? '📁 In your approvals folder' : '⏳ Saving to your approvals folder…'}
            {short.tiktok_account && <span className="text-whisper"> · posting as {short.tiktok_account.handle}</span>}
          </div>
        )}

        {short.reviewer_notes && !remaking && (
          <div className="text-xs text-neon-pink bg-neon-pink/5 border border-neon-pink/20 rounded p-2">{short.reviewer_notes}</div>
        )}

        <button
          onClick={() => { navigator.clipboard.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="text-left text-xs text-quiet bg-dash-bg border border-dash-border rounded-lg p-2 hover:border-gta-gold/40 transition-colors"
          title="Click to copy caption + hashtags"
        >
          <span className="block text-[10px] font-mono uppercase tracking-widest mb-1 text-whisper">{copied ? '✓ Copied' : 'Caption · click to copy'}</span>
          {copyText}
        </button>

        {(short.tiktok_posted_at || short.youtube_posted_at) && (
          <div className="text-[11px] font-mono text-[#5a96ff] space-y-0.5">
            {short.tiktok_posted_at && <div>✓ Posted on TikTok {short.tiktok_url && <a href={short.tiktok_url} target="_blank" rel="noopener noreferrer" className="underline">link</a>}</div>}
            {short.youtube_posted_at && <div>✓ Posted on YouTube {short.youtube_url && <a href={short.youtube_url} target="_blank" rel="noopener noreferrer" className="underline">link</a>}</div>}
          </div>
        )}

        <div className="mt-auto space-y-2">
          {panel === 'revise' && (
            <RevisePanel short={short} busy={busy} onSubmit={e => run({ action: 'revise', ...e })} onCancel={() => setPanel(null)} />
          )}
          {panel === 'reject' && (
            <div className="space-y-2 border border-neon-pink/30 rounded-lg p-3 bg-neon-pink/[0.04]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-neon-pink">Reject: deletes this video and makes a new one</div>
              <input autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="What was wrong? (optional, helps the retry)" style={{ fontSize: 16, minHeight: 44 }} className={input} />
              <div className="flex gap-2 flex-wrap">
                <button disabled={busy} onClick={() => run({ action: 'reject', retry: 'same', notes: note })} style={{ minHeight: 44 }} className={`${btn} flex-1 bg-neon-pink/10 text-neon-pink border-neon-pink/30 hover:bg-neon-pink/20`}>Same subject, new footage</button>
                <button disabled={busy} onClick={() => run({ action: 'reject', retry: 'new', notes: note })} style={{ minHeight: 44 }} className={`${btn} flex-1 bg-neon-pink/10 text-neon-pink border-neon-pink/30 hover:bg-neon-pink/20`}>New subject</button>
              </div>
              <button onClick={() => setPanel(null)} style={{ minHeight: 44 }} className={`${btn} w-full border-dash-border text-quiet hover:text-bright`}>Cancel</button>
            </div>
          )}

          {panel === null && postable && (
            <div className="space-y-2 border border-[#5a96ff]/30 rounded-lg p-3 bg-[#5a96ff]/[0.04]">
              <input value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="Post link (optional)" style={{ fontSize: 16, minHeight: 44 }} className={input} />
              <div className="flex gap-2">
                {!short.tiktok_posted_at && (
                  <button disabled={busy} onClick={() => run({ action: 'mark_posted', platform: 'tiktok', url: postUrl })} style={{ minHeight: 44 }} className={`${btn} flex-1 border-[#5a96ff]/40 text-[#5a96ff] hover:bg-[#5a96ff]/10 font-semibold`}>Mark posted: TikTok</button>
                )}
                {!short.youtube_posted_at && (
                  <button disabled={busy} onClick={() => run({ action: 'mark_posted', platform: 'youtube', url: postUrl })} style={{ minHeight: 44 }} className={`${btn} flex-1 border-[#5a96ff]/40 text-[#5a96ff] hover:bg-[#5a96ff]/10 font-semibold`}>Mark posted: YouTube</button>
                )}
              </div>
            </div>
          )}

          {panel === null && (
            <div className="flex gap-2 flex-wrap">
              {short.status === 'pending_review' && (
                <button disabled={busy} onClick={() => run({ action: 'approve' })} style={{ minHeight: 44 }} className={`${btn} flex-1 bg-[#3fd17a]/20 text-[#3fd17a] border-[#3fd17a]/40 hover:bg-[#3fd17a]/30 font-semibold`}>✓ Approve</button>
              )}
              {['pending_review', 'approved'].includes(short.status) && (
                <button disabled={busy} onClick={() => setPanel('revise')} style={{ minHeight: 44 }} className={`${btn} border-gta-gold/40 text-gta-gold hover:bg-gta-gold/10`}>Revise</button>
              )}
              {['pending_review', 'needs_revision', 'approved'].includes(short.status) && (
                <button disabled={busy} onClick={() => setPanel('reject')} style={{ minHeight: 44 }} className={`${btn} bg-neon-pink/10 text-neon-pink border-neon-pink/30 hover:bg-neon-pink/20`}>✕ Reject</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- page
export default function ShortsQueue() {
  const [shorts, setShorts] = useState<Short[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending_review')
  const [busy, setBusy] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<{ type: OverlayType; reward?: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/shorts', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setShorts(data.shorts)
      setAccounts(data.accounts)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shorts')
    } finally {
      setLoading(false)
    }
  }, [])

  // ds_shorts is service-role only, so there is no browser realtime channel
  // like the article queue has -- poll instead, so a render finishing on the
  // factory (or a rejected short coming back remade) shows up on its own.
  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const act = useCallback(async (s: Short, body: Record<string, unknown>) => {
    setBusy(s.id)
    try {
      await postJSON(`/api/shorts/${s.id}/review`, body)
      if (body.action === 'approve') {
        soundManager.play(SoundEvents.ARTICLE_APPROVED)
        setOverlay({ type: 'mission-passed', reward: 'SENT TO APPROVALS FOLDER' })
      } else if (body.action === 'reject') {
        soundManager.play(SoundEvents.ARTICLE_REJECTED_SOFT, { volume: 0.4 })
        setOverlay({ type: 'wasted' })
      }
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
      return false
    } finally {
      setBusy(null)
    }
  }, [load])

  const savePostingAccount = useCallback(async (handle: string) => {
    try {
      await postJSON('/api/shorts/accounts', { platform: 'tiktok', handle })
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the posting account')
      return false
    }
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of shorts) c[s.status] = (c[s.status] ?? 0) + 1
    return c
  }, [shorts])

  const visible = filter === 'all' ? shorts
    : filter === 'rejected' ? shorts.filter(s => s.status === 'rejected' || s.status === 'regenerating')
    : shorts.filter(s => s.status === filter)
  const postingAccount = accounts.find(a => a.platform === 'tiktok') ?? null

  return (
    <>
      <GTAOverlay type={overlay?.type ?? null} reward={overlay?.reward} onDismiss={() => setOverlay(null)} />

      <div className="p-4 sm:p-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-pricedown text-gta-gold text-3xl leading-none">SHORTS QUEUE</h1>
            <p className="text-quiet text-sm mt-1">
              {loading ? 'Loading...' : `${counts.pending_review ?? 0} pending review · ${counts.approved ?? 0} approved, ready to post · ${(counts.rejected ?? 0) + (counts.regenerating ?? 0)} being remade`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{ minHeight: 44 }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === f.key ? 'border-gta-gold/60 text-gta-gold bg-gta-gold/10' : 'border-dash-border text-quiet hover:text-bright'
                }`}
              >
                {f.label}{f.key !== 'all' && counts[f.key] ? ` · ${counts[f.key]}` : ''}
              </button>
            ))}
            <button onClick={load} style={{ minHeight: 44 }} className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors">Refresh</button>
            <PostingAccount account={postingAccount} onSave={savePostingAccount} />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-xs text-neon-pink bg-neon-pink/5 border border-neon-pink/20 rounded p-3 flex justify-between gap-4">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-whisper hover:text-bright">dismiss</button>
          </div>
        )}

        <CalendarStrip shorts={shorts} />

        {!loading && visible.length === 0 && (
          <div className="dash-card p-12 text-center">
            <p className="text-quiet text-sm">
              {filter === 'pending_review' ? 'Nothing waiting for review. Run the factory to render the next batch.' : 'No shorts in this view.'}
            </p>
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {visible.map(s => (
            <ShortCard key={s.id} short={s} busy={busy === s.id} act={act} />
          ))}
        </div>
      </div>
    </>
  )
}
