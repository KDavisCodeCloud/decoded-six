import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MapPlaceholder } from '@/components/map/MapPlaceholder'
import { MapClientLoader } from '@/components/map/MapClientLoader'
import { supabase } from '@/lib/supabase'
import type { MapMarker, MapArea } from '@/lib/types'

export const revalidate = 300

async function getMapData() {
  const [{ data: markers }, { data: areas }] = await Promise.all([
    supabase
      .from('map_markers')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    supabase
      .from('map_areas')
      .select('*')
      .order('name', { ascending: true }),
  ])
  return {
    markers: (markers as MapMarker[] | null) ?? [],
    areas: (areas as MapArea[] | null) ?? [],
  }
}

export default async function MapPage() {
  const mapLive = process.env.NEXT_PUBLIC_MAP_LIVE === 'true'

  if (!mapLive) {
    return (
      <>
        <Header />
        <main className="container py-16">
          <MapPlaceholder />
        </main>
        <Footer />
      </>
    )
  }

  const { markers, areas } = await getMapData()

  return (
    <>
      <Header />
      <main className="container py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-0.5 h-5 bg-flame rounded-full" />
          <h1 className="font-heading font-bold text-lg text-bright uppercase tracking-widest">
            Interactive Map
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-xs font-mono text-quiet">
              {markers.length} locations live
            </span>
          </div>
        </div>

        <div className="flex-1" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
          <MapClientLoader markers={markers} areas={areas} />
        </div>
      </main>
      <Footer />
    </>
  )
}
