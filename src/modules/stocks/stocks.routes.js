const express = require('express');
const {
  search,
  profile,
  quote,
  peers,
} = require('./stocks.controller');
const {
  getTechnical,
  getTechnicalSchedulerStatus,
  runTechnicalRecompute,
} = require('./technical/technical.controller');
const {
  getFundamental,
  getFinancials,
  getFundamentalsStatus,
  runFundamentalsSync,
} = require('./fundamentals/fundamentals.controller');
const tickRoutes = require('./ticks/ticks.routes');

const router = express.Router();

router.get('/search', search);
router.get('/technical/status', getTechnicalSchedulerStatus);
router.post('/technical/recompute', runTechnicalRecompute);
router.get('/fundamentals/status', getFundamentalsStatus);
router.post('/fundamentals/sync', runFundamentalsSync);
router.get('/:symbol/technical', getTechnical);
router.get('/:symbol/fundamental', getFundamental);
router.get('/:symbol/financials', getFinancials);
router.get('/:symbol/peers', peers);
router.get('/:symbol/quote', quote);
router.get('/:symbol', profile);

router.use('/', tickRoutes);

module.exports = router;
