'use client'

import type { MapMarker } from '@/lib/types'

interface DailyTrackerProps {
  markers: MapMarker[]
}

export function DailyTracker({ markers }: DailyTrackerProps) {
  const daily = markers.filter(m => m.daily_reset)

  return (
    <div className="bg-panel border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
        <span className="text-[10px] font-mono text-quiet uppercase tracking-widest">
          Daily Resets
        </span>
        {daily.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-whisper">
            {daily.length}
          </span>
        )}
      </div>

      {daily.length === 0 ? (
        <p className="text-[11px] text-whisper italic">No daily locations yet</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {daily.slice(0, 6).map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-green flex-shrink-0" />
              <span className="text-[11px] text-quiet truncate">{m.name}</span>
              {m.payout_per_hour != null && (
                <span className="ml-auto text-[10px] font-mono text-green flex-shrink-0">
                  ${(m.payout_per_hour / 1000).toFixed(0)}K
                </span>
              )}
            </div>
          ))}
          {daily.length > 6 && (
            <p className="text-[10px] text-whisper mt-1">
              +{daily.length - 6} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}
