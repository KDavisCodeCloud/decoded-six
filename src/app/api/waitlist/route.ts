import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function writeAuditLog(
  db: ReturnType<typeof getAdminClient>,
  result: 'success' | 'error',
  error?: string,
) {
  await db.from('audit_log').insert({
    agent_id: 'api_waitlist',
    action: 'waitlist_signup',
    result,
    error: error ?? null,
  })
}

export async function POST(request: Request) {
  let email: string | undefined

  try {
    const body = await request.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const db = getAdminClient()

  const { error: insertError } = await db
    .from('waitlist_emails')
    .insert({ email, product_id: 'decodedsix' })

  if (insertError) {
    const isDuplicate = insertError.code === '23505'
    const message = isDuplicate
      ? "You're already on the waitlist!"
      : 'Something went wrong. Try again.'

    await writeAuditLog(db, 'error', insertError.message)
    return NextResponse.json({ error: message }, { status: isDuplicate ? 409 : 500 })
  }

  await writeAuditLog(db, 'success')
  return NextResponse.json({ success: true })
}
