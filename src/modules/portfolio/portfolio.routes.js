const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const {
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
} = require('./portfolio.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listPortfolios);
router.post('/', createPortfolio);

router.get('/export', exportPortfolioCsv);
router.get('/holdings', getHoldings);
router.get('/summary', getSummary);
router.get('/performance', getPerformance);
router.get('/xirr', getXirr);

router.get('/:portfolioId/holdings', getPortfolioHoldings);
router.get('/:portfolioId/summary', getPortfolioSummary);
router.get('/:portfolioId/performance', getPortfolioPerformance);
router.get('/:portfolioId/xirr', getPortfolioXirr);
router.get('/:portfolioId', getPortfolioDetails);
router.put('/:portfolioId', updatePortfolio);
router.delete('/:portfolioId', removePortfolio);
router.post('/:portfolioId/transactions', addTransaction);

module.exports = router;
