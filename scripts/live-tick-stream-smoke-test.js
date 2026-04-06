/* eslint-disable no-console */

const { io } = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';
const WS_PATH = process.env.WS_PATH || '/socket.io';
const SYMBOL = (process.env.SMOKE_SYMBOL || 'RELIANCE').toUpperCase();
const TIMEOUT_MS = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || '15000', 10);

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, options);
  let body = null;

  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }

  return { response, body };
};

const assertOkResponse = (label, response, expectedStatus = 200) => {
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected status ${expectedStatus}, got ${response.status}`);
  }
};

const waitForEvent = (socket, eventName, predicate, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      socket.off(eventName, listener);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const listener = (payload) => {
      if (!predicate || predicate(payload)) {
        clearTimeout(timeoutHandle);
        socket.off(eventName, listener);
        resolve(payload);
      }
    };

    socket.on(eventName, listener);
  });
};

const run = async () => {
  const statusBefore = await requestJson('/api/v1/market/ticks/status');
  assertOkResponse('ticks status endpoint', statusBefore.response, 200);

  const streamStatus = statusBefore.body?.data;
  if (!streamStatus?.enabled) {
    throw new Error('Live tick stream is disabled (LIVE_TICK_STREAM_ENABLED=false)');
  }

  const socket = io(BASE_URL, {
    path: WS_PATH,
    transports: ['websocket'],
    timeout: TIMEOUT_MS,
  });

  await waitForEvent(socket, 'ws:connected', null, TIMEOUT_MS);

  const subscribeAck = await new Promise((resolve) => {
    socket.emit('stock:subscribe', SYMBOL, (payload) => resolve(payload || null));
  });

  if (!subscribeAck?.ok) {
    throw new Error(`Failed to subscribe to stock room for ${SYMBOL}`);
  }

  const tickPromise = waitForEvent(
    socket,
    'stock:tick',
    (payload) => payload?.symbol === SYMBOL,
    TIMEOUT_MS
  );

  const syncResponse = await requestJson(
    `/api/v1/market/ticks/sync?symbols=${encodeURIComponent(SYMBOL)}&persist=true`,
    { method: 'POST' }
  );
  assertOkResponse('live tick sync endpoint', syncResponse.response, 200);

  const tickPayload = await tickPromise;

  const latestTickResponse = await requestJson(`/api/v1/stocks/${SYMBOL}/ticks?limit=1`);
  assertOkResponse('stock ticks read endpoint', latestTickResponse.response, 200);

  const latestCount = latestTickResponse.body?.data?.count || 0;
  if (latestCount < 1) {
    throw new Error(`Expected persisted tick rows for ${SYMBOL}`);
  }

  socket.disconnect();

  console.log(
    JSON.stringify(
      {
        ok: true,
        symbol: SYMBOL,
        subscribedRoom: subscribeAck.room,
        tickTimestamp: tickPayload?.timestamp || null,
        tickClose: tickPayload?.close || null,
        persistedRowsRead: latestCount,
        syncSummary: syncResponse.body?.data?.summary || null,
      },
      null,
      2
    )
  );
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
