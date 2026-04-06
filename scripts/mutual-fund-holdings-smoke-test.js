/* eslint-disable no-console */

const { scrapeAndStoreMutualFundHoldings } = require('../src/modules/institutional/institutional.service');
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
  const syncResult = await scrapeAndStoreMutualFundHoldings({
    source: 'smoke_scraper_mutual_funds',
    months: 8,
    limit: 320,
  });

  if (syncResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one mutual fund holding row');
  }

  const latestResponse = await requestJson('/api/v1/institutional/mutual-funds?limit=10');
  assertStatus('mutual funds latest', latestResponse.response.status, 200);

  const latestRows = latestResponse.body?.data?.rows || [];
  if (latestRows.length < 1) {
    throw new Error('expected latest mutual fund holdings rows');
  }

  const historyResponse = await requestJson(
    '/api/v1/institutional/mutual-funds/history?symbol=RELIANCE&limit=20'
  );
  assertStatus('mutual funds history', historyResponse.response.status, 200);

  const historyRows = historyResponse.body?.data?.rows || [];
  if (historyRows.length < 1) {
    throw new Error('expected mutual fund history rows');
  }

  const topResponse = await requestJson(
    '/api/v1/institutional/mutual-funds/top-holders?symbol=RELIANCE&limit=10'
  );
  assertStatus('mutual funds top holders', topResponse.response.status, 200);

  const topRows = topResponse.body?.data?.rows || [];
  if (topRows.length < 1) {
    throw new Error('expected top mutual fund holder rows');
  }

  const sample = latestRows[0];

  console.log(
    JSON.stringify(
      {
        ok: true,
        holdingMonths: syncResult.holdingMonths.length,
        savedRows: syncResult.savedCount,
        latestCount: latestRows.length,
        historyCount: historyRows.length,
        topCount: topRows.length,
        sample: {
          holdingMonth: sample.holdingMonth,
          symbol: sample.symbol,
          amcName: sample.amcName,
          marketValueCr: sample.marketValueCr,
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
