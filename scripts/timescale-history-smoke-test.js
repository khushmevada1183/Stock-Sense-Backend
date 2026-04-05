/* eslint-disable no-console */

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

const run = async () => {
  const symbol = 'TCS';
  const now = Date.now();

  const ticks = [0, 1, 2, 3, 4, 5].map((offset) => {
    const timestamp = new Date(now - offset * 60 * 1000).toISOString();
    const priceBase = 4200 + offset * 2;

    return {
      timestamp,
      open: priceBase,
      high: priceBase + 5,
      low: priceBase - 5,
      close: priceBase + 1,
      volume: 1000 + offset * 100,
      source: 'timescale-smoke',
      metadata: { test: true },
    };
  });

  const ingestRes = await fetch(`${BASE_URL}/api/v1/stocks/${symbol}/ticks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source: 'timescale-smoke', ticks }),
  });

  const ingestBody = await ingestRes.json();
  if (ingestRes.status !== 201) {
    throw new Error(`ingest failed: ${ingestRes.status} ${JSON.stringify(ingestBody)}`);
  }

  const buckets = ['1m', '5m', '15m', '1d'];
  const results = {};

  for (const bucket of buckets) {
    const historyRes = await fetch(
      `${BASE_URL}/api/v1/stocks/${symbol}/history?bucket=${bucket}&limit=20`
    );

    const historyBody = await historyRes.json();
    if (historyRes.status !== 200) {
      throw new Error(`history(${bucket}) failed: ${historyRes.status} ${JSON.stringify(historyBody)}`);
    }

    if (!historyBody?.data?.items || historyBody.data.items.length === 0) {
      throw new Error(`history(${bucket}) returned no items`);
    }

    const first = historyBody.data.items[0];
    if (
      typeof first.open !== 'number' ||
      typeof first.high !== 'number' ||
      typeof first.low !== 'number' ||
      typeof first.close !== 'number'
    ) {
      throw new Error(`history(${bucket}) missing OHLC numeric fields`);
    }

    results[bucket] = {
      count: historyBody.data.count,
      newestTimestamp: first.timestamp,
      source: historyBody.data.source,
    };
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        symbol,
        ingest: {
          receivedCount: ingestBody?.data?.receivedCount,
          upsertedCount: ingestBody?.data?.upsertedCount,
        },
        history: results,
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
