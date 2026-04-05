const { ApiError } = require('../../utils/errorHandler');

const IPO_STATUSES = ['upcoming', 'active', 'listed', 'closed'];
const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

const parseDateOnly = (value, fieldName) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsedDate = new Date(raw);
  if (!Number.isFinite(parsedDate.getTime())) {
    throw new ApiError(`${fieldName} must be a valid date`, 400, 'ERR_INVALID_QUERY');
  }

  return parsedDate.toISOString().slice(0, 10);
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new ApiError('grouped must be boolean-like', 400, 'ERR_INVALID_QUERY');
};

const parseLimit = (value, fallback = 100) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
    throw new ApiError('limit must be an integer between 1 and 500', 400, 'ERR_INVALID_QUERY');
  }

  return parsed;
};

const normalizeIpoStatus = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const status = String(value).trim().toLowerCase();
  if (!IPO_STATUSES.includes(status)) {
    throw new ApiError(
      `status must be one of: ${IPO_STATUSES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return status;
};

const normalizeIpoCalendarQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    status: normalizeIpoStatus(query?.status),
    grouped: parseBoolean(query?.grouped, true),
    limit: parseLimit(query?.limit, 100),
    fromDate,
    toDate,
  };
};

const normalizeIpoSubscriptionLatestQuery = (query) => {
  return {
    status: normalizeIpoStatus(query?.status),
    limit: parseLimit(query?.limit, 100),
  };
};

const normalizeIpoSubscriptionHistoryQuery = (query) => {
  return {
    limit: parseLimit(query?.limit, 30),
  };
};

const normalizeIpoSubscriptionSyncQuery = (query) => {
  return {
    limit: parseLimit(query?.limit, 500),
    snapshotDate: parseDateOnly(query?.snapshotDate, 'snapshotDate'),
  };
};

const normalizeIpoGmpLatestQuery = (query) => {
  return {
    status: normalizeIpoStatus(query?.status),
    limit: parseLimit(query?.limit, 100),
  };
};

const normalizeIpoGmpHistoryQuery = (query) => {
  return {
    limit: parseLimit(query?.limit, 30),
  };
};

const normalizeIpoGmpSyncQuery = (query) => {
  return {
    limit: parseLimit(query?.limit, 500),
    snapshotDate: parseDateOnly(query?.snapshotDate, 'snapshotDate'),
  };
};

const normalizeIpoId = (rawIpoId) => {
  const ipoId = String(rawIpoId || '').trim();
  if (!UUID_REGEX.test(ipoId)) {
    throw new ApiError('Invalid ipoId format', 400, 'ERR_INVALID_IPO_ID');
  }

  return ipoId;
};

module.exports = {
  IPO_STATUSES,
  normalizeIpoCalendarQuery,
  normalizeIpoSubscriptionLatestQuery,
  normalizeIpoSubscriptionHistoryQuery,
  normalizeIpoSubscriptionSyncQuery,
  normalizeIpoGmpLatestQuery,
  normalizeIpoGmpHistoryQuery,
  normalizeIpoGmpSyncQuery,
  normalizeIpoId,
};
