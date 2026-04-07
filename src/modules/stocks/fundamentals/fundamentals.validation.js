const { BadRequestError } = require('../../../utils/errorHandler');

const VALID_STATEMENT_TYPES = new Set([
  'cashflow',
  'yoy_results',
  'quarter_results',
  'balancesheet',
]);

const toBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const parseDate = (value, fieldName) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid date`);
  }

  return date.toISOString().slice(0, 10);
};

const parseLimit = (value, defaultValue, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  const rounded = Math.trunc(parsed);
  if (rounded < 1) {
    return 1;
  }

  return Math.min(rounded, max);
};

const normalizeSymbol = (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestError('symbol is required');
  }

  if (!/^[A-Z0-9._-]{1,25}$/.test(normalized)) {
    throw new BadRequestError('symbol must be alphanumeric and up to 25 characters');
  }

  return normalized;
};

const normalizeStatementType = (value, defaultType = 'quarter_results') => {
  const normalized = String(value || defaultType).trim().toLowerCase();
  if (!VALID_STATEMENT_TYPES.has(normalized)) {
    throw new BadRequestError(
      `statementType must be one of: ${Array.from(VALID_STATEMENT_TYPES).join(', ')}`
    );
  }

  return normalized;
};

const normalizeFundamentalQuery = (query = {}) => ({
  includeHistory: toBoolean(query.includeHistory, false),
  forceRefresh: toBoolean(query.forceRefresh, false),
  from: parseDate(query.from, 'from'),
  to: parseDate(query.to, 'to'),
  limit: parseLimit(query.limit, 5),
});

const normalizeFinancialsQuery = (query = {}) => ({
  statementType: normalizeStatementType(query.statementType, 'quarter_results'),
  includeHistory: toBoolean(query.includeHistory, false),
  forceRefresh: toBoolean(query.forceRefresh, false),
  from: parseDate(query.from, 'from'),
  to: parseDate(query.to, 'to'),
  limit: parseLimit(query.limit, 5),
});

const normalizeSyncPayload = (payload = {}) => {
  const rawSymbols = Array.isArray(payload.symbols)
    ? payload.symbols
    : typeof payload.symbols === 'string'
      ? payload.symbols.split(',')
      : [];

  const symbols = rawSymbols
    .map((symbol) => String(symbol || '').trim().toUpperCase())
    .filter(Boolean);

  const rawStatementTypes = Array.isArray(payload.statementTypes)
    ? payload.statementTypes
    : typeof payload.statementTypes === 'string'
      ? payload.statementTypes.split(',')
      : ['quarter_results'];

  const statementTypes = Array.from(
    new Set(rawStatementTypes.map((type) => normalizeStatementType(type, 'quarter_results')))
  );

  return {
    symbols,
    statementTypes,
    includeFundamentals: toBoolean(payload.includeFundamentals, true),
    maxSymbols: parseLimit(payload.maxSymbols, 40, 200),
  };
};

module.exports = {
  VALID_STATEMENT_TYPES,
  normalizeSymbol,
  normalizeFundamentalQuery,
  normalizeFinancialsQuery,
  normalizeSyncPayload,
};
