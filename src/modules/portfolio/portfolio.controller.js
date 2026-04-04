const asyncHandler = require('../../shared/middleware/asyncHandler');
const { ApiError } = require('../../utils/errorHandler');
const {
  normalizeUserId,
  normalizePortfolioId,
  normalizePortfolioCreatePayload,
  normalizePortfolioUpdatePayload,
  normalizePortfolioTransactionPayload,
  normalizeHoldingsQuery,
} = require('./portfolio.validation');
const {
  getUserPortfolios,
  createUserPortfolio,
  updateUserPortfolio,
  deleteUserPortfolio,
  getUserPortfolioHoldings,
  getUserPortfolioSummary,
  getUserPortfolioDetails,
  createPortfolioTransaction,
} = require('./portfolio.service');

const getUserIdFromRequest = (req) => {
  return normalizeUserId(req.query.userId || req.body?.userId || req.headers['x-user-id']);
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
    userId: req.query.userId || req.body?.userId || req.headers['x-user-id'],
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
    userId: req.query.userId || req.body?.userId || req.headers['x-user-id'],
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
  addTransaction,
};
