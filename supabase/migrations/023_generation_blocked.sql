-- Pre-generation dedup gate: logs every generation attempt the gate
-- refused, so a blocked attempt is visible on the dashboard instead of
-- silently vanishing. See src/agents/content/dedup_gate.py.

CREATE TABLE IF NOT EXISTS generation_blocked (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL DEFAULT 'gta-hub',
    topic TEXT NOT NULL,
    matched_slugs TEXT[] NOT NULL DEFAULT '{}',
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE generation_blocked ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_generation_blocked" ON generation_blocked
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_generation_blocked_created_at
    ON generation_blocked (created_at DESC);
