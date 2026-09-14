-- Migration 018: community map-location submissions.
--
-- map_markers had a public SELECT policy (status='published') but no INSERT
-- policy at all -- anonymous users couldn't submit anything. This adds one,
-- scoped as tightly as the RLS layer can express: an anonymous or
-- authenticated submitter can only ever insert a row with
-- status='pending' AND source='community'. They cannot set verified=true,
-- cannot set status='published' or 'approved', and cannot set
-- source='manual'/'agent_scraped' -- the WITH CHECK clause blocks all of
-- that at the database level, independent of whatever the client-side form
-- or API route does. Approving/publishing a submission still requires the
-- service-role review route (bypasses RLS), same pattern as articles review.
--
-- submitted_ip supports server-side rate limiting (5 submissions/IP/hour) in
-- the /api/map-markers/submit route -- true IP-based rate limiting can't be
-- expressed in RLS alone since Postgres has no notion of the HTTP client's
-- address, so the API route reads x-forwarded-for, queries this column with
-- the service-role client, and rejects before ever attempting the insert.

ALTER TABLE map_markers
  ADD COLUMN IF NOT EXISTS submitted_ip TEXT,
  ADD COLUMN IF NOT EXISTS submitted_source_url TEXT;

CREATE POLICY "community_submit_pending_markers" ON map_markers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND source = 'community'
    AND verified = false
  );

CREATE INDEX IF NOT EXISTS idx_map_markers_submitted_ip_created
  ON map_markers (submitted_ip, created_at DESC)
  WHERE source = 'community';
