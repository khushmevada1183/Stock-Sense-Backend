const { ApiError } = require('../../../utils/errorHandler');

const ALLOWED_BUCKETS = new Set(['1m', '5m', '15m', '1d']);
const DEFAULT_BUCKET = '1d';
const DEFAULT_LIMIT = 240;
const MAX_LIMIT = 2000;

const assertSymbol = (rawSymbol) => {
  const symbol = String(rawSymbol || '').trim().toUpperCase();

  if (!/^[A-Z0-9.&_-]{1,20}$/.test(symbol)) {
    throw new ApiError('Invalid stock symbol format', 400, 'ERR_INVALID_SYMBOL');
  }

  return symbol;
};

const parseDateValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`${fieldName} must be a valid ISO date`, 400, 'ERR_INVALID_DATE');
  }

  return date.toISOString();
};

const parseBoolean = (value, fallback = false) => {
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

  throw new ApiError('Invalid boolean query value', 400, 'ERR_INVALID_QUERY');
};

const parseLimit = (value, fallback = DEFAULT_LIMIT) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(`limit must be an integer between 1 and ${MAX_LIMIT}`, 400, 'ERR_INVALID_LIMIT');
  }

  if (parsed < 1 || parsed > MAX_LIMIT) {
    throw new ApiError(`limit must be between 1 and ${MAX_LIMIT}`, 400, 'ERR_INVALID_LIMIT');
  }

  return parsed;
};

const parseBucket = (value) => {
  const bucket = String(value || DEFAULT_BUCKET).trim().toLowerCase();

  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new ApiError('bucket must be one of 1m, 5m, 15m, 1d', 400, 'ERR_INVALID_BUCKET');
  }

  return bucket;
};

const parseBuckets = (value) => {
  if (value === undefined || value === null || value === '') {
    return [DEFAULT_BUCKET];
  }

  const buckets = String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(buckets)];
  if (unique.length === 0) {
    return [DEFAULT_BUCKET];
  }

  unique.forEach((bucket) => {
    if (!ALLOWED_BUCKETS.has(bucket)) {
      throw new ApiError('buckets must contain only 1m, 5m, 15m, 1d', 400, 'ERR_INVALID_BUCKET');
    }
  });

  return unique;
};

const parseSymbolsCsv = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const symbols = String(value)
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return null;
  }

  const unique = [...new Set(symbols.map((symbol) => assertSymbol(symbol)))];
  return unique.length > 0 ? unique : null;
};

const parsePositiveInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new ApiError('Expected a positive integer query value', 400, 'ERR_INVALID_QUERY');
  }

  return parsed;
};

const normalizeTechnicalQuery = (rawSymbol, query = {}) => {
  const symbol = assertSymbol(rawSymbol);
  const bucket = parseBucket(query.bucket);
  const from = parseDateValue(query.from, 'from');
  const to = parseDateValue(query.to, 'to');

  if (from && to && new Date(from) > new Date(to)) {
    throw new ApiError('from must be earlier than to', 400, 'ERR_INVALID_DATE_RANGE');
  }

  return {
    symbol,
    bucket,
    from,
    to,
    limit: parseLimit(query.limit),
    includeHistory: parseBoolean(query.includeHistory, true),
    forceRefresh: parseBoolean(query.forceRefresh, false),
  };
};

const normalizeRecomputeQuery = (query = {}) => {
  return {
    symbols: parseSymbolsCsv(query.symbols),
    buckets: parseBuckets(query.buckets),
    maxSymbols: parsePositiveInt(query.maxSymbols, 50),
    lookbackLimit: parsePositiveInt(query.lookbackLimit, 320),
    ignoreMarketHours: parseBoolean(query.ignoreMarketHours, false),
  };
};

module.exports = {
  ALLOWED_BUCKETS,
  assertSymbol,
  normalizeTechnicalQuery,
  normalizeRecomputeQuery,
  parseBuckets,
};
