import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedecodedsix.com'

const STATIC_ROUTES = ['/', '/news', '/guides', '/about', '/privacy']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.8,
  }))

  const hasSupabaseCredentials = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  if (!hasSupabaseCredentials) return staticRoutes

  const { data } = await supabase
    .from('articles')
    .select('slug, published_at')
    .eq('status', 'published')

  const rows = (data as { slug: string; published_at: string }[] | null) ?? []
  const articleRoutes: MetadataRoute.Sitemap = rows.map((article) => ({
    url: `${siteUrl}/news/${article.slug}`,
    lastModified: new Date(article.published_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...articleRoutes]
}
