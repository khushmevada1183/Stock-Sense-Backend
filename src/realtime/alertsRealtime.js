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

const normalizeAlert = (alert) => {
  if (!alert || typeof alert !== 'object') {
    return null;
  }

  const id = String(alert.id || '').trim();
  const userId = String(alert.userId || '').trim();
  const symbol = String(alert.symbol || '').trim().toUpperCase();

  if (!id || !userId || !symbol) {
    return null;
  }

  return {
    id,
    userId,
    symbol,
    alertType: String(alert.alertType || '').trim().toLowerCase(),
    targetValue: Number(alert.targetValue),
    reason: String(alert.reason || 'alert_triggered').trim(),
    metrics: alert.metrics && typeof alert.metrics === 'object' ? alert.metrics : {},
  };
};

const state = {
  enabled: parseBoolean(process.env.ALERTS_REALTIME_WEBSOCKET_ENABLED, true),
  totalTriggeredAlerts: 0,
  totalEmittedEvents: 0,
  totalErrors: 0,
  lastSymbol: null,
  lastError: null,
  lastRunAt: null,
};

let emitEventFn = null;

const setAlertsRealtimeEmitter = (emitEvent) => {
  emitEventFn = typeof emitEvent === 'function' ? emitEvent : null;
};

const getAlertsRealtimeStatus = () => {
  return {
    ...state,
    emitterAttached: typeof emitEventFn === 'function',
  };
};

const publishTriggeredAlertsRealtime = async (triggeredAlerts, options = {}) => {
  state.lastRunAt = new Date().toISOString();

  const enabled = parseBoolean(options.enabled, state.enabled);
  if (!enabled) {
    return {
      skipped: true,
      reason: 'alerts-realtime-disabled',
    };
  }

  if (typeof emitEventFn !== 'function') {
    return {
      skipped: true,
      reason: 'websocket-emitter-unavailable',
    };
  }

  const alerts = (Array.isArray(triggeredAlerts) ? triggeredAlerts : [])
    .map(normalizeAlert)
    .filter(Boolean);

  state.totalTriggeredAlerts += alerts.length;

  if (alerts.length === 0) {
    return {
      skipped: true,
      reason: 'no-triggered-alerts',
      triggeredCount: 0,
    };
  }

  let emittedCount = 0;

  alerts.forEach((alert) => {
    state.lastSymbol = alert.symbol;

    const emitted = emitEventFn(
      'alert:triggered',
      {
        alertId: alert.id,
        userId: alert.userId,
        symbol: alert.symbol,
        alertType: alert.alertType,
        targetValue: Number.isFinite(alert.targetValue) ? alert.targetValue : null,
        reason: alert.reason,
        metrics: alert.metrics,
        evaluatedAt: options.evaluatedAt || new Date().toISOString(),
        trigger: options.trigger || 'alert-evaluator',
      },
      `alerts:user:${alert.userId}`
    );

    if (emitted) {
      emittedCount += 1;
    }
  });

  if (emittedCount === 0) {
    state.totalErrors += 1;
    state.lastError = 'websocket-server-inactive';

    return {
      skipped: true,
      reason: 'websocket-server-inactive',
      trigger: options.trigger || 'alert-evaluator',
      triggeredCount: alerts.length,
      emittedCount,
    };
  }

  state.totalEmittedEvents += emittedCount;
  state.lastError = null;

  return {
    skipped: false,
    trigger: options.trigger || 'alert-evaluator',
    triggeredCount: alerts.length,
    emittedCount,
  };
};

module.exports = {
  setAlertsRealtimeEmitter,
  getAlertsRealtimeStatus,
  publishTriggeredAlertsRealtime,
};
