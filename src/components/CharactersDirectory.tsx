'use client'

import { useState } from 'react'

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
}

// Full confirmed roster (8) -- the homepage "Protagonists" teaser
// (components/CharacterGrid.tsx) intentionally covers only Jason and Lucia;
// this directory is the complete cast page linked from the BROWSE grid.
// Bios for the 6 supporting characters stay short and caveat-labeled where
// Rockstar has confirmed little beyond a name and one scene -- matching the
// accuracy rules the rest of the site holds content to, not padded out with
// invented personality traits the source material doesn't support.
const CHARACTERS: Character[] = [
  {
    name: 'Jason Duval',
    role: 'Protagonist',
    tagline: 'Ex-military, loyal to a fault — and the wrong people',
    img: '/images/tier1/characters/jason-duval/screenshot-Jason_Duval_04.jpg',
    imgObjectPosition: 'center 15%',
    bio: 'Jason Duval grew up around criminals and did a brief stint in the military before the story begins. Rockstar\'s materials lean into his maritime and coastal expertise — he\'s based in the Leonida Keys, and several of his trailer scenes take place on or near water.',
    traits: ['Leonida Keys-based', 'Maritime background', 'Ex-military', 'Employed by Brian Heder'],
    background: 'Grew up around criminals. Works for veteran drug runner Brian Heder, who owns Heder Boat Works & Marina in the Keys.',
    confirmedIn: ['GTA VI Trailer 1', 'GTA VI Trailer 2', 'Official Rockstar press materials'],
  },
  {
    name: 'Lucia Caminos',
    role: 'Protagonist',
    tagline: 'The first female playable protagonist in a mainline GTA game',
    img: '/images/tier1/characters/lucia-caminos/screenshot-Lucia_Caminos_05.jpg',
    imgObjectPosition: 'center 20%',
    bio: 'Lucia Caminos was born in Liberty City. Rockstar\'s official materials place her at Leonida State Penitentiary at the start of the game — the first trailer opens with her release. Rockstar frames her as the strategic half of the duo, the one making decisions rather than just following Jason\'s lead.',
    traits: ['Born in Liberty City', 'First female GTA protagonist', 'Strategic decision-maker', 'Formerly incarcerated'],
    background: 'Released from Leonida State Penitentiary at the story\'s start. Not a Leonida local — her Liberty City origin is confirmed in her official bio.',
    confirmedIn: ['GTA VI Trailer 1 (opening scene)', 'GTA VI Trailer 2', 'Official Rockstar press materials'],
  },
  {
    name: 'Cal Hampton',
    role: 'Supporting',
    tagline: 'Shares a billiards-hall scene with Jason in trailer footage',
    img: '/images/tier1/characters/cal-hampton/screenshot-Cal_Hampton_03.jpg',
    imgObjectPosition: 'center 20%',
    bio: 'Cal Hampton appears alongside Jason in a billiards-hall scene from trailer footage. Rockstar has confirmed his name through official materials but hasn\'t detailed his role in the story beyond that appearance.',
    traits: ['Confirmed via Trailer 2', 'Shown with Jason'],
    background: 'Role beyond the confirmed trailer scene is undisclosed by Rockstar.',
    confirmedIn: ['GTA VI Trailer 2', 'Official Rockstar press materials'],
  },
  {
    name: 'Boobie Ike',
    role: 'Supporting',
    tagline: 'Owns the Jack of Hearts strip club and nightclub franchise',
    img: '/images/tier1/characters/boobie-ike/screenshot-Boobie_Ike_03.jpg',
    imgObjectPosition: 'center 20%',
    bio: 'Boobie Ike owns the Jack of Hearts strip club and nightclub franchise, appearing in the Vice City segments of Trailer 2. Rockstar hasn\'t said whether the business plays a role beyond what\'s shown on screen.',
    traits: ['Owns Jack of Hearts franchise', 'Vice City-based'],
    background: 'Confirmed via Trailer 2\'s Vice City segments. No further story detail disclosed.',
    confirmedIn: ['GTA VI Trailer 2', 'Official Rockstar press materials'],
  },
  {
    name: 'Real Dimez',
    role: 'Supporting',
    tagline: 'A rap duo — Roxy and Bae-Luxe — featured in Trailer 2',
    img: '/images/tier1/characters/real-dimez/screenshot-Real_Dimez_02.jpg',
    imgObjectPosition: 'center 20%',
    bio: 'Real Dimez is a rap duo made up of Roxy and Bae-Luxe, confirmed through their appearance in Trailer 2. They\'re music-industry characters rather than criminal-underworld figures like most of the rest of the confirmed cast.',
    traits: ['Music-industry duo', 'Roxy and Bae-Luxe'],
    background: 'Confirmed via Trailer 2. Nothing ties them directly to Jason and Lucia\'s story yet beyond the same trailer footage.',
    confirmedIn: ['GTA VI Trailer 2', 'Official Rockstar press materials'],
  },
  {
    name: "Dre'Quan Priest",
    role: 'Supporting',
    tagline: 'Confirmed by name — the thinnest entry in the confirmed cast',
    img: "/images/tier1/characters/drequan-priest/screenshot-DreQuan_Priest_02.jpg",
    imgObjectPosition: 'center 20%',
    bio: "Dre'Quan Priest is confirmed by name through official Rockstar materials. Beyond the name itself, Rockstar hasn't released any detail on his role or his connection to Jason and Lucia.",
    traits: ['Name confirmed only'],
    background: 'No role, scene, or relationship detail has been disclosed by Rockstar as of this writing.',
    confirmedIn: ['Official Rockstar press materials'],
  },
  {
    name: 'Raul Bautista',
    role: 'Supporting',
    tagline: 'Logistics specialist shown holding a Carbine Rifle in trailer footage',
    img: '/images/tier1/characters/raul-bautista/screenshot-Raul_Bautista_03.jpg',
    imgObjectPosition: 'center 20%',
    bio: 'Rockstar\'s official character materials describe Raul Bautista as a logistics specialist who handles heist planning and a regional contact network. He\'s shown in trailer footage holding a Carbine Rifle.',
    traits: ['Logistics specialist', 'Heist planning', 'Regional contact network'],
    background: 'Handles planning and contacts rather than being described as a frontline operator, though trailer footage shows him armed.',
    confirmedIn: ['GTA VI trailer footage', 'Official Rockstar press materials'],
  },
  {
    name: 'Brian Heder',
    role: 'Supporting',
    tagline: "Veteran drug runner Jason works for in the Leonida Keys",
    img: '/images/tier1/characters/brian-heder/screenshot-Brian_Heder_02.jpg',
    imgObjectPosition: 'center 20%',
    bio: 'Brian Heder is a veteran drug runner. Rockstar\'s materials confirm Jason works for him in the Leonida Keys, and that Heder owns Heder Boat Works & Marina.',
    traits: ['Veteran drug runner', "Jason's employer", 'Owns Heder Boat Works & Marina'],
    background: 'Based in the Leonida Keys, tying directly into Jason\'s own confirmed maritime background.',
    confirmedIn: ['Official Rockstar press materials'],
  },
]

const ARTICLE_SLUG = 'gta-6-characters-every-confirmed-name-role-detail'

export function CharactersDirectory() {
  const [selected, setSelected] = useState<Character | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
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
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.95) 100%)' }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

            <div className="absolute top-3 left-3">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded font-ibm"
                style={{ background: 'rgba(236,18,114,0.2)', color: '#ec1272', border: '1px solid rgba(236,18,114,0.35)' }}
              >
                {char.role}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="font-heading font-black text-bright text-base leading-tight mb-1">
                {char.name}
              </p>
              <p className="text-[10px] font-ibm text-flame/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                View profile →
              </p>
            </div>

            <span className="absolute top-2 right-2 text-[8px] text-white/30 select-none">
              © Rockstar Games
            </span>
          </button>
        ))}
      </div>

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
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.65)' }}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="absolute top-3 right-3">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded font-ibm"
                  style={{ background: 'rgba(236,18,114,0.25)', color: '#ec1272', border: '1px solid rgba(236,18,114,0.4)' }}
                >
                  {selected.role}
                </span>
              </div>
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

            <div className="p-6">
              <p className="text-quiet text-[15px] leading-relaxed mb-6">
                {selected.bio}
              </p>

              <div className="rounded-lg p-4 mb-4" style={{ background: '#141414' }}>
                <p className="text-[10px] text-whisper uppercase tracking-widest mb-2 font-ibm">Background</p>
                <p className="text-quiet text-sm leading-relaxed">{selected.background}</p>
              </div>

              <div className="mb-5">
                <p className="text-[10px] text-whisper uppercase tracking-widest mb-3 font-ibm">Confirmed Details</p>
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

              <a
                href={`/news/${ARTICLE_SLUG}`}
                className="block w-full text-center py-3 rounded-xl font-bold text-sm"
                style={{ background: '#ec1272', color: '#fff' }}
              >
                Read the Full Character Breakdown →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
