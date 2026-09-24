// Read-only visibility into the pre-generation dedup gate (dedup_gate.py) --
// no actions here by design (per spec): this is so a blocked attempt is
// visible instead of silently vanishing, and so false positives are easy to
// spot, not a review queue. A gate re-run happens by resubmitting the topic
// through its original entry point, not from here.

export interface BlockedGeneration {
  id: string
  topic: string
  matched_slugs: string[]
  reason: string
  created_at: string
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function BlockedGenerationsSection({ blocked }: { blocked: BlockedGeneration[] }) {
  if (blocked.length === 0) return null

  return (
    <div className="px-8 pt-4">
      <div className="dash-card p-5 mb-2 border-neon-pink/20">
        <h2 className="font-pricedown text-neon-pink text-xl leading-none">BLOCKED (DUPLICATE)</h2>
        <p className="text-quiet text-xs mt-1 mb-4">
          {blocked.length} generation attempt{blocked.length === 1 ? '' : 's'} the dedup gate refused before any article was written — visibility only, spot false positives here
        </p>

        <div className="space-y-2">
          {blocked.map(b => (
            <div key={b.id} className="rounded-xl border border-dash-border p-4" style={{ background: '#0d0d0d' }}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-heading font-bold text-bright text-sm leading-snug">{b.topic}</h3>
                <span className="text-[10px] text-whisper whitespace-nowrap">{timeAgo(b.created_at)}</span>
              </div>
              <p className="text-quiet text-xs leading-relaxed mb-2">{b.reason}</p>
              {b.matched_slugs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {b.matched_slugs.map(slug => (
                    <span
                      key={slug}
                      className="text-[10px] font-mono text-ice border border-ice/30 px-1.5 py-0.5 rounded"
                    >
                      {slug}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
