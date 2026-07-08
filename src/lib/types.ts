export interface Article {
  id: string
  product_id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  source_url: string | null
  source_name: string | null
  category: 'news' | 'rumor' | 'guide' | 'event' | 'update'
  published_at: string
  created_at: string
  agent_generated: boolean
  status: 'draft' | 'published' | 'archived'
}

export interface MapMarker {
  id: string
  name: string
  description: string | null
  category: 'money_spot' | 'vehicle_spawn' | 'property' | 'heist' | 'mission_start' | 'weapon_pickup' | 'health_armor' | 'collectible' | 'landmark' | 'daily_location'
  coordinates: { lat: number; lng: number }
  area_name: string | null
  payout_per_hour: number | null
  difficulty: 'solo' | 'small_crew' | 'full_crew' | null
  verified: boolean
  source: 'community' | 'agent_scraped' | 'manual' | null
  status: 'pending' | 'approved' | 'published' | 'retired'
  daily_reset: boolean
  last_confirmed: string | null
  created_at: string
  updated_at: string
}

export interface MapArea {
  id: string
  name: string
  geojson: Record<string, unknown>
  color: string
  opacity: number
  created_at: string
}

export interface Vehicle {
  id: string
  product_id: string
  name: string
  category: string
  top_speed: number | null
  acceleration: number | null
  handling: number | null
  braking: number | null
  image_url: string | null
  price_legit: number | null
  price_shark_card: number | null
  dlc_name: string | null
  created_at: string
}

export interface WeeklyEvent {
  id: string
  product_id: string
  week_start: string
  week_end: string
  title: string
  content: Record<string, unknown>
  bonuses: Record<string, unknown>[]
  discounts: Record<string, unknown>[]
  published: boolean
  created_at: string
}

export interface AgentLog {
  id: string
  product_id: string
  agent_name: string
  status: 'running' | 'success' | 'error' | 'skipped'
  records_processed: number
  error_message: string | null
  started_at: string
  completed_at: string | null
}
