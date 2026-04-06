const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const {
  addSymbolSubscription,
  removeSymbolSubscription,
  normalizeSymbol,
} = require('./liveTickStreamer');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

const state = {
  enabled: parseBoolean(process.env.WEBSOCKET_ENABLED, true),
  adapterEnabled: parseBoolean(process.env.WEBSOCKET_REDIS_ADAPTER_ENABLED, true),
  redisConnected: false,
  redisError: null,
  path: process.env.WEBSOCKET_PATH || '/socket.io',
  corsOrigin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
  pingIntervalMs: parsePositiveInt(process.env.WEBSOCKET_PING_INTERVAL_MS, 25000),
  pingTimeoutMs: parsePositiveInt(process.env.WEBSOCKET_PING_TIMEOUT_MS, 20000),
  running: false,
  startedAt: null,
  activeConnections: 0,
  totalConnections: 0,
  totalDisconnections: 0,
  emittedEvents: 0,
  roomsJoined: 0,
  roomsLeft: 0,
  lastEvent: null,
};

let io = null;
let redisPubClient = null;
let redisSubClient = null;
const socketStockSubscriptions = new Map();

const buildCorsOrigin = () => {
  if (state.corsOrigin === '*') {
    return true;
  }

  const origins = String(state.corsOrigin)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
};

const emitEvent = (eventName, payload, room = null) => {
  if (!io) {
    return false;
  }

  if (room) {
    io.to(room).emit(eventName, payload);
  } else {
    io.emit(eventName, payload);
  }

  state.emittedEvents += 1;
  state.lastEvent = {
    eventName,
    room,
    at: new Date().toISOString(),
  };

  return true;
};

const emitMarketSnapshotEvent = (snapshot) => {
  if (!snapshot) {
    return false;
  }

  return emitEvent('market:snapshot', {
    capturedAt: snapshot.capturedAt || null,
    capturedMinute: snapshot.capturedMinute || null,
    source: snapshot.source || null,
    metadata: snapshot.metadata || null,
    trendingCount: Array.isArray(snapshot.trending) ? snapshot.trending.length : 0,
    nseMostActiveCount: Array.isArray(snapshot.nseMostActive) ? snapshot.nseMostActive.length : 0,
    bseMostActiveCount: Array.isArray(snapshot.bseMostActive) ? snapshot.bseMostActive.length : 0,
    priceShockersCount: Array.isArray(snapshot.priceShockers) ? snapshot.priceShockers.length : 0,
  });
};

const getWebSocketServerStatus = () => {
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : null;

  return {
    ...state,
    uptimeMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0,
    ioAttached: Boolean(io),
  };
};

const attachSocketHandlers = () => {
  io.on('connection', (socket) => {
    state.activeConnections += 1;
    state.totalConnections += 1;
    socketStockSubscriptions.set(socket.id, new Set());

    socket.emit('ws:connected', {
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
      server: 'stock-sense-backend',
    });

    socket.on('ws:ping', (payload, callback) => {
      const pongPayload = {
        ok: true,
        echoedPayload: payload || null,
        serverTime: new Date().toISOString(),
      };

      if (typeof callback === 'function') {
        callback(pongPayload);
      } else {
        socket.emit('ws:pong', pongPayload);
      }
    });

    socket.on('market:subscribe-overview', (callback) => {
      socket.join('market:overview');
      state.roomsJoined += 1;

      if (typeof callback === 'function') {
        callback({ ok: true, room: 'market:overview' });
      }
    });

    socket.on('market:unsubscribe-overview', (callback) => {
      socket.leave('market:overview');
      state.roomsLeft += 1;

      if (typeof callback === 'function') {
        callback({ ok: true, room: 'market:overview' });
      }
    });

    socket.on('stock:subscribe', (symbol, callback) => {
      const normalizedSymbol = normalizeSymbol(symbol);
      if (!normalizedSymbol) {
        if (typeof callback === 'function') {
          callback({ ok: false, message: 'symbol is required' });
        }
        return;
      }

      const room = `stock:${normalizedSymbol}`;

      const existingSubscriptions = socketStockSubscriptions.get(socket.id) || new Set();
      const alreadySubscribed = existingSubscriptions.has(normalizedSymbol);

      if (!alreadySubscribed) {
        existingSubscriptions.add(normalizedSymbol);
        socketStockSubscriptions.set(socket.id, existingSubscriptions);
        addSymbolSubscription(normalizedSymbol);
      }

      socket.join(room);
      state.roomsJoined += 1;

      if (typeof callback === 'function') {
        callback({ ok: true, room, symbol: normalizedSymbol, alreadySubscribed });
      }
    });

    socket.on('stock:unsubscribe', (symbol, callback) => {
      const normalizedSymbol = normalizeSymbol(symbol);
      if (!normalizedSymbol) {
        if (typeof callback === 'function') {
          callback({ ok: false, message: 'symbol is required' });
        }
        return;
      }

      const room = `stock:${normalizedSymbol}`;

      const existingSubscriptions = socketStockSubscriptions.get(socket.id) || new Set();
      const wasSubscribed = existingSubscriptions.has(normalizedSymbol);

      if (wasSubscribed) {
        existingSubscriptions.delete(normalizedSymbol);
        socketStockSubscriptions.set(socket.id, existingSubscriptions);
        removeSymbolSubscription(normalizedSymbol);
      }

      socket.leave(room);
      state.roomsLeft += 1;

      if (typeof callback === 'function') {
        callback({ ok: true, room, symbol: normalizedSymbol, wasSubscribed });
      }
    });

    socket.on('disconnect', () => {
      const existingSubscriptions = socketStockSubscriptions.get(socket.id) || new Set();
      existingSubscriptions.forEach((symbol) => {
        removeSymbolSubscription(symbol);
      });
      socketStockSubscriptions.delete(socket.id);

      state.activeConnections = Math.max(0, state.activeConnections - 1);
      state.totalDisconnections += 1;
    });
  });
};

const attachRedisAdapter = async () => {
  const redisUrl = process.env.WEBSOCKET_REDIS_URL || process.env.REDIS_URL;
  if (!redisUrl) {
    state.redisConnected = false;
    state.redisError = 'WEBSOCKET_REDIS_URL or REDIS_URL is not configured';
    return;
  }

  try {
    redisPubClient = createClient({ url: redisUrl });
    redisSubClient = redisPubClient.duplicate();

    redisPubClient.on('error', (error) => {
      state.redisConnected = false;
      state.redisError = error.message;
      console.error(`[WEBSOCKET] Redis pub client error: ${error.message}`);
    });

    redisSubClient.on('error', (error) => {
      state.redisConnected = false;
      state.redisError = error.message;
      console.error(`[WEBSOCKET] Redis sub client error: ${error.message}`);
    });

    await redisPubClient.connect();
    await redisSubClient.connect();

    io.adapter(createAdapter(redisPubClient, redisSubClient));
    state.redisConnected = true;
    state.redisError = null;
  } catch (error) {
    state.redisConnected = false;
    state.redisError = error.message;
    console.error(`[WEBSOCKET] Redis adapter initialization failed: ${error.message}`);
  }
};

const startWebSocketServer = async (httpServer) => {
  if (io) {
    return getWebSocketServerStatus();
  }

  if (!state.enabled) {
    state.running = false;
    return getWebSocketServerStatus();
  }

  io = new Server(httpServer, {
    path: state.path,
    cors: {
      origin: buildCorsOrigin(),
      methods: ['GET', 'POST'],
      credentials: false,
    },
    transports: ['websocket', 'polling'],
    pingInterval: state.pingIntervalMs,
    pingTimeout: state.pingTimeoutMs,
  });

  attachSocketHandlers();

  if (state.adapterEnabled) {
    await attachRedisAdapter();
  }

  state.running = true;
  state.startedAt = new Date().toISOString();

  console.log(
    `[WEBSOCKET] Started path=${state.path} adapterEnabled=${state.adapterEnabled} ` +
      `redisConnected=${state.redisConnected}`
  );

  return getWebSocketServerStatus();
};

const stopWebSocketServer = async () => {
  if (io) {
    await io.close();
    io = null;
  }

  socketStockSubscriptions.clear();

  if (redisPubClient) {
    await redisPubClient.quit();
    redisPubClient = null;
  }

  if (redisSubClient) {
    await redisSubClient.quit();
    redisSubClient = null;
  }

  state.running = false;
  state.redisConnected = false;

  return getWebSocketServerStatus();
};

module.exports = {
  startWebSocketServer,
  stopWebSocketServer,
  getWebSocketServerStatus,
  emitEvent,
  emitMarketSnapshotEvent,
};
