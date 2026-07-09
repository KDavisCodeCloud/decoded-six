'use client'

import dynamic from 'next/dynamic'
import type { MapMarker, MapArea } from '@/lib/types'

const LeafletMap = dynamic(
  () => import('@/components/map/LeafletMap').then(m => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 rounded-xl bg-panel border border-white/[0.06] animate-pulse" />
    ),
  }
)

interface Props {
  markers: MapMarker[]
  areas: MapArea[]
}

export function MapClientLoader({ markers, areas }: Props) {
  return <LeafletMap markers={markers} areas={areas} />
}
