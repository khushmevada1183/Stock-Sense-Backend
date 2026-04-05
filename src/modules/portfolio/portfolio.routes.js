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
  getPortfolioHoldings,
  getPortfolioSummary,
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

router.get('/:portfolioId/holdings', getPortfolioHoldings);
router.get('/:portfolioId/summary', getPortfolioSummary);
router.get('/:portfolioId', getPortfolioDetails);
router.put('/:portfolioId', updatePortfolio);
router.delete('/:portfolioId', removePortfolio);
router.post('/:portfolioId/transactions', addTransaction);

module.exports = router;
