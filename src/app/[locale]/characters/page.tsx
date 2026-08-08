import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CharactersDirectory } from '@/components/CharactersDirectory'

export const metadata = {
  title: 'GTA 6 Characters',
  description: 'Every officially confirmed GTA 6 character — name, role, and what Rockstar has actually said about each.',
  alternates: { canonical: '/characters' },
}

export default function CharactersPage() {
  return (
    <>
      <Header />

      <div
        className="relative overflow-hidden border-b border-white/[0.06]"
        style={{ background: 'linear-gradient(to bottom, #111118, #0a0a0a)', minHeight: '22vh' }}
      >
        <div className="container py-12">
          <p className="font-ibm text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: '#ec1272' }}>
            Confirmed Pre-Launch
          </p>
          <h1 className="font-heading font-black text-bright leading-tight mb-3"
              style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            GTA VI Characters
          </h1>
          <p className="text-quiet text-[15px] max-w-xl">
            All 8 officially confirmed GTA 6 characters. Tap anyone for what Rockstar has actually said about them.
          </p>
        </div>
      </div>

      <div className="container py-12">
        <CharactersDirectory />
      </div>

      <Footer />
    </>
  )
}
