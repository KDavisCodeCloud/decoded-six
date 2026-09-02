-- Migration 015: Affiliate products table (Amazon ASIN tracking).
--
-- Requested schema didn't include product_id, but every other table in this
-- project scopes rows to product_id (see articles, media_assets) per
-- CLAUDE.md's non-negotiable -- added here for consistency, defaulted to
-- 'gta-hub' to match the value every other DecodedSix table actually uses.

CREATE TABLE IF NOT EXISTS affiliate_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    TEXT NOT NULL DEFAULT 'gta-hub',
  asin          TEXT NOT NULL UNIQUE,
  product_name  TEXT NOT NULL,
  category      TEXT,
  price_usd     NUMERIC,
  amazon_url    TEXT NOT NULL,
  article_slug  TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_article_slug ON affiliate_products(article_slug);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_active ON affiliate_products(active);

ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY affiliate_products_service_role ON affiliate_products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY affiliate_products_public_read ON affiliate_products
  FOR SELECT TO anon, authenticated USING (active = true);
