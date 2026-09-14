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

interface LinkedArticleInfo {
  slug: string
  title: string
  category: string
}

interface DeepLinkView {
  lat: number
  lng: number
  zoom: number
}

interface Props {
  markers: MapMarker[]
  areas: MapArea[]
  linkedArticles?: Record<string, LinkedArticleInfo>
  showAllStatuses?: boolean
  onMarkerReviewed?: (id: string, action: 'approve' | 'retire') => void
  initialMarkerId?: string
  initialView?: DeepLinkView
  pickingLocation?: boolean
  onPickLocation?: (lat: number, lng: number) => void
}

export function MapClientLoader(props: Props) {
  return <LeafletMap {...props} />
}
