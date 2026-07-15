import { NextResponse } from 'next/server'

interface CheckResult {
  name: string
  url: string
  up: boolean
  statusCode: number | null
  responseMs: number | null
  error: string | null
}

async function check(name: string, url: string): Promise<CheckResult> {
  const start = Date.now()
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(8000) })
    return {
      name,
      url,
      up: res.ok,
      statusCode: res.status,
      responseMs: Date.now() - start,
      error: null,
    }
  } catch (err) {
    return {
      name,
      url,
      up: false,
      statusCode: null,
      responseMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'unreachable',
    }
  }
}

// Real, live checks each time this is called — not cached, not mocked.
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'
  const apiUrl = process.env.DECODEDSIX_API_URL || 'https://decoded-six-production.up.railway.app'

  const [site, api] = await Promise.all([
    check('Public site', siteUrl),
    check('FastAPI backend', `${apiUrl}/health`),
  ])

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    checks: [site, api],
  })
}
