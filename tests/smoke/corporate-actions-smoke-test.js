/* eslint-disable no-console */

const { scrapeAndStoreCorporateActions } = require('../../src/modules/institutional/institutional.service');
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
  const syncResult = await scrapeAndStoreCorporateActions({
    source: 'smoke_scraper_corporate_actions',
    months: 18,
    limit: 260,
  });

  if (syncResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one corporate action row');
  }

  const latestResponse = await requestJson('/api/v1/institutional/corporate-actions?limit=10');
  assertStatus('corporate actions latest', latestResponse.response.status, 200);

  const latestRows = latestResponse.body?.data?.rows || [];
  if (latestRows.length < 1) {
    throw new Error('expected latest corporate action rows');
  }

  const historyResponse = await requestJson(
    '/api/v1/institutional/corporate-actions/history?symbol=RELIANCE&limit=20'
  );
  assertStatus('corporate actions history', historyResponse.response.status, 200);

  const historyRows = historyResponse.body?.data?.rows || [];
  if (historyRows.length < 1) {
    throw new Error('expected corporate action history rows');
  }

  const summaryResponse = await requestJson(
    '/api/v1/institutional/corporate-actions/summary?range=monthly&limit=6'
  );
  assertStatus('corporate actions summary', summaryResponse.response.status, 200);

  const summaryRows = summaryResponse.body?.data?.rows || [];
  if (summaryRows.length < 1) {
    throw new Error('expected corporate action summary rows');
  }

  const sample = latestRows[0];

  console.log(
    JSON.stringify(
      {
        ok: true,
        months: syncResult.actionMonths.length,
        savedRows: syncResult.savedCount,
        latestCount: latestRows.length,
        historyCount: historyRows.length,
        summaryCount: summaryRows.length,
        sample: {
          actionDate: sample.actionDate,
          symbol: sample.symbol,
          actionType: sample.actionType,
          title: sample.title,
          cashValue: sample.cashValue,
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
