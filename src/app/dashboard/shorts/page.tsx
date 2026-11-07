import ShortsQueue from './ShortsQueue'

export const metadata = { title: 'Shorts Queue — DecodedSix' }

// Status changes must show on the next load, never from a cached render
// (the Sep 24 ISR stale-queue bug). Data itself is fetched client-side from
// /api/shorts, which is also no-store.
export const dynamic = 'force-dynamic'

export default function ShortsPage() {
  return <ShortsQueue />
}
