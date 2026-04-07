/* eslint-disable no-console */

const { seedIpoCalendar } = require('../../src/modules/ipo/ipo.service');
const { scrapeAndStoreFiiDiiFlows } = require('../../src/modules/institutional/institutional.service');
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
  await seedIpoCalendar({ source: 'smoke_seed_fii_dii' });

  const syncResult = await scrapeAndStoreFiiDiiFlows({
    source: 'smoke_scraper_fii_dii',
    days: 15,
  });

  if (syncResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one fii/dii row');
  }

  const latestResponse = await requestJson('/api/v1/institutional/fii-dii?limit=5');
  assertStatus('fii-dii latest', latestResponse.response.status, 200);

  const latestRows = latestResponse.body?.data?.summary || [];
  if (latestRows.length < 1) {
    throw new Error('expected latest fii/dii summary rows');
  }

  const historyResponse = await requestJson('/api/v1/institutional/fii-dii/history?limit=20');
  assertStatus('fii-dii history', historyResponse.response.status, 200);

  const historyRows = historyResponse.body?.data?.rows || [];
  if (historyRows.length < 1) {
    throw new Error('expected fii/dii history rows');
  }

  const cumulativeResponse = await requestJson(
    '/api/v1/institutional/fii-dii/cumulative?range=monthly&limit=6'
  );
  assertStatus('fii-dii cumulative', cumulativeResponse.response.status, 200);

  const cumulativeRows = cumulativeResponse.body?.data?.rows || [];
  if (cumulativeRows.length < 1) {
    throw new Error('expected cumulative fii/dii rows');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        syncedDates: syncResult.flowDates.length,
        savedRows: syncResult.savedCount,
        latestCount: latestRows.length,
        historyCount: historyRows.length,
        cumulativeCount: cumulativeRows.length,
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
