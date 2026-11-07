import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase-server'

// Shorts queue (025_shorts_queue.sql). Every ds_short* table is service-role
// only, so the dashboard never touches them from the browser: reads and status
// changes all go through /api/shorts/*, which check the Supabase session the
// same way api/articles/[id]/review does before using the service role.

export const SHORTS_BUCKET = 'shorts'
export const SIGNED_URL_SECONDS = 60 * 60

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Signed-in reviewer's email/id, or null if there is no session. */
export async function currentReviewer(): Promise<string | null> {
  const auth = await createAuthClient()
  const { data: { user } } = await auth.auth.getUser()
  return user ? (user.email ?? user.id) : null
}

export async function auditShort(
  sb: SupabaseClient,
  shortId: string | null,
  action: string,
  result: string,
  error: string | null = null,
) {
  await sb.from('audit_log').insert({
    agent_id: 'dsx-hitl-dashboard',
    action,
    short_id: shortId,
    result,
    error,
  })
}
