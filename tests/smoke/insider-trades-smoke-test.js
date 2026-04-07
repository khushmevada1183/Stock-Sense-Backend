/* eslint-disable no-console */

const { scrapeAndStoreInsiderTrades } = require('../../src/modules/institutional/institutional.service');
const { closePool } = require('../../src/db/client');

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
  const syncResult = await scrapeAndStoreInsiderTrades({
    source: 'smoke_scraper_insider_trades',
    days: 14,
    limit: 220,
  });

  if (syncResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one insider trade row');
  }

  const latestResponse = await requestJson('/api/v1/institutional/insider-trades?limit=10');
  assertStatus('insider trades latest', latestResponse.response.status, 200);

  const latestRows = latestResponse.body?.data?.rows || [];
  if (latestRows.length < 1) {
    throw new Error('expected latest insider trades rows');
  }

  const historyResponse = await requestJson(
    '/api/v1/institutional/insider-trades/history?symbol=RELIANCE&limit=20'
  );
  assertStatus('insider trades history', historyResponse.response.status, 200);

  const historyRows = historyResponse.body?.data?.rows || [];
  if (historyRows.length < 1) {
    throw new Error('expected insider trades history rows');
  }

  const summaryResponse = await requestJson(
    '/api/v1/institutional/insider-trades/summary?range=monthly&limit=6'
  );
  assertStatus('insider trades summary', summaryResponse.response.status, 200);

  const summaryRows = summaryResponse.body?.data?.rows || [];
  if (summaryRows.length < 1) {
    throw new Error('expected insider trades summary rows');
  }

  const sample = latestRows[0];

  console.log(
    JSON.stringify(
      {
        ok: true,
        tradeDates: syncResult.tradeDates.length,
        savedRows: syncResult.savedCount,
        latestCount: latestRows.length,
        historyCount: historyRows.length,
        summaryCount: summaryRows.length,
        sample: {
          tradeDate: sample.tradeDate,
          symbol: sample.symbol,
          insiderName: sample.insiderName,
          transactionType: sample.transactionType,
          tradeValueCr: sample.tradeValueCr,
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
