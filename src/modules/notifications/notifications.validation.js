const { ApiError } = require('../../utils/errorHandler');

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
const DELIVERY_STATUS = ['queued', 'processing', 'sent', 'failed'];
const DELIVERY_CHANNEL = ['email', 'push'];
const PUSH_PROVIDERS = ['fcm', 'expo', 'apns', 'webpush', 'mock'];
const PUSH_PLATFORMS = ['ios', 'android', 'web', 'unknown'];

const normalizePositiveInt = (value, fallback, { min = 1, max = 200 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
};

const normalizeEnum = (rawValue, allowedValues, fieldName) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  const value = String(rawValue).trim().toLowerCase();
  if (!allowedValues.includes(value)) {
    throw new ApiError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      400,
      'ERR_INVALID_PAYLOAD'
    );
  }

  return value;
};

const normalizePushDeviceId = (rawDeviceId) => {
  const deviceId = String(rawDeviceId || '').trim();
  if (!UUID_REGEX.test(deviceId)) {
    throw new ApiError('Invalid push device id format', 400, 'ERR_INVALID_PUSH_DEVICE_ID');
  }

  return deviceId;
};

const normalizeMetadata = (rawMetadata) => {
  if (rawMetadata === undefined || rawMetadata === null) {
    return {};
  }

  if (typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
    throw new ApiError('metadata must be an object', 400, 'ERR_INVALID_PAYLOAD');
  }

  return rawMetadata;
};

const normalizeRegisterPushDevicePayload = (body) => {
  const provider = normalizeEnum(body?.provider || 'fcm', PUSH_PROVIDERS, 'provider') || 'fcm';
  const deviceToken = String(body?.deviceToken || '').trim();

  if (!deviceToken || deviceToken.length < 10 || deviceToken.length > 2048) {
    throw new ApiError('deviceToken must be between 10 and 2048 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  const platform = normalizeEnum(body?.platform || 'unknown', PUSH_PLATFORMS, 'platform') || 'unknown';

  return {
    provider,
    deviceToken,
    platform,
    metadata: normalizeMetadata(body?.metadata),
  };
};

const normalizeNotificationListQuery = (query) => {
  return {
    status: normalizeEnum(query?.status, DELIVERY_STATUS, 'status'),
    channel: normalizeEnum(query?.channel, DELIVERY_CHANNEL, 'channel'),
    limit: normalizePositiveInt(query?.limit, 50, { min: 1, max: 200 }),
  };
};

module.exports = {
  normalizePushDeviceId,
  normalizeRegisterPushDevicePayload,
  normalizeNotificationListQuery,
  DELIVERY_STATUS,
  DELIVERY_CHANNEL,
};
