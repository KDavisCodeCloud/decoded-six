'use client'

import { useState } from 'react'

const BASE = 'https://www.rockstargames.com/VI/_next/static/media'

interface Vehicle {
  name: string
  category: string
  edition: string
  img: string
  img2?: string
  desc: string
  status: 'confirmed'
}

const VEHICLES: Vehicle[] = [
  {
    name: "'95 Grotti Cheetah",
    category: 'Supercar',
    edition: 'Ultimate Edition',
    img: `${BASE}/ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg`,
    img2: `${BASE}/ULTIMATE_EDITION_GROTTI_CHEETAH_02.0rkrlsu_dg~ww.jpg`,
    desc: "A reimagined Italian icon — the '95 Cheetah is confirmed exclusive to Ultimate Edition owners at launch. Clean lines, top-tier performance.",
    status: 'confirmed',
  },
  {
    name: "Ganado Retro Build",
    category: 'Truck / 4x4',
    edition: 'Ultimate Edition',
    img: `${BASE}/ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg`,
    desc: "A period-correct Vapid Ganado with retro custom build. Off-road capable, built heavy. Comes with the Ultimate Edition package.",
    status: 'confirmed',
  },
  {
    name: "Shitzu Squalo",
    category: 'Watercraft',
    edition: 'Ultimate Edition',
    img: `${BASE}/ULTIMATE_EDITION_SQUALO_01.0cim7hj58ypb1.jpg`,
    desc: "High-performance personal watercraft. Built for Leonida's coastal waters and the Keys. Ultimate Edition exclusive at launch.",
    status: 'confirmed',
  },
  {
    name: "'67 Vapid Dominator Buggy",
    category: 'Off-road',
    edition: 'Ultimate Edition',
    img: `${BASE}/ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.jpg`,
    img2: `${BASE}/ULTIMATE_EDITION_VAPID_BUGGY_02.0tf15jp~61bkj.jpg`,
    desc: "A stripped Dominator converted for off-road desert running. Light, loud, fast over rough terrain. Ultimate Edition exclusive.",
    status: 'confirmed',
  },
  {
    name: "Classic Car Collection",
    category: 'Various Classics',
    edition: 'Ultimate Edition',
    img: `${BASE}/ULTIMATE_EDITION_WYMAN_CAR_COLLECTION_01.0swhrm__iu~6b.jpg`,
    img2: `${BASE}/ULTIMATE_EDITION_WYMAN_CAR_COLLECTION_02.0_biiqjqkpg2b.jpg`,
    desc: "A curated collection of classic vehicles from Wyman\'s garage — handpicked for Ultimate Edition owners. Multiple models confirmed.",
    status: 'confirmed',
  },
  {
    name: "'55 Vapid Stanier",
    category: 'Classic Sedan',
    edition: 'Vintage Vice City Pack',
    img: `${BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01.004m_8d1~qngy.jpg`,
    img2: `${BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_02.0s2wun4_vzld2.jpg`,
    desc: "A period-authentic 1955 Vapid Stanier — the quintessential American classic, restored and ready for Vice City streets. Vintage Vice City Pack exclusive.",
    status: 'confirmed',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Supercar': '#ec1272',
  'Truck / 4x4': '#f0975a',
  'Watercraft': '#2fc4e8',
  'Off-road': '#3fd17a',
  'Various Classics': '#7c3aed',
  'Classic Sedan': '#C8A84B',
}

export function VehicleGrid() {
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [activeImg, setActiveImg] = useState(0)

  function openVehicle(v: Vehicle) {
    setSelected(v)
    setActiveImg(0)
  }

  const categories = [...new Set(VEHICLES.map(v => v.category))]
  const [activeCategory, setActiveCategory] = useState<string>('All')

  const filtered = activeCategory === 'All'
    ? VEHICLES
    : VEHICLES.filter(v => v.category === activeCategory)

  return (
    <>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: activeCategory === cat ? '#ec1272' : 'rgba(255,255,255,0.06)',
              color: activeCategory === cat ? '#fff' : 'rgba(255,255,255,0.55)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(vehicle => (
          <button
            key={vehicle.name}
            onClick={() => openVehicle(vehicle)}
            className="group relative rounded-xl overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-flame/40"
            style={{ aspectRatio: '16/10', background: '#1a1a1a' }}
          >
            <img
              src={vehicle.img}
              alt={vehicle.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {/* Gradient */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 25%, rgba(0,0,0,0.9) 100%)' }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

            {/* Category badge */}
            <div className="absolute top-3 left-3">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded font-ibm"
                style={{
                  background: `${CATEGORY_COLORS[vehicle.category] ?? '#ec1272'}22`,
                  color: CATEGORY_COLORS[vehicle.category] ?? '#ec1272',
                  border: `1px solid ${CATEGORY_COLORS[vehicle.category] ?? '#ec1272'}44`,
                }}
              >
                {vehicle.category}
              </span>
            </div>

            {/* Edition badge */}
            <div className="absolute top-3 right-3">
              <span className="text-[8px] font-ibm text-white/40 uppercase tracking-widest">
                {vehicle.edition}
              </span>
            </div>

            {/* Name */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-heading font-bold text-bright text-base leading-tight">
                {vehicle.name}
              </p>
              <p className="text-[10px] font-ibm text-flame/80 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                View details →
              </p>
            </div>

            {/* © */}
            <span className="absolute bottom-1 right-2 text-[7px] text-white/25 select-none pointer-events-none">
              © Rockstar Games
            </span>
          </button>
        ))}
      </div>

      {/* Stats coming soon notice */}
      <div
        className="mt-8 rounded-xl p-5 flex items-start gap-4 border"
        style={{ background: 'rgba(47,196,232,0.04)', borderColor: 'rgba(47,196,232,0.15)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
          style={{ background: 'rgba(47,196,232,0.15)', color: '#2fc4e8' }}
        >
          ⏳
        </div>
        <div>
          <p className="font-heading font-semibold text-bright text-sm mb-1">Stats & Pricing — Pending Launch</p>
          <p className="text-quiet text-sm leading-relaxed">
            Top speed, acceleration, handling, and GTA Online pricing will be populated when GTA VI launches November 2026.
            All vehicles shown are confirmed from official Rockstar press materials.
          </p>
        </div>
      </div>

      {/* ── VEHICLE DETAIL MODAL ───────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl overflow-hidden border border-white/[0.08] max-h-[90vh] overflow-y-auto"
            style={{ background: '#0d0d0d' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Image viewer */}
            <div className="relative h-56 overflow-hidden" style={{ background: '#1a1a1a' }}>
              <img
                src={activeImg === 0 ? selected.img : (selected.img2 ?? selected.img)}
                alt={selected.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(13,13,13,0.9) 100%)' }}
              />
              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.65)' }}
              >
                ✕
              </button>
              {/* Image toggle if 2 images */}
              {selected.img2 && (
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                  {[0, 1].map(i => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{ background: activeImg === i ? '#fff' : 'rgba(255,255,255,0.3)' }}
                    />
                  ))}
                </div>
              )}
              {/* © */}
              <span className="absolute top-2 right-3 text-[8px] text-white/30 select-none">
                © Rockstar Games
              </span>
            </div>

            <div className="p-6">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-heading font-black text-bright text-xl leading-tight">{selected.name}</p>
                  <p className="text-whisper text-xs font-ibm mt-1">{selected.edition}</p>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shrink-0 font-ibm"
                  style={{
                    background: `${CATEGORY_COLORS[selected.category] ?? '#ec1272'}22`,
                    color: CATEGORY_COLORS[selected.category] ?? '#ec1272',
                    border: `1px solid ${CATEGORY_COLORS[selected.category] ?? '#ec1272'}44`,
                  }}
                >
                  {selected.category}
                </span>
              </div>

              <p className="text-quiet text-sm leading-relaxed mb-6">{selected.desc}</p>

              {/* Stats grid — all pending */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {['Top Speed', 'Acceleration', 'Handling', 'Braking'].map(stat => (
                  <div
                    key={stat}
                    className="rounded-lg p-3"
                    style={{ background: '#141414' }}
                  >
                    <p className="text-[10px] text-whisper uppercase tracking-widest mb-1 font-ibm">{stat}</p>
                    <p className="text-quiet text-sm">Pending launch</p>
                  </div>
                ))}
              </div>

              {/* Coming soon */}
              <div
                className="rounded-xl p-4 flex items-center gap-3 border"
                style={{ background: 'rgba(236,18,114,0.06)', borderColor: 'rgba(236,18,114,0.2)' }}
              >
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded font-ibm shrink-0"
                  style={{ background: '#ec1272', color: '#fff' }}
                >
                  Coming Soon
                </span>
                <p className="text-quiet text-xs">
                  Full stats, GTA Online pricing, and performance breakdowns arrive when GTA VI launches.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
