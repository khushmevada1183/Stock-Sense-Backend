/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const parsePositiveNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNonNegativeInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

const timedQuery = async (name, sql, params = []) => {
  const startedAt = Date.now();
  const result = await query(sql, params);

  return {
    name,
    latencyMs: Date.now() - startedAt,
    rows: result.rows,
  };
};

const run = async () => {
  const args = process.argv.slice(2);

  const thresholds = {
    minProd1dRows24h: parseNonNegativeInt(readArgValue(args, '--minProd1dRows24h'), 0),
    minProd1dRows7d: parseNonNegativeInt(readArgValue(args, '--minProd1dRows7d'), 100),
    maxSmokeLeakRows: parseNonNegativeInt(readArgValue(args, '--maxSmokeLeakRows'), 0),
    minCoveragePercent: parsePositiveNumber(readArgValue(args, '--minCoveragePercent'), 95),
    maxBridgeMismatchRows: parseNonNegativeInt(readArgValue(args, '--maxBridgeMismatchRows'), 0),
    maxProbeLatencyMs: parsePositiveNumber(readArgValue(args, '--maxProbeLatencyMs'), 1000),
    maxPgStatMeanExecMs: parsePositiveNumber(readArgValue(args, '--maxPgStatMeanExecMs'), 500),
  };

  const probes = [];

  const growthProbe = await timedQuery(
    'row_growth',
    `
      SELECT
        COUNT(*) FILTER (
          WHERE dataset_type = 'prod'
            AND timeframe = '1d'
            AND ts >= NOW() - INTERVAL '24 hours'
        )::int AS prod_1d_rows_24h,
        COUNT(*) FILTER (
          WHERE dataset_type = 'prod'
            AND timeframe = '1d'
            AND ts >= NOW() - INTERVAL '7 days'
        )::int AS prod_1d_rows_7d,
        COUNT(*) FILTER (
          WHERE dataset_type = 'prod'
            AND timeframe = 'tick'
            AND ts >= NOW() - INTERVAL '24 hours'
        )::int AS prod_tick_rows_24h,
        COUNT(*) FILTER (
          WHERE dataset_type = 'test'
            AND ts >= NOW() - INTERVAL '24 hours'
        )::int AS test_rows_24h
      FROM stock_price_ticks;
    `
  );
  probes.push({ name: growthProbe.name, latencyMs: growthProbe.latencyMs });

  const isolationProbe = await timedQuery(
    'prod_smoke_isolation',
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
  probes.push({ name: isolationProbe.name, latencyMs: isolationProbe.latencyMs });

  const coverageProbe = await timedQuery(
    'metrics_coverage',
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
  probes.push({ name: coverageProbe.name, latencyMs: coverageProbe.latencyMs });

  const bridgeProbe = await timedQuery(
    'news_bridge_mismatch',
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
  probes.push({ name: bridgeProbe.name, latencyMs: bridgeProbe.latencyMs });

  const pgStatExtensionProbe = await timedQuery(
    'pg_stat_statements_extension',
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_stat_statements'
      ) AS available;
    `
  );
  probes.push({ name: pgStatExtensionProbe.name, latencyMs: pgStatExtensionProbe.latencyMs });

  const pgStatAvailable = Boolean(pgStatExtensionProbe.rows[0]?.available);
  let pgStatSlowRows = [];

  if (pgStatAvailable) {
    const pgStatProbe = await timedQuery(
      'pg_stat_statements_scan',
      `
        SELECT
          queryid::text AS query_id,
          calls::bigint,
          ROUND(mean_exec_time::numeric, 3) AS mean_exec_time_ms,
          ROUND(total_exec_time::numeric, 3) AS total_exec_time_ms,
          LEFT(REPLACE(REPLACE(query, E'\n', ' '), E'\t', ' '), 180) AS query_snippet
        FROM pg_stat_statements
        WHERE
          query ILIKE '%stock_price_ticks%'
          OR query ILIKE '%stock_metrics_snapshots%'
          OR query ILIKE '%news_article_symbols%'
        ORDER BY mean_exec_time DESC
        LIMIT 10;
      `
    );

    probes.push({ name: pgStatProbe.name, latencyMs: pgStatProbe.latencyMs });
    pgStatSlowRows = pgStatProbe.rows.filter(
      (row) => Number(row.mean_exec_time_ms || 0) > thresholds.maxPgStatMeanExecMs
    );
  }

  const growth = growthProbe.rows[0] || {};
  const isolation = isolationProbe.rows[0] || {};
  const coverage = coverageProbe.rows[0] || {};
  const bridge = bridgeProbe.rows[0] || {};

  const eligibleCount = Number(coverage.eligible_count || 0);
  const coveredCount = Number(coverage.covered_count || 0);
  const coveragePercent = toPercent(coveredCount, eligibleCount);

  const missingBridgeCount = Number(bridge.missing_count || 0);
  const unexpectedBridgeCount = Number(bridge.unexpected_count || 0);
  const totalBridgeMismatch = missingBridgeCount + unexpectedBridgeCount;

  const maxObservedProbeLatencyMs = probes.reduce(
    (maxValue, probe) => Math.max(maxValue, Number(probe.latencyMs || 0)),
    0
  );

  const checks = {
    prod1dRowGrowth24h: Number(growth.prod_1d_rows_24h || 0) >= thresholds.minProd1dRows24h,
    prod1dRowGrowth7d: Number(growth.prod_1d_rows_7d || 0) >= thresholds.minProd1dRows7d,
    prodSmokeIsolation: Number(isolation.leaked_smoke_rows || 0) <= thresholds.maxSmokeLeakRows,
    metricsCoverage: eligibleCount > 0 && coveragePercent >= thresholds.minCoveragePercent,
    newsBridgeMismatch: totalBridgeMismatch <= thresholds.maxBridgeMismatchRows,
    probeLatencyBudget: maxObservedProbeLatencyMs <= thresholds.maxProbeLatencyMs,
    pgStatLatencyBudget: pgStatAvailable ? pgStatSlowRows.length === 0 : true,
  };

  const alerts = [];

  if (!checks.prod1dRowGrowth24h) {
    alerts.push(
      `prod_1d_rows_24h (${growth.prod_1d_rows_24h || 0}) is below threshold ${thresholds.minProd1dRows24h}`
    );
  }

  if (!checks.prod1dRowGrowth7d) {
    alerts.push(
      `prod_1d_rows_7d (${growth.prod_1d_rows_7d || 0}) is below threshold ${thresholds.minProd1dRows7d}`
    );
  }

  if (!checks.prodSmokeIsolation) {
    alerts.push(
      `leaked smoke rows in prod dataset (${isolation.leaked_smoke_rows || 0}) exceed threshold ${thresholds.maxSmokeLeakRows}`
    );
  }

  if (!checks.metricsCoverage) {
    alerts.push(
      `metrics coverage ${coveragePercent}% for eligibleCount=${eligibleCount} is below threshold ${thresholds.minCoveragePercent}%`
    );
  }

  if (!checks.newsBridgeMismatch) {
    alerts.push(
      `news bridge mismatches (${totalBridgeMismatch}) exceed threshold ${thresholds.maxBridgeMismatchRows}`
    );
  }

  if (!checks.probeLatencyBudget) {
    alerts.push(
      `probe latency ${maxObservedProbeLatencyMs}ms exceeds threshold ${thresholds.maxProbeLatencyMs}ms`
    );
  }

  if (!checks.pgStatLatencyBudget) {
    alerts.push(
      `pg_stat_statements has ${pgStatSlowRows.length} rows above mean_exec_time threshold ${thresholds.maxPgStatMeanExecMs}ms`
    );
  }

  const ok = alerts.length === 0;

  const output = {
    ok,
    generatedAt: new Date().toISOString(),
    thresholds,
    checks,
    alerts,
    stats: {
      rowGrowth: {
        prod1dRows24h: Number(growth.prod_1d_rows_24h || 0),
        prod1dRows7d: Number(growth.prod_1d_rows_7d || 0),
        prodTickRows24h: Number(growth.prod_tick_rows_24h || 0),
        testRows24h: Number(growth.test_rows_24h || 0),
      },
      prodIsolation: {
        leakedSmokeRows: Number(isolation.leaked_smoke_rows || 0),
      },
      metricsCoverage: {
        eligibleCount,
        coveredCount,
        coveragePercent,
      },
      newsBridge: {
        missingCount: missingBridgeCount,
        unexpectedCount: unexpectedBridgeCount,
        totalMismatchCount: totalBridgeMismatch,
      },
      latency: {
        maxObservedProbeLatencyMs,
        probes,
        pgStatAvailable,
        pgStatSlowRows,
      },
    },
  };

  console.log(JSON.stringify(output, null, 2));

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
