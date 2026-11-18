import type { MapMarker } from '@/lib/types'
import { CATEGORY_COLOR_BY_KEY } from '@/lib/map-categories'

export const CATEGORY_LABELS: Record<string, string> = {
  money_spot: 'Money Spot',
  vehicle_spawn: 'Vehicle Spawn',
  property: 'Property',
  heist: 'Heist',
  mission_start: 'Mission Start',
  weapon_pickup: 'Weapon',
  health_armor: 'Health / Armor',
  collectible: 'Collectible',
  landmark: 'Landmark',
  daily_location: 'Daily Location',
  fuel_station: 'Gas Station',
  store: 'Store',
  clothing: 'Clothing Store',
  fence: 'Fence',
  gym: 'Gym',
  safehouse: 'Safehouse',
  hospital: 'Hospital',
  police_station: 'Police Station',
  side_activity: 'Side Activity',
  street_race: 'Street Race',
  random_event: 'Random Event',
}

export const CATEGORY_COLORS: Record<string, string> = CATEGORY_COLOR_BY_KEY

interface MarkerPopupProps {
  marker: MapMarker
}

export function MarkerPopup({ marker }: MarkerPopupProps) {
  const gtadb = marker.source_type === 'gtadb_import'
  const color = CATEGORY_COLORS[marker.category] ?? '#ffffff'
  const label = CATEGORY_LABELS[marker.category] ?? marker.category

  return (
    <div style={{ minWidth: 200, fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, flexShrink: 0, display: 'inline-block',
        }} />
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>
          {label}
        </span>
        {marker.verified && (
          <span style={{
            marginLeft: 'auto', fontSize: 9, padding: '2px 6px',
            background: '#3fd17a18', color: '#3fd17a', borderRadius: 4,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            verified
          </span>
        )}
      </div>

      <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#f0eef8' }}>
        {marker.name}
      </h3>

      {gtadb && (
        <div style={{ margin: '0 0 6px' }}>
          <span title={marker.attribution ?? 'GTA VI Landmarks Data (CC BY 4.0)'} style={{
            fontSize: 9, padding: '2px 6px', background: '#5a96ff18', color: '#5a96ff', borderRadius: 4,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            Community-mapped (gtadb)
          </span>
          <a href="https://map.gtadb.org" target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 6, fontSize: 9, color: '#5a5270', fontFamily: 'JetBrains Mono, monospace' }}>
            gtadb.org · CC BY 4.0
          </a>
        </div>
      )}

      {/* gtadb descriptions are raw tag lists ("gtadb tags: ..."), not prose */}
      {marker.description && !gtadb && (
        <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9b94b8', lineHeight: 1.5 }}>
          {marker.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#5a5270' }}>
        {marker.payout_per_hour != null && (
          <span style={{ color: '#3fd17a' }}>
            ${(marker.payout_per_hour / 1000).toFixed(0)}K/hr
          </span>
        )}
        {marker.difficulty && (
          <span>{marker.difficulty.replace(/_/g, ' ')}</span>
        )}
        {marker.area_name && <span>{marker.area_name}</span>}
      </div>
    </div>
  )
}
