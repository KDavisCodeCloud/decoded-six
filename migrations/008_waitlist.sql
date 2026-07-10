-- DecodedSix Migration 008 — Waitlist Emails
-- Run in Supabase SQL Editor (decodedsix-prod project only)

CREATE TABLE IF NOT EXISTS waitlist_emails (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  product_id text DEFAULT 'decodedsix'
);

ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_waitlist_emails"
  ON waitlist_emails FOR ALL
  USING (auth.role() = 'service_role');

-- Allows a future client-side/anon insert path in addition to the
-- /api/waitlist route (which uses the service role key).
CREATE POLICY "anon_insert_waitlist_emails"
  ON waitlist_emails FOR INSERT
  TO anon
  WITH CHECK (true);
