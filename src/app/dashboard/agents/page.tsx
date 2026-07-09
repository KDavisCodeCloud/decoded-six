import { createClient } from '@/lib/supabase-server'

const KNOWN_AGENTS = [
  { name: 'DSX-CA1',      desc: 'Content agent (news/evergreen/conversion)', schedule: 'Tue/Thu/Sat 9am' },
  { name: 'DS-HUM',       desc: 'Humanizer',                                 schedule: 'Per draft' },
  { name: 'DS-AEO',       desc: 'AEO structure check',                       schedule: 'Per draft' },
  { name: 'DS-SEO',       desc: 'SEO rules check',                           schedule: 'Per draft' },
  { name: 'DS-DETECT',    desc: 'AI detection (Originality)',                 schedule: 'Per draft' },
  { name: 'DS-COPYRIGHT', desc: 'Trademark compliance check',                 schedule: 'Per draft' },
  { name: 'DS-MAP-SCRAPE',desc: 'Reddit/Discord scraper',                    schedule: 'Daily 6am' },
  { name: 'DS-YT-SHORT',  desc: 'Weekly challenge Short',                    schedule: 'Thu 6am' },
  { name: 'DS-YT-STRATEGY',desc: 'Shorts optimizer',                         schedule: 'Sun 6am' },
]

interface AuditRow {
  id: string
  agent_id: string
  action: string
  result: string | null
  error: string | null
  created_at: string
}

export default async function AgentsPage() {
  const supabase = await createClient()

  let recentLogs: AuditRow[] = []
  try {
    const { data } = await supabase
      .from('audit_log')
      .select('id, agent_id, action, result, error, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    recentLogs = (data as AuditRow[]) ?? []
  } catch {
    // audit_log not yet seeded
  }

  const lastRun = new Map<string, AuditRow>()
  recentLogs.forEach(log => {
    if (!lastRun.has(log.agent_id)) lastRun.set(log.agent_id, log)
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-pricedown text-gta-gold text-3xl leading-none">AGENT ROSTER</h1>
        <p className="text-quiet text-sm mt-1">{KNOWN_AGENTS.length} agents registered</p>
      </div>

      {/* Agent status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
        {KNOWN_AGENTS.map(agent => {
          const last = lastRun.get(agent.name)
          const statusColor = !last
            ? 'bg-dash-border'
            : last.error
            ? 'bg-neon-pink'
            : last.result === 'success'
            ? 'bg-green-400'
            : 'bg-gta-gold animate-pulse'

          return (
            <div key={agent.name} className="dash-card p-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor}`} />
              <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-bright text-sm">{agent.name}</div>
                <div className="text-quiet text-xs">{agent.desc}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-whisper">{agent.schedule}</div>
                {last ? (
                  <div className="text-[10px] text-whisper mt-0.5">
                    {new Date(last.created_at).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="text-[10px] text-whisper">Never run</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent audit log */}
      <div className="dash-card">
        <div className="px-6 py-4 border-b border-dash-border">
          <h2 className="font-heading font-bold text-bright text-sm uppercase tracking-widest">
            Recent Activity
          </h2>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3">🤖</div>
            <p className="text-quiet text-sm">No agent activity yet.</p>
            <p className="text-whisper text-xs mt-1">Runs will appear here once agents are active.</p>
          </div>
        ) : (
          <div className="divide-y divide-dash-border">
            {recentLogs.slice(0, 50).map(log => (
              <div key={log.id} className="px-6 py-3 flex items-center gap-4">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  log.error   ? 'bg-neon-pink' :
                  log.result === 'success' ? 'bg-green-400' :
                  'bg-quiet'
                }`} />
                <span className="text-gta-gold text-xs font-mono w-32 shrink-0">{log.agent_id}</span>
                <span className="text-quiet text-xs flex-1 truncate">{log.action}</span>
                <span className="text-whisper text-xs shrink-0">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
