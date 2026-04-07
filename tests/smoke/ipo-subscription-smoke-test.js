/* eslint-disable no-console */

const { seedIpoCalendar, scrapeAndStoreIpoSubscriptions } = require('../../src/modules/ipo/ipo.service');
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
  await seedIpoCalendar({ source: 'smoke_seed_ipo_subscription' });

  const scrapeResult = await scrapeAndStoreIpoSubscriptions({
    source: 'smoke_scraper_ipo_subscription',
  });

  if (scrapeResult.savedCount < 1) {
    throw new Error('expected scraper to save at least one ipo subscription snapshot');
  }

  const latestResponse = await requestJson('/api/v1/ipo/subscriptions/latest?limit=5');
  assertStatus('ipo subscriptions latest', latestResponse.response.status, 200);

  const snapshots = latestResponse.body?.data?.snapshots || [];
  if (snapshots.length < 1) {
    throw new Error('expected at least one subscription snapshot in latest list');
  }

  const sample = snapshots[0];

  const historyResponse = await requestJson(`/api/v1/ipo/${sample.ipoId}/subscription?limit=10`);
  assertStatus('ipo subscription history', historyResponse.response.status, 200);

  const latestForIpo = historyResponse.body?.data?.latest;
  if (!latestForIpo) {
    throw new Error('expected latest subscription snapshot for ipo');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scrapeSnapshotDate: scrapeResult.snapshotDate,
        latestCount: snapshots.length,
        sampleIpoId: sample.ipoId,
        latestTotalSubscribed: latestForIpo.totalSubscribed,
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
