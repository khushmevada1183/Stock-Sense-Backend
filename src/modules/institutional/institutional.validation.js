const { ApiError } = require('../../utils/errorHandler');

const SEGMENTS = ['equity', 'debt', 'hybrid'];
const CUMULATIVE_RANGES = ['monthly', 'yearly'];

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

const parseLimit = (value, fallback, max = 500) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
    throw new ApiError(`limit must be an integer between 1 and ${max}`, 400, 'ERR_INVALID_QUERY');
  }

  return parsed;
};

const normalizeSegment = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const segment = String(value).trim().toLowerCase();
  if (!SEGMENTS.includes(segment)) {
    throw new ApiError(
      `segment must be one of: ${SEGMENTS.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return segment;
};

const normalizeCumulativeRange = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'monthly';
  }

  const normalized = String(value).trim().toLowerCase();
  if (!CUMULATIVE_RANGES.includes(normalized)) {
    throw new ApiError(
      `range must be one of: ${CUMULATIVE_RANGES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return normalized;
};

const normalizeFiiDiiLatestQuery = (query) => {
  return {
    segment: normalizeSegment(query?.segment),
    limit: parseLimit(query?.limit, 30),
  };
};

const normalizeFiiDiiHistoryQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    segment: normalizeSegment(query?.segment),
    limit: parseLimit(query?.limit, 120),
  };
};

const normalizeFiiDiiCumulativeQuery = (query) => {
  return {
    range: normalizeCumulativeRange(query?.range),
    segment: normalizeSegment(query?.segment),
    limit: parseLimit(query?.limit, 12, 120),
  };
};

const normalizeFiiDiiSyncQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    segment: normalizeSegment(query?.segment),
    days: parseLimit(query?.days, 30, 365),
  };
};

module.exports = {
  SEGMENTS,
  normalizeFiiDiiLatestQuery,
  normalizeFiiDiiHistoryQuery,
  normalizeFiiDiiCumulativeQuery,
  normalizeFiiDiiSyncQuery,
};
