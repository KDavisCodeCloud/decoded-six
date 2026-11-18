'use client'

import { useState } from 'react'
import { MapClientLoader } from '@/components/map/MapClientLoader'
import { SubmitLocationForm } from '@/components/map/SubmitLocationForm'
import type { MapMarker, MapArea } from '@/lib/types'
import type { MapLayer } from '@/lib/map-layers'
import type { PickedPoint } from '@/components/map/LeafletMap'

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
  layers: MapLayer[]
  linkedArticles: Record<string, LinkedArticleInfo>
  initialMarkerId?: string
  initialView?: DeepLinkView
}

export function MapPageClient({ markers, areas, layers, linkedArticles, initialMarkerId, initialView }: Props) {
  const [picking, setPicking] = useState(false)
  const [pickedCoords, setPickedCoords] = useState<PickedPoint | null>(null)

  return (
    <div className="relative flex-1 md:h-[calc(100vh-200px)] md:min-h-[500px]">
      <MapClientLoader
        markers={markers}
        areas={areas}
        layers={layers}
        linkedArticles={linkedArticles}
        initialMarkerId={initialMarkerId}
        initialView={initialView}
        pickingLocation={picking}
        onPickLocation={(p) => {
          setPickedCoords(p)
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
