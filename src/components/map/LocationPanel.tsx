'use client'

import type { MapMarker } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from './MarkerPopup'

export const STATUS_COLORS: Record<string, string> = {
  pending: '#f5a623',
  approved: '#5a96ff',
  published: '#3fd17a',
  retired: '#5a5270',
}

interface LinkedArticleInfo {
  slug: string
  title: string
  category: string
}

interface LocationPanelProps {
  marker: MapMarker | null
  onClose: () => void
  linkedArticle?: LinkedArticleInfo | null
  showAllStatuses?: boolean
  processing?: boolean
  onApprove?: () => void
  onRetire?: () => void
}

function articleHref(article: LinkedArticleInfo): string {
  return article.category === 'guide' ? `/guides/${article.slug}` : `/news/${article.slug}`
}

export function LocationPanel({
  marker,
  onClose,
  linkedArticle,
  showAllStatuses,
  processing,
  onApprove,
  onRetire,
}: LocationPanelProps) {
  if (!marker) return null

  const color = CATEGORY_COLORS[marker.category] ?? '#9b94b8'
  const label = CATEGORY_LABELS[marker.category] ?? marker.category
  const statusColor = STATUS_COLORS[marker.status] ?? '#9b94b8'

  return (
    <>
      {/* Mobile scrim */}
      <div
        className="md:hidden fixed inset-0 z-[1400] bg-black/50"
        onClick={onClose}
      />

      <aside
        className="
          fixed z-[1500] bg-panel border border-white/[0.08] overflow-y-auto
          left-0 right-0 bottom-0 rounded-t-2xl max-h-[75vh]
          md:left-auto md:right-4 md:top-4 md:bottom-4 md:w-80 md:rounded-2xl md:max-h-none
          animate-in fade-in slide-in-from-bottom-4 duration-200
        "
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
              />
              <span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {label}
              </span>
              {marker.verified && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-green/10 text-green font-mono">
                  verified
                </span>
              )}
              {showAllStatuses && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                  style={{ background: `${statusColor}22`, color: statusColor }}
                >
                  {marker.status}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-whisper hover:text-bright text-xl leading-none shrink-0"
              style={{ minWidth: 32, minHeight: 32 }}
            >
              ×
            </button>
          </div>

          <h2 className="font-heading font-bold text-bright text-lg mb-2">{marker.name}</h2>

          {marker.description && (
            <p className="text-quiet text-sm leading-relaxed mb-4">{marker.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs font-mono mb-4">
            {marker.payout_per_hour != null && (
              <span className="text-green">${(marker.payout_per_hour / 1000).toFixed(1)}K/hr</span>
            )}
            {marker.difficulty && (
              <span className="text-quiet capitalize">{marker.difficulty.replace(/_/g, ' ')}</span>
            )}
            {marker.area_name && <span className="text-whisper">{marker.area_name}</span>}
          </div>

          {linkedArticle && (
            <a
              href={articleHref(linkedArticle)}
              className="block text-xs px-3 py-2 rounded-lg border border-ice/30 text-ice hover:bg-ice/10 transition-colors mb-4"
            >
              📄 {linkedArticle.title} →
            </a>
          )}

          {marker.source === 'community' && (
            <p className="text-[10px] text-whisper mb-4">Submitted by the community.</p>
          )}

          {showAllStatuses && (
            <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
              {marker.status !== 'published' && (
                <button
                  onClick={onApprove}
                  disabled={processing}
                  style={{ minHeight: 44 }}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#3fd17a]/15 text-[#3fd17a] border border-[#3fd17a]/40 hover:bg-[#3fd17a]/25 disabled:opacity-40 transition-colors font-semibold"
                >
                  ✓ Approve
                </button>
              )}
              {marker.status !== 'retired' && (
                <button
                  onClick={onRetire}
                  disabled={processing}
                  style={{ minHeight: 44 }}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-neon-pink/10 text-neon-pink border border-neon-pink/30 hover:bg-neon-pink/20 disabled:opacity-40 transition-colors"
                >
                  Retire
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
