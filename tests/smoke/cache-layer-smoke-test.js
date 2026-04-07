/* eslint-disable no-console */

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, options);
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

const getHits = (statsBody) => Number(statsBody?.data?.operations?.hits || 0);

const run = async () => {
  const beforeStats = await requestJson('/api/admin/cache/stats');
  assertStatus('cache stats before', beforeStats.response.status, 200);

  const hitsBefore = getHits(beforeStats.body);

  const latest1 = await requestJson('/api/v1/market/snapshot/latest');
  assertStatus('market latest 1', latest1.response.status, 200);

  const latest2 = await requestJson('/api/v1/market/snapshot/latest');
  assertStatus('market latest 2', latest2.response.status, 200);

  const symbol = 'CACHECHK';
  const now = Date.now();

  const ingest = await requestJson(`/api/v1/stocks/${symbol}/ticks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'cache-smoke',
      ticks: [0, 1, 2].map((offset) => ({
        timestamp: new Date(now - offset * 60 * 1000).toISOString(),
        open: 100 + offset,
        high: 101 + offset,
        low: 99 + offset,
        close: 100 + offset,
        volume: 1000 + offset,
      })),
    }),
  });

  assertStatus('tick ingest', ingest.response.status, 201);

  const historyPath = `/api/v1/stocks/${symbol}/history?bucket=1m&limit=10`;
  const history1 = await requestJson(historyPath);
  assertStatus('stock history 1', history1.response.status, 200);

  const history2 = await requestJson(historyPath);
  assertStatus('stock history 2', history2.response.status, 200);

  const afterStats = await requestJson('/api/admin/cache/stats');
  assertStatus('cache stats after', afterStats.response.status, 200);

  const hitsAfter = getHits(afterStats.body);
  const hitDelta = hitsAfter - hitsBefore;

  if (hitDelta < 2) {
    throw new Error(`expected cache hit delta >= 2, got ${hitDelta}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        hitsBefore,
        hitsAfter,
        hitDelta,
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
