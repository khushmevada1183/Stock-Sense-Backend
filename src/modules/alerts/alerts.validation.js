const { ApiError } = require('../../utils/errorHandler');

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
const SYMBOL_REGEX = /^[A-Z0-9.&_-]{1,20}$/;
const ALERT_TYPES = [
  'price_above',
  'price_below',
  'percent_change_up',
  'percent_change_down',
  'volume_spike',
  'daily_change',
];

const normalizeAlertId = (rawAlertId) => {
  const alertId = String(rawAlertId || '').trim();
  if (!UUID_REGEX.test(alertId)) {
    throw new ApiError('Invalid alertId format', 400, 'ERR_INVALID_ALERT_ID');
  }

  return alertId;
};

const normalizeSymbol = (rawSymbol) => {
  const symbol = String(rawSymbol || '').trim().toUpperCase();

  if (!SYMBOL_REGEX.test(symbol)) {
    throw new ApiError('symbol must be a valid NSE/BSE symbol', 400, 'ERR_INVALID_SYMBOL');
  }

  return symbol;
};

const normalizeAlertType = (rawAlertType) => {
  const alertType = String(rawAlertType || '').trim().toLowerCase();

  if (!ALERT_TYPES.includes(alertType)) {
    throw new ApiError(
      `alertType must be one of: ${ALERT_TYPES.join(', ')}`,
      400,
      'ERR_INVALID_ALERT_TYPE'
    );
  }

  return alertType;
};

const normalizeTargetValue = (rawTargetValue) => {
  const targetValue = Number(rawTargetValue);

  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    throw new ApiError('targetValue must be a positive number', 400, 'ERR_INVALID_PAYLOAD');
  }

  return targetValue;
};

const normalizeIsActive = (rawIsActive) => {
  if (typeof rawIsActive === 'boolean') {
    return rawIsActive;
  }

  if (typeof rawIsActive === 'string') {
    const normalized = rawIsActive.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  throw new ApiError('isActive must be a boolean', 400, 'ERR_INVALID_PAYLOAD');
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

const normalizeAlertCreatePayload = (body) => {
  return {
    symbol: normalizeSymbol(body?.symbol),
    alertType: normalizeAlertType(body?.alertType),
    targetValue: normalizeTargetValue(body?.targetValue),
    isActive: body?.isActive === undefined ? true : normalizeIsActive(body.isActive),
    metadata: normalizeMetadata(body?.metadata),
  };
};

const normalizeAlertUpdatePayload = (body) => {
  const payload = {};

  if (body?.symbol !== undefined) {
    payload.symbol = normalizeSymbol(body.symbol);
  }

  if (body?.alertType !== undefined) {
    payload.alertType = normalizeAlertType(body.alertType);
  }

  if (body?.targetValue !== undefined) {
    payload.targetValue = normalizeTargetValue(body.targetValue);
  }

  if (body?.isActive !== undefined) {
    payload.isActive = normalizeIsActive(body.isActive);
  }

  if (body?.metadata !== undefined) {
    payload.metadata = normalizeMetadata(body.metadata);
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError('No updatable fields were provided', 400, 'ERR_INVALID_PAYLOAD');
  }

  return payload;
};

const normalizeAlertListQuery = (query) => {
  return {
    symbol: query?.symbol ? normalizeSymbol(query.symbol) : null,
    isActive:
      query?.isActive === undefined || query?.isActive === null || query?.isActive === ''
        ? null
        : normalizeIsActive(query.isActive),
  };
};

module.exports = {
  normalizeAlertId,
  normalizeAlertCreatePayload,
  normalizeAlertUpdatePayload,
  normalizeAlertListQuery,
  ALERT_TYPES,
};
