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
  product_id: string
  title: string
  description: string | null
  marker_type: string
  lat: number
  lng: number
  icon: string | null
  verified: boolean
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
