const {
  listActivePortfolioSubscriptionsBySymbol,
} = require('../modules/portfolio/portfolio.repository');
const {
  getUserPortfolioHoldings,
  getUserPortfolioSummary,
} = require('../modules/portfolio/portfolio.service');

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
  const normalized = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9.&_-]{1,20}$/.test(normalized) ? normalized : null;
};

const state = {
  enabled: parseBoolean(process.env.PORTFOLIO_REALTIME_PNL_ENABLED, true),
  minEmitIntervalMs: parsePositiveInt(process.env.PORTFOLIO_REALTIME_MIN_INTERVAL_MS, 8000),
  totalTickEvents: 0,
  totalPortfolioEvaluations: 0,
  totalEventsEmitted: 0,
  totalErrors: 0,
  lastError: null,
  lastRunAt: null,
  lastSymbol: null,
};

let emitEventFn = null;
const lastEmitByPortfolio = new Map();

const setPortfolioRealtimeEmitter = (emitEvent) => {
  emitEventFn = typeof emitEvent === 'function' ? emitEvent : null;
};

const getPortfolioRealtimeStatus = () => {
  return {
    ...state,
    emitterAttached: typeof emitEventFn === 'function',
    trackedPortfolioRooms: lastEmitByPortfolio.size,
  };
};

const buildTickPayload = (tick) => {
  return {
    symbol: tick.symbol,
    timestamp: tick.timestamp || new Date().toISOString(),
    close: tick.close,
    change: tick.metadata?.change ?? null,
    pChange: tick.metadata?.pChange ?? null,
    source: tick.source || null,
  };
};

const publishPortfolioUpdatesForTick = async (tick, options = {}) => {
  state.totalTickEvents += 1;
  state.lastRunAt = new Date().toISOString();

  const enabled = parseBoolean(options.enabled, state.enabled);
  if (!enabled) {
    return {
      skipped: true,
      reason: 'portfolio-realtime-disabled',
    };
  }

  if (typeof emitEventFn !== 'function') {
    return {
      skipped: true,
      reason: 'websocket-emitter-unavailable',
    };
  }

  const symbol = normalizeSymbol(tick?.symbol);
  if (!symbol) {
    return {
      skipped: true,
      reason: 'invalid-symbol',
    };
  }

  state.lastSymbol = symbol;

  const minEmitIntervalMs = parsePositiveInt(
    options.minEmitIntervalMs,
    state.minEmitIntervalMs
  );

  const subscriptions = await listActivePortfolioSubscriptionsBySymbol(symbol);
  if (subscriptions.length === 0) {
    return {
      skipped: true,
      reason: 'no-active-portfolios-for-symbol',
      symbol,
    };
  }

  let emittedCount = 0;
  let throttledCount = 0;
  const errors = [];

  for (const subscription of subscriptions) {
    const portfolioId = subscription.portfolioId;
    const userId = subscription.userId;

    const lastEmitAt = lastEmitByPortfolio.get(portfolioId) || 0;
    const nowMs = Date.now();

    if (nowMs - lastEmitAt < minEmitIntervalMs) {
      throttledCount += 1;
      continue;
    }

    try {
      const [summary, holdings] = await Promise.all([
        getUserPortfolioSummary(userId, portfolioId),
        getUserPortfolioHoldings(userId, portfolioId),
      ]);

      const holding = holdings.find((item) => item.symbol === symbol) || null;

      const emitted = emitEventFn(
        'portfolio:update',
        {
          portfolioId,
          userId,
          portfolioName: subscription.portfolioName || null,
          trigger: options.trigger || 'live-tick-stream',
          emittedAt: new Date().toISOString(),
          tick: buildTickPayload({ ...tick, symbol }),
          summary,
          holding,
        },
        `portfolio:${portfolioId}`
      );

      if (emitted) {
        emittedCount += 1;
        lastEmitByPortfolio.set(portfolioId, nowMs);
      }

      state.totalPortfolioEvaluations += 1;
    } catch (error) {
      state.totalErrors += 1;
      state.lastError = error.message;
      errors.push({ portfolioId, message: error.message });
    }
  }

  state.totalEventsEmitted += emittedCount;

  return {
    skipped: false,
    symbol,
    subscriptionCount: subscriptions.length,
    emittedCount,
    throttledCount,
    errorCount: errors.length,
    errors,
  };
};

module.exports = {
  setPortfolioRealtimeEmitter,
  getPortfolioRealtimeStatus,
  publishPortfolioUpdatesForTick,
};
