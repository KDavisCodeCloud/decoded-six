'use client'

import { useState, useEffect } from 'react'
import { soundManager } from '@/lib/sounds'

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(soundManager.isEnabled())
  }, [])

  function toggle() {
    const next = soundManager.toggle()
    setEnabled(next)
  }

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Sound on — click to mute' : 'Sound off — click to enable'}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-quiet hover:text-gta-gold hover:bg-dash-border transition-colors"
    >
      {enabled ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      )}
    </button>
  )
}
