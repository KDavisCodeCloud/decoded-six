'use client'

import { useState } from 'react'

const CATEGORIES = [
  { key: 'money_spot',     label: 'Money Spot' },
  { key: 'vehicle_spawn',  label: 'Vehicle Spawn' },
  { key: 'property',       label: 'Property' },
  { key: 'heist',          label: 'Heist' },
  { key: 'mission_start',  label: 'Mission Start' },
  { key: 'weapon_pickup',  label: 'Weapon Pickup' },
  { key: 'health_armor',   label: 'Health / Armor' },
  { key: 'collectible',    label: 'Collectible' },
  { key: 'landmark',       label: 'Landmark' },
  { key: 'daily_location', label: 'Daily Location' },
]

type Status = 'idle' | 'submitting' | 'success' | 'error'

interface SubmitLocationFormProps {
  mapLive: boolean
  pickedCoords: { lat: number; lng: number } | null
  onStartPicking?: () => void
  onCancelPicking?: () => void
  picking?: boolean
}

export function SubmitLocationForm({
  mapLive,
  pickedCoords,
  onStartPicking,
  onCancelPicking,
  picking,
}: SubmitLocationFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('landmark')
  const [description, setDescription] = useState('')
  const [coordText, setCoordText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)

    let lat: number | undefined
    let lng: number | undefined

    if (mapLive && pickedCoords) {
      lat = pickedCoords.lat
      lng = pickedCoords.lng
    } else if (!mapLive && coordText.trim()) {
      const parts = coordText.split(',').map(s => parseFloat(s.trim()))
      if (parts.length === 2 && parts.every(Number.isFinite)) {
        [lat, lng] = parts
      }
    }

    try {
      const res = await fetch('/api/map-markers/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim(),
          lat, lng,
          source_url: sourceUrl.trim(),
          website,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')

      setStatus('success')
      setName('')
      setDescription('')
      setCoordText('')
      setSourceUrl('')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ minHeight: 44 }}
        className="w-full text-sm px-4 py-3 rounded-xl border border-flame/40 text-flame hover:bg-flame/10 transition-colors font-semibold"
      >
        📍 Submit a Location
      </button>
    )
  }

  if (status === 'success') {
    return (
      <div className="bg-panel border border-green/30 rounded-xl p-5 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-bright font-semibold text-sm mb-1">Submitted for review</p>
        <p className="text-quiet text-xs">A moderator will review it before it appears on the map.</p>
        <button
          onClick={() => { setOpen(false); setStatus('idle') }}
          className="mt-3 text-xs text-whisper hover:text-bright"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-panel border border-white/[0.08] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono uppercase tracking-widest text-quiet">Submit a Location</span>
        <button type="button" onClick={() => setOpen(false)} className="text-whisper hover:text-bright text-lg leading-none" aria-label="Close">×</button>
      </div>

      {/* Honeypot -- hidden from real users via CSS, not `type="hidden"`
          (bots that skip visually-hidden fields fall for this less often
          than they skip explicit hidden inputs). */}
      <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
      </div>

      <div>
        <label className="text-[10px] text-whisper uppercase tracking-wider">Location Name</label>
        <input
          required
          maxLength={200}
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ fontSize: 16, minHeight: 44 }}
          className="w-full mt-1 bg-transparent border border-dash-border rounded-lg px-3 text-quiet focus:outline-none focus:border-flame/40"
        />
      </div>

      <div>
        <label className="text-[10px] text-whisper uppercase tracking-wider">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ fontSize: 16, minHeight: 44 }}
          className="w-full mt-1 bg-panel border border-dash-border rounded-lg px-3 text-quiet focus:outline-none focus:border-flame/40"
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[10px] text-whisper uppercase tracking-wider">Description (optional)</label>
        <textarea
          maxLength={2000}
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ fontSize: 16 }}
          className="w-full mt-1 bg-transparent border border-dash-border rounded-lg p-3 text-quiet resize-none focus:outline-none focus:border-flame/40"
        />
      </div>

      <div>
        <label className="text-[10px] text-whisper uppercase tracking-wider">
          Coordinates (optional)
        </label>
        {mapLive ? (
          pickedCoords ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-green font-mono">
              {pickedCoords.lat.toFixed(4)}, {pickedCoords.lng.toFixed(4)}
              <button type="button" onClick={onStartPicking} className="text-whisper hover:text-bright underline">change</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={picking ? onCancelPicking : onStartPicking}
              style={{ minHeight: 44 }}
              className={`mt-1 w-full text-xs px-3 py-2 rounded-lg border transition-colors ${
                picking
                  ? 'border-flame/60 text-flame bg-flame/10'
                  : 'border-dash-border text-quiet hover:text-bright'
              }`}
            >
              {picking ? 'Click anywhere on the map…' : '📍 Click on Map to Set Location'}
            </button>
          )
        ) : (
          <input
            placeholder="e.g. 25.7617, -80.1918"
            value={coordText}
            onChange={e => setCoordText(e.target.value)}
            style={{ fontSize: 16, minHeight: 44 }}
            className="w-full mt-1 bg-transparent border border-dash-border rounded-lg px-3 text-quiet placeholder:text-whisper focus:outline-none focus:border-flame/40"
          />
        )}
      </div>

      <div>
        <label className="text-[10px] text-whisper uppercase tracking-wider">Source URL (optional)</label>
        <input
          type="url"
          maxLength={500}
          placeholder="Trailer, screenshot, or clip this comes from"
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
          style={{ fontSize: 16, minHeight: 44 }}
          className="w-full mt-1 bg-transparent border border-dash-border rounded-lg px-3 text-quiet placeholder:text-whisper focus:outline-none focus:border-flame/40"
        />
      </div>

      {status === 'error' && error && (
        <p className="text-xs text-neon-pink">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || !name.trim()}
        style={{ minHeight: 44 }}
        className="w-full text-sm px-4 py-2.5 rounded-lg bg-flame/15 text-flame border border-flame/40 hover:bg-flame/25 disabled:opacity-40 transition-colors font-semibold"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit for Review'}
      </button>
    </form>
  )
}
