/* eslint-disable no-console */

const {
  scrapeAndStoreShareholdingPatterns,
} = require('../src/modules/institutional/institutional.service');
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
  const syncResult = await scrapeAndStoreShareholdingPatterns({
    source: 'smoke_scraper_shareholding_patterns',
    quarters: 10,
    limit: 260,
  });

  if (syncResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one shareholding pattern row');
  }

  const latestResponse = await requestJson('/api/v1/institutional/shareholding?limit=10');
  assertStatus('shareholding latest', latestResponse.response.status, 200);

  const latestRows = latestResponse.body?.data?.rows || [];
  if (latestRows.length < 1) {
    throw new Error('expected latest shareholding pattern rows');
  }

  const historyResponse = await requestJson(
    '/api/v1/institutional/shareholding/history?symbol=RELIANCE&limit=20'
  );
  assertStatus('shareholding history', historyResponse.response.status, 200);

  const historyRows = historyResponse.body?.data?.rows || [];
  if (historyRows.length < 1) {
    throw new Error('expected shareholding history rows');
  }

  const trendsResponse = await requestJson(
    '/api/v1/institutional/shareholding/trends?range=quarterly&limit=6'
  );
  assertStatus('shareholding trends', trendsResponse.response.status, 200);

  const trendsRows = trendsResponse.body?.data?.rows || [];
  if (trendsRows.length < 1) {
    throw new Error('expected shareholding trends rows');
  }

  const sample = latestRows[0];

  console.log(
    JSON.stringify(
      {
        ok: true,
        periods: syncResult.periodEnds.length,
        savedRows: syncResult.savedCount,
        latestCount: latestRows.length,
        historyCount: historyRows.length,
        trendsCount: trendsRows.length,
        sample: {
          periodEnd: sample.periodEnd,
          symbol: sample.symbol,
          promoterHolding: sample.promoterHolding,
          institutionalHolding: sample.institutionalHolding,
          retailHolding: sample.retailHolding,
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
