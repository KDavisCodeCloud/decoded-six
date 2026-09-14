import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const RATE_LIMIT_PER_HOUR = 5
const VALID_CATEGORIES = [
  'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start',
  'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location',
]

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    name?: string
    category?: string
    description?: string
    lat?: number
    lng?: number
    source_url?: string
    website?: string // honeypot -- real users never see or fill this field
  } | null

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Honeypot: a bot filling every field (including hidden ones) gets a fake
  // success response instead of an error, so it doesn't learn to skip the field.
  if (body.website) {
    return NextResponse.json({ success: true, marker_id: null })
  }

  const name = (body.name ?? '').trim()
  const category = body.category ?? ''
  const description = (body.description ?? '').trim()

  if (!name || name.length > 200) {
    return NextResponse.json({ error: 'Location name is required (max 200 characters)' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (description.length > 2000) {
    return NextResponse.json({ error: 'Description too long (max 2000 characters)' }, { status: 400 })
  }

  const hasCoords = typeof body.lat === 'number' && typeof body.lng === 'number'
    && Number.isFinite(body.lat) && Number.isFinite(body.lng)

  const ip = clientIp(request)

  // Service role: needed for the rate-limit read (querying by IP isn't
  // something the anon RLS policy should ever allow -- it would leak
  // other submitters' activity to any anonymous client). The insert itself
  // still only ever writes status='pending'/source='community', identical
  // to what the RLS policy (018_map_community_submissions.sql) would allow
  // an anon client to do directly -- this route doesn't grant itself any
  // extra privilege, it just adds the IP-based rate limit RLS can't express.
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  if (ip !== 'unknown') {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await sb
      .from('map_markers')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_ip', ip)
      .eq('source', 'community')
      .gte('created_at', oneHourAgo)

    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many submissions from this network in the last hour. Try again later.' },
        { status: 429 },
      )
    }
  }

  const { data, error } = await sb
    .from('map_markers')
    .insert({
      product_id: 'gta-hub',
      name,
      description: description || null,
      category,
      coordinates: hasCoords ? { lat: body.lat, lng: body.lng } : { lat: 0, lng: 0 },
      source: 'community',
      status: 'pending',
      verified: false,
      submitted_ip: ip === 'unknown' ? null : ip,
      submitted_source_url: body.source_url?.trim().slice(0, 500) || null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sb.from('audit_log').insert({
    agent_id: 'dsx-map-community',
    action: 'map_marker_submitted',
    marker_id: data.id,
    result: 'success',
    error: null,
  })

  return NextResponse.json({ success: true, marker_id: data.id })
}
