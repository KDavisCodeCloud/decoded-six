import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import type { Article } from '@/lib/types'

export const revalidate = 60

export const metadata = {
  title: 'GTA 6 Guides',
  description: 'Strategy guides, walkthroughs, and how-tos for GTA 6 — updated as the game evolves.',
}

async function getGuides(): Promise<Article[]> {
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .eq('category', 'guide')
    .order('published_at', { ascending: false })
    .limit(48)

  return (data as Article[]) ?? []
}

export default async function GuidesPage() {
  const guides = await getGuides()

  return (
    <>
      <Header />

      <div className="container py-10">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl text-bright mb-2">GTA 6 Guides</h1>
          <p className="text-quiet">Strategy, walkthroughs, and how-tos — updated as the game evolves.</p>
        </div>

        {guides.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-quiet">Guide content arrives with GTA 6</p>
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}
