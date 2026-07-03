-- Decoded Six - GTA 6 Hub schema
-- product_id namespace: 'gta-hub'
-- Run in Supabase SQL Editor > New query

CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL DEFAULT 'gta-hub',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  source_url TEXT,
  source_name TEXT,
  category TEXT NOT NULL DEFAULT 'news'
    CHECK (category IN ('news', 'rumor', 'guide', 'event', 'update')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_generated BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS map_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL DEFAULT 'gta-hub',
  title TEXT NOT NULL,
  description TEXT,
  marker_type TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  icon TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL DEFAULT 'gta-hub',
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  top_speed DECIMAL(5, 2),
  acceleration DECIMAL(3, 2),
  handling DECIMAL(3, 2),
  braking DECIMAL(3, 2),
  image_url TEXT,
  price_legit INTEGER,
  price_shark_card INTEGER,
  dlc_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL DEFAULT 'gta-hub',
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  bonuses JSONB NOT NULL DEFAULT '[]',
  discounts JSONB NOT NULL DEFAULT '[]',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL DEFAULT 'gta-hub',
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'error', 'skipped')),
  records_processed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents_log ENABLE ROW LEVEL SECURITY;

-- Public read on published content (anon key access from Next.js)
CREATE POLICY "articles_public_read" ON articles
  FOR SELECT USING (status = 'published');

CREATE POLICY "map_markers_public_read" ON map_markers
  FOR SELECT USING (true);

CREATE POLICY "vehicles_public_read" ON vehicles
  FOR SELECT USING (true);

CREATE POLICY "weekly_events_public_read" ON weekly_events
  FOR SELECT USING (published = true);

-- Service role bypasses RLS automatically for agent writes
-- No explicit service role policy needed

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_product_id ON articles(product_id);
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON articles(source_url);
CREATE INDEX IF NOT EXISTS idx_map_markers_product_id ON map_markers(product_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_product_id ON vehicles(product_id);
CREATE INDEX IF NOT EXISTS idx_weekly_events_product_id ON weekly_events(product_id);
CREATE INDEX IF NOT EXISTS idx_agents_log_product_id ON agents_log(product_id);
CREATE INDEX IF NOT EXISTS idx_agents_log_started_at ON agents_log(started_at);

-- Seed articles (placeholder content so the homepage renders on first deploy)
INSERT INTO articles (title, slug, excerpt, content, source_name, category, status, agent_generated, published_at)
VALUES
  (
    'GTA 6 PC Release Window: What the Latest Signals Are Saying',
    'gta-6-pc-release-window-signals',
    'With GTA 6 now live on consoles, attention is turning to the PC port. Industry analysts tracking Rockstar release patterns are pointing to late 2026 or early 2027 - here is what we know.',
    'The console launch of GTA 6 is behind us, and the GTA community is now focused on one question: when does the PC version arrive? Historical precedent gives us some clues. GTA V launched on PS3 and Xbox 360 in September 2013, then hit PS4 and Xbox One in November 2014, and finally arrived on PC in April 2015 - an 18-month gap. Red Dead Redemption 2 had a similar pattern, releasing on consoles in October 2018 and arriving on PC 13 months later in November 2019. If Rockstar follows this formula for GTA 6, a late 2026 or early 2027 PC release is the most likely window. The PC version is expected to include enhanced graphics options including ray tracing beyond console capabilities, DLSS and FSR support, and - most importantly for the community - modding support. Rockstar has not made any official statements on PC timing, maintaining their standard practice of keeping all attention on the console launch before acknowledging the PC port publicly.',
    'Decoded Six',
    'news',
    'published',
    FALSE,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'Decoded Six is Live: Your 24/7 GTA 6 Intelligence Hub',
    'decoded-six-is-live',
    'We built an AI-powered news aggregator that monitors dozens of GTA 6 sources around the clock. Here is how it works and what to expect.',
    'Decoded Six is now live. The site is powered by Agent 04, a custom news scraping and summarization pipeline that monitors GTA 6 coverage across gaming press, Reddit, and community forums every six hours. When Agent 04 finds a new article or discussion worth surfacing, it generates an original summary - not a copy of the source - and publishes it here within minutes. The goal is to be the single place you check for GTA 6 news instead of juggling a dozen tabs. Phase 1 is the news site you are reading now. Phase 2 launches with the PC release: interactive maps covering every location and collectible, a full vehicle database with performance stats and money-making rankings, weekly GTA Online event digests, and heist guides updated with community-tested strategies. Bookmark this and check back. Agent 04 never sleeps.',
    'Decoded Six',
    'guide',
    'published',
    FALSE,
    NOW() - INTERVAL '6 hours'
  ),
  (
    'GTA 6 Online Economy: Everything We Know About Making Money',
    'gta-6-online-economy-making-money',
    'From businesses to heists to passive income - based on confirmed details and the GTA V Online playbook, here is how the GTA 6 Online economy is shaping up.',
    'Rockstar has not published a complete breakdown of the GTA 6 Online economy, but between trailer details, developer comments, and the established GTA Online playbook from GTA V, we can piece together a solid picture. Heists return as a core pillar - the original GTA 6 trailer showed co-op gameplay that strongly implies structured heist missions from launch, unlike GTA V Online which added them months after release. Businesses are expected in an expanded form, with player-owned properties spread across the Leonida map including the Vice City urban area and surrounding regions. The question everyone is asking is whether Shark Cards return and in what form. Rockstar has not confirmed specifics, but economic pressure to monetize GTA Online is inevitable given it generates hundreds of millions annually. Community sentiment from GTA V suggests the 2026 playerbase will scrutinize any pay-to-win elements aggressively, which may push Rockstar toward a more cosmetic-focused model. We will update this guide as more details emerge.',
    'Community Analysis',
    'guide',
    'published',
    TRUE,
    NOW() - INTERVAL '12 hours'
  ),
  (
    'The GTA 6 Map: Everything Confirmed About Leonida and Vice City',
    'gta-6-map-leonida-vice-city-confirmed',
    'Based on the trailers and confirmed Rockstar statements, here is a complete breakdown of what we know about the GTA 6 map - the largest in franchise history.',
    'The GTA 6 map covers the fictional state of Leonida, a Florida analog that includes Vice City as its major urban center. Based on the trailers and press coverage, the map includes several distinct regions. Vice City itself appears to be divided into neighborhoods with strong architectural identities - a beachfront strip reminiscent of Miami Beach, a downtown core with high-rises, a Little Havana-inspired district, and suburban sprawl extending outward. Outside the city, Leonida features rural highways, swamplands with airboat-accessible waterways, smaller towns, and natural areas that recall the Blaine County region from GTA V. Rockstar has confirmed that the map is the largest in Grand Theft Auto history, exceeding the already-substantial GTA V map. The vertical dimension also appears expanded - the tallest buildings in Vice City look significantly taller than anything in Los Santos. Phase 2 of Decoded Six will include an interactive map covering every confirmed location, mission site, and collectible once the PC version launches and the community has had time to thoroughly explore.',
    'Decoded Six',
    'news',
    'published',
    TRUE,
    NOW() - INTERVAL '20 hours'
  )
ON CONFLICT (slug) DO NOTHING;
