import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import type { Article } from '@/lib/types'

export const revalidate = 60

export const metadata = {
  title: 'GTA 6 Rumors',
  description: 'Unconfirmed GTA 6 leaks, insider reports, and speculation — tracked and verified as Rockstar confirms details.',
}

async function getRumors(): Promise<Article[]> {
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .eq('category', 'rumor')
    .order('published_at', { ascending: false })
    .limit(48)
  return (data as Article[]) ?? []
}

export default async function RumorsPage() {
  const rumors = await getRumors()

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
            Unconfirmed
          </p>
          <h1 className="font-heading font-black text-bright leading-tight mb-3"
              style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            Rumor Mill
          </h1>
          <p className="text-quiet text-[15px] max-w-xl">
            Leaks, insider reports, and speculation tracked in real time. We flag everything as confirmed or denied when Rockstar speaks.
          </p>
        </div>
      </div>

      <div className="container py-12">
        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-white/[0.06]">
          <span className="text-whisper text-xs font-ibm uppercase tracking-widest">Status key:</span>
          {[
            { label: 'Unconfirmed', color: '#f0975a' },
            { label: 'Denied', color: '#FF2D6B' },
            { label: 'Confirmed', color: '#3fd17a' },
          ].map(s => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs font-ibm" style={{ color: s.color }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>

        {rumors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rumors.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="text-5xl mb-5">📡</div>
            <h2 className="font-heading font-bold text-bright text-xl mb-3">Rumor pipeline warming up</h2>
            <p className="text-quiet text-sm max-w-sm mx-auto">
              Leaks and insider reports will appear here as our agents scrape and verify them. Check back soon.
            </p>
            <a
              href="/news"
              className="inline-block mt-6 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: '#ec1272' }}
            >
              Read Latest News
            </a>
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}
