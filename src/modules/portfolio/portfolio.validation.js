const { ApiError } = require('../../utils/errorHandler');

const SYMBOL_REGEX = /^[A-Z0-9.&_-]{1,20}$/;

const normalizeUserId = (rawUserId) => {
  const userId = String(rawUserId || '').trim();
  if (!userId) {
    throw new ApiError('userId is required', 400, 'ERR_INVALID_USER_ID');
  }
  return userId;
};

const normalizePortfolioId = (rawPortfolioId) => {
  const portfolioId = String(rawPortfolioId || '').trim();

  if (!/^[0-9a-fA-F-]{36}$/.test(portfolioId)) {
    throw new ApiError('Invalid portfolioId format', 400, 'ERR_INVALID_PORTFOLIO_ID');
  }

  return portfolioId;
};

const normalizeSymbol = (rawSymbol, fieldName = 'symbol') => {
  const symbol = String(rawSymbol || '').trim().toUpperCase();

  if (!SYMBOL_REGEX.test(symbol)) {
    throw new ApiError(`${fieldName} must be a valid NSE/BSE symbol`, 400, 'ERR_INVALID_SYMBOL');
  }

  return symbol;
};

const parsePositiveNumber = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(`${fieldName} must be a positive number`, 400, 'ERR_INVALID_PAYLOAD');
  }

  return parsed;
};

const parseNonNegativeNumber = (value, fieldName, defaultValue = 0) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ApiError(`${fieldName} must be a non-negative number`, 400, 'ERR_INVALID_PAYLOAD');
  }

  return parsed;
};

const normalizeDate = (value, fieldName = 'date') => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(`${fieldName} must be a valid date`, 400, 'ERR_INVALID_PAYLOAD');
  }

  return parsed.toISOString().slice(0, 10);
};

const normalizeStocksArray = (stocks) => {
  if (!Array.isArray(stocks) || stocks.length === 0) {
    return [];
  }

  if (stocks.length > 500) {
    throw new ApiError('stocks cannot exceed 500 records per request', 400, 'ERR_PAYLOAD_TOO_LARGE');
  }

  return stocks.map((stock, index) => ({
    symbol: normalizeSymbol(stock?.symbol, `stocks[${index}].symbol`),
    quantity: parsePositiveNumber(stock?.quantity, `stocks[${index}].quantity`),
    buyPrice: parsePositiveNumber(stock?.buyPrice, `stocks[${index}].buyPrice`),
    buyDate: normalizeDate(stock?.buyDate, `stocks[${index}].buyDate`),
  }));
};

const normalizePortfolioCreatePayload = (body) => {
  const portfolioName = String(body?.portfolioName || '').trim();
  if (!portfolioName) {
    throw new ApiError('portfolioName is required', 400, 'ERR_INVALID_PAYLOAD');
  }

  const description = body?.description ? String(body.description).trim() : null;

  return {
    portfolioName,
    description,
    stocks: normalizeStocksArray(body?.stocks),
  };
};

const normalizePortfolioUpdatePayload = (body) => {
  const payload = {};

  if (body?.portfolioName !== undefined) {
    const portfolioName = String(body.portfolioName || '').trim();
    if (!portfolioName) {
      throw new ApiError('portfolioName cannot be empty', 400, 'ERR_INVALID_PAYLOAD');
    }
    payload.portfolioName = portfolioName;
  }

  if (body?.description !== undefined) {
    payload.description = body.description ? String(body.description).trim() : null;
  }

  if (body?.stocks !== undefined) {
    payload.stocks = normalizeStocksArray(body.stocks);
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError('No updatable fields were provided', 400, 'ERR_INVALID_PAYLOAD');
  }

  return payload;
};

const normalizePortfolioTransactionPayload = (body) => {
  return {
    symbol: normalizeSymbol(body?.symbol),
    transactionType: String(body?.transactionType || '').trim().toLowerCase(),
    quantity: parsePositiveNumber(body?.quantity, 'quantity'),
    price: parsePositiveNumber(body?.price, 'price'),
    transactionDate: normalizeDate(body?.transactionDate, 'transactionDate'),
    fees: parseNonNegativeNumber(body?.fees, 'fees', 0),
    metadata:
      body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : {},
  };
};

const normalizeHoldingsQuery = (query) => {
  return {
    userId: normalizeUserId(query?.userId),
    portfolioId: query?.portfolioId ? normalizePortfolioId(query.portfolioId) : null,
  };
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizeDate(value, fieldName);
};

const parseOptionalPositiveInt = (value, fieldName, defaultValue, min = 1, max = 2000) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ApiError(
      `${fieldName} must be an integer between ${min} and ${max}`,
      400,
      'ERR_INVALID_QUERY'
    );
  }

  return parsed;
};

const normalizePerformanceQuery = (query = {}) => {
  const from = parseOptionalDate(query.from, 'from');
  const to = parseOptionalDate(query.to, 'to');

  if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
    throw new ApiError('from must be earlier than or equal to to', 400, 'ERR_INVALID_QUERY');
  }

  return {
    from,
    to,
    maxPoints: parseOptionalPositiveInt(query.maxPoints, 'maxPoints', 180, 10, 1000),
  };
};

const normalizeXirrQuery = (query = {}) => {
  return {
    asOf: parseOptionalDate(query.asOf, 'asOf'),
  };
};

module.exports = {
  normalizeUserId,
  normalizePortfolioId,
  normalizePortfolioCreatePayload,
  normalizePortfolioUpdatePayload,
  normalizePortfolioTransactionPayload,
  normalizeHoldingsQuery,
  normalizePerformanceQuery,
  normalizeXirrQuery,
};
