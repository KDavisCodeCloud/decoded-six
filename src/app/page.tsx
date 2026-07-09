import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Countdown } from '@/components/Countdown'
import { ArticleCard } from '@/components/ArticleCard'
import { MapPlaceholder } from '@/components/map/MapPlaceholder'
import { PalmSilhouette } from '@/components/PalmSilhouette'
import type { Article } from '@/lib/types'

export const revalidate = 60

async function getLatest(): Promise<Article[]> {
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(7)
  return (data as Article[]) ?? []
}

const COMING_SOON = [
  { icon: '🗺️', label: 'Interactive Map',  desc: 'Every location, mission, and collectible plotted.', accent: 'border-l-ice' },
  { icon: '🚗', label: 'Vehicle Database', desc: 'Stats, top speeds, and money-making rankings.', accent: 'border-l-[#f5a623]' },
  { icon: '📅', label: 'Weekly Events',    desc: 'GTA Online bonuses and discounts updated every Thursday.', accent: 'border-l-gta-gold' },
  { icon: '💰', label: 'Money Guide',      desc: 'Fastest passive income methods ranked and updated.', accent: 'border-l-[#3fd17a]' },
]

export default async function HomePage() {
  const articles = await getLatest()
  const [featured, ...rest] = articles

  const launchDate = process.env.NEXT_PUBLIC_LAUNCH_DATE || '2027-03-01'

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <PalmSilhouette className="absolute inset-0 w-full h-full" />
        </div>
        <div className="hero-vignette absolute inset-0 pointer-events-none" />
        <div
          className="absolute inset-x-0 h-px pointer-events-none"
          style={{ top: '65%', background: 'linear-gradient(90deg, transparent, #FF2D6B, #00d2ff, transparent)' }}
        />

        <div className="container relative pb-16 md:pb-24">
          <div className="max-w-2xl">
            <h1 className="font-heading font-bold text-7xl md:text-[9rem] leading-[0.9] tracking-tight">
              <span className="block text-bright">VICE CITY</span>
              <span className="block gradient-text">DECODED</span>
            </h1>

            <p className="text-quiet text-lg max-w-md mt-6">
              GTA 6 news, confirmed locations, vehicle stats, and weekly events.
            </p>

            <div className="mt-8">
              <Countdown targetDate={launchDate} label="PC Launch Countdown" />
            </div>
          </div>
        </div>
      </section>

      {/* Intel ticker */}
      <div className="w-full py-2.5 px-6 bg-panel border-l-2 border-neon-pink">
        <p className="text-xs uppercase">
          <span className="font-mono text-neon-pink tracking-widest">GTA 6 INTEL</span>
          <span className="text-whisper tracking-widest"> &middot; PC LAUNCH &middot; CONFIRMED LOCATIONS &middot; VEHICLE DATABASE &middot; WEEKLY EVENTS</span>
        </p>
      </div>

      <div className="container pb-20">
        {/* Featured */}
        {featured && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-0.5 h-5 bg-flame rounded-full" />
              <h2 className="font-heading font-bold text-lg text-bright uppercase tracking-widest">
                Featured
              </h2>
            </div>
            <ArticleCard article={featured} featured />
          </section>
        )}

        {/* Latest grid */}
        {rest.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-0.5 h-5 bg-ice rounded-full" />
                <h2 className="font-heading font-bold text-lg text-bright uppercase tracking-widest">
                  Latest News
                </h2>
              </div>
              <a href="/news" className="text-flame text-sm hover:underline">
                View all &rarr;
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {articles.length === 0 && (
          <section className="mb-16 py-24 text-center">
            <div className="text-6xl mb-4">🌆</div>
            <h2 className="font-heading font-bold text-2xl text-bright mb-3">
              First stories dropping soon
            </h2>
            <p className="text-quiet">
              GTA 6 coverage is loading. Check back in a few minutes.
            </p>
          </section>
        )}

        <div className="vice-divider my-12" />

        {/* Coming soon */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-0.5 h-5 bg-gold rounded-full" />
            <h2 className="font-heading font-bold text-lg text-bright uppercase tracking-widest">
              Launching with GTA 6
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMING_SOON.map(item => (
              <div
                key={item.label}
                className={`bg-panel border border-white/[0.04] border-l-2 ${item.accent} rounded-xl p-5`}
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <div className="font-heading font-bold text-bright mb-1">{item.label}</div>
                <div className="text-whisper text-sm leading-relaxed">{item.desc}</div>
                <div className="mt-3 inline-block text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded uppercase tracking-widest">
                  Coming Soon
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="vice-divider my-12" />

        {/* Interactive map */}
        <section className="mt-16">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-0.5 h-5 bg-flame rounded-full" />
            <h2 className="font-heading font-bold text-lg text-bright uppercase tracking-widest">
              Interactive Map
            </h2>
          </div>
          {process.env.NEXT_PUBLIC_MAP_LIVE === 'true' ? (
            <a
              href="/map"
              className="block bg-panel border border-ice/20 rounded-2xl p-10 text-center hover:border-ice/40 transition-colors group"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                <span className="text-xs font-mono text-green uppercase tracking-widest">Live Now</span>
              </div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-bright mb-2">
                Interactive Map
              </h3>
              <p className="text-quiet text-sm mb-6 max-w-sm mx-auto">
                Every confirmed location, money spot, and vehicle spawn — all plotted.
              </p>
              <span className="inline-block px-5 py-2.5 rounded-xl bg-ice/10 text-ice text-sm font-medium group-hover:bg-ice/20 transition-colors">
                Open Map &rarr;
              </span>
            </a>
          ) : (
            <MapPlaceholder />
          )}
        </section>
      </div>

      <Footer />
    </>
  )
}
