const { syncMarketSnapshot } = require('../modules/market/market.service');

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

const DEFAULT_INTERVAL_MS = parsePositiveInt(process.env.MARKET_SYNC_INTERVAL_MS, 60000);
const DEFAULT_ENABLED = parseBoolean(process.env.MARKET_SYNC_ENABLED, true);
const DEFAULT_RUN_ON_START = parseBoolean(process.env.MARKET_SYNC_RUN_ON_START, true);

const state = {
  enabled: DEFAULT_ENABLED,
  running: false,
  intervalMs: DEFAULT_INTERVAL_MS,
  runOnStart: DEFAULT_RUN_ON_START,
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
  lastSnapshotCapturedAt: null,
  totalRuns: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  consecutiveFailures: 0,
};

let intervalHandle = null;
let emitSnapshotEventFn = null;

const emitSnapshotEvent = (snapshot, trigger) => {
  if (typeof emitSnapshotEventFn !== 'function' || !snapshot) {
    return false;
  }

  try {
    return !!emitSnapshotEventFn({
      ...snapshot,
      metadata: {
        ...(snapshot.metadata || {}),
        websocketTrigger: trigger,
      },
    });
  } catch (error) {
    console.error(`[MARKET_SYNC] snapshot websocket emit failed: ${error.message}`);
    return false;
  }
};

const runMarketSyncNow = async (trigger = 'manual') => {
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
    const snapshot = await syncMarketSnapshot();
    const status = snapshot?.metadata?.syncStatus || {};

    state.lastRunCompletedAt = new Date().toISOString();
    state.lastSuccessAt = state.lastRunCompletedAt;
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastError = null;
    state.lastSnapshotCapturedAt = snapshot?.capturedAt || null;
    state.totalSuccesses += 1;
    state.consecutiveFailures = 0;

    console.log(
      `[MARKET_SYNC] trigger=${trigger} captured=${snapshot?.capturedMinute || 'n/a'} ` +
        `trending=${status.trending} priceShockers=${status.priceShockers} ` +
        `nseMostActive=${status.nseMostActive} bseMostActive=${status.bseMostActive}`
    );

    const websocketEmitted = emitSnapshotEvent(snapshot, trigger);

    return {
      skipped: false,
      success: true,
      trigger,
      websocketEmitted,
      snapshot,
    };
  } catch (error) {
    state.lastRunCompletedAt = new Date().toISOString();
    state.lastFailureAt = state.lastRunCompletedAt;
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastError = error.message;
    state.totalFailures += 1;
    state.consecutiveFailures += 1;

    console.error(`[MARKET_SYNC] trigger=${trigger} failed: ${error.message}`);

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

const getMarketSyncSchedulerStatus = () => {
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : null;

  return {
    ...state,
    timerActive: Boolean(intervalHandle),
    uptimeMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0,
  };
};

const startMarketSyncScheduler = (options = {}) => {
  const enabled = parseBoolean(options.enabled, DEFAULT_ENABLED);
  const intervalMs = parsePositiveInt(options.intervalMs, DEFAULT_INTERVAL_MS);
  const runOnStart = parseBoolean(options.runOnStart, DEFAULT_RUN_ON_START);

  if (typeof options.emitSnapshotEvent === 'function') {
    emitSnapshotEventFn = options.emitSnapshotEvent;
  }

  state.enabled = enabled;
  state.intervalMs = intervalMs;
  state.runOnStart = runOnStart;

  if (!enabled) {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }

    state.running = false;
    state.timerActive = false;
    return getMarketSyncSchedulerStatus();
  }

  if (intervalHandle) {
    return getMarketSyncSchedulerStatus();
  }

  state.running = true;
  state.startedAt = new Date().toISOString();

  console.log(`[MARKET_SYNC] Scheduler started. interval=${intervalMs}ms runOnStart=${runOnStart}`);

  intervalHandle = setInterval(() => {
    runMarketSyncNow('interval').catch((error) => {
      console.error(`[MARKET_SYNC] Interval execution failed: ${error.message}`);
    });
  }, intervalMs);

  if (runOnStart) {
    runMarketSyncNow('startup').catch((error) => {
      console.error(`[MARKET_SYNC] Startup sync failed: ${error.message}`);
    });
  }

  return getMarketSyncSchedulerStatus();
};

const stopMarketSyncScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[MARKET_SYNC] Scheduler stopped.');
  }

  state.running = false;
  state.timerActive = false;

  return getMarketSyncSchedulerStatus();
};

module.exports = {
  runMarketSyncNow,
  startMarketSyncScheduler,
  stopMarketSyncScheduler,
  getMarketSyncSchedulerStatus,
};
