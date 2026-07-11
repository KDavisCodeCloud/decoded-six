'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SoundToggle from './SoundToggle'

const NAV = [
  { href: '/dashboard',         label: 'Overview',   icon: '⬡' },
  { href: '/dashboard/queue',   label: 'HITL Queue', icon: '📋' },
  { href: '/dashboard/gates',   label: 'Gates',      icon: '🎯' },
  { href: '/dashboard/agents',  label: 'Agents',     icon: '🤖' },
  { href: '/dashboard/content', label: 'Content',    icon: '📝' },
]

interface DashNavProps {
  userEmail?: string | null
  pendingCount?: number
}

export default function DashNav({ userEmail, pendingCount = 0 }: DashNavProps) {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-dash-panel border-r border-dash-border min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-dash-border">
        <div className="font-pricedown text-gta-gold text-xl leading-none">DECODED</div>
        <div className="font-pricedown text-quiet text-sm leading-none">SIX</div>
        <div className="text-[10px] text-whisper uppercase tracking-widest mt-1">Mission Control</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-gta-gold/15 text-gta-gold font-semibold'
                  : 'text-quiet hover:text-bright hover:bg-dash-border'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/dashboard/queue' && pendingCount > 0 && (
                <span className="text-[10px] font-bold bg-neon-pink/20 text-neon-pink rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-dash-border space-y-3">
        <SoundToggle />
        {userEmail && (
          <div className="text-[10px] text-whisper truncate">{userEmail}</div>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-[11px] text-whisper hover:text-neon-pink transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
