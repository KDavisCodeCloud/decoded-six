'use client'

import { useState } from 'react'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { MapClientLoader } from '@/components/map/MapClientLoader'
import { STATUS_COLORS } from '@/components/map/LocationPanel'
import type { MapMarker, MapArea } from '@/lib/types'

interface LinkedArticleInfo {
  slug: string
  title: string
  category: string
}

interface Props {
  markers: MapMarker[]
  areas: MapArea[]
  linkedArticles: Record<string, LinkedArticleInfo>
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  published: 'Published',
  retired: 'Retired',
}

export function DashboardMapClient({ markers: initialMarkers, areas, linkedArticles }: Props) {
  const [markers, setMarkers] = useState(initialMarkers)
  const [overlay, setOverlay] = useState<{ type: OverlayType } | null>(null)

  const counts = markers.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1
    return acc
  }, {})

  function handleReviewed(id: string, action: 'approve' | 'retire') {
    setMarkers(prev => prev.map(m =>
      m.id === id ? { ...m, status: action === 'approve' ? 'published' : 'retired' } : m
    ))
    setOverlay({ type: action === 'approve' ? 'mission-passed' : 'wasted' })
  }

  return (
    <div className="p-4 sm:p-8 flex flex-col h-screen">
      <GTAOverlay type={overlay?.type ?? null} onDismiss={() => setOverlay(null)} />

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-pricedown text-gta-gold text-3xl leading-none">MAP CONTROL</h1>
          <p className="text-quiet text-sm mt-1">
            {markers.length} total markers across every status
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(['pending', 'approved', 'published', 'retired'] as const).map(status => (
            <div key={status} className="flex items-center gap-1.5 text-xs font-mono">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: STATUS_COLORS[status] }}
              />
              <span className="text-quiet">{STATUS_LABEL[status]}</span>
              <span className="text-whisper">{counts[status] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <MapClientLoader
          markers={markers}
          areas={areas}
          linkedArticles={linkedArticles}
          showAllStatuses
          onMarkerReviewed={handleReviewed}
        />
      </div>
    </div>
  )
}
