/* eslint-disable no-console */

const { scrapeAndStoreEarningsCalendar } = require('../../src/modules/institutional/institutional.service');
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
  const syncResult = await scrapeAndStoreEarningsCalendar({
    source: 'smoke_seed_earnings_calendar',
    quarters: 10,
    limit: 260,
  });

  if (syncResult.savedCount < 1) {
    throw new Error('expected seeder to save at least one earnings calendar row');
  }

  const latestResponse = await requestJson('/api/v1/institutional/earnings-calendar?limit=10');
  assertStatus('earnings calendar latest', latestResponse.response.status, 200);

  const latestRows = latestResponse.body?.data?.rows || [];
  if (latestRows.length < 1) {
    throw new Error('expected latest earnings calendar rows');
  }

  const historyResponse = await requestJson(
    '/api/v1/institutional/earnings-calendar/history?symbol=RELIANCE&limit=20'
  );
  assertStatus('earnings calendar history', historyResponse.response.status, 200);

  const historyRows = historyResponse.body?.data?.rows || [];
  if (historyRows.length < 1) {
    throw new Error('expected earnings calendar history rows');
  }

  const summaryResponse = await requestJson(
    '/api/v1/institutional/earnings-calendar/summary?range=monthly&limit=6'
  );
  assertStatus('earnings calendar summary', summaryResponse.response.status, 200);

  const summaryRows = summaryResponse.body?.data?.rows || [];
  if (summaryRows.length < 1) {
    throw new Error('expected earnings calendar summary rows');
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
        summaryCount: summaryRows.length,
        sample: {
          eventDate: sample.eventDate,
          symbol: sample.symbol,
          fiscalQuarter: sample.fiscalQuarter,
          epsActual: sample.epsActual,
          surprisePercent: sample.surprisePercent,
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
