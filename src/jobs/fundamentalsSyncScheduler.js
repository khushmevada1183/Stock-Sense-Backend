const { syncFundamentalsBatch } = require('../modules/stocks/fundamentals/fundamentals.service');

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

const DEFAULT_INTERVAL_MS = parsePositiveInt(process.env.FUNDAMENTALS_SYNC_INTERVAL_MS, 6 * 60 * 60 * 1000);
const DEFAULT_ENABLED = parseBoolean(process.env.FUNDAMENTALS_SYNC_SCHEDULER_ENABLED, true);
const DEFAULT_RUN_ON_START = parseBoolean(process.env.FUNDAMENTALS_SYNC_RUN_ON_START, false);
const DEFAULT_INCLUDE_FUNDAMENTALS = parseBoolean(process.env.FUNDAMENTALS_SYNC_INCLUDE_FUNDAMENTALS, true);
const DEFAULT_MAX_SYMBOLS = parsePositiveInt(process.env.FUNDAMENTALS_SYNC_MAX_SYMBOLS, 40);
const DEFAULT_STATEMENT_TYPES = String(
  process.env.FUNDAMENTALS_SYNC_STATEMENT_TYPES || 'quarter_results'
)
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const state = {
  enabled: DEFAULT_ENABLED,
  running: false,
  intervalMs: DEFAULT_INTERVAL_MS,
  runOnStart: DEFAULT_RUN_ON_START,
  includeFundamentals: DEFAULT_INCLUDE_FUNDAMENTALS,
  maxSymbols: DEFAULT_MAX_SYMBOLS,
  statementTypes: DEFAULT_STATEMENT_TYPES,
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
};

let intervalHandle = null;

const runFundamentalsSyncNow = async (trigger = 'manual', options = {}) => {
  if (state.inFlight) {
    return {
      skipped: true,
      reason: 'sync-in-flight',
      trigger,
    };
  }

  state.inFlight = true;
  state.lastTrigger = trigger;
  state.lastRunStartedAt = new Date().toISOString();
  state.totalRuns += 1;

  const startedAtMs = Date.now();

  try {
    const summary = await syncFundamentalsBatch({
      includeFundamentals: parseBoolean(
        options.includeFundamentals,
        state.includeFundamentals
      ),
      maxSymbols: parsePositiveInt(options.maxSymbols, state.maxSymbols),
      statementTypes: options.statementTypes || state.statementTypes,
      symbols: options.symbols || [],
    });

    state.lastRunCompletedAt = new Date().toISOString();
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastSummary = summary;

    if (summary.failed > 0) {
      state.lastFailureAt = state.lastRunCompletedAt;
      state.lastError = `${summary.failed} symbol(s) failed`;
      state.totalFailures += 1;
    } else {
      state.lastSuccessAt = state.lastRunCompletedAt;
      state.lastError = null;
      state.totalSuccesses += 1;
    }

    console.log(
      `[FUNDAMENTALS] trigger=${trigger} processed=${summary.processed} ` +
        `success=${summary.succeeded} failed=${summary.failed}`
    );

    return {
      skipped: false,
      success: summary.failed === 0,
      trigger,
      summary,
    };
  } catch (error) {
    state.lastRunCompletedAt = new Date().toISOString();
    state.lastFailureAt = state.lastRunCompletedAt;
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastError = error.message;
    state.totalFailures += 1;

    console.error(`[FUNDAMENTALS] trigger=${trigger} failed: ${error.message}`);

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

const getFundamentalsSyncStatus = () => {
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : null;

  return {
    ...state,
    timerActive: Boolean(intervalHandle),
    uptimeMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0,
  };
};

const startFundamentalsSyncScheduler = (options = {}) => {
  const enabled = parseBoolean(options.enabled, DEFAULT_ENABLED);
  const intervalMs = parsePositiveInt(options.intervalMs, DEFAULT_INTERVAL_MS);
  const runOnStart = parseBoolean(options.runOnStart, DEFAULT_RUN_ON_START);
  const includeFundamentals = parseBoolean(
    options.includeFundamentals,
    DEFAULT_INCLUDE_FUNDAMENTALS
  );
  const maxSymbols = parsePositiveInt(options.maxSymbols, DEFAULT_MAX_SYMBOLS);

  const statementTypes = Array.isArray(options.statementTypes)
    ? options.statementTypes
    : DEFAULT_STATEMENT_TYPES;

  state.enabled = enabled;
  state.intervalMs = intervalMs;
  state.runOnStart = runOnStart;
  state.includeFundamentals = includeFundamentals;
  state.maxSymbols = maxSymbols;
  state.statementTypes = statementTypes;

  if (!enabled) {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }

    state.running = false;
    state.timerActive = false;
    return getFundamentalsSyncStatus();
  }

  if (intervalHandle) {
    return getFundamentalsSyncStatus();
  }

  state.running = true;
  state.startedAt = new Date().toISOString();

  console.log(
    `[FUNDAMENTALS] Scheduler started. interval=${intervalMs}ms runOnStart=${runOnStart}`
  );

  intervalHandle = setInterval(() => {
    runFundamentalsSyncNow('interval').catch((error) => {
      console.error(`[FUNDAMENTALS] Interval execution failed: ${error.message}`);
    });
  }, intervalMs);

  if (runOnStart) {
    runFundamentalsSyncNow('startup').catch((error) => {
      console.error(`[FUNDAMENTALS] Startup sync failed: ${error.message}`);
    });
  }

  return getFundamentalsSyncStatus();
};

const stopFundamentalsSyncScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[FUNDAMENTALS] Scheduler stopped.');
  }

  state.running = false;
  state.timerActive = false;

  return getFundamentalsSyncStatus();
};

module.exports = {
  runFundamentalsSyncNow,
  startFundamentalsSyncScheduler,
  stopFundamentalsSyncScheduler,
  getFundamentalsSyncStatus,
};
