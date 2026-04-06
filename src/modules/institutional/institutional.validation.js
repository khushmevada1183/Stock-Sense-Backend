const { ApiError } = require('../../utils/errorHandler');

const SEGMENTS = ['equity', 'debt', 'hybrid'];
const CUMULATIVE_RANGES = ['monthly', 'yearly'];
const SHAREHOLDING_RANGES = ['quarterly', 'yearly'];
const EXCHANGES = ['NSE', 'BSE'];
const DEAL_TYPES = ['block', 'bulk'];
const TRANSACTION_TYPES = ['buy', 'sell'];
const ACTION_TYPES = ['dividend', 'split', 'bonus', 'rights', 'buyback'];
const EARNINGS_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

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

const normalizeShareholdingRange = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'quarterly';
  }

  const normalized = String(value).trim().toLowerCase();
  if (!SHAREHOLDING_RANGES.includes(normalized)) {
    throw new ApiError(
      `range must be one of: ${SHAREHOLDING_RANGES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return normalized;
};

const normalizeExchange = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const exchange = String(value).trim().toUpperCase();
  if (!EXCHANGES.includes(exchange)) {
    throw new ApiError(
      `exchange must be one of: ${EXCHANGES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return exchange;
};

const normalizeDealType = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const dealType = String(value).trim().toLowerCase();
  if (!DEAL_TYPES.includes(dealType)) {
    throw new ApiError(
      `dealType must be one of: ${DEAL_TYPES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return dealType;
};

const normalizeTransactionType = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const transactionType = String(value).trim().toLowerCase();
  if (!TRANSACTION_TYPES.includes(transactionType)) {
    throw new ApiError(
      `transactionType must be one of: ${TRANSACTION_TYPES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return transactionType;
};

const normalizeActionType = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const actionType = String(value).trim().toLowerCase();
  if (!ACTION_TYPES.includes(actionType)) {
    throw new ApiError(
      `actionType must be one of: ${ACTION_TYPES.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return actionType;
};

const normalizeFiscalQuarter = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const fiscalQuarter = String(value).trim().toUpperCase();
  if (!EARNINGS_QUARTERS.includes(fiscalQuarter)) {
    throw new ApiError(
      `fiscalQuarter must be one of: ${EARNINGS_QUARTERS.join(', ')}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return fiscalQuarter;
};

const normalizeSymbol = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const symbol = String(value).trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,30}$/.test(symbol)) {
    throw new ApiError('symbol must be alphanumeric (up to 30 chars)', 400, 'ERR_INVALID_QUERY');
  }

  return symbol;
};

const normalizeTextFilter = (value, fieldName, maxLength = 120) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new ApiError(
      `${fieldName} must be between 1 and ${maxLength} characters`,
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

const normalizeBlockDealsLatestQuery = (query) => {
  return {
    tradeDate: parseDateOnly(query?.date, 'date'),
    exchange: normalizeExchange(query?.exchange),
    symbol: normalizeSymbol(query?.symbol),
    dealType: normalizeDealType(query?.dealType),
    limit: parseLimit(query?.limit, 100, 500),
  };
};

const normalizeBlockDealsHistoryQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    exchange: normalizeExchange(query?.exchange),
    symbol: normalizeSymbol(query?.symbol),
    dealType: normalizeDealType(query?.dealType),
    limit: parseLimit(query?.limit, 250, 1000),
  };
};

const normalizeBlockDealsSyncQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    exchange: normalizeExchange(query?.exchange),
    days: parseLimit(query?.days, 7, 365),
    limit: parseLimit(query?.limit, 200, 1000),
  };
};

const normalizeMutualFundsLatestQuery = (query) => {
  return {
    monthDate: parseDateOnly(query?.month, 'month'),
    symbol: normalizeSymbol(query?.symbol),
    amcName: normalizeTextFilter(query?.amc, 'amc'),
    schemeName: normalizeTextFilter(query?.scheme, 'scheme'),
    limit: parseLimit(query?.limit, 100, 1000),
  };
};

const normalizeMutualFundsHistoryQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    amcName: normalizeTextFilter(query?.amc, 'amc'),
    schemeName: normalizeTextFilter(query?.scheme, 'scheme'),
    limit: parseLimit(query?.limit, 300, 2000),
  };
};

const normalizeMutualFundsTopHoldersQuery = (query) => {
  return {
    monthDate: parseDateOnly(query?.month, 'month'),
    symbol: normalizeSymbol(query?.symbol),
    limit: parseLimit(query?.limit, 20, 200),
  };
};

const normalizeMutualFundsSyncQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    months: parseLimit(query?.months, 6, 60),
    limit: parseLimit(query?.limit, 300, 5000),
  };
};

const normalizeInsiderTradesLatestQuery = (query) => {
  return {
    tradeDate: parseDateOnly(query?.date, 'date'),
    symbol: normalizeSymbol(query?.symbol),
    transactionType: normalizeTransactionType(query?.transactionType),
    insiderName: normalizeTextFilter(query?.insider, 'insider'),
    insiderRole: normalizeTextFilter(query?.role, 'role'),
    limit: parseLimit(query?.limit, 100, 1000),
  };
};

const normalizeInsiderTradesHistoryQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    transactionType: normalizeTransactionType(query?.transactionType),
    insiderName: normalizeTextFilter(query?.insider, 'insider'),
    insiderRole: normalizeTextFilter(query?.role, 'role'),
    limit: parseLimit(query?.limit, 300, 3000),
  };
};

const normalizeInsiderTradesSummaryQuery = (query) => {
  return {
    range: normalizeCumulativeRange(query?.range),
    symbol: normalizeSymbol(query?.symbol),
    transactionType: normalizeTransactionType(query?.transactionType),
    limit: parseLimit(query?.limit, 12, 120),
  };
};

const normalizeInsiderTradesSyncQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    transactionType: normalizeTransactionType(query?.transactionType),
    days: parseLimit(query?.days, 30, 365),
    limit: parseLimit(query?.limit, 300, 5000),
  };
};

const normalizeShareholdingLatestQuery = (query) => {
  return {
    periodDate: parseDateOnly(query?.period, 'period'),
    symbol: normalizeSymbol(query?.symbol),
    limit: parseLimit(query?.limit, 100, 1000),
  };
};

const normalizeShareholdingHistoryQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    limit: parseLimit(query?.limit, 300, 3000),
  };
};

const normalizeShareholdingTrendsQuery = (query) => {
  return {
    range: normalizeShareholdingRange(query?.range),
    symbol: normalizeSymbol(query?.symbol),
    limit: parseLimit(query?.limit, 12, 120),
  };
};

const normalizeShareholdingSyncQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    quarters: parseLimit(query?.quarters, 8, 80),
    limit: parseLimit(query?.limit, 400, 5000),
  };
};

const normalizeCorporateActionsLatestQuery = (query) => {
  return {
    actionDate: parseDateOnly(query?.date, 'date'),
    symbol: normalizeSymbol(query?.symbol),
    actionType: normalizeActionType(query?.actionType),
    limit: parseLimit(query?.limit, 100, 1000),
  };
};

const normalizeCorporateActionsHistoryQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    actionType: normalizeActionType(query?.actionType),
    limit: parseLimit(query?.limit, 300, 3000),
  };
};

const normalizeCorporateActionsSummaryQuery = (query) => {
  return {
    range: normalizeCumulativeRange(query?.range),
    symbol: normalizeSymbol(query?.symbol),
    actionType: normalizeActionType(query?.actionType),
    limit: parseLimit(query?.limit, 12, 120),
  };
};

const normalizeCorporateActionsSyncQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    actionType: normalizeActionType(query?.actionType),
    months: parseLimit(query?.months, 24, 120),
    limit: parseLimit(query?.limit, 300, 5000),
  };
};

const normalizeEarningsCalendarLatestQuery = (query) => {
  return {
    eventDate: parseDateOnly(query?.date, 'date'),
    symbol: normalizeSymbol(query?.symbol),
    fiscalQuarter: normalizeFiscalQuarter(query?.fiscalQuarter),
    limit: parseLimit(query?.limit, 100, 1000),
  };
};

const normalizeEarningsCalendarHistoryQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    fiscalQuarter: normalizeFiscalQuarter(query?.fiscalQuarter),
    limit: parseLimit(query?.limit, 300, 3000),
  };
};

const normalizeEarningsCalendarSummaryQuery = (query) => {
  return {
    range: normalizeCumulativeRange(query?.range),
    symbol: normalizeSymbol(query?.symbol),
    fiscalQuarter: normalizeFiscalQuarter(query?.fiscalQuarter),
    limit: parseLimit(query?.limit, 12, 120),
  };
};

const normalizeEarningsCalendarSyncQuery = (query) => {
  const fromDate = parseDateOnly(query?.from, 'from');
  const toDate = parseDateOnly(query?.to, 'to');

  return {
    fromDate,
    toDate,
    symbol: normalizeSymbol(query?.symbol),
    fiscalQuarter: normalizeFiscalQuarter(query?.fiscalQuarter),
    quarters: parseLimit(query?.quarters, 8, 80),
    limit: parseLimit(query?.limit, 320, 5000),
  };
};

module.exports = {
  SEGMENTS,
  EXCHANGES,
  DEAL_TYPES,
  TRANSACTION_TYPES,
  ACTION_TYPES,
  EARNINGS_QUARTERS,
  SHAREHOLDING_RANGES,
  normalizeFiiDiiLatestQuery,
  normalizeFiiDiiHistoryQuery,
  normalizeFiiDiiCumulativeQuery,
  normalizeFiiDiiSyncQuery,
  normalizeBlockDealsLatestQuery,
  normalizeBlockDealsHistoryQuery,
  normalizeBlockDealsSyncQuery,
  normalizeMutualFundsLatestQuery,
  normalizeMutualFundsHistoryQuery,
  normalizeMutualFundsTopHoldersQuery,
  normalizeMutualFundsSyncQuery,
  normalizeInsiderTradesLatestQuery,
  normalizeInsiderTradesHistoryQuery,
  normalizeInsiderTradesSummaryQuery,
  normalizeInsiderTradesSyncQuery,
  normalizeShareholdingLatestQuery,
  normalizeShareholdingHistoryQuery,
  normalizeShareholdingTrendsQuery,
  normalizeShareholdingSyncQuery,
  normalizeCorporateActionsLatestQuery,
  normalizeCorporateActionsHistoryQuery,
  normalizeCorporateActionsSummaryQuery,
  normalizeCorporateActionsSyncQuery,
  normalizeEarningsCalendarLatestQuery,
  normalizeEarningsCalendarHistoryQuery,
  normalizeEarningsCalendarSummaryQuery,
  normalizeEarningsCalendarSyncQuery,
};
