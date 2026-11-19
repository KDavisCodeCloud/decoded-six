export interface FaqPair {
  question: string
  answer: string
}

export interface AffiliateLink {
  product_name: string
  url: string
  placement: string
}

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
  status: 'draft' | 'published' | 'archived' | 'pending_review' | 'needs_revision'
  ai_detect_score: number | null
  // Agent-generated fields (005_articles_agent_fields.sql)
  article_type: 'news' | 'evergreen' | 'conversion' | null
  publish_date: string | null
  faq_pairs: FaqPair[] | null
  internal_links_used: string[] | null
  external_citation: string | null
  affiliate_links: AffiliateLink[] | null
  schema_article: Record<string, unknown> | null
  schema_faq: Record<string, unknown> | null
  schema_breadcrumb: Record<string, unknown> | null
  word_count: number | null
  hitl_reviewer: string | null
  hitl_reviewed_at: string | null
  hitl_notes: string | null
  page_views: number
  affiliate_clicks: number
  // Visual strategy fields (007_media_assets.sql)
  featured_image_url: string | null
  featured_image_alt: string | null
  featured_image_credit: string | null
  featured_image_tier: 1 | 2 | 3 | null
  og_image_url: string | null
  // Template rotation (017_template_variant.sql) -- null on every pre-2026-09-14 row
  template_variant: 'A' | 'B' | 'C' | 'D' | null
}

export interface Rumor {
  id: string
  product_id: string
  title: string
  summary: string
  status: 'unconfirmed' | 'confirmed' | 'debunked'
  source_name: string | null
  source_url: string | null
  category: string | null
  last_updated: string
  created_at: string
}

export interface MediaAsset {
  id: string
  product_id: string
  name: string
  tier: 1 | 2 | 3
  category: string | null
  url: string
  alt_text: string
  credit: string | null
  width: number | null
  height: number | null
  best_use: string[] | null
  created_at: string
}

export interface MapMarker {
  id: string
  name: string
  description: string | null
  category: 'money_spot' | 'vehicle_spawn' | 'property' | 'heist' | 'mission_start' | 'weapon_pickup' | 'health_armor' | 'collectible' | 'landmark' | 'daily_location'
    | 'fuel_station' | 'store' | 'clothing' | 'fence' | 'gym' | 'safehouse' | 'hospital' | 'police_station'
    | 'side_activity' | 'street_race' | 'random_event'
    | 'nightclub' | 'bar' | 'fire_station' | 'liquor_store' | 'fast_food' | 'electronics' | 'convenience_store'
    | 'barber' | 'tattoo' | 'mod_shop'
  coordinates: { lat: number; lng: number }
  area_name: string | null
  payout_per_hour: number | null
  difficulty: 'solo' | 'small_crew' | 'full_crew' | null
  verified: boolean
  source: 'community' | 'agent_scraped' | 'manual' | 'import' | null
  linked_article_id: string | null
  status: 'pending' | 'held' | 'approved' | 'community_reported' | 'verified' | 'published' | 'rejected' | 'retired'
  daily_reset: boolean
  last_confirmed: string | null
  created_at: string
  updated_at: string
  submitted_ip: string | null
  submitted_source_url: string | null
  /** Canonical game-world position in meters within `frame` (migration 029). */
  x?: number | null
  y?: number | null
  frame?: string | null
  /** Provenance / verification (migration 031). */
  source_type?: 'gtadb_import' | 'scraper' | 'community_submission' | 'staff' | null
  source_urls?: string[]
  source_domains?: string[]
  license?: string | null
  attribution?: string | null
  confidence?: number | null
  independent_source_count?: number
  accuracy_radius_m?: number | null
  placement_method?: 'screenshot_match' | 'gazetteer' | 'hitl_manual' | 'import' | null
  county?: 'Mariana' | 'Vice-Dale' | 'Kelly' | 'Leonard' | 'Lummox' | null
  first_seen_at?: string | null
  verified_at?: string | null
  game_version?: 'pre_launch' | 'launch' | null
}

export interface MapArea {
  id: string
  name: string
  geojson: Record<string, unknown>
  color: string
  opacity: number
  created_at: string
  /** 'real_world_latlng' (legacy seed) or 'gtadb_world' meters (migration 029). */
  frame?: string
  /** 'label' = name only, geojson is a single Point. */
  kind?: 'polygon' | 'label'
  /** migration 031: 'county' | 'region' | 'gang_territory' */
  category?: string | null
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
