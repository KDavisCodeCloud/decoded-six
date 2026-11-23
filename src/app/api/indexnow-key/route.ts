// IndexNow key file (keyLocation in src/lib/indexnow.ts). Public by design.
export const dynamic = 'force-dynamic'

export function GET() {
  const key = process.env.INDEXNOW_KEY
  if (!key) return new Response('not configured', { status: 404 })
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
