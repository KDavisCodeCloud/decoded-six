import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import DashNav from '@/components/dashboard/DashNav'

export const metadata = {
  title: 'Mission Control — DecodedSix',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userEmail: string | null = null
  let pendingCount = 0

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
  }

  return (
    <div className="flex min-h-screen bg-dash-bg text-bright">
      <DashNav userEmail={userEmail} pendingCount={pendingCount} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
