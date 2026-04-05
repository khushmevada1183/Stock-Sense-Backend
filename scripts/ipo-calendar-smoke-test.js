/* eslint-disable no-console */

const { seedIpoCalendar } = require('../src/modules/ipo/ipo.service');
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
  const seedResult = await seedIpoCalendar({ source: 'smoke_seed_ipo_calendar' });

  const calendarResponse = await requestJson('/api/v1/ipo/calendar?grouped=true&limit=100');
  assertStatus('ipo calendar', calendarResponse.response.status, 200);

  const total = calendarResponse.body?.data?.total || 0;
  if (total < 1) {
    throw new Error('expected at least one IPO entry in calendar');
  }

  const firstEntry =
    calendarResponse.body?.data?.upcoming?.[0] ||
    calendarResponse.body?.data?.active?.[0] ||
    calendarResponse.body?.data?.listed?.[0] ||
    calendarResponse.body?.data?.closed?.[0];

  if (!firstEntry?.id) {
    throw new Error('expected at least one IPO entry with id');
  }

  const detailsResponse = await requestJson(`/api/v1/ipo/${firstEntry.id}`);
  assertStatus('ipo details', detailsResponse.response.status, 200);

  console.log(
    JSON.stringify(
      {
        ok: true,
        seedRequestedCount: seedResult.requestedCount,
        seedSavedCount: seedResult.savedCount,
        total,
        sampleIpoId: firstEntry.id,
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
