const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const {
  addSymbolSubscription,
  removeSymbolSubscription,
  normalizeSymbol,
} = require('./liveTickStreamer');

const DEFAULT_TRANSPORTS = ['websocket', 'polling'];

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNonNegativeInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

const parseString = (value, fallback) => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const parseTransports = (value) => {
  const transports = String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => DEFAULT_TRANSPORTS.includes(item));

  const unique = [...new Set(transports)];
  return unique.length > 0 ? unique : DEFAULT_TRANSPORTS;
};

const state = {
  enabled: parseBoolean(process.env.WEBSOCKET_ENABLED, true),
  adapterEnabled: parseBoolean(process.env.WEBSOCKET_REDIS_ADAPTER_ENABLED, true),
  redisConnected: false,
  redisError: null,
  path: process.env.WEBSOCKET_PATH || '/socket.io',
  corsOrigin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
  transports: parseTransports(process.env.WEBSOCKET_TRANSPORTS),
  pingIntervalMs: parsePositiveInt(process.env.WEBSOCKET_PING_INTERVAL_MS, 25000),
  pingTimeoutMs: parsePositiveInt(process.env.WEBSOCKET_PING_TIMEOUT_MS, 20000),
  perMessageDeflateEnabled: parseBoolean(
    process.env.WEBSOCKET_PERMESSAGE_DEFLATE_ENABLED,
    true
  ),
  perMessageDeflateThreshold: parsePositiveInt(
    process.env.WEBSOCKET_PERMESSAGE_DEFLATE_THRESHOLD,
    1024
  ),
  maxConnections: parsePositiveInt(process.env.WEBSOCKET_MAX_CONNECTIONS, 2000),
  maxSubscriptionsPerSocket: parsePositiveInt(
    process.env.WEBSOCKET_MAX_SUBSCRIPTIONS_PER_SOCKET,
    50
  ),
  connectRateLimitWindowMs: parsePositiveInt(
    process.env.WEBSOCKET_CONNECT_RATE_LIMIT_WINDOW_MS,
    60000
  ),
  connectRateLimitMax: parseNonNegativeInt(
    process.env.WEBSOCKET_CONNECT_RATE_LIMIT_MAX,
    200
  ),
  instanceId: parseString(process.env.WEBSOCKET_INSTANCE_ID, 'stock-sense-backend'),
  running: false,
  startedAt: null,
  activeConnections: 0,
  totalConnections: 0,
  totalDisconnections: 0,
  rejectedConnections: 0,
  lastRejectedConnection: null,
  emittedEvents: 0,
  roomsJoined: 0,
  roomsLeft: 0,
  lastEvent: null,
};

let io = null;
let redisPubClient = null;
let redisSubClient = null;
const socketOverviewSubscriptions = new Set();
const socketStockSubscriptions = new Map();
const socketPortfolioSubscriptions = new Map();
const socketAlertSubscriptions = new Map();
const connectRateTracker = new Map();

const normalizePortfolioId = (value) => {
  const normalized = String(value || '').trim();
  return /^[0-9a-fA-F-]{36}$/.test(normalized) ? normalized.toLowerCase() : null;
};

const normalizeUserId = (value) => {
  const normalized = String(value || '').trim();
  return /^[0-9a-fA-F-]{36}$/.test(normalized) ? normalized.toLowerCase() : null;
};

const listFromPayload = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === 'object') {
    for (const key of ['data', 'items', 'results', 'rows']) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }
  }

  return [];
};

const normalizeIpAddress = (value) => {
  const rawValue = String(value || '')
    .split(',')[0]
    .trim();

  if (!rawValue) {
    return 'unknown';
  }

  if (rawValue === '::1') {
    return '127.0.0.1';
  }

  if (rawValue.startsWith('::ffff:')) {
    return rawValue.slice(7);
  }

  return rawValue;
};

const resolveClientIpFromRequest = (request) => {
  const headers = request?.headers || {};
  return normalizeIpAddress(
    headers['x-forwarded-for'] ||
      headers['x-real-ip'] ||
      request?.socket?.remoteAddress ||
      request?.connection?.remoteAddress
  );
};

const resolveClientIpFromSocket = (socket) => {
  return normalizeIpAddress(
    socket?.handshake?.headers?.['x-forwarded-for'] ||
      socket?.handshake?.headers?.['x-real-ip'] ||
      socket?.handshake?.address
  );
};

const recordRejectedConnection = (reason, metadata = {}) => {
  state.rejectedConnections += 1;
  state.lastRejectedConnection = {
    reason,
    ...metadata,
    at: new Date().toISOString(),
  };
};

const pruneConnectRateTracker = (nowMs) => {
  const maxAge = state.connectRateLimitWindowMs * 2;
  for (const [ip, entry] of connectRateTracker.entries()) {
    if (nowMs - entry.lastSeenMs > maxAge) {
      connectRateTracker.delete(ip);
    }
  }
};

const consumeConnectionBudget = (clientIp) => {
  const normalizedIp = normalizeIpAddress(clientIp);

  if (state.connectRateLimitMax <= 0) {
    return {
      allowed: true,
      clientIp: normalizedIp,
    };
  }

  const nowMs = Date.now();
  pruneConnectRateTracker(nowMs);

  const existing = connectRateTracker.get(normalizedIp);
  if (!existing || nowMs - existing.windowStartMs >= state.connectRateLimitWindowMs) {
    connectRateTracker.set(normalizedIp, {
      windowStartMs: nowMs,
      count: 1,
      lastSeenMs: nowMs,
    });

    return {
      allowed: true,
      clientIp: normalizedIp,
    };
  }

  if (existing.count >= state.connectRateLimitMax) {
    existing.lastSeenMs = nowMs;
    connectRateTracker.set(normalizedIp, existing);

    return {
      allowed: false,
      reason: 'connect-rate-limit',
      retryAfterMs: Math.max(
        0,
        state.connectRateLimitWindowMs - (nowMs - existing.windowStartMs)
      ),
      clientIp: normalizedIp,
    };
  }

  existing.count += 1;
  existing.lastSeenMs = nowMs;
  connectRateTracker.set(normalizedIp, existing);

  return {
    allowed: true,
    clientIp: normalizedIp,
  };
};

const getSocketSubscriptionCount = (socketId) => {
  const overviewCount = socketOverviewSubscriptions.has(socketId) ? 1 : 0;
  const stockCount = (socketStockSubscriptions.get(socketId) || new Set()).size;
  const portfolioCount = (socketPortfolioSubscriptions.get(socketId) || new Set()).size;
  const alertCount = (socketAlertSubscriptions.get(socketId) || new Set()).size;

  return overviewCount + stockCount + portfolioCount + alertCount;
};

const buildSubscriptionLimitPayload = (socketId) => {
  return {
    ok: false,
    code: 'ERR_WS_SUBSCRIPTION_LIMIT',
    message: `max ${state.maxSubscriptionsPerSocket} subscriptions per socket exceeded`,
    activeSubscriptions: getSocketSubscriptionCount(socketId),
    maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
  };
};

const canAddSubscription = (socketId) => {
  return getSocketSubscriptionCount(socketId) < state.maxSubscriptionsPerSocket;
};

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

  const priceShockers = snapshot.priceShockers || {};
  const gainers = listFromPayload(
    priceShockers.gainers ||
      priceShockers.topGainers ||
      priceShockers.advances ||
      []
  );
  const losers = listFromPayload(
    priceShockers.losers ||
      priceShockers.topLosers ||
      priceShockers.declines ||
      []
  );

  const breadth = {
    gainers: gainers.length,
    losers: losers.length,
    total: gainers.length + losers.length,
  };

  return emitEvent(
    'market:snapshot',
    {
      capturedAt: snapshot.capturedAt || null,
      capturedMinute: snapshot.capturedMinute || null,
      source: snapshot.source || null,
      metadata: snapshot.metadata || null,
      breadth,
      indices: snapshot.trending || {},
      mostActive: {
        nse: snapshot.nseMostActive || {},
        bse: snapshot.bseMostActive || {},
      },
      trendingCount: Array.isArray(snapshot.trending) ? snapshot.trending.length : 0,
      nseMostActiveCount: Array.isArray(snapshot.nseMostActive)
        ? snapshot.nseMostActive.length
        : 0,
      bseMostActiveCount: Array.isArray(snapshot.bseMostActive)
        ? snapshot.bseMostActive.length
        : 0,
      priceShockersCount: Array.isArray(snapshot.priceShockers)
        ? snapshot.priceShockers.length
        : 0,
    },
    'market:overview'
  );
};

const getWebSocketServerStatus = () => {
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : null;

  return {
    ...state,
    connectRateTrackedIps: connectRateTracker.size,
    uptimeMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0,
    ioAttached: Boolean(io),
  };
};

const attachSocketHandlers = () => {
  io.on('connection', (socket) => {
    state.activeConnections += 1;
    state.totalConnections += 1;
    socketStockSubscriptions.set(socket.id, new Set());
    socketPortfolioSubscriptions.set(socket.id, new Set());
    socketAlertSubscriptions.set(socket.id, new Set());

    socket.emit('ws:connected', {
      socketId: socket.id,
      instanceId: state.instanceId,
      connectedAt: new Date().toISOString(),
      server: 'stock-sense-backend',
      clientIp: resolveClientIpFromSocket(socket),
      limits: {
        maxConnections: state.maxConnections,
        maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
      },
    });

    socket.on('ws:ping', (payload, callback) => {
      const pongPayload = {
        ok: true,
        instanceId: state.instanceId,
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
      const alreadySubscribed = socketOverviewSubscriptions.has(socket.id);
      if (!alreadySubscribed && !canAddSubscription(socket.id)) {
        if (typeof callback === 'function') {
          callback(buildSubscriptionLimitPayload(socket.id));
        }
        return;
      }

      if (!alreadySubscribed) {
        socketOverviewSubscriptions.add(socket.id);
        socket.join('market:overview');
        state.roomsJoined += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room: 'market:overview',
          alreadySubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
      }
    });

    socket.on('market:unsubscribe-overview', (callback) => {
      const wasSubscribed = socketOverviewSubscriptions.has(socket.id);
      if (wasSubscribed) {
        socketOverviewSubscriptions.delete(socket.id);
        socket.leave('market:overview');
        state.roomsLeft += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room: 'market:overview',
          wasSubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
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

      if (!alreadySubscribed && !canAddSubscription(socket.id)) {
        if (typeof callback === 'function') {
          callback(buildSubscriptionLimitPayload(socket.id));
        }
        return;
      }

      if (!alreadySubscribed) {
        existingSubscriptions.add(normalizedSymbol);
        socketStockSubscriptions.set(socket.id, existingSubscriptions);
        addSymbolSubscription(normalizedSymbol);
        socket.join(room);
        state.roomsJoined += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room,
          symbol: normalizedSymbol,
          alreadySubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
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
        socket.leave(room);
        state.roomsLeft += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room,
          symbol: normalizedSymbol,
          wasSubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
      }
    });

    socket.on('portfolio:subscribe', (portfolioId, callback) => {
      const normalizedPortfolioId = normalizePortfolioId(portfolioId);
      if (!normalizedPortfolioId) {
        if (typeof callback === 'function') {
          callback({ ok: false, message: 'valid portfolioId is required' });
        }
        return;
      }

      const room = `portfolio:${normalizedPortfolioId}`;
      const existingSubscriptions = socketPortfolioSubscriptions.get(socket.id) || new Set();
      const alreadySubscribed = existingSubscriptions.has(normalizedPortfolioId);

      if (!alreadySubscribed && !canAddSubscription(socket.id)) {
        if (typeof callback === 'function') {
          callback(buildSubscriptionLimitPayload(socket.id));
        }
        return;
      }

      if (!alreadySubscribed) {
        existingSubscriptions.add(normalizedPortfolioId);
        socketPortfolioSubscriptions.set(socket.id, existingSubscriptions);
        socket.join(room);
        state.roomsJoined += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room,
          portfolioId: normalizedPortfolioId,
          alreadySubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
      }
    });

    socket.on('portfolio:unsubscribe', (portfolioId, callback) => {
      const normalizedPortfolioId = normalizePortfolioId(portfolioId);
      if (!normalizedPortfolioId) {
        if (typeof callback === 'function') {
          callback({ ok: false, message: 'valid portfolioId is required' });
        }
        return;
      }

      const room = `portfolio:${normalizedPortfolioId}`;
      const existingSubscriptions = socketPortfolioSubscriptions.get(socket.id) || new Set();
      const wasSubscribed = existingSubscriptions.has(normalizedPortfolioId);

      if (wasSubscribed) {
        existingSubscriptions.delete(normalizedPortfolioId);
        socketPortfolioSubscriptions.set(socket.id, existingSubscriptions);
        socket.leave(room);
        state.roomsLeft += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room,
          portfolioId: normalizedPortfolioId,
          wasSubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
      }
    });

    socket.on('alerts:subscribe', (userId, callback) => {
      const normalizedUserId = normalizeUserId(userId);
      if (!normalizedUserId) {
        if (typeof callback === 'function') {
          callback({ ok: false, message: 'valid userId is required' });
        }
        return;
      }

      const room = `alerts:user:${normalizedUserId}`;
      const existingSubscriptions = socketAlertSubscriptions.get(socket.id) || new Set();
      const alreadySubscribed = existingSubscriptions.has(normalizedUserId);

      if (!alreadySubscribed && !canAddSubscription(socket.id)) {
        if (typeof callback === 'function') {
          callback(buildSubscriptionLimitPayload(socket.id));
        }
        return;
      }

      if (!alreadySubscribed) {
        existingSubscriptions.add(normalizedUserId);
        socketAlertSubscriptions.set(socket.id, existingSubscriptions);
        socket.join(room);
        state.roomsJoined += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room,
          userId: normalizedUserId,
          alreadySubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
      }
    });

    socket.on('alerts:unsubscribe', (userId, callback) => {
      const normalizedUserId = normalizeUserId(userId);
      if (!normalizedUserId) {
        if (typeof callback === 'function') {
          callback({ ok: false, message: 'valid userId is required' });
        }
        return;
      }

      const room = `alerts:user:${normalizedUserId}`;
      const existingSubscriptions = socketAlertSubscriptions.get(socket.id) || new Set();
      const wasSubscribed = existingSubscriptions.has(normalizedUserId);

      if (wasSubscribed) {
        existingSubscriptions.delete(normalizedUserId);
        socketAlertSubscriptions.set(socket.id, existingSubscriptions);
        socket.leave(room);
        state.roomsLeft += 1;
      }

      if (typeof callback === 'function') {
        callback({
          ok: true,
          room,
          userId: normalizedUserId,
          wasSubscribed,
          activeSubscriptions: getSocketSubscriptionCount(socket.id),
          maxSubscriptionsPerSocket: state.maxSubscriptionsPerSocket,
        });
      }
    });

    socket.on('disconnect', () => {
      const existingStockSubscriptions = socketStockSubscriptions.get(socket.id) || new Set();
      existingStockSubscriptions.forEach((symbol) => {
        removeSymbolSubscription(symbol);
      });

      socketOverviewSubscriptions.delete(socket.id);
      socketStockSubscriptions.delete(socket.id);
      socketPortfolioSubscriptions.delete(socket.id);
      socketAlertSubscriptions.delete(socket.id);

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

const buildAllowRequestHandler = () => {
  return (request, callback) => {
    const clientIp = resolveClientIpFromRequest(request);

    const budget = consumeConnectionBudget(clientIp);
    if (!budget.allowed) {
      recordRejectedConnection('connect-rate-limit', {
        clientIp: budget.clientIp,
        retryAfterMs: budget.retryAfterMs,
      });
      callback('websocket connection rate limit exceeded', false);
      return;
    }

    if (state.activeConnections >= state.maxConnections) {
      recordRejectedConnection('max-connections', {
        clientIp,
        activeConnections: state.activeConnections,
        maxConnections: state.maxConnections,
      });
      callback('websocket connection limit reached', false);
      return;
    }

    callback(null, true);
  };
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
    transports: state.transports,
    pingInterval: state.pingIntervalMs,
    pingTimeout: state.pingTimeoutMs,
    perMessageDeflate: state.perMessageDeflateEnabled
      ? { threshold: state.perMessageDeflateThreshold }
      : false,
    allowRequest: buildAllowRequestHandler(),
  });

  attachSocketHandlers();

  if (state.adapterEnabled) {
    await attachRedisAdapter();
  }

  state.running = true;
  state.startedAt = new Date().toISOString();

  console.log(
    `[WEBSOCKET] Started path=${state.path} adapterEnabled=${state.adapterEnabled} ` +
      `redisConnected=${state.redisConnected} transports=${state.transports.join(',')} ` +
      `instanceId=${state.instanceId}`
  );

  return getWebSocketServerStatus();
};

const stopWebSocketServer = async () => {
  if (io) {
    await io.close();
    io = null;
  }

  socketOverviewSubscriptions.clear();
  socketStockSubscriptions.clear();
  socketPortfolioSubscriptions.clear();
  socketAlertSubscriptions.clear();
  connectRateTracker.clear();

  if (redisPubClient) {
    await redisPubClient.quit();
    redisPubClient = null;
  }

  if (redisSubClient) {
    await redisSubClient.quit();
    redisSubClient = null;
  }

  state.running = false;
  state.startedAt = null;
  state.activeConnections = 0;
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