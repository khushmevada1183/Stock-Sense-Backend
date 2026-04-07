const { ApiError } = require('../../utils/errorHandler');
const { normalizePaginationQuery } = require('../../shared/utils/pagination');

const SYMBOL_PATTERN = /^[A-Z0-9.&_-]{1,20}$/;

const assertSymbol = (rawSymbol) => {
  const symbol = String(rawSymbol || '').trim().toUpperCase();

  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new ApiError('Invalid stock symbol format', 400, 'ERR_INVALID_SYMBOL');
  }

  return symbol;
};

const normalizeSearchQuery = (query = {}) => {
  const q = String(query.q || query.query || query.name || '').trim();
  if (!q) {
    throw new ApiError('q query parameter is required', 400, 'ERR_INVALID_QUERY');
  }

  if (q.length > 120) {
    throw new ApiError('q query parameter is too long', 400, 'ERR_INVALID_QUERY');
  }

  const pagination = normalizePaginationQuery(query, {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  });

  return {
    q,
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
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

const normalizePeersQuery = (query = {}) => {
  const pagination = normalizePaginationQuery(query, {
    defaultPage: 1,
    defaultLimit: 12,
    maxLimit: 100,
  });

  return {
    limit: pagination.limit,
    forceRefresh: parseBoolean(query.forceRefresh, false),
  };
};

module.exports = {
  assertSymbol,
  normalizeSearchQuery,
  normalizePeersQuery,
};
