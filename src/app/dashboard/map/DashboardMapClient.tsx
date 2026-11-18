'use client'

import { useState } from 'react'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { MapClientLoader } from '@/components/map/MapClientLoader'
import { STATUS_COLORS } from '@/components/map/LocationPanel'
import type { MapMarker, MapArea } from '@/lib/types'
import type { MapLayer } from '@/lib/map-layers'
import { MapLeadsPanel } from '@/components/map/MapLeadsPanel'
import type { MapLead } from '@/lib/map-leads'

interface LinkedArticleInfo {
  slug: string
  title: string
  category: string
}

interface Props {
  markers: MapMarker[]
  areas: MapArea[]
  layers: MapLayer[]
  linkedArticles: Record<string, LinkedArticleInfo>
  leads: MapLead[]
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  held: 'Held',
  community_reported: 'Community',
  verified: 'Verified',
  published: 'Published',
  rejected: 'Rejected',
  retired: 'Retired',
}

export function DashboardMapClient({ markers: initialMarkers, areas, layers, linkedArticles, leads }: Props) {
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
    <div className="p-4 sm:p-8 flex flex-col">
      <GTAOverlay type={overlay?.type ?? null} onDismiss={() => setOverlay(null)} />

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-pricedown text-gta-gold text-3xl leading-none">MAP CONTROL</h1>
          <p className="text-quiet text-sm mt-1">
            {markers.length} total markers across every status · pin colour = category, outer ring = status
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(['pending', 'held', 'community_reported', 'verified', 'published', 'rejected', 'retired'] as const).map(status => (
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


      <section className="mb-8">
        <h2 className="font-pricedown text-gta-gold text-2xl leading-none mb-1">LEADS <span className="text-quiet text-base">{leads.filter(l => l.status !== 'closed').length}</span></h2>
        <p className="text-quiet text-xs mb-4">Names we know are in the game but can&apos;t place yet. Searched first every scraper cycle.</p>
        <MapLeadsPanel initial={leads} />
      </section>

      <div className="h-[75vh] min-h-[480px]">
        <MapClientLoader
          markers={markers}
          areas={areas}
          layers={layers}
          linkedArticles={linkedArticles}
          showAllStatuses
          onMarkerReviewed={handleReviewed}
        />
      </div>
    </div>
  )
}
