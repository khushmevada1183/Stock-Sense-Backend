CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'rss',
  category TEXT NOT NULL DEFAULT 'markets',
  headline TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  author_name TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  symbols TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sentiment_label TEXT NOT NULL DEFAULT 'neutral',
  sentiment_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  sentiment_confidence NUMERIC(8, 4) NOT NULL DEFAULT 0.5,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT news_articles_category_check CHECK (
    category IN ('companies', 'markets', 'economy', 'ipos', 'commodities', 'global', 'regulatory', 'general')
  ),
  CONSTRAINT news_articles_sentiment_label_check CHECK (
    sentiment_label IN ('positive', 'negative', 'neutral')
  ),
  CONSTRAINT news_articles_sentiment_score_check CHECK (
    sentiment_score >= -1 AND sentiment_score <= 1
  ),
  CONSTRAINT news_articles_sentiment_confidence_check CHECK (
    sentiment_confidence >= 0 AND sentiment_confidence <= 1
  )
);

CREATE INDEX IF NOT EXISTS idx_news_articles_published_at
  ON news_articles (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_category_published_at
  ON news_articles (category, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_source_published_at
  ON news_articles (source, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_symbols
  ON news_articles USING GIN (symbols);

CREATE INDEX IF NOT EXISTS idx_news_articles_sentiment
  ON news_articles (sentiment_label, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_fts
  ON news_articles USING GIN (
    to_tsvector(
      'english',
      COALESCE(headline, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(content, '')
    )
  );

DROP TRIGGER IF EXISTS trg_news_articles_updated_at ON news_articles;
CREATE TRIGGER trg_news_articles_updated_at
BEFORE UPDATE ON news_articles
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE IF NOT EXISTS social_sentiment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_time TIMESTAMPTZ NOT NULL,
  symbol TEXT,
  platform TEXT NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 0,
  positive_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  sentiment_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'scraper',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_sentiment_platform_check CHECK (
    platform IN ('twitter', 'reddit', 'news', 'aggregate')
  ),
  CONSTRAINT social_sentiment_counts_non_negative_check CHECK (
    mention_count >= 0
    AND positive_count >= 0
    AND negative_count >= 0
    AND neutral_count >= 0
  ),
  CONSTRAINT social_sentiment_score_check CHECK (
    sentiment_score >= -1 AND sentiment_score <= 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_social_sentiment_snapshot
  ON social_sentiment_snapshots (
    snapshot_time,
    COALESCE(symbol, '__MARKET__'),
    platform,
    source
  );

CREATE INDEX IF NOT EXISTS idx_social_sentiment_symbol_snapshot
  ON social_sentiment_snapshots (symbol, snapshot_time DESC);

CREATE INDEX IF NOT EXISTS idx_social_sentiment_platform_snapshot
  ON social_sentiment_snapshots (platform, snapshot_time DESC);

DROP TRIGGER IF EXISTS trg_social_sentiment_updated_at ON social_sentiment_snapshots;
CREATE TRIGGER trg_social_sentiment_updated_at
BEFORE UPDATE ON social_sentiment_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE IF NOT EXISTS fear_greed_index_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  classification TEXT NOT NULL,
  news_sentiment_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  social_sentiment_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  momentum_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  volatility_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'computed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fear_greed_score_check CHECK (score >= 0 AND score <= 100),
  CONSTRAINT fear_greed_classification_check CHECK (
    classification IN ('extreme fear', 'fear', 'neutral', 'greed', 'extreme greed')
  )
);

CREATE INDEX IF NOT EXISTS idx_fear_greed_snapshot_date
  ON fear_greed_index_snapshots (snapshot_date DESC);

DROP TRIGGER IF EXISTS trg_fear_greed_updated_at ON fear_greed_index_snapshots;
CREATE TRIGGER trg_fear_greed_updated_at
BEFORE UPDATE ON fear_greed_index_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
