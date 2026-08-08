-- 010_article_translations.sql
-- Stores pre-translated article content per locale (Kelvin, 2026-08-07:
-- translate everything, pre-generate and store rather than translate live
-- on every page view -- real indexable pages per locale, one-time cost per
-- article instead of a repeated one on every visit).
--
-- 'en' (the site's existing default American-English content) is NOT a row
-- in this table -- it lives in articles.* as it always has. This table only
-- holds the 7 additional locales.

CREATE TABLE IF NOT EXISTS article_translations (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id         UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  locale             TEXT NOT NULL
    CHECK (locale IN ('en-GB', 'fr', 'de', 'ja', 'zh', 'pt', 'es')),
  title              TEXT NOT NULL,
  excerpt            TEXT,
  content            TEXT,
  faq_pairs          JSONB,
  meta_description   TEXT,
  translation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (translation_status IN ('pending', 'translating', 'completed', 'failed')),
  translation_error  TEXT,
  translated_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_article_translations_article_id ON article_translations(article_id);
CREATE INDEX IF NOT EXISTS idx_article_translations_locale ON article_translations(locale);

ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;

-- Mirrors articles_public_read (001_schema.sql) -- a translation is only
-- publicly visible if its parent article is actually published, and only
-- once the translation pass itself succeeded (never serve a half-failed
-- translation row to a visitor).
CREATE POLICY "article_translations_public_read" ON article_translations
  FOR SELECT USING (
    translation_status = 'completed'
    AND EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_translations.article_id
      AND articles.status = 'published'
    )
  );
