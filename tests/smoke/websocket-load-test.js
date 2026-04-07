/* eslint-disable no-console */

const { io } = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';
const WS_PATH = process.env.WS_PATH || '/socket.io';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseOptionalRate = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(String(value || ''));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const TARGET_CONNECTIONS = parsePositiveInt(process.env.WS_LOAD_CONNECTIONS, 1000);
const BATCH_SIZE = parsePositiveInt(process.env.WS_LOAD_BATCH_SIZE, 200);
const BATCH_DELAY_MS = parsePositiveInt(process.env.WS_LOAD_BATCH_DELAY_MS, 150);
const CONNECT_TIMEOUT_MS = parsePositiveInt(process.env.WS_LOAD_CONNECT_TIMEOUT_MS, 10000);
const PING_SAMPLE_SIZE = parsePositiveInt(process.env.WS_LOAD_PING_SAMPLE_SIZE, 50);
const HOLD_OPEN_MS = parsePositiveInt(process.env.WS_LOAD_HOLD_OPEN_MS, 2000);

const EXPECT_MIN_CONNECTIONS = parseOptionalPositiveInt(process.env.WS_LOAD_EXPECT_MIN_CONNECTIONS);
const EXPECT_MIN_SUCCESS_RATE = parseOptionalRate(process.env.WS_LOAD_EXPECT_MIN_SUCCESS_RATE);

const SUBSCRIBE_OVERVIEW = parseBoolean(process.env.WS_LOAD_SUBSCRIBE_OVERVIEW, true);
const SUBSCRIBE_SYMBOL = String(process.env.WS_LOAD_SUBSCRIBE_SYMBOL || '').trim().toUpperCase();

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

const delay = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const emitWithAck = (socket, eventName, payload, timeoutMs = CONNECT_TIMEOUT_MS) => {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`${eventName} ack timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    const ack = (ackPayload) => {
      clearTimeout(timeoutHandle);
      resolve(ackPayload || null);
    };

    if (payload === undefined) {
      socket.emit(eventName, ack);
      return;
    }

    socket.emit(eventName, payload, ack);
  });
};

const connectOne = async () => {
  const connectStart = Date.now();

  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      path: WS_PATH,
      transports: ['websocket'],
      timeout: CONNECT_TIMEOUT_MS,
      reconnection: false,
      forceNew: true,
    });

    const timeoutHandle = setTimeout(() => {
      cleanup();
      socket.disconnect();
      reject(new Error(`connection timeout after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeoutHandle);
      socket.off('connect_error', onConnectError);
      socket.off('ws:connected', onConnected);
    };

    const onConnectError = (error) => {
      cleanup();
      socket.disconnect();
      reject(new Error(error?.message || 'connect_error'));
    };

    const onConnected = async (payload) => {
      cleanup();

      try {
        if (SUBSCRIBE_OVERVIEW) {
          const ack = await emitWithAck(socket, 'market:subscribe-overview');
          if (!ack?.ok) {
            throw new Error(ack?.message || 'market:subscribe-overview failed');
          }
        }

        if (SUBSCRIBE_SYMBOL) {
          const ack = await emitWithAck(socket, 'stock:subscribe', SUBSCRIBE_SYMBOL);
          if (!ack?.ok) {
            throw new Error(ack?.message || `stock:subscribe failed for ${SUBSCRIBE_SYMBOL}`);
          }
        }

        resolve({
          socket,
          socketId: payload?.socketId || socket.id,
          instanceId: payload?.instanceId || null,
          connectMs: Date.now() - connectStart,
        });
      } catch (error) {
        socket.disconnect();
        reject(error);
      }
    };

    socket.on('connect_error', onConnectError);
    socket.on('ws:connected', onConnected);
  });
};

const percentile = (values, p) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
};

const summarizeFailures = (failures) => {
  const counts = new Map();

  failures.forEach((failure) => {
    const message = String(failure || 'unknown failure').trim();
    counts.set(message, (counts.get(message) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([message, count]) => ({ message, count }));
};

const run = async () => {
  const statusBeforeResponse = await requestJson('/api/v1/market/socket/status');
  if (statusBeforeResponse.response.status !== 200 || !statusBeforeResponse.body?.success) {
    throw new Error(
      `socket status endpoint failed with status=${statusBeforeResponse.response.status}`
    );
  }

  const statusBefore = statusBeforeResponse.body?.data || null;
  if (!statusBefore?.enabled) {
    throw new Error('websocket server is disabled (WEBSOCKET_ENABLED=false)');
  }

  const connections = [];
  const connectLatencies = [];
  const connectionFailures = [];
  const totalBatches = Math.ceil(TARGET_CONNECTIONS / BATCH_SIZE);

  try {
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, TARGET_CONNECTIONS);
      const size = end - start;

      const batchPromises = Array.from({ length: size }, () => connectOne());
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          connections.push(result.value.socket);
          connectLatencies.push(result.value.connectMs);
        } else {
          connectionFailures.push(result.reason?.message || String(result.reason));
        }
      });

      console.log(
        `[WS_LOAD] batch ${batchIndex + 1}/${totalBatches} connected=${connections.length} failed=${connectionFailures.length}`
      );

      if (batchIndex < totalBatches - 1 && BATCH_DELAY_MS > 0) {
        await delay(BATCH_DELAY_MS);
      }
    }

    const pingSockets = connections.slice(0, Math.min(PING_SAMPLE_SIZE, connections.length));
    const pingLatencies = [];
    const pingFailures = [];

    await Promise.all(
      pingSockets.map(async (socket) => {
        const start = Date.now();
        try {
          const ack = await emitWithAck(socket, 'ws:ping', { loadTest: true, at: start });
          if (!ack?.ok) {
            throw new Error('ws:ping ack returned non-ok response');
          }
          pingLatencies.push(Date.now() - start);
        } catch (error) {
          pingFailures.push(error.message);
        }
      })
    );

    if (HOLD_OPEN_MS > 0) {
      await delay(HOLD_OPEN_MS);
    }

    const statusDuringResponse = await requestJson('/api/v1/market/socket/status');
    const statusDuring = statusDuringResponse.body?.data || null;

    connections.forEach((socket) => {
      socket.disconnect();
    });

    await delay(750);

    const statusAfterResponse = await requestJson('/api/v1/market/socket/status');
    const statusAfter = statusAfterResponse.body?.data || null;

    const connectedCount = connections.length;
    const failedCount = connectionFailures.length;
    const attemptedCount = connectedCount + failedCount;
    const successRate = attemptedCount > 0 ? connectedCount / attemptedCount : 0;

    const checks = [];

    if (connectedCount < 1) {
      checks.push('no websocket connections were established');
    }

    if (EXPECT_MIN_CONNECTIONS !== null && connectedCount < EXPECT_MIN_CONNECTIONS) {
      checks.push(
        `connected sockets (${connectedCount}) below WS_LOAD_EXPECT_MIN_CONNECTIONS (${EXPECT_MIN_CONNECTIONS})`
      );
    }

    if (EXPECT_MIN_SUCCESS_RATE !== null && successRate < EXPECT_MIN_SUCCESS_RATE) {
      checks.push(
        `success rate (${successRate.toFixed(4)}) below WS_LOAD_EXPECT_MIN_SUCCESS_RATE (${EXPECT_MIN_SUCCESS_RATE})`
      );
    }

    const summary = {
      ok: checks.length === 0,
      targetConnections: TARGET_CONNECTIONS,
      batchSize: BATCH_SIZE,
      batchDelayMs: BATCH_DELAY_MS,
      holdOpenMs: HOLD_OPEN_MS,
      attemptedCount,
      connectedCount,
      failedCount,
      successRate,
      connectLatencyMs: {
        p50: percentile(connectLatencies, 50),
        p95: percentile(connectLatencies, 95),
        p99: percentile(connectLatencies, 99),
      },
      pingSampleSize: pingSockets.length,
      pingFailures: pingFailures.length,
      pingLatencyMs: {
        p50: percentile(pingLatencies, 50),
        p95: percentile(pingLatencies, 95),
        p99: percentile(pingLatencies, 99),
      },
      failureReasons: summarizeFailures(connectionFailures).slice(0, 10),
      statusBefore: {
        activeConnections: statusBefore?.activeConnections,
        maxConnections: statusBefore?.maxConnections,
        maxSubscriptionsPerSocket: statusBefore?.maxSubscriptionsPerSocket,
        adapterEnabled: statusBefore?.adapterEnabled,
        redisConnected: statusBefore?.redisConnected,
        instanceId: statusBefore?.instanceId,
      },
      statusDuring: {
        activeConnections: statusDuring?.activeConnections,
        totalConnections: statusDuring?.totalConnections,
        rejectedConnections: statusDuring?.rejectedConnections,
        lastRejectedConnection: statusDuring?.lastRejectedConnection || null,
      },
      statusAfter: {
        activeConnections: statusAfter?.activeConnections,
        totalDisconnections: statusAfter?.totalDisconnections,
      },
      checks,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (checks.length > 0) {
      throw new Error(checks.join('; '));
    }
  } finally {
    connections.forEach((socket) => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });
  }
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });