/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');
const { list52WeekLevels } = require('../src/modules/stocks/stocks.repository');

const run = async () => {
  const tableRes = await query(
    `
      SELECT to_regclass('public.stock_52_week_levels') IS NOT NULL AS stock_52_week_levels_exists;
    `
  );

  const columnsRes = await query(
    `
      SELECT
        EXISTS (
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

  const snapshotRes = await query(
    `
      WITH latest AS (
        SELECT MAX(as_of_date) AS as_of_date
        FROM stock_metrics_snapshots
      )
      SELECT
        (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots) AS total_snapshots,
        (
          SELECT COUNT(*)::bigint
          FROM stock_metrics_snapshots s
          JOIN latest l ON s.as_of_date = l.as_of_date
          WHERE s.week_52_high IS NOT NULL OR s.week_52_low IS NOT NULL
        ) AS latest_rows_with_52w;
    `
  );

  let leaderboardRows = [];
  let leaderboardError = null;

  try {
    leaderboardRows = await list52WeekLevels({ type: 'high', limit: 10 });
  } catch (error) {
    leaderboardError = error.message;
  }

  const stock52WeekLevelsExists = Boolean(tableRes.rows[0]?.stock_52_week_levels_exists);
  const high12Exists = Boolean(columnsRes.rows[0]?.high_12m_exists);
  const low12Exists = Boolean(columnsRes.rows[0]?.low_12m_exists);
  const totalSnapshots = Number(snapshotRes.rows[0]?.total_snapshots || 0);
  const latestRowsWith52w = Number(snapshotRes.rows[0]?.latest_rows_with_52w || 0);

  const checks = {
    legacyTableRemoved: !stock52WeekLevelsExists,
    high12ColumnRemoved: !high12Exists,
    low12ColumnRemoved: !low12Exists,
    leaderboardQueryOperational: !leaderboardError,
    leaderboardCoveragePresentWhenSnapshotsExist:
      totalSnapshots === 0 || latestRowsWith52w === 0 || leaderboardRows.length > 0,
  };

  const ok = Object.values(checks).every(Boolean);

  console.log(
    JSON.stringify(
      {
        ok,
        checks,
        stats: {
          stock52WeekLevelsExists,
          high12Exists,
          low12Exists,
          totalSnapshots,
          latestRowsWith52w,
          leaderboardRowsReturned: leaderboardRows.length,
          leaderboardError,
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
