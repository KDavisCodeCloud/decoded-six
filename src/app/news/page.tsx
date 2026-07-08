import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import type { Article } from '@/lib/types'

export const revalidate = 60

export const metadata = {
  title: 'GTA 6 News',
  description: 'All the latest GTA 6 updates, leaks, and breaking news — updated continuously.',
}

const CATS = ['all', 'news', 'rumor', 'guide', 'event', 'update'] as const

async function getArticles(category: string): Promise<Article[]> {
  let q = supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(48)

  if (category !== 'all') q = q.eq('category', category)

  const { data } = await q
  return (data as Article[]) ?? []
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const cat = category ?? 'all'
  const articles = await getArticles(cat)

  return (
    <>
      <Header />

      <div className="container py-10">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl text-bright mb-2">GTA 6 News</h1>
          <p className="text-quiet">Breaking news, leaks, and official updates. Refreshed continuously.</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map(c => (
            <a
              key={c}
              href={c === 'all' ? '/news' : `/news?category=${c}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                cat === c
                  ? 'bg-flame text-white'
                  : 'bg-panel text-quiet hover:text-bright hover:bg-raised'
              }`}
            >
              {c}
            </a>
          ))}
        </div>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📡</div>
            <p className="text-quiet">No articles yet. First stories coming soon.</p>
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}
