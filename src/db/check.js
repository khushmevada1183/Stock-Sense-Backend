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

  const aggregateResult = await query(`
    SELECT
      to_regclass('public.stock_price_candles_1m') AS candles_1m,
      to_regclass('public.stock_price_candles_5m') AS candles_5m,
      to_regclass('public.stock_price_candles_15m') AS candles_15m,
      to_regclass('public.stock_price_candles_1d') AS candles_1d;
  `);

  const aggregates = aggregateResult.rows[0] || {};

  return {
    ...connection,
    timescaleInstalled: extensionResult.rows[0].installed,
    stockPriceTicksTable: tableResult.rows[0].table_name,
    stockPriceCandleViews: {
      candles1m: aggregates.candles_1m,
      candles5m: aggregates.candles_5m,
      candles15m: aggregates.candles_15m,
      candles1d: aggregates.candles_1d,
    },
  };
};

if (require.main === module) {
  checkDatabaseReadiness()
    .then((result) => {
      console.log('[DB CHECK] Connection OK');
      console.log(`[DB CHECK] Latency: ${result.latencyMs}ms`);
      console.log(`[DB CHECK] Timescale installed: ${result.timescaleInstalled}`);
      console.log(`[DB CHECK] stock_price_ticks table: ${result.stockPriceTicksTable || 'missing'}`);
      console.log(
        `[DB CHECK] stock_price_candles_1m view: ${result.stockPriceCandleViews.candles1m || 'missing'}`
      );
      console.log(
        `[DB CHECK] stock_price_candles_5m view: ${result.stockPriceCandleViews.candles5m || 'missing'}`
      );
      console.log(
        `[DB CHECK] stock_price_candles_15m view: ${result.stockPriceCandleViews.candles15m || 'missing'}`
      );
      console.log(
        `[DB CHECK] stock_price_candles_1d view: ${result.stockPriceCandleViews.candles1d || 'missing'}`
      );
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
