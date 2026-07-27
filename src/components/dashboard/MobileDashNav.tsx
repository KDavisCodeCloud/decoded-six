'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',         label: 'Overview',   icon: '⬡' },
  { href: '/dashboard/queue',   label: 'HITL Queue', icon: '📋' },
  { href: '/dashboard/gates',   label: 'Gates',      icon: '🎯' },
  { href: '/dashboard/agents',  label: 'Agents',     icon: '🤖' },
  { href: '/dashboard/content', label: 'Content',    icon: '📝' },
]

interface MobileDashNavProps {
  pendingCount?: number
}

// DashNav.tsx (the desktop sidebar) is a fixed w-56 aside with zero
// responsive classes -- confirmed 2026-07-27 it eats ~60% of a phone
// viewport permanently, with no toggle anywhere in the codebase. This
// replaces it below md; DashNav itself gets wrapped in `hidden md:flex`
// in layout.tsx rather than being modified directly.
export default function MobileDashNav({ pendingCount = 0 }: MobileDashNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <header className="flex md:hidden items-center justify-between shrink-0 h-14 px-3 bg-dash-panel border-b border-dash-border">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="flex flex-col items-center justify-center gap-1"
          style={{ width: 44, height: 44 }}
        >
          <span className="w-5 h-0.5 rounded-full bg-quiet" />
          <span className="w-5 h-0.5 rounded-full bg-quiet" />
          <span className="w-5 h-0.5 rounded-full bg-quiet" />
        </button>

        <div className="text-center leading-none">
          <div className="font-pricedown text-gta-gold text-sm">DECODED SIX</div>
        </div>

        <Link
          href="/dashboard/queue"
          className="relative flex items-center justify-center"
          style={{ width: 44, height: 44 }}
          aria-label="HITL Queue"
        >
          <span className="text-lg">📋</span>
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 text-[10px] font-bold bg-neon-pink/20 text-neon-pink rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {pendingCount}
            </span>
          )}
        </Link>
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 flex bg-black/60"
          onClick={() => setOpen(false)}
        >
          <aside
            className="flex flex-col h-full w-64 bg-dash-panel border-r border-dash-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-dash-border">
              <div>
                <div className="font-pricedown text-gta-gold text-xl leading-none">DECODED</div>
                <div className="font-pricedown text-quiet text-sm leading-none">SIX</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex items-center justify-center text-xl text-whisper"
                style={{ width: 44, height: 44 }}
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV.map(item => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 rounded-lg text-[15px] transition-colors ${
                      active
                        ? 'bg-gta-gold/15 text-gta-gold font-semibold'
                        : 'text-quiet hover:text-bright hover:bg-dash-border'
                    }`}
                    style={{ minHeight: 48 }}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span className="flex-1 flex items-center">{item.label}</span>
                    {item.href === '/dashboard/queue' && pendingCount > 0 && (
                      <span className="text-[10px] font-bold bg-neon-pink/20 text-neon-pink rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="px-4 py-4 border-t border-dash-border">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-[13px] text-whisper hover:text-neon-pink transition-colors"
                  style={{ minHeight: 44 }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
