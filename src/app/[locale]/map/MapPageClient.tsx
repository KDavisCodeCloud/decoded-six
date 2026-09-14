'use client'

import { useState } from 'react'
import { MapClientLoader } from '@/components/map/MapClientLoader'
import { SubmitLocationForm } from '@/components/map/SubmitLocationForm'
import type { MapMarker, MapArea } from '@/lib/types'

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
  linkedArticles: Record<string, LinkedArticleInfo>
  initialMarkerId?: string
  initialView?: DeepLinkView
}

export function MapPageClient({ markers, areas, linkedArticles, initialMarkerId, initialView }: Props) {
  const [picking, setPicking] = useState(false)
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null)

  return (
    <div className="relative flex-1" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
      <MapClientLoader
        markers={markers}
        areas={areas}
        linkedArticles={linkedArticles}
        initialMarkerId={initialMarkerId}
        initialView={initialView}
        pickingLocation={picking}
        onPickLocation={(lat, lng) => {
          setPickedCoords({ lat, lng })
          setPicking(false)
        }}
      />

      <div className="absolute bottom-4 right-4 z-[1300] w-72">
        <SubmitLocationForm
          mapLive
          pickedCoords={pickedCoords}
          picking={picking}
          onStartPicking={() => { setPickedCoords(null); setPicking(true) }}
          onCancelPicking={() => setPicking(false)}
        />
      </div>
    </div>
  )
}
