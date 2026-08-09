import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { Rumor } from '@/lib/types'

export const revalidate = 60

export const metadata = {
  title: 'GTA 6 Rumors',
  description: 'Unconfirmed GTA 6 leaks, insider reports, and speculation — tracked and verified as Rockstar confirms details.',
  alternates: { canonical: '/rumors' },
}

type StatusFilter = 'all' | 'unconfirmed' | 'confirmed' | 'debunked'

const STATUS_COLOR: Record<Rumor['status'], string> = {
  unconfirmed: '#f0975a',
  confirmed: '#3fd17a',
  debunked: '#FF2D6B',
}

const STATUS_LABEL: Record<Rumor['status'], string> = {
  unconfirmed: 'Unconfirmed',
  confirmed: 'Confirmed',
  debunked: 'Debunked',
}

async function getRumors(status: StatusFilter): Promise<Rumor[]> {
  let query = supabase
    .from('rumors')
    .select('*')
    .eq('product_id', 'gta-hub')
    .order('last_updated', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data } = await query
  return (data as Rumor[]) ?? []
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function RumorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: rawStatus } = await searchParams
  const status: StatusFilter =
    rawStatus === 'unconfirmed' || rawStatus === 'confirmed' || rawStatus === 'debunked' ? rawStatus : 'all'

  const rumors = await getRumors(status)

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unconfirmed', label: 'Unconfirmed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'debunked', label: 'Debunked' },
  ]

  return (
    <>
      <Header />

      {/* Page hero */}
      <div
        className="relative overflow-hidden border-b border-white/[0.06]"
        style={{ background: 'linear-gradient(to bottom, #110a14, #0a0a0a)', minHeight: '22vh' }}
      >
        <div className="container py-12">
          <p className="font-ibm text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: '#f0975a' }}>
            Rumor Tracker
          </p>
          <h1 className="font-heading font-black text-bright leading-tight mb-3"
              style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            Rumor Mill
          </h1>
          <p className="text-quiet text-[15px] max-w-xl">
            Leaks, insider reports, and speculation tracked in real time. Every entry gets flipped to confirmed or debunked the moment Rockstar speaks — never presented as fact until then.
          </p>
        </div>
      </div>

      <div className="container py-12">
        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-white/[0.06]">
          <span className="text-whisper text-xs font-ibm uppercase tracking-widest mr-2">Filter:</span>
          {FILTERS.map(f => (
            <a
              key={f.key}
              href={f.key === 'all' ? '/rumors' : `/rumors?status=${f.key}`}
              className="px-3 py-1.5 rounded-full text-xs font-bold font-ibm uppercase tracking-wide transition-colors"
              style={
                status === f.key
                  ? { background: f.key === 'all' ? '#ffffff1a' : STATUS_COLOR[f.key as Rumor['status']], color: f.key === 'all' ? '#fff' : '#070910' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.12)' }
              }
            >
              {f.label}
            </a>
          ))}
        </div>

        {rumors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rumors.map(r => (
              <div
                key={r.id}
                className="rounded-xl border border-white/[0.06] p-5"
                style={{ background: '#0d0d0d' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: STATUS_COLOR[r.status] }}
                  />
                  <span className="text-xs font-ibm font-bold uppercase tracking-wider" style={{ color: STATUS_COLOR[r.status] }}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.category && (
                    <span className="text-whisper text-xs font-ibm uppercase tracking-wide">· {r.category}</span>
                  )}
                  <span className="text-whisper text-xs ml-auto">{fmtDate(r.last_updated)}</span>
                </div>
                <h3 className="font-heading font-bold text-bright text-lg leading-snug mb-2">{r.title}</h3>
                <p className="text-quiet text-sm leading-relaxed mb-3">{r.summary}</p>
                {r.source_name && (
                  <p className="text-whisper text-xs">Source: {r.source_name}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="text-5xl mb-5">📡</div>
            <h2 className="font-heading font-bold text-bright text-xl mb-3">No {status !== 'all' ? STATUS_LABEL[status as Rumor['status']].toLowerCase() : ''} rumors right now</h2>
            <p className="text-quiet text-sm max-w-sm mx-auto">
              Check back soon, or browse everything we&apos;re tracking.
            </p>
            <a
              href="/rumors"
              className="inline-block mt-6 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: '#ec1272' }}
            >
              View All Rumors
            </a>
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}
