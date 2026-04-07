/* eslint-disable no-console */

const { seedIpoCalendar, scrapeAndStoreIpoGmp } = require('../../src/modules/ipo/ipo.service');
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
  await seedIpoCalendar({ source: 'smoke_seed_ipo_gmp' });

  const scrapeResult = await scrapeAndStoreIpoGmp({
    source: 'smoke_scraper_ipo_gmp',
  });

  if (scrapeResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one ipo gmp snapshot');
  }

  const latestResponse = await requestJson('/api/v1/ipo/gmp/latest?limit=5');
  assertStatus('ipo gmp latest', latestResponse.response.status, 200);

  const snapshots = latestResponse.body?.data?.snapshots || [];
  if (snapshots.length < 1) {
    throw new Error('expected at least one gmp snapshot in latest list');
  }

  const sample = snapshots[0];

  const historyResponse = await requestJson(`/api/v1/ipo/${sample.ipoId}/gmp?limit=10`);
  assertStatus('ipo gmp history', historyResponse.response.status, 200);

  const latestForIpo = historyResponse.body?.data?.latest;
  if (!latestForIpo) {
    throw new Error('expected latest gmp snapshot for ipo');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scrapeSnapshotDate: scrapeResult.snapshotDate,
        latestCount: snapshots.length,
        sampleIpoId: sample.ipoId,
        latestGmpPercent: latestForIpo.gmpPercent,
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
