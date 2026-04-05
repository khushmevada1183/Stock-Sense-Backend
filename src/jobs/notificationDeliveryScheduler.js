const { processQueuedNotifications } = require('../modules/notifications/notifications.service');

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

const DEFAULT_INTERVAL_MS = parsePositiveInt(process.env.NOTIFICATION_DELIVERY_INTERVAL_MS, 30000);
const DEFAULT_ENABLED = parseBoolean(process.env.NOTIFICATION_DELIVERY_ENABLED, true);
const DEFAULT_RUN_ON_START = parseBoolean(process.env.NOTIFICATION_DELIVERY_RUN_ON_START, true);

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
  lastSummary: null,
  totalRuns: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  consecutiveFailures: 0,
};

let intervalHandle = null;

const runNotificationDeliveryNow = async (trigger = 'manual') => {
  if (state.inFlight) {
    return {
      skipped: true,
      reason: 'delivery-in-flight',
      trigger,
    };
  }

  state.inFlight = true;
  state.lastTrigger = trigger;
  state.lastRunStartedAt = new Date().toISOString();
  state.totalRuns += 1;

  const startedAtMs = Date.now();

  try {
    const summary = await processQueuedNotifications();

    state.lastRunCompletedAt = new Date().toISOString();
    state.lastSuccessAt = state.lastRunCompletedAt;
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastError = null;
    state.lastSummary = summary;
    state.totalSuccesses += 1;
    state.consecutiveFailures = 0;

    console.log(
      `[NOTIFICATION_DELIVERY] trigger=${trigger} claimed=${summary.claimedCount} ` +
        `sent=${summary.sentCount} failed=${summary.failedCount}`
    );

    return {
      skipped: false,
      success: true,
      trigger,
      summary,
    };
  } catch (error) {
    state.lastRunCompletedAt = new Date().toISOString();
    state.lastFailureAt = state.lastRunCompletedAt;
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastError = error.message;
    state.totalFailures += 1;
    state.consecutiveFailures += 1;

    console.error(`[NOTIFICATION_DELIVERY] trigger=${trigger} failed: ${error.message}`);

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

const getNotificationDeliverySchedulerStatus = () => {
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : null;

  return {
    ...state,
    timerActive: Boolean(intervalHandle),
    uptimeMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0,
  };
};

const startNotificationDeliveryScheduler = (options = {}) => {
  const enabled = parseBoolean(options.enabled, DEFAULT_ENABLED);
  const intervalMs = parsePositiveInt(options.intervalMs, DEFAULT_INTERVAL_MS);
  const runOnStart = parseBoolean(options.runOnStart, DEFAULT_RUN_ON_START);

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
    return getNotificationDeliverySchedulerStatus();
  }

  if (intervalHandle) {
    return getNotificationDeliverySchedulerStatus();
  }

  state.running = true;
  state.startedAt = new Date().toISOString();

  console.log(
    `[NOTIFICATION_DELIVERY] Scheduler started. interval=${intervalMs}ms runOnStart=${runOnStart}`
  );

  intervalHandle = setInterval(() => {
    runNotificationDeliveryNow('interval').catch((error) => {
      console.error(`[NOTIFICATION_DELIVERY] Interval execution failed: ${error.message}`);
    });
  }, intervalMs);

  if (runOnStart) {
    runNotificationDeliveryNow('startup').catch((error) => {
      console.error(`[NOTIFICATION_DELIVERY] Startup execution failed: ${error.message}`);
    });
  }

  return getNotificationDeliverySchedulerStatus();
};

const stopNotificationDeliveryScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[NOTIFICATION_DELIVERY] Scheduler stopped.');
  }

  state.running = false;
  state.timerActive = false;

  return getNotificationDeliverySchedulerStatus();
};

module.exports = {
  runNotificationDeliveryNow,
  startNotificationDeliveryScheduler,
  stopNotificationDeliveryScheduler,
  getNotificationDeliverySchedulerStatus,
};
