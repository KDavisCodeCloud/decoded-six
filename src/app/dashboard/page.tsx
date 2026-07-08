import { createClient } from '@/lib/supabase-server'

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [articles, gates, agentRuns] = await Promise.all([
    supabase.from('articles').select('id, status', { count: 'exact' })
      .eq('product_id', 'decodedsix'),
    supabase.from('monetization_gates').select('gate_id, status')
      .eq('product_id', 'decodedsix'),
    supabase.from('audit_log').select('id, created_at')
      .eq('product_id', 'decodedsix')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const pending = articles.data?.filter(a => a.status === 'draft').length ?? 0
  const published = articles.data?.filter(a => a.status === 'published').length ?? 0
  const gatesCleared = gates.data?.filter(g => g.status === 'cleared').length ?? 0
  const gatesToday = agentRuns.data?.length ?? 0

  return { pending, published, gatesCleared, gatesToday }
}

export default async function DashboardOverview() {
  const supabase = await createClient()
  const stats = await getStats(supabase).catch(() => ({
    pending: 0, published: 0, gatesCleared: 0, gatesToday: 0,
  }))

  const STATS = [
    { label: 'Queue',       value: stats.pending,      note: 'awaiting approval', color: 'text-gta-gold' },
    { label: 'Published',   value: stats.published,    note: 'articles live',     color: 'text-green-400' },
    { label: 'Gates',       value: `${stats.gatesCleared}/12`, note: 'cleared', color: 'text-ice' },
    { label: 'Agent Runs',  value: stats.gatesToday,   note: 'last 24h',          color: 'text-quiet' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-pricedown text-gta-gold text-3xl leading-none">MISSION CONTROL</h1>
        <p className="text-quiet text-sm mt-1">DecodedSix — Internal Dashboard</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map(s => (
          <div key={s.label} className="dash-card p-5">
            <div className={`font-pricedown text-4xl leading-none mb-1 ${s.color}`}>
              {s.value}
            </div>
            <div className="text-whisper text-xs uppercase tracking-widest">{s.label}</div>
            <div className="text-quiet text-xs mt-0.5">{s.note}</div>
          </div>
        ))}
      </div>

      {/* Phase tracker */}
      <div className="dash-card p-6 mb-6">
        <h2 className="font-heading font-bold text-bright text-sm uppercase tracking-widest mb-4">
          Build Phase
        </h2>
        <div className="space-y-3">
          {[
            { phase: 'Phase 1 — Foundation', done: true },
            { phase: 'Phase 2 — Public Site Shell', done: false },
            { phase: 'Phase 3 — Content Pipeline', done: false },
            { phase: 'Phase 4 — Internal Dashboard', done: false, active: true },
            { phase: 'Phase 5 — Interactive Map', done: false },
            { phase: 'Phase 6 — YouTube System', done: false },
            { phase: 'Phase 7 — Revenue Intelligence', done: false },
            { phase: 'Phase 8 — Launch Day (Nov 19 2026)', done: false },
          ].map(p => (
            <div key={p.phase} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                p.done ? 'bg-green-400' : p.active ? 'bg-gta-gold animate-pulse' : 'bg-dash-border'
              }`} />
              <span className={`text-sm ${
                p.done ? 'text-quiet line-through' : p.active ? 'text-gta-gold font-semibold' : 'text-whisper'
              }`}>
                {p.phase}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Launch countdown */}
      <div className="dash-card p-6">
        <h2 className="font-heading font-bold text-bright text-sm uppercase tracking-widest mb-2">
          Launch Target
        </h2>
        <div className="font-pricedown text-neon-pink text-2xl">November 19 2026</div>
        <p className="text-quiet text-xs mt-1">GTA 6 launch day — map goes live</p>
      </div>
    </div>
  )
}
