const { getPool, closePool } = require('../src/db/client');

const DEFAULT_RETENTION = {
  market_snapshots: 7,
  news_articles: 30,
  stock_profile_details: 30,
  technical_indicators: 30,
  stock_price_ticks: 7,
  social_sentiment_snapshots: 30,
  sector_heatmap_snapshots: 30,
  ipo_gmp_snapshots: 30,
  ipo_subscription_snapshots: 30,
  fear_greed_index_snapshots: 30,
  mutual_fund_holdings: 90,
  shareholding_patterns: 90,
  corporate_actions: 90,
  insider_trades: 90,
  portfolio_transactions: 365,
  notification_deliveries: 30,
  user_sessions: 30,
  auth_login_attempts: 30,
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const daysFromArgs = () => {
  const retention = { ...DEFAULT_RETENTION };
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const [key, raw] = arg.slice(2).split('=');
    if (!key || raw == null) continue;
    if (key in retention) retention[key] = toNumber(raw, retention[key]);
  }
  return retention;
};

const identifyRetentionColumn = async (client, tableName) => {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = any($2::text[])
      order by array_position($2::text[], column_name)
      limit 1
    `,
    [tableName, [
      'created_at', 'captured_at', 'captured_minute', 'snapshot_time', 'snapshot_at',
      'published_at', 'trade_date', 'transaction_date', 'last_attempt_at', 'sent_at',
      'last_used_at', 'last_activity', 'updated_at',
    ]]
  );

  return result.rows[0]?.column_name || null;
};

const pruneTable = async (client, tableName, days) => {
  const column = await identifyRetentionColumn(client, tableName);
  if (!column) {
    return { tableName, skipped: true, reason: 'no retention column found' };
  }

  const sql = `delete from public.${tableName} where ${column} < now() - ($1 || ' days')::interval`;
  const result = await client.query(sql, [String(days)]);
  return { tableName, skipped: false, column, deleted: result.rowCount };
};

const main = async () => {
  const retention = daysFromArgs();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results = [];
    for (const [tableName, days] of Object.entries(retention)) {
      const exists = await client.query(
        `select 1 from information_schema.tables where table_schema = 'public' and table_name = $1 limit 1`,
        [tableName]
      );
      if (exists.rowCount === 0) {
        results.push({ tableName, skipped: true, reason: 'table not found' });
        continue;
      }

      results.push(await pruneTable(client, tableName, days));
    }

    await client.query('COMMIT');

    for (const result of results) {
      if (result.skipped) {
        console.log(`[RETENTION] skipped ${result.tableName}: ${result.reason}`);
      } else {
        console.log(`[RETENTION] pruned ${result.deleted} row(s) from ${result.tableName} using ${result.column}`);
      }
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closePool();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error('[RETENTION] Error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  main,
};