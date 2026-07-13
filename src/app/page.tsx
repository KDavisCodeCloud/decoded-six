import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import { MapPlaceholder } from '@/components/map/MapPlaceholder'
import { HeroContent } from '@/components/HeroContent'
import { RegionGrid } from '@/components/RegionGrid'
import { CharacterGrid } from '@/components/CharacterGrid'
import type { Article } from '@/lib/types'

export const revalidate = 60

const COVER_ART =
  'https://www.rockstargames.com/VI/_next/static/media/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg'


const TICKER_ITEMS = [
  'PC LAUNCH WINDOW',
  'CONFIRMED LOCATIONS',
  'VEHICLE DATABASE',
  'WEEKLY EVENTS',
  'HEIST PAYOUTS',
  'RUMOR MILL',
  'ONLINE MULTIPLAYER',
  'MAP SIZE REVEALED',
  'JASON & LUCIA LORE',
]

async function getLatest(): Promise<Article[]> {
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(7)
  return (data as Article[]) ?? []
}

async function getRumors(): Promise<Article[]> {
  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, category, published_at')
    .eq('status', 'published')
    .eq('category', 'rumor')
    .order('published_at', { ascending: false })
    .limit(6)
  return (data as Article[]) ?? []
}

export default async function HomePage() {
  const [articles, rumors] = await Promise.all([getLatest(), getRumors()])
  const [featured, ...rest] = articles

  const launchDate = process.env.NEXT_PUBLIC_LAUNCH_DATE || '2027-11-19'

  return (
    <>
      <Header />

      {/* ── HERO — full-bleed cover art ─────────────────────────── */}
      <section className="relative min-h-[88vh] overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${COVER_ART}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        {/* Bottom gradient fade to bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)' }}
        />
        {/* Left-side text readability fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, transparent 85%)' }}
        />
        {/* © attribution */}
        <span className="absolute bottom-2 right-3 text-[9px] text-white/30 select-none">
          © Rockstar Games
        </span>

        {/* Content */}
        <div className="container relative z-10 min-h-[88vh] flex items-center">
          <div className="w-full md:w-[55%] py-20">
            <HeroContent launchDate={launchDate} />
          </div>
        </div>
      </section>

      {/* ── INTEL TICKER ────────────────────────────────────────── */}
      <div
        className="w-full overflow-hidden border-y py-2.5"
        style={{ background: '#0a0a0a', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="ticker-track">
          {[0, 1].map(copy => (
            <span key={copy} className="inline-flex items-center">
              <span className="font-ibm text-[11px] font-bold tracking-widest px-6" style={{ color: '#ec1272' }}>
                INTEL
              </span>
              {TICKER_ITEMS.map((item, j) => (
                <span
                  key={j}
                  className="font-ibm text-[11px] font-semibold tracking-wider pr-6"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  · {item}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── LEONIDA REGIONS ─────────────────────────────────────── */}
      <div className="container py-16">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-[3px] h-5 rounded-full" style={{ background: '#2fc4e8' }} />
          <h2 className="font-heading font-extrabold text-[13px] uppercase tracking-[0.1em] text-bright">
            Explore Leonida
          </h2>
          <span className="text-whisper text-[11px] font-ibm">6 confirmed regions</span>
        </div>

        <RegionGrid />
      </div>

      {/* ── MAIN CONTENT GRID ───────────────────────────────────── */}
      <div className="container pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">

          {/* Left: Featured + Latest */}
          <div>
            {featured && (
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-[3px] h-5 rounded-full" style={{ background: '#ec1272' }} />
                  <h2 className="font-heading font-extrabold text-[13px] uppercase tracking-[0.1em] text-bright">
                    Featured
                  </h2>
                </div>
                <ArticleCard article={featured} featured />
              </section>
            )}

            {rest.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-[3px] h-5 rounded-full" style={{ background: '#2fc4e8' }} />
                    <h2 className="font-heading font-extrabold text-[13px] uppercase tracking-[0.1em] text-bright">
                      Latest News
                    </h2>
                  </div>
                  <a
                    href="/news"
                    className="font-ibm text-[11px] font-semibold tracking-wider hover:text-bright transition-colors"
                    style={{ color: '#ec1272' }}
                  >
                    VIEW ALL →
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rest.slice(0, 4).map(a => <ArticleCard key={a.id} article={a} />)}
                </div>
              </section>
            )}

            {articles.length === 0 && (
              <section className="py-24 text-center">
                <h2 className="font-heading font-bold text-2xl text-bright mb-3">First stories dropping soon</h2>
                <p style={{ color: 'rgba(255,255,255,0.58)' }}>GTA 6 coverage loading. Check back shortly.</p>
              </section>
            )}
          </div>

          {/* Right: Rumor Mill + Map */}
          <div className="space-y-10">
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-[3px] h-5 rounded-full" style={{ background: '#7c3aed' }} />
                <h2 className="font-heading font-extrabold text-[13px] uppercase tracking-[0.1em] text-bright">
                  Rumor Mill
                </h2>
              </div>

              {rumors.length > 0 ? (
                <div className="space-y-0">
                  {rumors.map((r, i) => (
                    <a
                      key={r.id}
                      href={`/news/${r.slug}`}
                      className="flex items-start gap-3 py-3.5 hover:bg-white/[0.03] transition-colors -mx-3 px-3 rounded"
                      style={{ borderBottom: i < rumors.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                    >
                      <span className="font-ibm text-[9px] font-bold uppercase tracking-wider mt-0.5 shrink-0" style={{ color: '#f0975a' }}>
                        UNCONFIRMED
                      </span>
                      <span className="font-heading font-semibold text-[14px] leading-snug text-bright">
                        {r.title}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  {[
                    'GTA 6 Vice City map allegedly 5× larger than GTA 5',
                    'Jason rumored to have solo story arc before Lucia chapters',
                    'Aircraft carriers confirmed in leaked mission briefings',
                    'GTA Online launch rumored 3 months post single-player',
                    'Weapon wheel redesign spotted in internal QA footage',
                  ].map((title, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 py-3.5"
                      style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                    >
                      <span className="font-ibm text-[9px] font-bold uppercase tracking-wider mt-0.5 shrink-0" style={{ color: '#f0975a' }}>
                        UNCONFIRMED
                      </span>
                      <span className="font-heading font-semibold text-[14px] leading-snug text-bright">
                        {title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-[3px] h-5 rounded-full" style={{ background: '#2fc4e8' }} />
                <h2 className="font-heading font-extrabold text-[13px] uppercase tracking-[0.1em] text-bright">
                  Interactive Map
                </h2>
              </div>
              {process.env.NEXT_PUBLIC_MAP_LIVE === 'true' ? (
                <a
                  href="/map"
                  className="block rounded-xl p-6 text-center border hover:border-white/20 transition-colors"
                  style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3fd17a' }} />
                    <span className="font-ibm text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3fd17a' }}>Live Now</span>
                  </div>
                  <p className="font-heading font-bold text-bright text-lg mb-1">Leonida Map</p>
                  <p className="text-[13px] mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Every confirmed location plotted.
                  </p>
                  <span className="font-ibm text-[11px] font-bold tracking-wider" style={{ color: '#2fc4e8' }}>
                    OPEN MAP →
                  </span>
                </a>
              ) : (
                <MapPlaceholder />
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ── CHARACTERS ──────────────────────────────────────────── */}
      <div
        className="border-t border-white/[0.06] py-16"
        style={{ background: '#0a0a0a' }}
      >
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-[3px] h-5 rounded-full" style={{ background: '#ec1272' }} />
            <h2 className="font-heading font-extrabold text-[13px] uppercase tracking-[0.1em] text-bright">
              The Protagonists
            </h2>
          </div>

          <CharacterGrid />
        </div>
      </div>

      <Footer />
    </>
  )
}
