/* eslint-disable no-console */

const { scrapeAndStoreBlockDeals } = require('../src/modules/institutional/institutional.service');
const { closePool } = require('../src/db/client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

const requestJson = async (path) => {
  const response = await fetch(`${BASE_URL}${path}`);
  let body;

  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }

  return { response, body };
};

const assertStatus = (label, actual, expected) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

const run = async () => {
  const syncResult = await scrapeAndStoreBlockDeals({
    source: 'smoke_scraper_block_deals',
    days: 10,
    limit: 120,
  });

  if (syncResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one block deal row');
  }

  const latestResponse = await requestJson('/api/v1/institutional/block-deals?limit=10');
  assertStatus('block deals latest', latestResponse.response.status, 200);

  const latestRows = latestResponse.body?.data?.rows || [];
  if (latestRows.length < 1) {
    throw new Error('expected latest block deals rows');
  }

  const sample = latestRows[0];

  const historyResponse = await requestJson(
    '/api/v1/institutional/block-deals/history?exchange=NSE&limit=20'
  );
  assertStatus('block deals history', historyResponse.response.status, 200);

  const historyRows = historyResponse.body?.data?.rows || [];
  if (historyRows.length < 1) {
    throw new Error('expected block deals history rows');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        tradeDates: syncResult.tradeDates.length,
        savedRows: syncResult.savedCount,
        latestCount: latestRows.length,
        historyCount: historyRows.length,
        sample: {
          tradeDate: sample.tradeDate,
          exchange: sample.exchange,
          symbol: sample.symbol,
          totalValueCr: sample.totalValueCr,
        },
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
