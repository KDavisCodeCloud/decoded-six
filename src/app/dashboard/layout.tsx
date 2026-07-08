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

  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-anon-key-for-local-dev'

  if (hasSupabase) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userEmail = user.email ?? null
  }

  return (
    <div className="flex min-h-screen bg-dash-bg text-bright">
      <DashNav userEmail={userEmail} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
