-- Migration 009: audit_log had only service_role_all_audit_log — no
-- authenticated-read policy — so the dashboard's Agents tab (reading with
-- the anon/authenticated client, not service-role) always got zero rows
-- back and showed "Never run" for every agent regardless of real history.
-- DSX-CA1 and others have actually run and written real rows; this was
-- purely an RLS read gap, not missing data.

DROP POLICY IF EXISTS "auth_read_audit_log" ON audit_log;
CREATE POLICY "auth_read_audit_log" ON audit_log
  FOR SELECT TO authenticated USING (true);
