const {
  listAlertsByUser,
  createAlert,
  getAlertById,
  updateAlert,
  deleteAlert,
  listActiveAlerts,
  getSymbolTickSnapshots,
  markAlertsTriggered,
} = require('./alerts.repository');
const { queueAlertNotifications } = require('../notifications/notifications.service');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ALERT_EVALUATOR_COOLDOWN_SECONDS = toPositiveInt(
  process.env.ALERT_EVALUATOR_COOLDOWN_SECONDS,
  300
);

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculatePercentChange = (currentPrice, previousClose) => {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(previousClose) || previousClose <= 0) {
    return null;
  }

  return ((currentPrice - previousClose) / previousClose) * 100;
};

const isInCooldownWindow = (alert, evaluatedAtMs, cooldownMs) => {
  if (cooldownMs <= 0 || !alert?.lastTriggeredAt) {
    return false;
  }

  const lastTriggeredAtMs = new Date(alert.lastTriggeredAt).getTime();
  if (!Number.isFinite(lastTriggeredAtMs)) {
    return false;
  }

  return evaluatedAtMs - lastTriggeredAtMs < cooldownMs;
};

const evaluateAlertCondition = (alert, snapshot) => {
  if (!snapshot) {
    return {
      triggered: false,
      reason: 'no_market_data',
      metrics: null,
    };
  }

  const currentPrice = toFiniteNumberOrNull(snapshot.currentPrice);
  const previousClose = toFiniteNumberOrNull(snapshot.previousClose);
  const currentVolume = toFiniteNumberOrNull(snapshot.currentVolume);
  const averageVolume = toFiniteNumberOrNull(snapshot.averageVolume);
  const percentChange = calculatePercentChange(currentPrice, previousClose);

  if (!Number.isFinite(currentPrice)) {
    return {
      triggered: false,
      reason: 'missing_current_price',
      metrics: {
        currentPrice,
        previousClose,
        percentChange,
        currentVolume,
        averageVolume,
      },
    };
  }

  let triggered = false;
  let reason = 'condition_not_met';
  const targetValue = toFiniteNumberOrNull(alert.targetValue);

  switch (alert.alertType) {
    case 'price_above':
      triggered = currentPrice >= targetValue;
      reason = triggered ? 'price_crossed_above_target' : reason;
      break;
    case 'price_below':
      triggered = currentPrice <= targetValue;
      reason = triggered ? 'price_crossed_below_target' : reason;
      break;
    case 'percent_change_up':
      if (percentChange === null) {
        reason = 'missing_previous_close';
      } else {
        triggered = percentChange >= targetValue;
        reason = triggered ? 'percent_change_up_threshold_met' : reason;
      }
      break;
    case 'percent_change_down':
      if (percentChange === null) {
        reason = 'missing_previous_close';
      } else {
        triggered = percentChange <= -Math.abs(targetValue);
        reason = triggered ? 'percent_change_down_threshold_met' : reason;
      }
      break;
    case 'volume_spike':
      if (!Number.isFinite(averageVolume) || averageVolume <= 0 || !Number.isFinite(currentVolume)) {
        reason = 'missing_volume_baseline';
      } else {
        triggered = currentVolume >= averageVolume * targetValue;
        reason = triggered ? 'volume_spike_threshold_met' : reason;
      }
      break;
    case 'daily_change':
      if (percentChange === null) {
        reason = 'missing_previous_close';
      } else {
        triggered = Math.abs(percentChange) >= targetValue;
        reason = triggered ? 'daily_change_threshold_met' : reason;
      }
      break;
    default:
      reason = 'unsupported_alert_type';
      triggered = false;
  }

  return {
    triggered,
    reason,
    metrics: {
      currentPrice,
      previousClose,
      percentChange,
      currentVolume,
      averageVolume,
      currentTs: snapshot.currentTs || null,
    },
  };
};

const listUserAlerts = async (userId, filters) => {
  return listAlertsByUser({
    userId,
    symbol: filters.symbol,
    isActive: filters.isActive,
  });
};

const createUserAlert = async (userId, payload) => {
  return createAlert({
    userId,
    symbol: payload.symbol,
    alertType: payload.alertType,
    targetValue: payload.targetValue,
    isActive: payload.isActive,
    metadata: payload.metadata,
  });
};

const getUserAlert = async (userId, alertId) => {
  return getAlertById({ userId, alertId });
};

const updateUserAlert = async (userId, alertId, payload) => {
  return updateAlert({
    userId,
    alertId,
    symbol: payload.symbol,
    alertType: payload.alertType,
    targetValue: payload.targetValue,
    isActive: payload.isActive,
    metadata: payload.metadata,
  });
};

const deleteUserAlert = async (userId, alertId) => {
  return deleteAlert({ userId, alertId });
};

const evaluateActiveAlerts = async (options = {}) => {
  const evaluatedAt = options.evaluatedAt ? new Date(options.evaluatedAt) : new Date();
  const evaluatedAtIso = evaluatedAt.toISOString();
  const evaluatedAtMs = evaluatedAt.getTime();

  const cooldownSeconds = toPositiveInt(
    options.cooldownSeconds,
    ALERT_EVALUATOR_COOLDOWN_SECONDS
  );
  const cooldownMs = cooldownSeconds * 1000;

  const activeAlerts = await listActiveAlerts();

  if (activeAlerts.length === 0) {
    return {
      evaluatedAt: evaluatedAtIso,
      cooldownSeconds,
      activeAlertCount: 0,
      symbolCount: 0,
      marketDataSymbolCount: 0,
      checkedCount: 0,
      skippedCooldownCount: 0,
      missingMarketDataCount: 0,
      triggeredCount: 0,
      triggeredAlerts: [],
      websocketDispatch: {
        attempted: false,
        success: false,
        emittedCount: 0,
        error: null,
      },
      notificationQueue: {
        evaluatedAt: evaluatedAtIso,
        triggeredCount: 0,
        queuedRequestCount: 0,
        queuedCount: 0,
        dedupedCount: 0,
        skippedNoUserCount: 0,
        skippedNoPushDeviceCount: 0,
      },
    };
  }

  const symbols = [...new Set(activeAlerts.map((alert) => String(alert.symbol || '').trim().toUpperCase()))]
    .filter(Boolean);

  const snapshots = await getSymbolTickSnapshots(symbols);
  const snapshotBySymbol = new Map(
    snapshots.map((snapshot) => [String(snapshot.symbol || '').trim().toUpperCase(), snapshot])
  );

  const triggeredAlerts = [];
  let skippedCooldownCount = 0;
  let missingMarketDataCount = 0;

  for (const alert of activeAlerts) {
    if (isInCooldownWindow(alert, evaluatedAtMs, cooldownMs)) {
      skippedCooldownCount += 1;
      continue;
    }

    const snapshot = snapshotBySymbol.get(String(alert.symbol || '').trim().toUpperCase()) || null;
    const evaluation = evaluateAlertCondition(alert, snapshot);

    if (evaluation.reason === 'no_market_data') {
      missingMarketDataCount += 1;
    }

    if (evaluation.triggered) {
      triggeredAlerts.push({
        id: alert.id,
        userId: alert.userId,
        symbol: alert.symbol,
        alertType: alert.alertType,
        targetValue: alert.targetValue,
        reason: evaluation.reason,
        metrics: evaluation.metrics,
      });
    }
  }

  let notificationQueue = {
    evaluatedAt: evaluatedAtIso,
    triggeredCount: 0,
    queuedRequestCount: 0,
    queuedCount: 0,
    dedupedCount: 0,
    skippedNoUserCount: 0,
    skippedNoPushDeviceCount: 0,
  };

  let websocketDispatch = {
    attempted: false,
    success: false,
    emittedCount: 0,
    error: null,
  };

  if (triggeredAlerts.length > 0) {
    await markAlertsTriggered(
      triggeredAlerts.map((alert) => alert.id),
      evaluatedAtIso
    );

    if (typeof options.onTriggeredAlerts === 'function') {
      websocketDispatch.attempted = true;

      try {
        const dispatchResult = await options.onTriggeredAlerts(triggeredAlerts, {
          evaluatedAt: evaluatedAtIso,
          cooldownSeconds,
        });

        websocketDispatch.success = !dispatchResult?.skipped;
        websocketDispatch.emittedCount = Number.isFinite(dispatchResult?.emittedCount)
          ? dispatchResult.emittedCount
          : 0;
        websocketDispatch.error = dispatchResult?.skipped
          ? dispatchResult.reason || 'websocket_dispatch_skipped'
          : null;
      } catch (error) {
        websocketDispatch.success = false;
        websocketDispatch.error = error.message;
      }
    }

    notificationQueue = await queueAlertNotifications(triggeredAlerts, {
      evaluatedAt: evaluatedAtIso,
    });
  }

  return {
    evaluatedAt: evaluatedAtIso,
    cooldownSeconds,
    activeAlertCount: activeAlerts.length,
    symbolCount: symbols.length,
    marketDataSymbolCount: snapshots.length,
    checkedCount: activeAlerts.length - skippedCooldownCount,
    skippedCooldownCount,
    missingMarketDataCount,
    triggeredCount: triggeredAlerts.length,
    triggeredAlerts,
    websocketDispatch,
    notificationQueue,
  };
};

module.exports = {
  listUserAlerts,
  createUserAlert,
  getUserAlert,
  updateUserAlert,
  deleteUserAlert,
  evaluateActiveAlerts,
};
