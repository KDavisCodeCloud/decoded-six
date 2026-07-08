/**
 * DecodedSix Sound System
 * Internal dashboard only — family use.
 * Source: myinstants.com
 *
 * If this dashboard ever becomes a distributed product,
 * replace all files with licensed audio before any public release.
 */

const sounds = {
  pickup:       '/sounds/pickup.mp3',
  missionPassed:'/sounds/mission-passed.mp3',
  wasted:       '/sounds/wasted.mp3',
  wantedStars:  '/sounds/wanted-stars.mp3',
  notification: '/sounds/ui-notification.mp3',
} as const

type SoundKey = keyof typeof sounds

interface PlayOptions {
  volume?: number  // 0.0 to 1.0, overrides user preference
}

class SoundManager {
  private enabled: boolean
  private volume: number
  private cache: Map<SoundKey, HTMLAudioElement>

  constructor() {
    this.enabled = typeof window !== 'undefined'
      ? localStorage.getItem('ds-sound-enabled') !== 'false'
      : false
    this.volume = typeof window !== 'undefined'
      ? parseFloat(localStorage.getItem('ds-sound-volume') || '0.7')
      : 0.7
    this.cache = new Map()
  }

  play(sound: SoundKey, options?: PlayOptions) {
    if (!this.enabled) return
    if (typeof window === 'undefined') return

    if (!this.cache.has(sound)) {
      this.cache.set(sound, new Audio(sounds[sound]))
    }

    const audio = this.cache.get(sound)!
    audio.volume = options?.volume ?? this.volume
    audio.currentTime = 0
    audio.play().catch(() => {
      // Browser autoplay policy requires user interaction first.
      // Silent catch is correct — sound plays after first click.
    })
  }

  toggle(): boolean {
    this.enabled = !this.enabled
    localStorage.setItem('ds-sound-enabled', String(this.enabled))
    return this.enabled
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    localStorage.setItem('ds-sound-volume', String(this.volume))
  }

  isEnabled(): boolean {
    return this.enabled
  }
}

export const soundManager = new SoundManager()

/**
 * Sound event mapping.
 * Import soundManager and SoundEvents throughout the dashboard.
 *
 * Usage:
 *   import { soundManager, SoundEvents } from '@/lib/sounds'
 *   soundManager.play(SoundEvents.ARTICLE_APPROVED)
 *   soundManager.play(SoundEvents.ARTICLE_REJECTED_SOFT, { volume: 0.4 })
 */
export const SoundEvents = {
  // Content pipeline
  ARTICLE_APPROVED:      'pickup',
  ARTICLE_REJECTED:      'wasted',
  ARTICLE_REJECTED_SOFT: 'wasted',       // use { volume: 0.4 }
  COMPLIANCE_FLAGGED:    'wantedStars',
  MARKER_APPROVED:       'pickup',
  MARKER_REJECTED:       'wasted',

  // Gates and milestones
  GATE_CLEARED:          'missionPassed',
  ADSENSE_APPROVED:      'missionPassed',
  REVENUE_MILESTONE:     'missionPassed',
  SUBSCRIBER_MILESTONE:  'missionPassed',

  // UI feedback
  QUEUE_ITEM_ARRIVED:    'notification',
  NEW_RECOMMENDATION:    'notification',
  NEW_PRODUCT_SCOUT:     'notification',
  NEW_AFFILIATE_SCOUT:   'notification',
} as const satisfies Record<string, SoundKey>
