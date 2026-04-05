const { findUsersByIds } = require('../auth/auth.repository');
const {
  createNotificationDeliveries,
  listNotificationDeliveriesByUser,
  registerPushDevice,
  listPushDevicesByUser,
  deactivatePushDevice,
  listActivePushDevicesByUserIds,
  claimQueuedNotificationDeliveries,
  markNotificationDeliverySent,
  markNotificationDeliveryFailed,
} = require('./notifications.repository');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  return value.toFixed(2);
};

const DELIVERY_CHANNELS = new Set(['email', 'push']);

const EMAIL_MODE = String(process.env.NOTIFICATION_EMAIL_MODE || 'mock').trim().toLowerCase();
const PUSH_MODE = String(process.env.NOTIFICATION_PUSH_MODE || 'mock').trim().toLowerCase();

const EMAIL_WEBHOOK_URL = process.env.NOTIFICATION_EMAIL_WEBHOOK_URL || '';
const PUSH_WEBHOOK_URL = process.env.NOTIFICATION_PUSH_WEBHOOK_URL || '';

const DEFAULT_EMAIL_PROVIDER = process.env.NOTIFICATION_EMAIL_PROVIDER || (EMAIL_MODE === 'webhook' ? 'webhook' : 'mock');
const DEFAULT_PUSH_PROVIDER = process.env.NOTIFICATION_PUSH_PROVIDER || (PUSH_MODE === 'webhook' ? 'webhook' : 'mock');
const DEFAULT_DELIVERY_BATCH_SIZE = toPositiveInt(process.env.NOTIFICATION_DELIVERY_BATCH_SIZE, 50);

const normalizeChannels = (rawChannels) => {
  if (!Array.isArray(rawChannels) || rawChannels.length === 0) {
    return ['email', 'push'];
  }

  const normalized = [...new Set(rawChannels.map((channel) => String(channel || '').trim().toLowerCase()))]
    .filter((channel) => DELIVERY_CHANNELS.has(channel));

  return normalized.length > 0 ? normalized : ['email', 'push'];
};

const buildNotificationMessage = (alert) => {
  const symbol = String(alert?.symbol || '').toUpperCase();
  const reason = String(alert?.reason || 'alert_triggered').replace(/_/g, ' ');
  const currentPrice = toFiniteNumberOrNull(alert?.metrics?.currentPrice);
  const targetValue = toFiniteNumberOrNull(alert?.targetValue);

  return `${symbol} ${reason}. current=${formatNumber(currentPrice)} target=${formatNumber(targetValue)}`;
};

const toDeliveryKey = ({ alertId, channel, recipient, evaluatedAt }) => {
  const recipientKey = String(recipient || '').trim().toLowerCase();
  return `${alertId}:${channel}:${recipientKey}:${new Date(evaluatedAt).toISOString()}`;
};

const postWebhook = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(`webhook ${response.status}: ${rawBody.slice(0, 300)}`);
  }

  let parsedBody = null;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    parsedBody = null;
  }

  return {
    mode: 'webhook',
    status: response.status,
    body: parsedBody,
  };
};

const deliverEmail = async (delivery) => {
  if (EMAIL_MODE === 'webhook' && EMAIL_WEBHOOK_URL) {
    const result = await postWebhook(EMAIL_WEBHOOK_URL, {
      channel: 'email',
      provider: delivery.provider,
      to: delivery.recipient,
      title: delivery.title,
      message: delivery.message,
      payload: delivery.payload,
    });

    return {
      providerResponse: JSON.stringify(result),
    };
  }

  console.log(
    `[NOTIFICATIONS][EMAIL] mode=${EMAIL_MODE} recipient=${delivery.recipient || 'n/a'} title=${delivery.title}`
  );

  return {
    providerResponse: `email_${EMAIL_MODE || 'mock'}_simulated`,
  };
};

const deliverPush = async (delivery) => {
  if (PUSH_MODE === 'webhook' && PUSH_WEBHOOK_URL) {
    const result = await postWebhook(PUSH_WEBHOOK_URL, {
      channel: 'push',
      provider: delivery.provider,
      deviceToken: delivery.recipient,
      title: delivery.title,
      message: delivery.message,
      payload: delivery.payload,
    });

    return {
      providerResponse: JSON.stringify(result),
    };
  }

  console.log(
    `[NOTIFICATIONS][PUSH] mode=${PUSH_MODE} recipient=${delivery.recipient || 'n/a'} title=${delivery.title}`
  );

  return {
    providerResponse: `push_${PUSH_MODE || 'mock'}_simulated`,
  };
};

const queueAlertNotifications = async (triggeredAlerts, { evaluatedAt } = {}) => {
  const normalizedAlerts = Array.isArray(triggeredAlerts) ? triggeredAlerts : [];
  const evaluatedAtIso = evaluatedAt ? new Date(evaluatedAt).toISOString() : new Date().toISOString();

  if (normalizedAlerts.length === 0) {
    return {
      evaluatedAt: evaluatedAtIso,
      triggeredCount: 0,
      queuedRequestCount: 0,
      queuedCount: 0,
      dedupedCount: 0,
      skippedNoUserCount: 0,
      skippedNoPushDeviceCount: 0,
    };
  }

  const userIds = [...new Set(normalizedAlerts.map((alert) => String(alert.userId || '').trim()).filter(Boolean))];

  const users = await findUsersByIds(userIds);
  const usersById = new Map(users.map((user) => [user.id, user]));

  const pushDevices = await listActivePushDevicesByUserIds(userIds);
  const pushDevicesByUserId = new Map();

  for (const device of pushDevices) {
    const key = String(device.userId || '').trim();
    const existing = pushDevicesByUserId.get(key) || [];
    existing.push(device);
    pushDevicesByUserId.set(key, existing);
  }

  const deliveries = [];
  let skippedNoUserCount = 0;
  let skippedNoPushDeviceCount = 0;

  for (const alert of normalizedAlerts) {
    const userId = String(alert.userId || '').trim();
    const user = usersById.get(userId);

    if (!user) {
      skippedNoUserCount += 1;
      continue;
    }

    const channels = normalizeChannels(alert?.metadata?.notificationChannels);
    const title = `${String(alert.symbol || '').toUpperCase()} alert triggered`;
    const message = buildNotificationMessage(alert);

    if (channels.includes('email') && user.email) {
      deliveries.push({
        userId,
        alertId: alert.id,
        deliveryKey: toDeliveryKey({
          alertId: alert.id,
          channel: 'email',
          recipient: user.email,
          evaluatedAt: evaluatedAtIso,
        }),
        channel: 'email',
        provider: DEFAULT_EMAIL_PROVIDER,
        recipient: user.email,
        title,
        message,
        payload: {
          ...alert,
          evaluatedAt: evaluatedAtIso,
        },
      });
    }

    if (channels.includes('push')) {
      const userDevices = pushDevicesByUserId.get(userId) || [];
      if (userDevices.length === 0) {
        skippedNoPushDeviceCount += 1;
      }

      for (const device of userDevices) {
        deliveries.push({
          userId,
          alertId: alert.id,
          deliveryKey: toDeliveryKey({
            alertId: alert.id,
            channel: 'push',
            recipient: device.deviceToken,
            evaluatedAt: evaluatedAtIso,
          }),
          channel: 'push',
          provider: device.provider || DEFAULT_PUSH_PROVIDER,
          recipient: device.deviceToken,
          title,
          message,
          payload: {
            ...alert,
            deviceId: device.id,
            platform: device.platform,
            evaluatedAt: evaluatedAtIso,
          },
        });
      }
    }
  }

  const created = await createNotificationDeliveries(deliveries);

  return {
    evaluatedAt: evaluatedAtIso,
    triggeredCount: normalizedAlerts.length,
    queuedRequestCount: deliveries.length,
    queuedCount: created.length,
    dedupedCount: Math.max(0, deliveries.length - created.length),
    skippedNoUserCount,
    skippedNoPushDeviceCount,
  };
};

const processQueuedNotifications = async (options = {}) => {
  const limit = toPositiveInt(options.limit, DEFAULT_DELIVERY_BATCH_SIZE);
  const claimed = await claimQueuedNotificationDeliveries(limit);

  if (claimed.length === 0) {
    return {
      claimedCount: 0,
      sentCount: 0,
      failedCount: 0,
      channelStats: {
        email: { sent: 0, failed: 0 },
        push: { sent: 0, failed: 0 },
      },
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  const channelStats = {
    email: { sent: 0, failed: 0 },
    push: { sent: 0, failed: 0 },
  };

  for (const delivery of claimed) {
    try {
      let result;

      if (delivery.channel === 'email') {
        result = await deliverEmail(delivery);
      } else if (delivery.channel === 'push') {
        result = await deliverPush(delivery);
      } else {
        throw new Error(`Unsupported notification channel: ${delivery.channel}`);
      }

      await markNotificationDeliverySent({
        deliveryId: delivery.id,
        providerResponse: result?.providerResponse || 'ok',
      });

      sentCount += 1;
      if (channelStats[delivery.channel]) {
        channelStats[delivery.channel].sent += 1;
      }
    } catch (error) {
      await markNotificationDeliveryFailed({
        deliveryId: delivery.id,
        errorMessage: error.message,
      });

      failedCount += 1;
      if (channelStats[delivery.channel]) {
        channelStats[delivery.channel].failed += 1;
      }
    }
  }

  return {
    claimedCount: claimed.length,
    sentCount,
    failedCount,
    channelStats,
  };
};

const listUserNotifications = async (userId, query) => {
  return listNotificationDeliveriesByUser({
    userId,
    status: query.status,
    channel: query.channel,
    limit: query.limit,
  });
};

const registerUserPushDevice = async (userId, payload) => {
  return registerPushDevice({
    userId,
    provider: payload.provider,
    deviceToken: payload.deviceToken,
    platform: payload.platform,
    metadata: payload.metadata,
  });
};

const listUserPushDevices = async (userId) => {
  return listPushDevicesByUser(userId);
};

const removeUserPushDevice = async (userId, deviceId) => {
  return deactivatePushDevice({ userId, deviceId });
};

module.exports = {
  queueAlertNotifications,
  processQueuedNotifications,
  listUserNotifications,
  registerUserPushDevice,
  listUserPushDevices,
  removeUserPushDevice,
};
