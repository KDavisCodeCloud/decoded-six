'use client'

import { useState } from 'react'

interface Region {
  name: string
  desc: string
  img: string
  subLocations: string[]
  climate: string
  vibe: string
  hasArticle: boolean
  articleSlug?: string
}

const REGIONS: Region[] = [
  {
    name: 'Vice City',
    desc: 'The neon-soaked urban core of Leonida returns bigger and more detailed than ever. South Leonida\'s crown jewel features an expanded downtown skyline, beach strips, affluent neighborhoods, shopping malls, nightclubs, and a criminal underground that runs twenty-four hours. Every block tells a story.',
    img: 'https://www.rockstargames.com/VI/_next/static/media/Vice_City_01.135x56yoeu.6t.jpg',
    subLocations: ['Downtown Vice City', 'Ocean Beach', 'Little Haiti', 'Starfish Island', 'Vice City Beach', 'Vice City Port'],
    climate: 'Subtropical — humid summers, warm winters',
    vibe: 'Urban, high-density, criminal enterprise',
    hasArticle: false,
  },
  {
    name: 'Leonida Keys',
    desc: 'An archipelago of subtropical islands off the southern coast, connected to the mainland by causeways and bridges. Turquoise shallows, fishing villages, luxury marinas, and the kind of quiet that makes you very aware when something is coming.',
    img: 'https://www.rockstargames.com/VI/_next/static/media/Leonida_Keys_01.0zgz7tveur6y8.jpg',
    subLocations: ['Northern Keys', 'South Key Marina', 'Pelican Cay', 'Causeway Bridge', 'Fishing Villages'],
    climate: 'Tropical — consistent heat, seasonal storms',
    vibe: 'Isolated, coastal, smuggler territory',
    hasArticle: false,
  },
  {
    name: 'Grassrivers',
    desc: 'Vast wetlands covering the northern reaches of Leonida. A labyrinth of swampland, bayou communities, shallow waterways, and dense cypress forest. The kind of place where things get buried and people disappear. Leonida keeps its oldest secrets here.',
    img: 'https://www.rockstargames.com/VI/_next/static/media/Grassrivers_01.1096rw4lbjur_.jpg',
    subLocations: ['Cypress Bayou', 'Mudflat Communities', 'Northern Waterways', 'Grassrivers Junction', 'Backwoods Settlements'],
    climate: 'Humid subtropical — fog, standing water year-round',
    vibe: 'Rural, isolated, lawless backwoods',
    hasArticle: false,
  },
  {
    name: 'Mount Kalaga',
    desc: 'A federally protected national park carved into the western highlands. Dense old-growth forest, dramatic elevation, and views that stretch across the entire state. Militia presence has been confirmed in the upper ranges. The wilderness is real — so is the danger.',
    img: 'https://www.rockstargames.com/VI/_next/static/media/Mount_Kalaga_National_Park_01.0v5fl0f83hjv_.jpg',
    subLocations: ['Kalaga Summit', 'National Park Visitor Center', 'Upper Ridge Militia Zone', 'Mountain Trails', 'Ranger Stations'],
    climate: 'Highland — cooler temperatures, seasonal snow at elevation',
    vibe: 'Wilderness, survivalist, off-grid',
    hasArticle: false,
  },
  {
    name: 'Port Gellhorn',
    desc: 'Leonida\'s northern industrial port. Container shipping, freight rail, heavy industry — and every bit of criminal logistics that comes with it. Cargo manifests here have a history of getting creative. The city runs on what comes through Port Gellhorn.',
    img: 'https://www.rockstargames.com/VI/_next/static/media/Port_Gellhorn_01.0fmisvza-5-cq.jpg',
    subLocations: ['Container Terminal', 'Freight Rail Yard', 'Industrial District', 'Gellhorn Dockside', 'Warehouse Quarter'],
    climate: 'Coastal — sea breeze, occasional fog',
    vibe: 'Industrial, working-class, organized crime hub',
    hasArticle: false,
  },
  {
    name: 'Ambrosia',
    desc: 'Leonida\'s premier gated enclave on the southeast peninsula. Waterfront estates, yacht clubs, private security, and old money that does not ask too many questions. Crime in Ambrosia wears a blazer. The most dangerous people here drive Bentleys.',
    img: 'https://www.rockstargames.com/VI/_next/static/media/Ambrosia_01.0rqphs0gazkm..jpg',
    subLocations: ['Ambrosia Peninsula', 'Yacht Club', 'Gated Estates', 'Private Beach Clubs', 'Ambrosia Marina'],
    climate: 'Coastal subtropical — pleasant, sheltered from storms',
    vibe: 'Affluent, exclusive, white-collar crime',
    hasArticle: false,
  },
]

export function RegionGrid() {
  const [selected, setSelected] = useState<Region | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {REGIONS.map(region => (
          <button
            key={region.name}
            onClick={() => setSelected(region)}
            className="group relative rounded-xl overflow-hidden text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-flame/40"
            style={{ aspectRatio: '16/10', background: '#1a1a1a' }}
          >
            <img
              src={region.img}
              alt={region.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {/* Base gradient */}
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)' }}
            />
            {/* Hover dim */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300" />

            {/* Text */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-heading font-bold text-bright text-base leading-tight">
                {region.name}
              </p>
              <p className="text-[10px] font-ibm text-flame/80 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Click to explore →
              </p>
            </div>

            {/* © */}
            <span className="absolute top-1.5 right-2 text-[7px] text-white/30 select-none">
              © Rockstar Games
            </span>
          </button>
        ))}
      </div>

      {/* ── REGION DETAIL MODAL ─────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-white/[0.08] max-h-[90vh] overflow-y-auto"
            style={{ background: '#0d0d0d' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Hero image */}
            <div className="relative h-52 overflow-hidden">
              <img
                src={selected.img}
                alt={selected.name}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(13,13,13,0.95) 100%)' }}
              />
              <span className="absolute top-2 right-3 text-[8px] text-white/30 select-none">
                © Rockstar Games
              </span>
              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                aria-label="Close"
              >
                ✕
              </button>
              {/* Region name on image */}
              <div className="absolute bottom-4 left-5">
                <p className="font-heading font-black text-bright text-2xl leading-none"
                   style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
                  {selected.name}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Description */}
              <p className="text-quiet text-[15px] leading-relaxed mb-6">
                {selected.desc}
              </p>

              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-lg p-3" style={{ background: '#141414' }}>
                  <p className="text-[10px] text-whisper uppercase tracking-widest mb-1 font-ibm">Climate</p>
                  <p className="text-bright text-sm font-medium">{selected.climate}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: '#141414' }}>
                  <p className="text-[10px] text-whisper uppercase tracking-widest mb-1 font-ibm">Character</p>
                  <p className="text-bright text-sm font-medium">{selected.vibe}</p>
                </div>
              </div>

              {/* Sub-locations */}
              <div className="mb-6">
                <p className="text-[10px] text-whisper uppercase tracking-widest mb-3 font-ibm">
                  Confirmed Locations
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.subLocations.map(loc => (
                    <span
                      key={loc}
                      className="text-xs px-2.5 py-1 rounded-full border font-ibm"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Coming soon footer */}
              {!selected.hasArticle && (
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
                  <p className="text-quiet text-sm">
                    Full coverage for {selected.name} is in production. Check back soon or{' '}
                    <a href="/news" className="text-flame hover:underline">browse latest news</a> for updates.
                  </p>
                </div>
              )}
              {selected.hasArticle && selected.articleSlug && (
                <a
                  href={`/news/${selected.articleSlug}`}
                  className="block w-full text-center py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{ background: '#ec1272', color: '#fff' }}
                >
                  Read Full Coverage →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
