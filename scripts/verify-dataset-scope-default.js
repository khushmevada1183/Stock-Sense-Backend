/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');
const { getHistoryCandles } = require('../src/modules/stocks/ticks/ticks.repository');

const run = async () => {
  const recent = await query(
    `
      SELECT symbol
      FROM stock_price_ticks
      WHERE dataset_type = 'test'
      ORDER BY ts DESC
      LIMIT 1;
    `
  );

  const symbol = recent.rows[0] && recent.rows[0].symbol ? recent.rows[0].symbol : null;
  if (!symbol) {
    throw new Error('No test dataset symbol found in stock_price_ticks');
  }

  const result = await getHistoryCandles(symbol, {
    bucket: '1m',
    from: null,
    to: null,
    limit: 10,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        datasetScope: process.env.STOCKS_V1_DEFAULT_DATASET_SCOPE || 'prod',
        symbol,
        count: result.items.length,
        source: result.source,
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
