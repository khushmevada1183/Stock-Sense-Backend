/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../src/db/client');

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
};

const toPercent = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
};

const run = async () => {
  const args = process.argv.slice(2);
  const writeJson = parseBoolean(readArgValue(args, '--writeJson'), true);
  const outputFileArg = readArgValue(args, '--output');

  const tickDistribution = await query(
    `
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
    `
  );

  const nullSafety = await query(
    `
      SELECT
        COUNT(*) FILTER (WHERE dataset_type IS NULL)::bigint AS null_dataset_type,
        COUNT(*) FILTER (WHERE timeframe IS NULL)::bigint AS null_timeframe,
        COUNT(*) FILTER (WHERE source_family IS NULL)::bigint AS null_source_family
      FROM stock_price_ticks;
    `
  );

  const rowCounts = await query(
    `
      SELECT
        (SELECT COUNT(*)::bigint FROM stock_price_ticks) AS stock_price_ticks_rows,
        (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots) AS stock_metrics_snapshots_rows,
        (SELECT COUNT(*)::bigint FROM stock_profile_details) AS stock_profile_details_rows,
        (SELECT COUNT(*)::bigint FROM news_articles) AS news_articles_rows,
        (SELECT COUNT(*)::bigint FROM news_article_symbols) AS news_article_symbols_rows,
        (SELECT COUNT(*)::bigint FROM stocks_master WHERE is_active = TRUE) AS active_symbols;
    `
  );

  const bridgeCoverage = await query(
    `
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
    `
  );

  const symbolCoverage = await query(
    `
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
    `
  );

  const retentionAndSize = await query(
    `
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
    `
  );

  const rowCountStats = rowCounts.rows[0];
  const symbolCoverageStats = symbolCoverage.rows[0];

  const profileCoveragePercent = toPercent(
    Number(symbolCoverageStats.profile_covered_symbols || 0),
    Number(symbolCoverageStats.active_symbols || 0)
  );
  const metricsCoveragePercent = toPercent(
    Number(symbolCoverageStats.metrics_covered_symbols || 0),
    Number(symbolCoverageStats.active_symbols || 0)
  );

  const snapshot = {
    ok: true,
    generatedAt: new Date().toISOString(),
    rowCounts: rowCountStats,
    nullSafety: nullSafety.rows[0],
    bridgeCoverage: bridgeCoverage.rows[0],
    symbolCoverage: {
      ...symbolCoverageStats,
      profileCoveragePercent,
      metricsCoveragePercent,
    },
    tickDistribution: tickDistribution.rows,
    retentionAndSize: retentionAndSize.rows,
  };

  if (writeJson) {
    const outputPath = outputFileArg
      ? path.resolve(outputFileArg)
      : path.resolve(__dirname, '../inspect-output.json');

    fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    snapshot.outputPath = outputPath;
  }

  console.log(JSON.stringify(snapshot, null, 2));
};

run()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
