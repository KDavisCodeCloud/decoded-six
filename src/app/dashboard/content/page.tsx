import { createClient } from '@supabase/supabase-js'
import { TopicQueueSection, type TopicCandidate } from './TopicQueueSection'
import { BlockedGenerationsSection, type BlockedGeneration } from './BlockedGenerationsSection'
import ContentPageClient from './ContentPageClient'

export const metadata = { title: 'Content — DecodedSix' }

// Service-role, server-only fetch -- topic_candidates' RLS is service-role
// only (022_discovery_pipeline.sql), same reasoning as every other
// dashboard-adjacent table added this way (map_markers, analytics_pageviews):
// this page is already gated by dashboard/layout.tsx's Supabase-auth
// redirect, so a page-level service-role fetch needs no RLS grant to
// `authenticated` at all.
async function getProposedCandidates(): Promise<TopicCandidate[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await sb
    .from('topic_candidates')
    .select('id, topic, angle, source_urls, score, suggested_article_type, suggested_template_variant, update_of, created_at')
    .eq('status', 'proposed')
    .order('score', { ascending: false })
  return (data as TopicCandidate[] | null) ?? []
}

async function getBlockedGenerations(): Promise<BlockedGeneration[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await sb
    .from('generation_blocked')
    .select('id, topic, matched_slugs, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data as BlockedGeneration[] | null) ?? []
}

export default async function ContentPage() {
  const [candidates, blocked] = await Promise.all([
    getProposedCandidates(),
    getBlockedGenerations(),
  ])

  return (
    <>
      <TopicQueueSection candidates={candidates} />
      <BlockedGenerationsSection blocked={blocked} />
      <ContentPageClient />
    </>
  )
}
