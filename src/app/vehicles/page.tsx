import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { VehicleGrid } from '@/components/VehicleGrid'

export const metadata = {
  title: 'GTA 6 Vehicles',
  description: 'Every confirmed GTA 6 vehicle — specs, images, and availability. Updated from official Rockstar sources.',
}

export default function VehiclesPage() {
  return (
    <>
      <Header />

      {/* Page hero */}
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
            GTA VI Vehicles
          </h1>
          <p className="text-quiet text-[15px] max-w-xl">
            Official vehicles confirmed by Rockstar Games. Stats and pricing will populate when GTA 6 launches.
          </p>
        </div>
      </div>

      <div className="container py-12">
        <VehicleGrid />
      </div>

      <Footer />
    </>
  )
}
