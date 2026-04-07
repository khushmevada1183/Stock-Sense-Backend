const { ApiError } = require('../../utils/errorHandler');

const NEWS_CATEGORIES = [
  'companies',
  'markets',
  'economy',
  'ipos',
  'commodities',
  'global',
  'regulatory',
  'general',
];

const SENTIMENT_LABELS = ['positive', 'negative', 'neutral'];
const SOCIAL_PLATFORMS = ['twitter', 'reddit', 'news', 'aggregate'];

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

const parseLimit = (value, fallback, max = 200) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
    throw new ApiError(`limit must be an integer between 1 and ${max}`, 400, 'ERR_INVALID_QUERY');
  }

  return parsed;
};

const parsePage = (value) => {
  if (value === undefined || value === null || value === '') {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new ApiError('page must be an integer greater than 0', 400, 'ERR_INVALID_QUERY');
  }

  return parsed;
};

const parseNumberInRange = (value, fallback, min, max, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ApiError(
      `${fieldName} must be a number between ${min} and ${max}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return parsed;
};

const normalizeCategory = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!NEWS_CATEGORIES.includes(normalized)) {
    throw new ApiError(
      `category must be one of: ${NEWS_CATEGORIES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return normalized;
};

const normalizeSentiment = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!SENTIMENT_LABELS.includes(normalized)) {
    throw new ApiError(
      `sentiment must be one of: ${SENTIMENT_LABELS.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return normalized;
};

const normalizePlatform = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!SOCIAL_PLATFORMS.includes(normalized)) {
    throw new ApiError(
      `platform must be one of: ${SOCIAL_PLATFORMS.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return normalized;
};

const normalizeSymbol = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,30}$/.test(normalized)) {
    throw new ApiError('symbol must be alphanumeric (up to 30 chars)', 400, 'ERR_INVALID_QUERY');
  }

  return normalized;
};

const normalizeTextQuery = (value, maxLength = 120) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new ApiError(
      `query text must be between 1 and ${maxLength} characters`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return normalized;
};

const parseBoolean = (value, fallback) => {
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

  throw new ApiError('boolean query parameter is invalid', 400, 'ERR_INVALID_QUERY');
};

const normalizeNewsFeedQuery = (query = {}) => {
  const page = parsePage(query.page);
  const limit = parseLimit(query.limit, 25, 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    category: normalizeCategory(query.category),
    sentiment: normalizeSentiment(query.sentiment),
    source: normalizeTextQuery(query.source, 80),
    symbol: normalizeSymbol(query.symbol),
    fromDate: parseDateOnly(query.from, 'from'),
    toDate: parseDateOnly(query.to, 'to'),
    queryText: normalizeTextQuery(query.q, 160),
  };
};

const normalizeTrendingQuery = (query = {}) => {
  return {
    hours: parseLimit(query.hours, 24, 336),
    limit: parseLimit(query.limit, 20, 100),
    category: normalizeCategory(query.category),
    symbol: normalizeSymbol(query.symbol),
  };
};

const normalizeAlertsQuery = (query = {}) => {
  return {
    hours: parseLimit(query.hours, 12, 168),
    limit: parseLimit(query.limit, 20, 100),
    minConfidence: parseNumberInRange(query.minConfidence, 0.65, 0, 1, 'minConfidence'),
    minScore: parseNumberInRange(query.minScore, 0.4, 0, 1, 'minScore'),
    symbol: normalizeSymbol(query.symbol),
  };
};

const normalizeNewsSyncQuery = (query = {}) => {
  return {
    days: parseLimit(query.days, 2, 30),
    limitPerSource: parseLimit(query.limitPerSource, 50, 300),
    includeNewsApi: parseBoolean(query.includeNewsApi, true),
    includeRss: parseBoolean(query.includeRss, true),
    includeSocial: parseBoolean(query.includeSocial, true),
    category: normalizeCategory(query.category),
  };
};

const normalizeSentimentSyncQuery = (query = {}) => {
  return {
    hours: parseLimit(query.hours, 72, 720),
    limit: parseLimit(query.limit, 1000, 5000),
  };
};

const normalizeFearGreedQuery = (query = {}) => {
  return {
    days: parseLimit(query.days, 30, 365),
  };
};

const normalizeStockSentimentQuery = (query = {}) => {
  return {
    days: parseLimit(query.days, 14, 365),
    limit: parseLimit(query.limit, 30, 365),
    platform: normalizePlatform(query.platform),
  };
};

module.exports = {
  NEWS_CATEGORIES,
  normalizeCategory,
  normalizeNewsFeedQuery,
  normalizeTrendingQuery,
  normalizeAlertsQuery,
  normalizeNewsSyncQuery,
  normalizeSentimentSyncQuery,
  normalizeFearGreedQuery,
  normalizeStockSentimentQuery,
};
