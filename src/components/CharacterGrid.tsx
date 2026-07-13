'use client'

import { useState } from 'react'

const BASE = 'https://www.rockstargames.com/VI/_next/static/media'

interface Character {
  name: string
  role: string
  tagline: string
  img: string
  imgObjectPosition: string
  bio: string
  traits: string[]
  background: string
  confirmedIn: string[]
  hasArticle: boolean
  articleSlug?: string
}

const CHARACTERS: Character[] = [
  {
    name: 'Jason Duval',
    role: 'Protagonist',
    tagline: 'Ex-military, loyal to a fault — and the wrong people',
    img: `${BASE}/Jason_Duval_06.086o72llg6~1p.jpg`,
    imgObjectPosition: 'center 8%',
    bio: 'Jason Duval is a Florida man with a complicated history. Former military, he drifted through work that kept him close to the edge of things before landing in Vice City\'s criminal ecosystem. He\'s not a bad man — but he\'s very good at doing bad things for people he trusts. That loyalty is his defining trait and his most exploitable weakness.',
    traits: ['Loyal', 'Resourceful', 'Physically imposing', 'Morally flexible under pressure'],
    background: 'Ex-military. Grew up in rural Leonida. Ended up in Vice City working for people who saw his capabilities and his blind spots in equal measure.',
    confirmedIn: ['GTA VI Trailer 1', 'GTA VI Trailer 2', 'Official press materials'],
    hasArticle: false,
  },
  {
    name: 'Lucia Caminos',
    role: 'Protagonist',
    tagline: 'Sharp, calculating, and done playing by anyone else\'s rules',
    img: `${BASE}/Lucia_Caminos_02.16n.5umvlu_48.jpg`,
    imgObjectPosition: 'center 25%',
    bio: 'Lucia Caminos walked out of Leonida State Penitentiary with nothing but a clear head and a very specific plan. Where Jason leads with instinct, Lucia leads with calculation. She is the sharpest person in any room she enters, and she has spent long enough in rooms where that did not matter. That time is over.',
    traits: ['Calculated', 'Street-smart', 'Adaptable', 'Self-determined'],
    background: 'Released from Leonida State Penitentiary. Working-class background. Has been surviving in systems designed to keep her down her entire life — and has gotten very good at it.',
    confirmedIn: ['GTA VI Trailer 1 (opening scene)', 'GTA VI Trailer 2', 'Official press materials'],
    hasArticle: false,
  },
]

export function CharacterGrid() {
  const [selected, setSelected] = useState<Character | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
        {CHARACTERS.map(char => (
          <button
            key={char.name}
            onClick={() => setSelected(char)}
            className="group relative rounded-xl overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-flame/40"
            style={{ aspectRatio: '2/3', background: '#1a1a1a' }}
          >
            <img
              src={char.img}
              alt={char.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              style={{ objectPosition: char.imgObjectPosition }}
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.95) 100%)' }}
            />
            {/* Hover dim */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

            {/* Role badge */}
            <div className="absolute top-3 left-3">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded font-ibm"
                style={{ background: 'rgba(236,18,114,0.2)', color: '#ec1272', border: '1px solid rgba(236,18,114,0.35)' }}
              >
                {char.role}
              </span>
            </div>

            {/* Text overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="font-heading font-black text-bright text-xl leading-tight mb-1">
                {char.name}
              </p>
              <p className="text-[13px] text-white/65 leading-snug mb-3">
                {char.tagline}
              </p>
              <p className="text-[10px] font-ibm text-flame/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                View character profile →
              </p>
            </div>

            {/* © */}
            <span className="absolute top-2 right-2 text-[8px] text-white/30 select-none">
              © Rockstar Games
            </span>
          </button>
        ))}
      </div>

      {/* ── CHARACTER DETAIL MODAL ───────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-white/[0.08] max-h-[90vh] overflow-y-auto"
            style={{ background: '#0d0d0d' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Hero portrait */}
            <div className="relative overflow-hidden" style={{ height: '280px', background: '#1a1a1a' }}>
              <img
                src={selected.img}
                alt={selected.name}
                className="w-full h-full object-cover"
                style={{ objectPosition: selected.imgObjectPosition }}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(13,13,13,0.95) 100%)' }}
              />
              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.65)' }}
                aria-label="Close"
              >
                ✕
              </button>
              {/* Role badge */}
              <div className="absolute top-3 right-3">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded font-ibm"
                  style={{ background: 'rgba(236,18,114,0.25)', color: '#ec1272', border: '1px solid rgba(236,18,114,0.4)' }}
                >
                  {selected.role}
                </span>
              </div>
              {/* Name overlay on image */}
              <div className="absolute bottom-4 left-5">
                <p
                  className="font-heading font-black text-bright text-2xl leading-none"
                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
                >
                  {selected.name}
                </p>
              </div>
              <span className="absolute bottom-2 right-3 text-[8px] text-white/30 select-none">
                © Rockstar Games
              </span>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Bio */}
              <p className="text-quiet text-[15px] leading-relaxed mb-6">
                {selected.bio}
              </p>

              {/* Background */}
              <div className="rounded-lg p-4 mb-4" style={{ background: '#141414' }}>
                <p className="text-[10px] text-whisper uppercase tracking-widest mb-2 font-ibm">Background</p>
                <p className="text-quiet text-sm leading-relaxed">{selected.background}</p>
              </div>

              {/* Traits */}
              <div className="mb-5">
                <p className="text-[10px] text-whisper uppercase tracking-widest mb-3 font-ibm">Key Traits</p>
                <div className="flex flex-wrap gap-2">
                  {selected.traits.map(trait => (
                    <span
                      key={trait}
                      className="text-xs px-2.5 py-1 rounded-full border font-ibm"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirmed in */}
              <div className="mb-6">
                <p className="text-[10px] text-whisper uppercase tracking-widest mb-3 font-ibm">Confirmed In</p>
                <div className="space-y-1">
                  {selected.confirmedIn.map(source => (
                    <div key={source} className="flex items-center gap-2 text-sm text-quiet">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3fd17a' }} />
                      {source}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coming soon / article CTA */}
              {!selected.hasArticle ? (
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
                    Full character deep-dive is in production.{' '}
                    <a href="/news" className="text-flame hover:underline">Browse latest news</a> for updates.
                  </p>
                </div>
              ) : (
                <a
                  href={`/news/${selected.articleSlug}`}
                  className="block w-full text-center py-3 rounded-xl font-bold text-sm"
                  style={{ background: '#ec1272', color: '#fff' }}
                >
                  Read Full Character Profile →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
