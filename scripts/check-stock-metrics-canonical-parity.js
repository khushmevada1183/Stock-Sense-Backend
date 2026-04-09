/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const run = async () => {
  const legacyExistsRes = await query(
    `SELECT to_regclass('public.stock_52_week_levels') IS NOT NULL AS exists;`
  );
  const legacyTableExists = Boolean(legacyExistsRes.rows[0]?.exists);

  const high12ColumnExistsRes = await query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'stock_metrics_snapshots'
          AND column_name = 'high_12m'
      ) AS high_12m_exists,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'stock_metrics_snapshots'
          AND column_name = 'low_12m'
      ) AS low_12m_exists;
    `
  );

  const high12ColumnExists = Boolean(high12ColumnExistsRes.rows[0]?.high_12m_exists);
  const low12ColumnExists = Boolean(high12ColumnExistsRes.rows[0]?.low_12m_exists);

  let duplicate12mCheck = null;
  if (high12ColumnExists || low12ColumnExists) {
    const duplicateRes = await query(
      `
        SELECT
          COUNT(*)::bigint AS total_rows,
          COUNT(*) FILTER (
            WHERE week_52_high IS DISTINCT FROM high_12m
               OR week_52_low IS DISTINCT FROM low_12m
          )::bigint AS mismatch_rows
        FROM stock_metrics_snapshots;
      `
    );
    duplicate12mCheck = duplicateRes.rows[0];
  }

  let parity = {
    legacyTableExists,
    overlapCount: 0,
    missingInMetrics: 0,
    missingInLegacy: 0,
    valueMismatches: 0,
  };

  if (legacyTableExists) {
    const parityRes = await query(
      `
        WITH latest_metrics AS (
          SELECT DISTINCT ON (symbol)
            symbol,
            week_52_high,
            week_52_low,
            week_52_high_date,
            week_52_low_date
          FROM stock_metrics_snapshots
          ORDER BY symbol, as_of_date DESC
        ),
        overlap AS (
          SELECT
            l.symbol,
            l.week_52_high AS legacy_high,
            l.week_52_low AS legacy_low,
            l.high_date AS legacy_high_date,
            l.low_date AS legacy_low_date,
            m.week_52_high AS metrics_high,
            m.week_52_low AS metrics_low,
            m.week_52_high_date AS metrics_high_date,
            m.week_52_low_date AS metrics_low_date
          FROM stock_52_week_levels l
          JOIN latest_metrics m ON m.symbol = l.symbol
        )
        SELECT
          (SELECT COUNT(*)::bigint FROM overlap) AS overlap_count,
          (
            SELECT COUNT(*)::bigint
            FROM stock_52_week_levels l
            LEFT JOIN latest_metrics m ON m.symbol = l.symbol
            WHERE m.symbol IS NULL
          ) AS missing_in_metrics,
          (
            SELECT COUNT(*)::bigint
            FROM latest_metrics m
            LEFT JOIN stock_52_week_levels l ON l.symbol = m.symbol
            WHERE l.symbol IS NULL
          ) AS missing_in_legacy,
          (
            SELECT COUNT(*)::bigint
            FROM overlap o
            WHERE o.legacy_high IS DISTINCT FROM o.metrics_high
               OR o.legacy_low IS DISTINCT FROM o.metrics_low
               OR o.legacy_high_date IS DISTINCT FROM o.metrics_high_date
               OR o.legacy_low_date IS DISTINCT FROM o.metrics_low_date
          ) AS value_mismatches;
      `
    );

    parity = {
      legacyTableExists,
      overlapCount: Number(parityRes.rows[0]?.overlap_count || 0),
      missingInMetrics: Number(parityRes.rows[0]?.missing_in_metrics || 0),
      missingInLegacy: Number(parityRes.rows[0]?.missing_in_legacy || 0),
      valueMismatches: Number(parityRes.rows[0]?.value_mismatches || 0),
    };
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        high12ColumnExists,
        low12ColumnExists,
        duplicate12mCheck,
        parity,
      },
      null,
      2
    )
  );
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
