import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { serviceClient } from '@/lib/shorts-server'
import DashNav from '@/components/dashboard/DashNav'
import MobileDashNav from '@/components/dashboard/MobileDashNav'

export const metadata = {
  title: 'Mission Control — DecodedSix',
  // robots.txt already carries `Disallow: /dashboard/`, but that blocks
  // CRAWLING, not INDEXING -- a URL linked from anywhere external can still
  // appear as a bare result with no snippet, and a disallowed page can never
  // be read to discover a noindex. Belt and braces: this emits the directive
  // on the page itself.
  robots: { index: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userEmail: string | null = null
  let pendingCount = 0
  let shortsPendingCount = 0

  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-anon-key-for-local-dev'

  if (hasSupabase) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userEmail = user.email ?? null

    // Matches the query shape in dashboard/queue/page.tsx (product_id
    // 'gta-hub', status 'pending_review') — that page is the live,
    // actively-used source of truth for what counts as "in the queue".
    const { count } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', 'gta-hub')
      .eq('status', 'pending_review')
    pendingCount = count ?? 0

    // ds_shorts is service-role only (025_shorts_queue.sql), so the badge
    // count can't use the session client above. The user check above has
    // already gated this request.
    const { count: shortsCount } = await serviceClient()
      .from('ds_shorts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review')
    shortsPendingCount = shortsCount ?? 0
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-dash-bg text-bright">
      <div className="hidden md:flex">
        <DashNav userEmail={userEmail} pendingCount={pendingCount} shortsPendingCount={shortsPendingCount} />
      </div>
      <MobileDashNav pendingCount={pendingCount} shortsPendingCount={shortsPendingCount} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
