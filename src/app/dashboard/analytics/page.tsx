import { createClient } from '@supabase/supabase-js'
import { DailyChart } from './DailyChart'
import { ProgressBar } from './ProgressBar'

export const metadata = { title: 'Analytics — DecodedSix' }

// Service-role, server-only fetch -- analytics_pageviews' RLS has no
// authenticated-role read policy at all (020_analytics_pageviews.sql),
// same reasoning as /dashboard/map: this page is already gated by
// dashboard/layout.tsx's Supabase-auth redirect, so a page-level
// service-role fetch needs no additional RLS grant.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const MEDIAVINE_THRESHOLD = 50_000
const PHASE_7_GATE = 25_000

interface Row {
  path: string
  referrer_source: string
  country: string | null
  session_id: string
  created_at: string
}

function utcDateKey(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD, created_at is already UTC (timestamptz)
}

async function getAnalytics() {
  const sb = serviceClient()
  const now = new Date()

  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const yesterdaySameHour = new Date(yesterdayStart.getTime() + (now.getTime() - todayStart.getTime()))

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  // One bounded fetch covers today/yesterday/7d/28d/month-to-date -- 35 days
  // back is a superset of all of those (even on the 1st of the month, or
  // when "yesterday" crosses a month boundary). Pre-launch traffic volume
  // makes a single limited fetch + in-memory aggregation the simpler choice
  // over per-section SQL aggregation -- matches the existing
  // /api/dashboard/traffic route's approach.
  const windowStart = new Date(Math.min(monthStart.getTime(), now.getTime() - 35 * 86400000))

  const [{ data: pageviewRows, error }, { data: botRows }] = await Promise.all([
    sb
      .from('analytics_pageviews')
      .select('path, referrer_source, country, session_id, created_at')
      .eq('product_id', 'gta-hub')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(20000),
    sb
      .from('analytics_bot_hits')
      .select('bot_name, hit_date, path')
      .eq('product_id', 'gta-hub')
      .gte('hit_date', new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10))
      .order('hit_date', { ascending: false })
      .limit(5000),
  ])

  const rows = (pageviewRows as Row[] | null) ?? []
  const bots = botRows ?? []

  const inRange = (r: Row, start: Date, end: Date) => {
    const t = new Date(r.created_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  }

  const todayRows = rows.filter(r => inRange(r, todayStart, now))
  const yesterdaySameHourRows = rows.filter(r => inRange(r, yesterdayStart, yesterdaySameHour))
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 86400000)
  const sevenDayRows = rows.filter(r => inRange(r, sevenDaysAgo, now))
  const monthRows = rows.filter(r => inRange(r, monthStart, now))

  function dailySeries(sinceDays: number) {
    const buckets = new Map<string, { views: number; sessions: Set<string> }>()
    for (let i = 0; i < sinceDays; i++) {
      const d = new Date(now.getTime() - i * 86400000)
      buckets.set(d.toISOString().slice(0, 10), { views: 0, sessions: new Set() })
    }
    for (const r of rows) {
      const key = utcDateKey(r.created_at)
      const bucket = buckets.get(key)
      if (!bucket) continue
      bucket.views++
      bucket.sessions.add(r.session_id)
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => ({ date, views: b.views, visitors: b.sessions.size }))
  }

  function topBy(source: Row[], field: 'path' | 'referrer_source' | 'country', limit: number) {
    const counts = new Map<string, number>()
    for (const r of source) {
      const key = r[field] ?? 'unknown'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => ({ key, count }))
  }

  const botsByDay = new Map<string, Map<string, number>>()
  for (const b of bots) {
    const day = b.hit_date as string
    if (!botsByDay.has(day)) botsByDay.set(day, new Map())
    const dayMap = botsByDay.get(day)!
    dayMap.set(b.bot_name, (dayMap.get(b.bot_name) ?? 0) + 1)
  }
  const botDays = [...botsByDay.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 7)
  const botNames = [...new Set(bots.map(b => b.bot_name))].sort()

  return {
    error: error?.message ?? null,
    today: { pageviews: todayRows.length, visitors: new Set(todayRows.map(r => r.session_id)).size },
    yesterdaySameHour: {
      pageviews: yesterdaySameHourRows.length,
      visitors: new Set(yesterdaySameHourRows.map(r => r.session_id)).size,
    },
    daily7: dailySeries(7),
    daily28: dailySeries(28),
    topPages: topBy(sevenDayRows, 'path', 10),
    sources: topBy(sevenDayRows, 'referrer_source', 6),
    countries: topBy(sevenDayRows, 'country', 10),
    monthSessions: new Set(monthRows.map(r => r.session_id)).size,
    botDays,
    botNames,
    botsByDay: Object.fromEntries([...botsByDay.entries()].map(([d, m]) => [d, Object.fromEntries(m)])),
  }
}

function pctChange(current: number, prior: number): string {
  if (prior === 0) return current > 0 ? '+∞' : '±0'
  const pct = ((current - prior) / prior) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

export default async function AnalyticsPage() {
  const data = await getAnalytics()

  if (data.error) {
    return (
      <div className="p-8">
        <p className="text-neon-pink text-sm">Failed to load analytics: {data.error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="font-pricedown text-gta-gold text-3xl leading-none">ANALYTICS</h1>
        <p className="text-quiet text-sm mt-1">First-party, self-hosted — no third-party analytics, no cookies, no IPs stored.</p>
      </div>

      {/* Today */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dash-card p-5">
          <div className="text-[10px] text-whisper uppercase tracking-widest mb-2">Visitors Today</div>
          <div className="font-pricedown text-3xl text-bright">{data.today.visitors}</div>
        </div>
        <div className="dash-card p-5">
          <div className="text-[10px] text-whisper uppercase tracking-widest mb-2">Pageviews Today</div>
          <div className="font-pricedown text-3xl text-bright">{data.today.pageviews}</div>
        </div>
        <div className="dash-card p-5">
          <div className="text-[10px] text-whisper uppercase tracking-widest mb-2">vs Yesterday (same hour)</div>
          <div className="font-pricedown text-3xl" style={{ color: '#00f0ff' }}>
            {pctChange(data.today.visitors, data.yesterdaySameHour.visitors)}
          </div>
          <div className="text-xs text-whisper mt-1">visitors · {pctChange(data.today.pageviews, data.yesterdaySameHour.pageviews)} pageviews</div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="dash-card p-5">
        <DailyChart daily7={data.daily7} daily28={data.daily28} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top pages */}
        <div className="dash-card p-5">
          <div className="text-[10px] text-whisper uppercase tracking-widest mb-3">Top 10 Pages — 7 Days</div>
          <div className="space-y-2">
            {data.topPages.length === 0 && <p className="text-xs text-whisper italic">No data yet</p>}
            {data.topPages.map(p => (
              <div key={p.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-quiet truncate">{p.key}</span>
                <span className="font-mono text-gta-gold shrink-0">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sources */}
        <div className="dash-card p-5">
          <div className="text-[10px] text-whisper uppercase tracking-widest mb-3">Traffic Sources — 7 Days</div>
          <div className="space-y-2">
            {data.sources.length === 0 && <p className="text-xs text-whisper italic">No data yet</p>}
            {data.sources.map(s => (
              <div key={s.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-quiet capitalize">{s.key}</span>
                <span className="font-mono text-gta-gold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Countries */}
        <div className="dash-card p-5">
          <div className="text-[10px] text-whisper uppercase tracking-widest mb-3">Countries — 7 Days</div>
          <div className="space-y-2">
            {data.countries.length === 0 && <p className="text-xs text-whisper italic">No data yet</p>}
            {data.countries.map(c => (
              <div key={c.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-quiet">{c.key === 'unknown' ? 'Unknown' : c.key}</span>
                <span className="font-mono text-gta-gold">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mediavine tracker */}
      <div className="dash-card p-5">
        <div className="text-[10px] text-whisper uppercase tracking-widest mb-3">
          Mediavine Tracker — Sessions This Calendar Month
        </div>
        <div className="font-pricedown text-3xl text-bright mb-3">
          {data.monthSessions.toLocaleString()} <span className="text-sm text-whisper font-heading">/ {MEDIAVINE_THRESHOLD.toLocaleString()}</span>
        </div>
        <ProgressBar value={data.monthSessions} max={MEDIAVINE_THRESHOLD} gateValue={PHASE_7_GATE} gateLabel="Phase 7 Gate" />
      </div>

      {/* Crawler activity */}
      <div className="dash-card p-5">
        <div className="text-[10px] text-whisper uppercase tracking-widest mb-3">Crawler Activity — 7 Days</div>
        {data.botNames.length === 0 ? (
          <p className="text-xs text-whisper italic">No crawler hits recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-whisper text-left">
                  <th className="pb-2 pr-4">Bot</th>
                  {data.botDays.map(d => (
                    <th key={d} className="pb-2 px-2 text-right font-mono">{d.slice(5)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.botNames.map(bot => (
                  <tr key={bot} className="border-t border-dash-border">
                    <td className="py-1.5 pr-4 text-quiet">{bot}</td>
                    {data.botDays.map(d => (
                      <td key={d} className="py-1.5 px-2 text-right font-mono text-gta-gold">
                        {(data.botsByDay as Record<string, Record<string, number>>)[d]?.[bot] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
