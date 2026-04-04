const express = require('express');
const {
  listPortfolios,
  createPortfolio,
  getPortfolioDetails,
  updatePortfolio,
  removePortfolio,
  getHoldings,
  getSummary,
  addTransaction,
} = require('./portfolio.controller');

const router = express.Router();

router.get('/', listPortfolios);
router.post('/', createPortfolio);

router.get('/holdings', getHoldings);
router.get('/summary', getSummary);

router.get('/:portfolioId', getPortfolioDetails);
router.put('/:portfolioId', updatePortfolio);
router.delete('/:portfolioId', removePortfolio);
router.post('/:portfolioId/transactions', addTransaction);

module.exports = router;
