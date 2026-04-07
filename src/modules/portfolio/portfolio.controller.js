const asyncHandler = require('../../shared/middleware/asyncHandler');
const { ApiError } = require('../../utils/errorHandler');
const {
  normalizePortfolioId,
  normalizePortfolioCreatePayload,
  normalizePortfolioUpdatePayload,
  normalizePortfolioTransactionPayload,
  normalizeHoldingsQuery,
  normalizePerformanceQuery,
  normalizeXirrQuery,
} = require('./portfolio.validation');
const {
  getUserPortfolios,
  createUserPortfolio,
  updateUserPortfolio,
  deleteUserPortfolio,
  getUserPortfolioHoldings,
  getUserPortfolioSummary,
  getUserPortfolioXirr,
  getUserPortfolioPerformance,
  getUserPortfolioDetails,
  createPortfolioTransaction,
} = require('./portfolio.service');

const csvEscape = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
};

const csvLine = (columns) => columns.map(csvEscape).join(',');

const buildPortfolioExportCsv = ({ holdings, summary }) => {
  const holdingHeader = [
    'symbol',
    'quantity',
    'buyPrice',
    'lastPrice',
    'change',
    'changePercent',
    'marketValue',
    'profitLoss',
    'profitLossPercent',
    'realizedPnl',
    'buyDate',
  ];

  const holdingRows = holdings.map((holding) =>
    csvLine([
      holding.symbol,
      holding.quantity,
      holding.buyPrice,
      holding.lastPrice,
      holding.change,
      holding.changePercent,
      holding.marketValue,
      holding.profitLoss,
      holding.profitLossPercent,
      holding.realizedPnl,
      holding.buyDate,
    ])
  );

  const summaryRows = Object.entries(summary || {}).map(([metric, value]) =>
    csvLine([metric, value])
  );

  return [
    csvLine(holdingHeader),
    ...holdingRows,
    '',
    csvLine(['metric', 'value']),
    ...summaryRows,
    '',
  ].join('\n');
};

const getUserIdFromRequest = (req) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError('Authentication required', 401, 'ERR_UNAUTHORIZED');
  }

  return String(userId);
};

const ensurePortfolioExists = async (userId, portfolioId) => {
  const details = await getUserPortfolioDetails(userId, portfolioId);

  if (!details) {
    throw new ApiError('Portfolio not found', 404, 'ERR_PORTFOLIO_NOT_FOUND');
  }

  return details;
};

const listPortfolios = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolios = await getUserPortfolios(userId);

  res.status(200).json({
    success: true,
    data: {
      portfolios,
    },
  });
});

const createPortfolio = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const payload = normalizePortfolioCreatePayload(req.body);

  const portfolio = await createUserPortfolio(userId, payload);

  res.status(201).json({
    success: true,
    data: {
      success: true,
      portfolioId: portfolio.id,
      portfolio,
    },
  });
});

const getPortfolioDetails = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);

  const details = await getUserPortfolioDetails(userId, portfolioId);

  if (!details) {
    throw new ApiError('Portfolio not found', 404, 'ERR_PORTFOLIO_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      details,
    },
  });
});

const updatePortfolio = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);
  const payload = normalizePortfolioUpdatePayload(req.body);

  const portfolio = await updateUserPortfolio(userId, portfolioId, payload);

  if (!portfolio) {
    throw new ApiError('Portfolio not found', 404, 'ERR_PORTFOLIO_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      success: true,
      portfolio,
    },
  });
});

const removePortfolio = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);

  const deleted = await deleteUserPortfolio(userId, portfolioId);
  if (!deleted) {
    throw new ApiError('Portfolio not found', 404, 'ERR_PORTFOLIO_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      success: true,
      message: 'Portfolio deleted successfully',
    },
  });
});

const getHoldings = asyncHandler(async (req, res) => {
  const { userId, portfolioId } = normalizeHoldingsQuery({
    userId: getUserIdFromRequest(req),
    portfolioId: req.query.portfolioId,
  });

  const holdings = await getUserPortfolioHoldings(userId, portfolioId);

  res.status(200).json({
    success: true,
    data: {
      holdings,
    },
  });
});

const getSummary = asyncHandler(async (req, res) => {
  const { userId, portfolioId } = normalizeHoldingsQuery({
    userId: getUserIdFromRequest(req),
    portfolioId: req.query.portfolioId,
  });

  const summary = await getUserPortfolioSummary(userId, portfolioId);

  res.status(200).json({
    success: true,
    data: {
      summary,
    },
  });
});

const getPerformance = asyncHandler(async (req, res) => {
  const { userId, portfolioId } = normalizeHoldingsQuery({
    userId: getUserIdFromRequest(req),
    portfolioId: req.query.portfolioId,
  });

  const query = normalizePerformanceQuery(req.query);
  const performance = await getUserPortfolioPerformance(userId, portfolioId, query);

  res.status(200).json({
    success: true,
    data: {
      performance,
    },
  });
});

const getXirr = asyncHandler(async (req, res) => {
  const { userId, portfolioId } = normalizeHoldingsQuery({
    userId: getUserIdFromRequest(req),
    portfolioId: req.query.portfolioId,
  });

  const query = normalizeXirrQuery(req.query);
  const xirr = await getUserPortfolioXirr(userId, portfolioId, query);

  res.status(200).json({
    success: true,
    data: {
      xirr,
    },
  });
});

const getPortfolioHoldings = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);

  const details = await ensurePortfolioExists(userId, portfolioId);

  res.status(200).json({
    success: true,
    data: {
      holdings: details.holdings,
    },
  });
});

const getPortfolioSummary = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);

  const details = await ensurePortfolioExists(userId, portfolioId);

  res.status(200).json({
    success: true,
    data: {
      summary: details.summary,
    },
  });
});

const getPortfolioPerformance = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);

  await ensurePortfolioExists(userId, portfolioId);

  const query = normalizePerformanceQuery(req.query);
  const performance = await getUserPortfolioPerformance(userId, portfolioId, query);

  res.status(200).json({
    success: true,
    data: {
      performance,
    },
  });
});

const getPortfolioXirr = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);

  await ensurePortfolioExists(userId, portfolioId);

  const query = normalizeXirrQuery(req.query);
  const xirr = await getUserPortfolioXirr(userId, portfolioId, query);

  res.status(200).json({
    success: true,
    data: {
      xirr,
    },
  });
});

const exportPortfolioCsv = asyncHandler(async (req, res) => {
  const { userId, portfolioId } = normalizeHoldingsQuery({
    userId: getUserIdFromRequest(req),
    portfolioId: req.query.portfolioId,
  });

  let holdings;
  let summary;

  if (portfolioId) {
    const details = await getUserPortfolioDetails(userId, portfolioId);

    if (!details) {
      throw new ApiError('Portfolio not found', 404, 'ERR_PORTFOLIO_NOT_FOUND');
    }

    holdings = details.holdings;
    summary = details.summary;
  } else {
    holdings = await getUserPortfolioHoldings(userId);
    summary = await getUserPortfolioSummary(userId);
  }

  const csvPayload = buildPortfolioExportCsv({ holdings, summary });
  const datePart = new Date().toISOString().slice(0, 10);
  const scope = portfolioId ? `portfolio-${portfolioId}` : 'all-portfolios';
  const filename = `${scope}-${datePart}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  return res.status(200).send(csvPayload);
});

const addTransaction = asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const portfolioId = normalizePortfolioId(req.params.portfolioId);
  const payload = normalizePortfolioTransactionPayload(req.body);

  if (!['buy', 'sell'].includes(payload.transactionType)) {
    throw new ApiError('transactionType must be buy or sell', 400, 'ERR_INVALID_PAYLOAD');
  }

  const transaction = await createPortfolioTransaction(userId, portfolioId, payload);

  if (!transaction) {
    throw new ApiError('Portfolio not found', 404, 'ERR_PORTFOLIO_NOT_FOUND');
  }

  res.status(201).json({
    success: true,
    data: {
      transaction,
    },
  });
});

module.exports = {
  listPortfolios,
  createPortfolio,
  getPortfolioDetails,
  updatePortfolio,
  removePortfolio,
  getHoldings,
  getSummary,
  getPerformance,
  getXirr,
  getPortfolioHoldings,
  getPortfolioSummary,
  getPortfolioPerformance,
  getPortfolioXirr,
  exportPortfolioCsv,
  addTransaction,
};
