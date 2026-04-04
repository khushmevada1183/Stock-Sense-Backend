const { checkConnection, query, closePool } = require('./client');

const checkDatabaseReadiness = async () => {
  const connection = await checkConnection();

  const extensionResult = await query(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_extension
      WHERE extname = 'timescaledb'
    ) AS installed;
  `);

  const tableResult = await query(`
    SELECT to_regclass('public.stock_price_ticks') AS table_name;
  `);

  return {
    ...connection,
    timescaleInstalled: extensionResult.rows[0].installed,
    stockPriceTicksTable: tableResult.rows[0].table_name,
  };
};

if (require.main === module) {
  checkDatabaseReadiness()
    .then((result) => {
      console.log('[DB CHECK] Connection OK');
      console.log(`[DB CHECK] Latency: ${result.latencyMs}ms`);
      console.log(`[DB CHECK] Timescale installed: ${result.timescaleInstalled}`);
      console.log(`[DB CHECK] stock_price_ticks table: ${result.stockPriceTicksTable || 'missing'}`);
    })
    .catch((error) => {
      console.error('[DB CHECK] Failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}

module.exports = {
  checkDatabaseReadiness,
};
