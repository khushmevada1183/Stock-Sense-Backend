/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const parsePositiveNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const toPercent = (numerator, denominator) => {
  if (!denominator) {
    return 100;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
};

const run = async () => {
  const args = process.argv.slice(2);
  const minCoveragePercent = parsePositiveNumber(readArgValue(args, '--minCoveragePercent'), 95);

  const nullCheck = await query(
    `
      SELECT
        COUNT(*) FILTER (WHERE dataset_type IS NULL)::int AS null_dataset_type,
        COUNT(*) FILTER (WHERE timeframe IS NULL)::int AS null_timeframe,
        COUNT(*) FILTER (WHERE source_family IS NULL)::int AS null_source_family
      FROM stock_price_ticks;
    `
  );

  const prodIsolationCheck = await query(
    `
      SELECT COUNT(*)::int AS leaked_smoke_rows
      FROM stock_price_ticks
      WHERE dataset_type = 'prod'
        AND (
          source_family = 'smoke'
          OR source IN ('timescale-smoke', 'cache-smoke', 'alerts-evaluator-smoke', 'notification-smoke')
        );
    `
  );

  const metricsCoverage = await query(
    `
      WITH eligible_symbols AS (
        SELECT symbol
        FROM stock_price_ticks
        WHERE dataset_type = 'prod'
          AND timeframe = '1d'
        GROUP BY symbol
        HAVING MIN(ts) <= MAX(ts) - INTERVAL '365 days'
      ),
      latest_metrics AS (
        SELECT DISTINCT ON (symbol)
          symbol,
          as_of_date
        FROM stock_metrics_snapshots
        ORDER BY symbol, as_of_date DESC
      )
      SELECT
        (SELECT COUNT(*)::int FROM eligible_symbols) AS eligible_count,
        (
          SELECT COUNT(*)::int
          FROM eligible_symbols es
          JOIN latest_metrics lm ON lm.symbol = es.symbol
        ) AS covered_count;
    `
  );

  const newsBridgeCoverage = await query(
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
        (SELECT COUNT(*)::int FROM expected) AS expected_count,
        (SELECT COUNT(*)::int FROM news_article_symbols) AS actual_count,
        (
          SELECT COUNT(*)::int
          FROM expected e
          LEFT JOIN news_article_symbols nas
            ON nas.article_id = e.article_id
           AND nas.symbol = e.symbol
          WHERE nas.article_id IS NULL
        ) AS missing_count,
        (
          SELECT COUNT(*)::int
          FROM news_article_symbols nas
          LEFT JOIN expected e
            ON e.article_id = nas.article_id
           AND e.symbol = nas.symbol
          WHERE e.article_id IS NULL
        ) AS unexpected_count;
    `
  );

  const nullRow = nullCheck.rows[0];
  const prodRow = prodIsolationCheck.rows[0];
  const coverageRow = metricsCoverage.rows[0];
  const bridgeRow = newsBridgeCoverage.rows[0];

  const eligibleCount = Number(coverageRow.eligible_count || 0);
  const coveredCount = Number(coverageRow.covered_count || 0);
  const metricsCoveragePercent = toPercent(
    coveredCount,
    eligibleCount
  );
  const hasEligibleCoveragePopulation = eligibleCount > 0;

  const checks = {
    noNullDatasetOrTimeframe:
      Number(nullRow.null_dataset_type || 0) === 0 && Number(nullRow.null_timeframe || 0) === 0,
    prodExcludesSmokeRows: Number(prodRow.leaked_smoke_rows || 0) === 0,
    metricsCoverageAtOrAboveThreshold:
      hasEligibleCoveragePopulation && metricsCoveragePercent >= minCoveragePercent,
    newsBridgeMatchesExplodedSymbols:
      Number(bridgeRow.expected_count || 0) === Number(bridgeRow.actual_count || 0) &&
      Number(bridgeRow.missing_count || 0) === 0 &&
      Number(bridgeRow.unexpected_count || 0) === 0,
  };

  const ok = Object.values(checks).every(Boolean);

  console.log(
    JSON.stringify(
      {
        ok,
        minCoveragePercent,
        checks,
        stats: {
          nullCounts: nullRow,
          prodSmokeLeakRows: prodRow.leaked_smoke_rows,
          metricsCoverage: {
            eligibleCount,
            coveredCount,
            coveragePercent: metricsCoveragePercent,
            hasEligiblePopulation: hasEligibleCoveragePopulation,
          },
          newsBridgeCoverage: {
            expectedCount: Number(bridgeRow.expected_count || 0),
            actualCount: Number(bridgeRow.actual_count || 0),
            missingCount: Number(bridgeRow.missing_count || 0),
            unexpectedCount: Number(bridgeRow.unexpected_count || 0),
          },
        },
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exitCode = 1;
  }
};

run()
  .then(async () => {
    await closePool();
    process.exit(process.exitCode || 0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
