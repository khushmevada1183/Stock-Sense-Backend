const { recomputeTechnicalIndicatorsBatch } = require('../modules/stocks/technical/technical.service');

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

const parseHHMM = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const hours = Math.floor(parsed / 100);
  const minutes = parsed % 100;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }

  return parsed;
};

const parseWeekdays = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = String(value)
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((day) => Number.isFinite(day) && day >= 0 && day <= 6);

  return parsed.length > 0 ? [...new Set(parsed)] : fallback;
};

const DEFAULT_INTERVAL_MS = parsePositiveInt(process.env.TECHNICAL_INDICATOR_INTERVAL_MS, 15 * 60 * 1000);
const DEFAULT_ENABLED = parseBoolean(process.env.TECHNICAL_INDICATOR_SCHEDULER_ENABLED, true);
const DEFAULT_RUN_ON_START = parseBoolean(process.env.TECHNICAL_INDICATOR_RUN_ON_START, false);
const DEFAULT_MARKET_HOURS_ONLY = parseBoolean(process.env.TECHNICAL_INDICATOR_MARKET_HOURS_ONLY, true);
const DEFAULT_FORCE_RUN = parseBoolean(process.env.TECHNICAL_INDICATOR_FORCE_RUN, false);
const DEFAULT_TIMEZONE = process.env.TECHNICAL_INDICATOR_MARKET_TIMEZONE || 'Asia/Kolkata';
const DEFAULT_MARKET_OPEN_HHMM = parseHHMM(process.env.TECHNICAL_INDICATOR_MARKET_OPEN_HHMM, 915);
const DEFAULT_MARKET_CLOSE_HHMM = parseHHMM(process.env.TECHNICAL_INDICATOR_MARKET_CLOSE_HHMM, 1530);
const DEFAULT_MARKET_WEEKDAYS = parseWeekdays(process.env.TECHNICAL_INDICATOR_MARKET_WEEKDAYS, [1, 2, 3, 4, 5]);

const state = {
  enabled: DEFAULT_ENABLED,
  running: false,
  intervalMs: DEFAULT_INTERVAL_MS,
  runOnStart: DEFAULT_RUN_ON_START,
  marketHoursOnly: DEFAULT_MARKET_HOURS_ONLY,
  forceRun: DEFAULT_FORCE_RUN,
  marketTimeZone: DEFAULT_TIMEZONE,
  marketOpenHHMM: DEFAULT_MARKET_OPEN_HHMM,
  marketCloseHHMM: DEFAULT_MARKET_CLOSE_HHMM,
  marketWeekdays: DEFAULT_MARKET_WEEKDAYS,
  startedAt: null,
  inFlight: false,
  timerActive: false,
  lastTrigger: null,
  lastRunStartedAt: null,
  lastRunCompletedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastSkippedAt: null,
  lastSkipReason: null,
  lastDurationMs: null,
  lastError: null,
  lastSummary: null,
  totalRuns: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  totalSkips: 0,
};

let intervalHandle = null;

const getMarketClock = (timeZone) => {
  const zonedNow = new Date(new Date().toLocaleString('en-US', { timeZone }));

  return {
    iso: zonedNow.toISOString(),
    weekday: zonedNow.getDay(),
    hhmm: zonedNow.getHours() * 100 + zonedNow.getMinutes(),
  };
};

const isWithinMarketWindow = () => {
  if (!state.marketHoursOnly || state.forceRun) {
    return {
      isOpen: true,
      reason: state.forceRun ? 'force_run_enabled' : 'market_hours_filter_disabled',
      clock: getMarketClock(state.marketTimeZone),
    };
  }

  const clock = getMarketClock(state.marketTimeZone);

  if (!state.marketWeekdays.includes(clock.weekday)) {
    return {
      isOpen: false,
      reason: 'outside_market_weekdays',
      clock,
    };
  }

  if (clock.hhmm < state.marketOpenHHMM || clock.hhmm > state.marketCloseHHMM) {
    return {
      isOpen: false,
      reason: 'outside_market_hours',
      clock,
    };
  }

  return {
    isOpen: true,
    reason: 'market_open',
    clock,
  };
};

const runTechnicalIndicatorRecomputeNow = async (trigger = 'manual', options = {}) => {
  if (state.inFlight) {
    return {
      skipped: true,
      reason: 'recompute-in-flight',
      trigger,
    };
  }

  const bypassMarketWindow = parseBoolean(options.ignoreMarketHours, false);
  const marketWindow = isWithinMarketWindow();

  if (!bypassMarketWindow && !marketWindow.isOpen) {
    state.lastTrigger = trigger;
    state.lastSkippedAt = new Date().toISOString();
    state.lastSkipReason = marketWindow.reason;
    state.totalSkips += 1;

    return {
      skipped: true,
      reason: marketWindow.reason,
      trigger,
      marketClock: marketWindow.clock,
    };
  }

  state.inFlight = true;
  state.lastTrigger = trigger;
  state.lastRunStartedAt = new Date().toISOString();
  state.totalRuns += 1;

  const startedAtMs = Date.now();

  try {
    const summary = await recomputeTechnicalIndicatorsBatch(options);

    state.lastRunCompletedAt = new Date().toISOString();
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastSummary = summary;

    if (summary.failures > 0) {
      state.lastFailureAt = state.lastRunCompletedAt;
      state.lastError = `${summary.failures} task(s) failed`;
      state.totalFailures += 1;
    } else {
      state.lastSuccessAt = state.lastRunCompletedAt;
      state.lastError = null;
      state.totalSuccesses += 1;
    }

    console.log(
      `[TECHNICAL_INDICATORS] trigger=${trigger} tasks=${summary.totalTasks} ` +
        `successes=${summary.successes} skipped=${summary.skipped} failures=${summary.failures}`
    );

    return {
      skipped: false,
      success: summary.failures === 0,
      trigger,
      summary,
    };
  } catch (error) {
    state.lastRunCompletedAt = new Date().toISOString();
    state.lastFailureAt = state.lastRunCompletedAt;
    state.lastDurationMs = Date.now() - startedAtMs;
    state.lastError = error.message;
    state.totalFailures += 1;

    console.error(`[TECHNICAL_INDICATORS] trigger=${trigger} failed: ${error.message}`);

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

const getTechnicalIndicatorSchedulerStatus = () => {
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : null;
  const marketWindow = isWithinMarketWindow();

  return {
    ...state,
    timerActive: Boolean(intervalHandle),
    uptimeMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : 0,
    marketWindow,
  };
};

const startTechnicalIndicatorScheduler = (options = {}) => {
  const enabled = parseBoolean(options.enabled, DEFAULT_ENABLED);
  const intervalMs = parsePositiveInt(options.intervalMs, DEFAULT_INTERVAL_MS);
  const runOnStart = parseBoolean(options.runOnStart, DEFAULT_RUN_ON_START);
  const marketHoursOnly = parseBoolean(options.marketHoursOnly, DEFAULT_MARKET_HOURS_ONLY);
  const forceRun = parseBoolean(options.forceRun, DEFAULT_FORCE_RUN);
  const marketTimeZone = String(options.marketTimeZone || DEFAULT_TIMEZONE);
  const marketOpenHHMM = parseHHMM(options.marketOpenHHMM, DEFAULT_MARKET_OPEN_HHMM);
  const marketCloseHHMM = parseHHMM(options.marketCloseHHMM, DEFAULT_MARKET_CLOSE_HHMM);
  const marketWeekdays = parseWeekdays(options.marketWeekdays, DEFAULT_MARKET_WEEKDAYS);

  state.enabled = enabled;
  state.intervalMs = intervalMs;
  state.runOnStart = runOnStart;
  state.marketHoursOnly = marketHoursOnly;
  state.forceRun = forceRun;
  state.marketTimeZone = marketTimeZone;
  state.marketOpenHHMM = marketOpenHHMM;
  state.marketCloseHHMM = marketCloseHHMM;
  state.marketWeekdays = marketWeekdays;

  if (!enabled) {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }

    state.running = false;
    state.timerActive = false;
    return getTechnicalIndicatorSchedulerStatus();
  }

  if (intervalHandle) {
    return getTechnicalIndicatorSchedulerStatus();
  }

  state.running = true;
  state.startedAt = new Date().toISOString();

  console.log(
    `[TECHNICAL_INDICATORS] Scheduler started. interval=${intervalMs}ms ` +
      `runOnStart=${runOnStart} marketHoursOnly=${marketHoursOnly}`
  );

  intervalHandle = setInterval(() => {
    runTechnicalIndicatorRecomputeNow('interval').catch((error) => {
      console.error(`[TECHNICAL_INDICATORS] Interval execution failed: ${error.message}`);
    });
  }, intervalMs);

  if (runOnStart) {
    runTechnicalIndicatorRecomputeNow('startup').catch((error) => {
      console.error(`[TECHNICAL_INDICATORS] Startup recompute failed: ${error.message}`);
    });
  }

  return getTechnicalIndicatorSchedulerStatus();
};

const stopTechnicalIndicatorScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[TECHNICAL_INDICATORS] Scheduler stopped.');
  }

  state.running = false;
  state.timerActive = false;

  return getTechnicalIndicatorSchedulerStatus();
};

module.exports = {
  runTechnicalIndicatorRecomputeNow,
  startTechnicalIndicatorScheduler,
  stopTechnicalIndicatorScheduler,
  getTechnicalIndicatorSchedulerStatus,
};
