-- V1 stock refactor baseline profiling queries
-- Usage example:
--   psql "$DATABASE_URL" -f scripts/sql/v1_stock_refactor_profiling.sql

-- 1) Tick table distribution by dataset/source dimensions.
SELECT
  dataset_type,
  timeframe,
  source_family,
  source,
  COUNT(*)::bigint AS row_count,
  MIN(ts) AS min_ts,
  MAX(ts) AS max_ts
FROM stock_price_ticks
GROUP BY dataset_type, timeframe, source_family, source
ORDER BY dataset_type, timeframe, source_family, source;

-- 2) Null-safety checks for refactor dimensions.
SELECT
  COUNT(*) FILTER (WHERE dataset_type IS NULL)::bigint AS null_dataset_type,
  COUNT(*) FILTER (WHERE timeframe IS NULL)::bigint AS null_timeframe,
  COUNT(*) FILTER (WHERE source_family IS NULL)::bigint AS null_source_family
FROM stock_price_ticks;

-- 3) Key table row counts.
SELECT
  (SELECT COUNT(*)::bigint FROM stock_price_ticks) AS stock_price_ticks_rows,
  (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots) AS stock_metrics_snapshots_rows,
  (SELECT COUNT(*)::bigint FROM stock_profile_details) AS stock_profile_details_rows,
  (SELECT COUNT(*)::bigint FROM news_articles) AS news_articles_rows,
  (SELECT COUNT(*)::bigint FROM news_article_symbols) AS news_article_symbols_rows,
  (SELECT COUNT(*)::bigint FROM stocks_master WHERE is_active = TRUE) AS active_symbols;

-- 4) News bridge integrity against exploded symbols array.
WITH expected AS (
  SELECT
    na.id::uuid AS article_id,
    UPPER(BTRIM(raw_symbol)) AS symbol
  FROM news_articles na
  CROSS JOIN LATERAL unnest(COALESCE(na.symbols, ARRAY[]::text[])) AS raw_symbol
  WHERE NULLIF(BTRIM(raw_symbol), '') IS NOT NULL
  GROUP BY na.id::uuid, UPPER(BTRIM(raw_symbol))
)
SELECT
  (SELECT COUNT(*)::bigint FROM expected) AS expected_bridge_rows,
  (SELECT COUNT(*)::bigint FROM news_article_symbols) AS actual_bridge_rows,
  (
    SELECT COUNT(*)::bigint
    FROM expected e
    LEFT JOIN news_article_symbols nas
      ON nas.article_id = e.article_id
     AND nas.symbol = e.symbol
    WHERE nas.article_id IS NULL
  ) AS missing_bridge_rows,
  (
    SELECT COUNT(*)::bigint
    FROM news_article_symbols nas
    LEFT JOIN expected e
      ON e.article_id = nas.article_id
     AND e.symbol = nas.symbol
    WHERE e.article_id IS NULL
  ) AS unexpected_bridge_rows;

-- 5) Symbol-level metrics/profile coverage for active stocks.
WITH active AS (
  SELECT symbol
  FROM stocks_master
  WHERE is_active = TRUE
), latest_metrics AS (
  SELECT DISTINCT ON (symbol)
    symbol,
    as_of_date
  FROM stock_metrics_snapshots
  ORDER BY symbol, as_of_date DESC
)
SELECT
  (SELECT COUNT(*)::bigint FROM active) AS active_symbols,
  (
    SELECT COUNT(*)::bigint
    FROM active a
    JOIN stock_profile_details sp ON sp.symbol = a.symbol
  ) AS profile_covered_symbols,
  (
    SELECT COUNT(*)::bigint
    FROM active a
    JOIN latest_metrics lm ON lm.symbol = a.symbol
  ) AS metrics_covered_symbols;

-- 6) Table size + retention window estimates for stock/news domain.
SELECT
  table_name,
  pg_size_pretty(total_bytes) AS total_size,
  total_bytes,
  row_estimate,
  min_ts,
  max_ts,
  retention_days
FROM (
  SELECT
    'stock_price_ticks'::text AS table_name,
    pg_total_relation_size('stock_price_ticks')::bigint AS total_bytes,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = 'stock_price_ticks'::regclass) AS row_estimate,
    (SELECT MIN(ts) FROM stock_price_ticks) AS min_ts,
    (SELECT MAX(ts) FROM stock_price_ticks) AS max_ts,
    (
      SELECT COALESCE(
        ROUND(EXTRACT(EPOCH FROM (MAX(ts) - MIN(ts))) / 86400.0, 2),
        0
      )
      FROM stock_price_ticks
    ) AS retention_days

  UNION ALL

  SELECT
    'stock_metrics_snapshots'::text,
    pg_total_relation_size('stock_metrics_snapshots')::bigint,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = 'stock_metrics_snapshots'::regclass),
    (SELECT MIN(as_of_date)::timestamptz FROM stock_metrics_snapshots),
    (SELECT MAX(as_of_date)::timestamptz FROM stock_metrics_snapshots),
    (
      SELECT COALESCE(
        ROUND(EXTRACT(EPOCH FROM ((MAX(as_of_date)::timestamptz) - (MIN(as_of_date)::timestamptz))) / 86400.0, 2),
        0
      )
      FROM stock_metrics_snapshots
    )

  UNION ALL

  SELECT
    'stock_profile_details'::text,
    pg_total_relation_size('stock_profile_details')::bigint,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = 'stock_profile_details'::regclass),
    NULL::timestamptz,
    NULL::timestamptz,
    NULL::numeric

  UNION ALL

  SELECT
    'news_articles'::text,
    pg_total_relation_size('news_articles')::bigint,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = 'news_articles'::regclass),
    (SELECT MIN(published_at) FROM news_articles),
    (SELECT MAX(published_at) FROM news_articles),
    (
      SELECT COALESCE(
        ROUND(EXTRACT(EPOCH FROM (MAX(published_at) - MIN(published_at))) / 86400.0, 2),
        0
      )
      FROM news_articles
    )

  UNION ALL

  SELECT
    'news_article_symbols'::text,
    pg_total_relation_size('news_article_symbols')::bigint,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = 'news_article_symbols'::regclass),
    (SELECT MIN(created_at) FROM news_article_symbols),
    (SELECT MAX(created_at) FROM news_article_symbols),
    (
      SELECT COALESCE(
        ROUND(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400.0, 2),
        0
      )
      FROM news_article_symbols
    )
) prof
ORDER BY table_name;
