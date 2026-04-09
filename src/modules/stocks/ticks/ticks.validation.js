const { ApiError } = require('../../../utils/errorHandler');
const { getDefaultReadDatasetType } = require('../datasetPolicy');

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const MAX_BATCH_SIZE = 2000;
const DEFAULT_HISTORY_BUCKET = '1d';
const ALLOWED_HISTORY_BUCKETS = new Set(['1m', '5m', '15m', '1d']);
const ALLOWED_DATASET_TYPES = new Set(['prod', 'test']);
const ALLOWED_TICK_TIMEFRAMES = new Set(['tick', '1m', '5m', '15m', '1d']);
const ALLOWED_SOURCE_FAMILIES = new Set(['historical', 'live', 'smoke', 'backfill', 'manual']);
const DEFAULT_READ_DATASET_TYPE = getDefaultReadDatasetType();

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

const parseNumber = (value, fieldName, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ApiError(`${fieldName} is required`, 400, 'ERR_INVALID_PAYLOAD');
    }
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(`${fieldName} must be numeric`, 400, 'ERR_INVALID_PAYLOAD');
  }

  return parsed;
};

const parseVolume = (value) => {
  const parsed = parseNumber(value, 'volume', false);
  if (parsed === null) {
    return null;
  }

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError('volume must be a non-negative integer', 400, 'ERR_INVALID_PAYLOAD');
  }

  return parsed;
};

const parseAllowedLower = (value, fieldName, allowedValues, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!allowedValues.has(normalized)) {
    throw new ApiError(`${fieldName} is invalid`, 400, 'ERR_INVALID_PAYLOAD');
  }

  return normalized;
};

const normalizeTick = (tick, index, fallback = {}) => {
  if (!tick || typeof tick !== 'object' || Array.isArray(tick)) {
    throw new ApiError(`Tick at index ${index} must be an object`, 400, 'ERR_INVALID_PAYLOAD');
  }

  const timestamp = parseDateValue(tick.timestamp || tick.ts, `ticks[${index}].timestamp`);
  if (!timestamp) {
    throw new ApiError(`ticks[${index}].timestamp is required`, 400, 'ERR_INVALID_PAYLOAD');
  }

  const open = parseNumber(tick.open, `ticks[${index}].open`);
  const high = parseNumber(tick.high, `ticks[${index}].high`);
  const low = parseNumber(tick.low, `ticks[${index}].low`);
  const close = parseNumber(tick.close, `ticks[${index}].close`, true);
  const volume = parseVolume(tick.volume);
  const source = String(tick.source || fallback.source || 'nse').trim().toLowerCase();
  const datasetType = parseAllowedLower(
    tick.datasetType,
    `ticks[${index}].datasetType`,
    ALLOWED_DATASET_TYPES,
    fallback.datasetType || null
  );
  const timeframe = parseAllowedLower(
    tick.timeframe,
    `ticks[${index}].timeframe`,
    ALLOWED_TICK_TIMEFRAMES,
    fallback.timeframe || null
  );
  const sourceFamily = parseAllowedLower(
    tick.sourceFamily,
    `ticks[${index}].sourceFamily`,
    ALLOWED_SOURCE_FAMILIES,
    fallback.sourceFamily || null
  );
  const metadata = tick.metadata && typeof tick.metadata === 'object' && !Array.isArray(tick.metadata)
    ? tick.metadata
    : {};

  if (high !== null && low !== null && high < low) {
    throw new ApiError(`ticks[${index}] high must be >= low`, 400, 'ERR_INVALID_PAYLOAD');
  }

  return {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    source,
    datasetType,
    timeframe,
    sourceFamily,
    metadata,
  };
};

const normalizeIngestPayload = (rawSymbol, body) => {
  const symbol = assertSymbol(rawSymbol);

  const ticks = Array.isArray(body)
    ? body
    : Array.isArray(body?.ticks)
      ? body.ticks
      : null;

  if (!ticks || ticks.length === 0) {
    throw new ApiError('ticks array is required and cannot be empty', 400, 'ERR_INVALID_PAYLOAD');
  }

  if (ticks.length > MAX_BATCH_SIZE) {
    throw new ApiError(`ticks array cannot exceed ${MAX_BATCH_SIZE} records`, 400, 'ERR_BATCH_TOO_LARGE');
  }

  const fallbackSource = body && typeof body === 'object' ? body.source : undefined;
  const fallbackDatasetType = body && typeof body === 'object'
    ? parseAllowedLower(body.datasetType, 'datasetType', ALLOWED_DATASET_TYPES, null)
    : null;
  const fallbackTimeframe = body && typeof body === 'object'
    ? parseAllowedLower(body.timeframe, 'timeframe', ALLOWED_TICK_TIMEFRAMES, null)
    : null;
  const fallbackSourceFamily = body && typeof body === 'object'
    ? parseAllowedLower(body.sourceFamily, 'sourceFamily', ALLOWED_SOURCE_FAMILIES, null)
    : null;

  return {
    symbol,
    ticks: ticks.map((tick, index) => normalizeTick(tick, index, {
      source: fallbackSource,
      datasetType: fallbackDatasetType,
      timeframe: fallbackTimeframe,
      sourceFamily: fallbackSourceFamily,
    })),
  };
};

const normalizeTicksQuery = (rawSymbol, query) => {
  const symbol = assertSymbol(rawSymbol);
  const from = parseDateValue(query.from, 'from');
  const to = parseDateValue(query.to, 'to');
  const datasetType = parseAllowedLower(
    query.dataset ?? query.datasetType,
    'dataset',
    ALLOWED_DATASET_TYPES,
    DEFAULT_READ_DATASET_TYPE
  );

  let limit = Number.parseInt(query.limit, 10);
  if (!Number.isFinite(limit)) {
    limit = DEFAULT_LIMIT;
  }

  if (limit < 1 || limit > MAX_LIMIT) {
    throw new ApiError(`limit must be between 1 and ${MAX_LIMIT}`, 400, 'ERR_INVALID_LIMIT');
  }

  if (from && to && new Date(from) > new Date(to)) {
    throw new ApiError('from must be earlier than to', 400, 'ERR_INVALID_DATE_RANGE');
  }

  return {
    symbol,
    from,
    to,
    limit,
    datasetType,
  };
};

const parseBucket = (value) => {
  const bucket = String(value || DEFAULT_HISTORY_BUCKET).trim().toLowerCase();

  if (!ALLOWED_HISTORY_BUCKETS.has(bucket)) {
    throw new ApiError('bucket must be one of 1m, 5m, 15m, 1d', 400, 'ERR_INVALID_BUCKET');
  }

  return bucket;
};

const normalizeHistoryQuery = (rawSymbol, query) => {
  const base = normalizeTicksQuery(rawSymbol, query);
  const bucket = parseBucket(query.bucket);

  return {
    ...base,
    bucket,
  };
};

module.exports = {
  normalizeIngestPayload,
  normalizeTicksQuery,
  normalizeHistoryQuery,
};
