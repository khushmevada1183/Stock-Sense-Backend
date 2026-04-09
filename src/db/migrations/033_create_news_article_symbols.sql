CREATE TABLE IF NOT EXISTS news_article_symbols (
  article_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  relevance_score NUMERIC(8, 4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, symbol),
  CONSTRAINT news_article_symbols_relevance_check CHECK (
    relevance_score >= 0 AND relevance_score <= 1
  ),
  CONSTRAINT news_article_symbols_symbol_format_check CHECK (
    symbol ~ '^[A-Z0-9.&_-]{1,20}$'
  ),
  CONSTRAINT news_article_symbols_article_fk FOREIGN KEY (article_id)
    REFERENCES news_articles(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_news_article_symbols_symbol
  ON news_article_symbols (symbol, article_id);

INSERT INTO news_article_symbols (article_id, symbol, relevance_score)
SELECT
  na.id,
  UPPER(TRIM(raw_symbol)) AS symbol,
  1 AS relevance_score
FROM news_articles na
CROSS JOIN LATERAL unnest(COALESCE(na.symbols, ARRAY[]::text[])) AS raw_symbol
WHERE COALESCE(TRIM(raw_symbol), '') <> ''
ON CONFLICT (article_id, symbol)
DO NOTHING;
