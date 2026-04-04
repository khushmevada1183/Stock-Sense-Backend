const { ApiError } = require('../../../utils/errorHandler');

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const MAX_BATCH_SIZE = 2000;

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

const normalizeTick = (tick, index, fallbackSource) => {
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
  const source = String(tick.source || fallbackSource || 'nse').trim().toLowerCase();
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

  return {
    symbol,
    ticks: ticks.map((tick, index) => normalizeTick(tick, index, fallbackSource)),
  };
};

const normalizeTicksQuery = (rawSymbol, query) => {
  const symbol = assertSymbol(rawSymbol);
  const from = parseDateValue(query.from, 'from');
  const to = parseDateValue(query.to, 'to');

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
  };
};

module.exports = {
  normalizeIngestPayload,
  normalizeTicksQuery,
};
