-- 012_rumors.sql
-- Phase 5 (2026-08-09): dedicated rumor-tracker data model. The articles
-- table's category='rumor' was never actually used by the content pipeline
-- (zero rows), so /rumors and the homepage "Rumor Mill" widget were showing
-- either nothing or hardcoded placeholder text. Rumors need a truth-status
-- (unconfirmed/confirmed/debunked) independent of editorial workflow status
-- -- articles.status means draft/published/archived, a different axis
-- entirely. Modeled on the vehicles/weekly_events tables (structured game
-- data, not long-form editorial content) rather than reusing articles.

CREATE TABLE IF NOT EXISTS rumors (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   TEXT NOT NULL DEFAULT 'gta-hub',
  title        TEXT NOT NULL UNIQUE,
  summary      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'unconfirmed'
    CHECK (status IN ('unconfirmed', 'confirmed', 'debunked')),
  source_name  TEXT,
  source_url   TEXT,
  category     TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rumors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rumors_public_read" ON rumors
  FOR SELECT USING (true);

-- Service role bypasses RLS automatically for agent/dashboard writes --
-- same convention as vehicles/weekly_events in 001_schema.sql, no explicit
-- service role policy needed.

CREATE INDEX IF NOT EXISTS idx_rumors_product_id ON rumors(product_id);
CREATE INDEX IF NOT EXISTS idx_rumors_status ON rumors(status);
CREATE INDEX IF NOT EXISTS idx_rumors_last_updated ON rumors(last_updated);

-- Seed: top 5 rumors already circulating in this site's own published
-- content (each repeated consistently across multiple articles' "What's
-- Still Just a Leak" sections) but never surfaced as first-class, trackable
-- entries. None of these are Rockstar-confirmed -- labeled unconfirmed per
-- docs/VOICE.md's accuracy rules.
INSERT INTO rumors (title, summary, status, source_name, category, last_updated)
VALUES
  (
    'Wanted system overhaul with coordinated law enforcement AI',
    'Widely circulated leaker claims describe police response moving away from mass-spawning toward coordinated, AI-driven tactics. Rockstar has not confirmed any specifics of the GTA 6 wanted system.',
    'unconfirmed',
    'Leaker chatter / fan community',
    'mechanics',
    NOW()
  ),
  (
    'Property ownership with passive income tied to in-world events',
    'Reports suggest player-owned property returns with passive income that reacts to events happening elsewhere in the world, not just a flat timer payout. No Rockstar confirmation of property mechanics exists yet.',
    'unconfirmed',
    'Leaker chatter / fan community',
    'economy',
    NOW()
  ),
  (
    'Weapon customization deeper than any prior GTA title',
    'Multiple leak threads claim GTA 6 weapon modification will go beyond GTA Online''s attachment system. Rockstar has shown weapons in trailers but has not detailed a customization system.',
    'unconfirmed',
    'Leaker chatter / fan community',
    'weapons',
    NOW()
  ),
  (
    'In-world social media / notoriety mechanic',
    'Trailer 2 shows NPCs filming incidents on phones in at least one sequence, which fans read as evidence of a viral-notoriety or in-world social media system. Rockstar has not named or described any such mechanic -- this is fan interpretation of trailer footage, not a confirmed feature.',
    'unconfirmed',
    'Trailer footage interpretation',
    'mechanics',
    NOW()
  ),
  (
    'PC version arrives roughly 18-19 months after console launch',
    'Based on GTA 5''s September 2013 console launch to April 2015 PC release (19 months) and RDR2''s similar gap, fans expect a GTA 6 PC version around mid-to-late 2028. Rockstar has not announced a PC version, platform, or date for GTA 6.',
    'unconfirmed',
    'Pattern-matching from prior Rockstar releases',
    'platforms',
    NOW()
  )
ON CONFLICT (title) DO NOTHING;
