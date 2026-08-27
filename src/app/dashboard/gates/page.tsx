import { createClient } from '@/lib/supabase-server'
import { UTILITY_PAGE_SLUGS } from '@/lib/article-utils'

const GATE_DEFS = [
  { id: 'GATE_1',   label: 'Gate 1',    desc: '20 articles published → Apply AdSense' },
  { id: 'GATE_2',   label: 'Gate 2',    desc: 'AdSense approved → Affiliate links live' },
  { id: 'GATE_B',   label: 'Gate B',    desc: '25K sessions/month → Secretlab, NordVPN, Razer' },
  { id: 'GATE_3',   label: 'Gate 3',    desc: '1K daily sessions × 7 days → Apply Ezoic Incubator' },
  { id: 'GATE_4',   label: 'Gate 4',    desc: '5K daily sessions → 4 articles/day + video pipeline' },
  { id: 'GATE_5',   label: 'Gate 5',    desc: '250K monthly users → Ezoic full platform' },
  { id: 'GATE_6',   label: 'Gate 6',    desc: '50K monthly sessions → Mediavine / Raptive' },
  { id: 'GATE_7',   label: 'Gate 7',    desc: '$500/month affiliate → A/B test placements' },
  { id: 'GATE_8',   label: 'Gate 8',    desc: '$1,500/month combined → Brand deal outreach' },
  { id: 'GATE_YT1', label: 'Gate YT1', desc: '1K subscribers → YouTube Partner Program' },
  { id: 'GATE_YT2', label: 'Gate YT2', desc: '10K subscribers → Pitch sponsorships' },
  { id: 'GATE_D1',  label: 'Gate D1',  desc: '10K monthly sessions → Discord paid tier' },
]

interface GateRow {
  gate_id: string
  status: string
  current_value: number | null
  target_value: number | null
  unlocked_at: string | null
}

export default async function GatesPage() {
  const supabase = await createClient()

  // The 'monetization_gates' table this page was built to read does not
  // exist in the database (confirmed 2026-08-27 -- PostgREST schema-cache
  // error, no migration ever created it, nothing else in the codebase
  // writes to it). Every gate silently showed 0 progress regardless of
  // real state as a result -- including Gate 1, whose actual condition (20
  // articles published) had already been cleared for a while by the time
  // this was caught. Rather than stand up a table + a sync mechanism for
  // one gate, Gate 1 is now computed live from `articles` here, the same
  // definition /dashboard's overview and /dashboard/content use
  // (product_id='gta-hub', status='published', minus UTILITY_PAGE_SLUGS).
  // Gates 2-12 still depend on data this app doesn't track anywhere yet
  // (AdSense approval, session counts, affiliate revenue) -- they keep
  // reading the missing table for now and will keep showing 0/pending
  // until that's built; that's real remaining scope, not fixed here.
  let gateRows: GateRow[] = []
  try {
    const { data } = await supabase
      .from('monetization_gates')
      .select('gate_id, status, current_value, target_value, unlocked_at')
      .eq('product_id', 'decodedsix')
    gateRows = (data as GateRow[]) ?? []
  } catch {
    // Table doesn't exist / DB not yet connected — show empty state for
    // whichever gates aren't overridden below.
  }

  const gateMap = new Map<string, GateRow>(gateRows.map(g => [g.gate_id, g]))

  const { data: articleRows } = await supabase
    .from('articles')
    .select('id, slug, status')
    .eq('product_id', 'gta-hub')
  const publishedEditorialCount = (articleRows ?? []).filter(
    a => a.status === 'published' && !UTILITY_PAGE_SLUGS.has(a.slug)
  ).length
  const GATE_1_TARGET = 20
  gateMap.set('GATE_1', {
    gate_id: 'GATE_1',
    status: publishedEditorialCount >= GATE_1_TARGET ? 'cleared' : 'pending',
    current_value: publishedEditorialCount,
    target_value: GATE_1_TARGET,
    unlocked_at: gateMap.get('GATE_1')?.unlocked_at ?? null,
  })

  const cleared = GATE_DEFS.filter(g => gateMap.get(g.id)?.status === 'cleared').length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-pricedown text-gta-gold text-3xl leading-none">GATE TRACKER</h1>
        <p className="text-quiet text-sm mt-1">{cleared} of 12 gates cleared</p>
      </div>

      {/* Progress bar */}
      <div className="dash-card p-4 mb-8">
        <div className="flex items-center justify-between text-xs text-quiet mb-2">
          <span>Progress</span>
          <span className="text-gta-gold font-semibold">{Math.round((cleared / 12) * 100)}%</span>
        </div>
        <div className="h-2 bg-dash-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gta-gold rounded-full transition-all duration-700"
            style={{ width: `${(cleared / 12) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {GATE_DEFS.map((gate, i) => {
          const row = gateMap.get(gate.id)
          const status = row?.status ?? 'pending'
          const current = row?.current_value ?? 0
          const target = row?.target_value ?? 0
          const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

          return (
            <div
              key={gate.id}
              className={`dash-card p-5 transition-colors ${
                status === 'cleared' ? 'border-green-500/30' :
                i === cleared ? 'border-gta-gold/30' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  status === 'cleared'
                    ? 'bg-green-500/20 text-green-400'
                    : i === cleared
                    ? 'bg-gta-gold/20 text-gta-gold'
                    : 'bg-dash-border text-whisper'
                }`}>
                  {status === 'cleared' ? '✓' : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-heading font-bold text-bright text-sm">{gate.label}</span>
                    {status === 'cleared' && (
                      <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                        Cleared
                      </span>
                    )}
                    {i === cleared && status !== 'cleared' && (
                      <span className="text-[10px] bg-gta-gold/15 text-gta-gold px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-quiet text-xs leading-relaxed">{gate.desc}</p>

                  {target > 0 && status !== 'cleared' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-whisper mb-1">
                        <span>{current.toLocaleString()} / {target.toLocaleString()}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1 bg-dash-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gta-gold/60 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {row?.unlocked_at && (
                    <p className="text-[10px] text-green-400/70 mt-1">
                      Cleared {new Date(row.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
