import type { MapMarker } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
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
}

export const CATEGORY_COLORS: Record<string, string> = {
  money_spot: '#3fd17a',
  vehicle_spawn: '#5a96ff',
  property: '#C8A84B',
  heist: '#f5a623',
  mission_start: '#FF2D6B',
  weapon_pickup: '#e6358a',
  health_armor: '#00d2ff',
  collectible: '#ffcc00',
  landmark: '#9b94b8',
  daily_location: '#3fd17a',
}

interface MarkerPopupProps {
  marker: MapMarker
}

export function MarkerPopup({ marker }: MarkerPopupProps) {
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

      {marker.description && (
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
