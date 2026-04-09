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

  const v1RefactorResult = await query(`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'stock_price_ticks'
          AND column_name = 'dataset_type'
      ) AS has_dataset_type,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'stock_price_ticks'
          AND column_name = 'timeframe'
      ) AS has_timeframe,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'stock_price_ticks'
          AND column_name = 'source_family'
      ) AS has_source_family,
      to_regclass('public.stock_metrics_snapshots') AS stock_metrics_snapshots,
      to_regclass('public.stock_profile_details') AS stock_profile_details,
      to_regclass('public.news_article_symbols') AS news_article_symbols;
  `);

  const aggregates = aggregateResult.rows[0] || {};
  const v1Refactor = v1RefactorResult.rows[0] || {};

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
    v1RefactorReadiness: {
      hasDatasetType: Boolean(v1Refactor.has_dataset_type),
      hasTimeframe: Boolean(v1Refactor.has_timeframe),
      hasSourceFamily: Boolean(v1Refactor.has_source_family),
      stockMetricsSnapshots: v1Refactor.stock_metrics_snapshots,
      stockProfileDetails: v1Refactor.stock_profile_details,
      newsArticleSymbols: v1Refactor.news_article_symbols,
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
      console.log(`[DB CHECK] stock_price_ticks.dataset_type: ${result.v1RefactorReadiness.hasDatasetType}`);
      console.log(`[DB CHECK] stock_price_ticks.timeframe: ${result.v1RefactorReadiness.hasTimeframe}`);
      console.log(`[DB CHECK] stock_price_ticks.source_family: ${result.v1RefactorReadiness.hasSourceFamily}`);
      console.log(
        `[DB CHECK] stock_metrics_snapshots table: ${result.v1RefactorReadiness.stockMetricsSnapshots || 'missing'}`
      );
      console.log(
        `[DB CHECK] stock_profile_details table: ${result.v1RefactorReadiness.stockProfileDetails || 'missing'}`
      );
      console.log(
        `[DB CHECK] news_article_symbols table: ${result.v1RefactorReadiness.newsArticleSymbols || 'missing'}`
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
