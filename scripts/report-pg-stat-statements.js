/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 100;

const APP_QUERY_NOISE_PATTERNS = [
  '%neon.%',
  '%pg_stat_activity%',
  '%pg_stat_replication%',
  '%pg_stat_subscription%',
  '%pg_stat_database%',
  '%pg_catalog.pg_database_size%',
  '%approximate_working_set_size_seconds%',
  '%pg_current_wal_lsn%',
  '%pg_last_wal_replay_lsn%',
  'SELECT $1%',
  '%postgres exporter - pg_locks metrics%',
];

const APP_DOMAIN_INCLUDE_PATTERNS = [
  '%stock_%',
  '%market_%',
  '%portfolio%',
  '%news_%',
  '%alerts%',
  '%watchlist%',
  '%ipo%',
  '%technical_%',
  '%fundamental%',
  '%shareholding%',
  '%mutual_fund%',
  '%insider_%',
];

const buildNoiseWhereClause = (startingParamIndex) =>
  APP_QUERY_NOISE_PATTERNS.map((_, index) => `query NOT ILIKE $${startingParamIndex + index}`).join('\n    AND ');

const buildIncludeWhereClause = (startingParamIndex) =>
  APP_DOMAIN_INCLUDE_PATTERNS.map((_, index) => `query ILIKE $${startingParamIndex + index}`).join(' OR\n      ');

const buildTopSql = ({ orderBy, appOnly }) => {
  const appOnlyFilter = appOnly ? `\n  AND ${buildNoiseWhereClause(2)}` : '';

  return `
  SELECT
    LEFT(REGEXP_REPLACE(query, '\\s+', ' ', 'g'), 300) AS query_sample,
    calls,
    rows AS total_rows,
    ROUND((rows::numeric / NULLIF(calls, 0)), 2) AS avg_rows_per_call,
    ROUND(total_exec_time::numeric, 2) AS total_exec_time_ms,
    ROUND(mean_exec_time::numeric, 2) AS mean_exec_time_ms
  FROM pg_stat_statements
  WHERE calls > 0${appOnlyFilter}
  ORDER BY ${orderBy} DESC
  LIMIT $1;
`;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, MAX_LIMIT);
};

const parseLimit = () => {
  const limitFlag = process.argv.find((arg) => arg.startsWith('--limit='));
  if (!limitFlag) {
    return DEFAULT_LIMIT;
  }

  return toPositiveInt(limitFlag.split('=')[1], DEFAULT_LIMIT);
};

const ensurePgStatStatements = async () => {
  try {
    await query('SELECT 1 FROM pg_stat_statements LIMIT 1;');
  } catch (error) {
    if (error.code === '42P01') {
      throw new Error(
        'pg_stat_statements is not enabled. Apply migration 036 or run CREATE EXTENSION IF NOT EXISTS pg_stat_statements;'
      );
    }

    throw error;
  }
};

const TOP_BY_ROWS_SQL = buildTopSql({ orderBy: 'rows', appOnly: false });
const TOP_BY_CALLS_SQL = buildTopSql({ orderBy: 'calls', appOnly: false });
const TOP_BY_EXEC_TIME_SQL = buildTopSql({ orderBy: 'total_exec_time', appOnly: false });

const APP_TOP_BY_ROWS_SQL = buildTopSql({ orderBy: 'rows', appOnly: true });
const APP_TOP_BY_CALLS_SQL = buildTopSql({ orderBy: 'calls', appOnly: true });
const APP_TOP_BY_EXEC_TIME_SQL = buildTopSql({ orderBy: 'total_exec_time', appOnly: true });

const APP_QUERY_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM pg_stat_statements
  WHERE calls > 0
    AND ${buildNoiseWhereClause(1)};
`;

const APP_DOMAIN_TOP_BY_EXEC_TIME_SQL = `
  SELECT
    LEFT(REGEXP_REPLACE(query, '\\s+', ' ', 'g'), 300) AS query_sample,
    calls,
    rows AS total_rows,
    ROUND((rows::numeric / NULLIF(calls, 0)), 2) AS avg_rows_per_call,
    ROUND(total_exec_time::numeric, 2) AS total_exec_time_ms,
    ROUND(mean_exec_time::numeric, 2) AS mean_exec_time_ms
  FROM pg_stat_statements
  WHERE calls > 0
    AND (
      ${buildIncludeWhereClause(2)}
    )
  ORDER BY total_exec_time DESC
  LIMIT $1;
`;

const APP_DOMAIN_QUERY_COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM pg_stat_statements
  WHERE calls > 0
    AND (
      ${buildIncludeWhereClause(1)}
    );
`;

const main = async () => {
  const limit = parseLimit();
  const appQueryParams = [limit, ...APP_QUERY_NOISE_PATTERNS];
  const appDomainParams = [limit, ...APP_DOMAIN_INCLUDE_PATTERNS];

  try {
    await ensurePgStatStatements();

    const [
      topByRows,
      topByCalls,
      topByExecTime,
      topAppByRows,
      topAppByCalls,
      topAppByExecTime,
      appQueryCount,
      topAppDomainByExecTime,
      appDomainQueryCount,
    ] = await Promise.all([
      query(TOP_BY_ROWS_SQL, [limit]),
      query(TOP_BY_CALLS_SQL, [limit]),
      query(TOP_BY_EXEC_TIME_SQL, [limit]),
      query(APP_TOP_BY_ROWS_SQL, appQueryParams),
      query(APP_TOP_BY_CALLS_SQL, appQueryParams),
      query(APP_TOP_BY_EXEC_TIME_SQL, appQueryParams),
      query(APP_QUERY_COUNT_SQL, APP_QUERY_NOISE_PATTERNS),
      query(APP_DOMAIN_TOP_BY_EXEC_TIME_SQL, appDomainParams),
      query(APP_DOMAIN_QUERY_COUNT_SQL, APP_DOMAIN_INCLUDE_PATTERNS),
    ]);

    const report = {
      generated_at: new Date().toISOString(),
      limit,
      app_noise_filters: APP_QUERY_NOISE_PATTERNS,
      app_query_candidate_count: appQueryCount.rows[0]?.count ?? 0,
      app_domain_include_filters: APP_DOMAIN_INCLUDE_PATTERNS,
      app_domain_query_candidate_count: appDomainQueryCount.rows[0]?.count ?? 0,
      top_by_rows: topByRows.rows,
      top_by_calls: topByCalls.rows,
      top_by_total_exec_time: topByExecTime.rows,
      top_app_by_rows: topAppByRows.rows,
      top_app_by_calls: topAppByCalls.rows,
      top_app_by_total_exec_time: topAppByExecTime.rows,
      top_app_domain_by_total_exec_time: topAppDomainByExecTime.rows,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await closePool();
  }
};

main().catch((error) => {
  console.error(`[PGSTAT] ${error.message}`);
  process.exit(1);
});