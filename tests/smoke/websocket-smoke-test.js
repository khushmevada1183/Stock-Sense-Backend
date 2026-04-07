/* eslint-disable no-console */

const { io } = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';
const WS_PATH = process.env.WS_PATH || '/socket.io';
const CONNECT_TIMEOUT_MS = Number.parseInt(process.env.WS_CONNECT_TIMEOUT_MS || '10000', 10);
const SNAPSHOT_TIMEOUT_MS = Number.parseInt(process.env.WS_SNAPSHOT_TIMEOUT_MS || '30000', 10);
const SMOKE_SYMBOL = (process.env.WS_SMOKE_SYMBOL || 'RELIANCE').toUpperCase();
const SMOKE_PORTFOLIO_ID =
  process.env.WS_SMOKE_PORTFOLIO_ID || '00000000-0000-0000-0000-000000000001';
const SMOKE_USER_ID =
  process.env.WS_SMOKE_USER_ID || '00000000-0000-0000-0000-000000000001';

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
        resolve(payload || null);
      }
    };

    socket.on(eventName, listener);
  });
};

const requestSocketStatus = async () => {
  const response = await fetch(`${BASE_URL}/api/v1/market/socket/status`);
  const body = await response.json();

  if (response.status !== 200 || !body?.success) {
    throw new Error(`socket status endpoint failed with status=${response.status}`);
  }

  return body?.data?.websocket || body.data;
};

const run = async () => {
  const status = await requestSocketStatus();

  if (!status.enabled) {
    throw new Error('websocket server is disabled (WEBSOCKET_ENABLED=false)');
  }

  const socket = io(BASE_URL, {
    path: WS_PATH,
    transports: ['websocket'],
    timeout: CONNECT_TIMEOUT_MS,
  });

  const connectedPayload = await new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`websocket connection timeout after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    socket.on('connect_error', (error) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`socket connect_error: ${error.message}`));
    });

    socket.on('ws:connected', (payload) => {
      clearTimeout(timeoutHandle);
      resolve(payload || null);
    });
  });

  const subscribeAck = await new Promise((resolve) => {
    socket.emit('market:subscribe-overview', (payload) => resolve(payload || null));
  });

  if (!subscribeAck?.ok) {
    throw new Error('failed to subscribe to market:overview room');
  }

  const stockSubscribeAck = await new Promise((resolve) => {
    socket.emit('stock:subscribe', SMOKE_SYMBOL, (payload) => resolve(payload || null));
  });

  if (!stockSubscribeAck?.ok) {
    throw new Error(`failed to subscribe to stock room for ${SMOKE_SYMBOL}`);
  }

  const portfolioSubscribeAck = await new Promise((resolve) => {
    socket.emit('portfolio:subscribe', SMOKE_PORTFOLIO_ID, (payload) => resolve(payload || null));
  });

  if (!portfolioSubscribeAck?.ok) {
    throw new Error(`failed to subscribe to portfolio room for ${SMOKE_PORTFOLIO_ID}`);
  }

  const alertsSubscribeAck = await new Promise((resolve) => {
    socket.emit('alerts:subscribe', SMOKE_USER_ID, (payload) => resolve(payload || null));
  });

  if (!alertsSubscribeAck?.ok) {
    throw new Error(`failed to subscribe to alert room for ${SMOKE_USER_ID}`);
  }

  const snapshotEventPromise = waitForEvent(
    socket,
    'market:snapshot',
    (payload) => Boolean(payload?.capturedAt),
    SNAPSHOT_TIMEOUT_MS
  );

  const snapshotSync = await requestJson('/api/v1/market/snapshot/sync', {
    method: 'POST',
  });

  if (snapshotSync.response.status !== 200 || !snapshotSync.body?.success) {
    throw new Error(
      `market snapshot sync endpoint failed with status=${snapshotSync.response.status}`
    );
  }

  const snapshotEvent = await snapshotEventPromise;

  const pingStart = Date.now();
  const pingResult = await new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error('ws:ping acknowledgement timed out'));
    }, CONNECT_TIMEOUT_MS);

    socket.emit('ws:ping', { smoke: true }, (payload) => {
      clearTimeout(timeoutHandle);
      resolve(payload || null);
    });
  });

  const unsubscribeAck = await new Promise((resolve) => {
    socket.emit('market:unsubscribe-overview', (payload) => resolve(payload || null));
  });

  const stockUnsubscribeAck = await new Promise((resolve) => {
    socket.emit('stock:unsubscribe', SMOKE_SYMBOL, (payload) => resolve(payload || null));
  });

  const portfolioUnsubscribeAck = await new Promise((resolve) => {
    socket.emit('portfolio:unsubscribe', SMOKE_PORTFOLIO_ID, (payload) => resolve(payload || null));
  });

  const alertsUnsubscribeAck = await new Promise((resolve) => {
    socket.emit('alerts:unsubscribe', SMOKE_USER_ID, (payload) => resolve(payload || null));
  });

  socket.disconnect();

  console.log(
    JSON.stringify(
      {
        ok: true,
        wsPath: WS_PATH,
        socketId: connectedPayload?.socketId || null,
        subscribedRoom: subscribeAck?.room || null,
        stockRoom: stockSubscribeAck?.room || null,
        portfolioRoom: portfolioSubscribeAck?.room || null,
        alertsRoom: alertsSubscribeAck?.room || null,
        unsubscribed: unsubscribeAck?.ok || false,
        stockUnsubscribed: stockUnsubscribeAck?.ok || false,
        portfolioUnsubscribed: portfolioUnsubscribeAck?.ok || false,
        alertsUnsubscribed: alertsUnsubscribeAck?.ok || false,
        snapshotCapturedAt: snapshotEvent?.capturedAt || null,
        snapshotBreadth: snapshotEvent?.breadth || null,
        pingRoundTripMs: Date.now() - pingStart,
        redisAdapterEnabled: status.adapterEnabled,
        redisConnected: status.redisConnected,
        pingResponse: pingResult,
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
