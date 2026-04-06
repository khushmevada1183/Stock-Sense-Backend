const { upsertTicks } = require('../modules/stocks/ticks/ticks.repository');

let NseIndia = null;

try {
  const { NseIndia: NseIndiaClass } = require('stock-nse-india');
  NseIndia = NseIndiaClass;
} catch (error) {
  NseIndia = null;
}

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

const normalizeSymbol = (value) => {
  const symbol = String(value || '').trim().toUpperCase();

  if (!/^[A-Z0-9.&_-]{1,20}$/.test(symbol)) {
    return null;
  }

  return symbol;
};

const normalizeSymbolList = (values = []) => {
  return [...new Set(
    values
      .map((value) => normalizeSymbol(value))
      .filter(Boolean)
  )];
};

const parseSymbolCsv = (value, fallback = []) => {
  const raw = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const normalized = normalizeSymbolList(raw);
  return normalized.length > 0 ? normalized : fallback;
};

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNonNegativeInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const DEFAULT_SYMBOLS = parseSymbolCsv(
  process.env.LIVE_TICK_STREAM_DEFAULT_SYMBOLS,
  ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK']
);

const DEFAULT_INTERVAL_MS = parsePositiveInt(process.env.LIVE_TICK_STREAM_INTERVAL_MS, 15000);
const DEFAULT_MAX_SYMBOLS = parsePositiveInt(process.env.LIVE_TICK_STREAM_MAX_SYMBOLS, 30);
const DEFAULT_ENABLED = parseBoolean(process.env.LIVE_TICK_STREAM_ENABLED, true);
const DEFAULT_RUN_ON_START = parseBoolean(process.env.LIVE_TICK_STREAM_RUN_ON_START, true);
const DEFAULT_PERSIST_TICKS = parseBoolean(process.env.LIVE_TICK_STREAM_PERSIST_TICKS, true);
const DEFAULT_INCLUDE_DEFAULT_SYMBOLS = parseBoolean(
  process.env.LIVE_TICK_STREAM_INCLUDE_DEFAULT_SYMBOLS,
  true
);

const state = {
  enabled: DEFAULT_ENABLED,
  running: false,
  intervalMs: DEFAULT_INTERVAL_MS,
  runOnStart: DEFAULT_RUN_ON_START,
  persistTicks: DEFAULT_PERSIST_TICKS,
  includeDefaultSymbols: DEFAULT_INCLUDE_DEFAULT_SYMBOLS,
  maxSymbols: DEFAULT_MAX_SYMBOLS,
  startedAt: null,
  inFlight: false,
  timerActive: false,
  lastTrigger: null,
  lastRunStartedAt: null,
  lastRunCompletedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastDurationMs: null,
  lastError: null,
  lastSummary: null,
  totalRuns: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  totalTicksEmitted: 0,
  totalTicksPersisted: 0,
  nseClientReady: Boolean(NseIndia),
};

let intervalHandle = null;
let emitEventFn = null;
let nseClient = null;
const subscriptionCounts = new Map();

const getNseClient = () => {
  if (!NseIndia) {
    return null;
  }

  if (!nseClient) {
    nseClient = new NseIndia();
  }

  return nseClient;
};

const getSubscriptionSnapshot = () => {
  const pairs = [...subscriptionCounts.entries()]
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return {
    totalSymbols: pairs.length,
    totalSubscriptions: pairs.reduce((sum, [, count]) => sum + count, 0),
    symbols: pairs.map(([symbol, count]) => ({ symbol, subscriptions: count })),
  };
};

const getTargetSymbols = (options = {}) => {
  const overrideSymbols = Array.isArray(options.symbols)
    ? normalizeSymbolList(options.symbols)
    : null;

  if (overrideSymbols && overrideSymbols.length > 0) {
    return overrideSymbols.slice(0, state.maxSymbols);
  }

  const subscribed = [...subscriptionCounts.entries()]
    .filter(([, count]) => count > 0)
    .map(([symbol]) => symbol);

  const includeDefaultSymbols = parseBoolean(
    options.includeDefaultSymbols,
    state.includeDefaultSymbols
  );

  const combined = includeDefaultSymbols
    ? normalizeSymbolList([...subscribed, ...DEFAULT_SYMBOLS])
    : normalizeSymbolList(subscribed);

  return combined.slice(0, state.maxSymbols);
};

const emitTick = (tick) => {
  if (typeof emitEventFn !== 'function') {
    return false;
  }

  const room = `stock:${tick.symbol}`;

  const stockEmitted = emitEventFn('stock:tick', {
    symbol: tick.symbol,
    timestamp: tick.timestamp,
    open: tick.open,
    high: tick.high,
    low: tick.low,
    close: tick.close,
    volume: tick.volume,
    source: tick.source,
    metadata: tick.metadata,
  }, room);

  emitEventFn('market:tick', {
    symbol: tick.symbol,
    timestamp: tick.timestamp,
    close: tick.close,
    change: tick.metadata?.change || null,
    pChange: tick.metadata?.pChange || null,
    source: tick.source,
  }, 'market:overview');

  return stockEmitted;
};

const fetchTickForSymbol = async (symbol) => {
  const client = getNseClient();

  if (!client) {
    throw new Error('stock-nse-india client unavailable');
  }

  const details = await client.getEquityDetails(symbol);
  const priceInfo = details?.priceInfo || {};

  const close = toFiniteNumber(priceInfo.lastPrice, null);
  if (close === null) {
    throw new Error('lastPrice missing from NSE quote response');
  }

  const open = toFiniteNumber(priceInfo.open, close);
  const high = toFiniteNumber(priceInfo.intraDayHighLow?.max, close);
  const low = toFiniteNumber(priceInfo.intraDayHighLow?.min, close);
  const volume = toNonNegativeInteger(
    priceInfo.totalTradedVolume,
    toNonNegativeInteger(priceInfo.totalTradedQty, null)
  );

  return {
    symbol,
    timestamp: new Date().toISOString(),
    open,
    high,
    low,
    close,
    volume,
    source: 'nse_live_quote_poll',
    metadata: {
      previousClose: toFiniteNumber(priceInfo.previousClose, null),
      change: toFiniteNumber(priceInfo.change, null),
      pChange: toFiniteNumber(priceInfo.pChange, null),
      vwap: toFiniteNumber(priceInfo.vwap, null),
    },
  };
};

const runLiveTickStreamNow = async (trigger = 'manual', options = {}) => {
  if (state.inFlight) {
    return {
      skipped: true,
      reason: 'stream-in-flight',
      trigger,
    };
  }

  const symbols = getTargetSymbols(options);
  if (symbols.length === 0) {
    return {
      skipped: true,
      reason: 'no-symbols-subscribed',
      trigger,
    };
  }

  state.inFlight = true;
  state.lastTrigger = trigger;
  state.lastRunStartedAt = new Date().toISOString();
  state.totalRuns += 1;

  const persistTicks = parseBoolean(options.persistTicks, state.persistTicks);
  const startedAtMs = Date.now();

  const ticks = [];
  const failures = [];

  try {
    for (const symbol of symbols) {
      try {
        const tick = await fetchTickForSymbol(symbol);
        ticks.push(tick);
      } catch (error) {
        failures.push({ symbol, message: error.message });
      }
    }

    let persistedCount = 0;

    if (persistTicks && ticks.length > 0) {
      for (const tick of ticks) {
        persistedCount += await upsertTicks(tick.symbol, [tick]);
      }
    }

    let emittedCount = 0;
    for (const tick of ticks) {
      if (emitTick(tick)) {
        emittedCount += 1;
      }
    }

    if (typeof emitEventFn === 'function') {
      emitEventFn('market:ticks:batch', {
        trigger,
        generatedAt: new Date().toISOString(),
        symbolCount: symbols.length,
        tickCount: ticks.length,
        failureCount: failures.length,
      }, 'market:overview');
    }

    const summary = {
      trigger,
      symbolCount: symbols.length,
      tickCount: ticks.length,
      emittedCount,
      persistedCount,
      failureCount: failures.length,
      failures,
    };

    state.lastRunCompletedAt = new Date().toISOString();
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastSummary = summary;
    state.totalTicksEmitted += emittedCount;
    state.totalTicksPersisted += persistedCount;

    if (failures.length > 0 && ticks.length === 0) {
      state.lastFailureAt = state.lastRunCompletedAt;
      state.lastError = failures[0].message;
      state.totalFailures += 1;
    } else {
      state.lastSuccessAt = state.lastRunCompletedAt;
      state.lastError = failures.length > 0
        ? `${failures.length} symbol(s) failed in latest run`
        : null;
      state.totalSuccesses += 1;
    }

    return {
      skipped: false,
      success: failures.length === 0 || ticks.length > 0,
      summary,
      ticks,
    };
  } catch (error) {
    state.lastRunCompletedAt = new Date().toISOString();
    state.lastFailureAt = state.lastRunCompletedAt;
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastError = error.message;
    state.totalFailures += 1;

    return {
      skipped: false,
      success: false,
      trigger,
      error: error.message,
    };
  } finally {
    state.inFlight = false;
  }
};

const getLiveTickStreamStatus = () => {
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : null;

  return {
    ...state,
    timerActive: Boolean(intervalHandle),
    uptimeMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0,
    defaultSymbols: [...DEFAULT_SYMBOLS],
    subscriptions: getSubscriptionSnapshot(),
  };
};

const startLiveTickStreamScheduler = (options = {}) => {
  const enabled = parseBoolean(options.enabled, state.enabled);
  const intervalMs = parsePositiveInt(options.intervalMs, state.intervalMs);
  const runOnStart = parseBoolean(options.runOnStart, state.runOnStart);
  const persistTicks = parseBoolean(options.persistTicks, state.persistTicks);
  const includeDefaultSymbols = parseBoolean(
    options.includeDefaultSymbols,
    state.includeDefaultSymbols
  );
  const maxSymbols = parsePositiveInt(options.maxSymbols, state.maxSymbols);

  if (typeof options.emitEvent === 'function') {
    emitEventFn = options.emitEvent;
  }

  state.enabled = enabled;
  state.intervalMs = intervalMs;
  state.runOnStart = runOnStart;
  state.persistTicks = persistTicks;
  state.includeDefaultSymbols = includeDefaultSymbols;
  state.maxSymbols = maxSymbols;
  state.nseClientReady = Boolean(NseIndia);

  if (!enabled) {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }

    state.running = false;
    state.timerActive = false;
    return getLiveTickStreamStatus();
  }

  if (intervalHandle) {
    return getLiveTickStreamStatus();
  }

  state.running = true;
  state.startedAt = new Date().toISOString();

  console.log(
    `[LIVE_TICK_STREAM] Scheduler started interval=${intervalMs}ms ` +
      `runOnStart=${runOnStart} persistTicks=${persistTicks}`
  );

  intervalHandle = setInterval(() => {
    runLiveTickStreamNow('interval').catch((error) => {
      console.error(`[LIVE_TICK_STREAM] Interval run failed: ${error.message}`);
    });
  }, intervalMs);

  if (runOnStart) {
    runLiveTickStreamNow('startup').catch((error) => {
      console.error(`[LIVE_TICK_STREAM] Startup run failed: ${error.message}`);
    });
  }

  return getLiveTickStreamStatus();
};

const stopLiveTickStreamScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[LIVE_TICK_STREAM] Scheduler stopped.');
  }

  state.running = false;
  state.timerActive = false;

  return getLiveTickStreamStatus();
};

const addSymbolSubscription = (symbol) => {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return {
      ok: false,
      message: 'invalid symbol',
    };
  }

  const count = subscriptionCounts.get(normalizedSymbol) || 0;
  subscriptionCounts.set(normalizedSymbol, count + 1);

  return {
    ok: true,
    symbol: normalizedSymbol,
    subscriptions: count + 1,
  };
};

const removeSymbolSubscription = (symbol) => {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return {
      ok: false,
      message: 'invalid symbol',
    };
  }

  const count = subscriptionCounts.get(normalizedSymbol) || 0;

  if (count <= 1) {
    subscriptionCounts.delete(normalizedSymbol);
    return {
      ok: true,
      symbol: normalizedSymbol,
      subscriptions: 0,
    };
  }

  subscriptionCounts.set(normalizedSymbol, count - 1);

  return {
    ok: true,
    symbol: normalizedSymbol,
    subscriptions: count - 1,
  };
};

module.exports = {
  runLiveTickStreamNow,
  getLiveTickStreamStatus,
  startLiveTickStreamScheduler,
  stopLiveTickStreamScheduler,
  addSymbolSubscription,
  removeSymbolSubscription,
  normalizeSymbol,
};
