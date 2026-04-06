/* eslint-disable no-console */

const { io } = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';
const WS_PATH = process.env.WS_PATH || '/socket.io';
const CONNECT_TIMEOUT_MS = Number.parseInt(process.env.WS_CONNECT_TIMEOUT_MS || '10000', 10);

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

  socket.disconnect();

  console.log(
    JSON.stringify(
      {
        ok: true,
        wsPath: WS_PATH,
        socketId: connectedPayload?.socketId || null,
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
