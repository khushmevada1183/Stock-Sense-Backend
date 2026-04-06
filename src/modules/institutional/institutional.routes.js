const express = require('express');
const apiKeyAuth = require('../../middleware/apiKeyAuth');
const {
  getFiiDiiLatest,
  getFiiDiiHistory,
  getFiiDiiCumulative,
  postFiiDiiSync,
  getBlockDealsLatest,
  getBlockDealsHistory,
  postBlockDealsSync,
  getMutualFundsLatest,
  getMutualFundsHistory,
  getMutualFundsTopHolders,
  postMutualFundsSync,
  getInsiderTradesLatest,
  getInsiderTradesHistory,
  getInsiderTradesSummary,
  postInsiderTradesSync,
  getShareholdingLatest,
  getShareholdingHistory,
  getShareholdingTrends,
  postShareholdingSync,
  getCorporateActionsLatest,
  getCorporateActionsHistory,
  getCorporateActionsSummary,
  postCorporateActionsSync,
  getEarningsCalendarLatest,
  getEarningsCalendarHistory,
  getEarningsCalendarSummary,
  postEarningsCalendarSync,
} = require('./institutional.controller');

const router = express.Router();

router.get('/fii-dii', getFiiDiiLatest);
router.get('/fii-dii/history', getFiiDiiHistory);
router.get('/fii-dii/cumulative', getFiiDiiCumulative);
router.post('/fii-dii/sync', apiKeyAuth, postFiiDiiSync);

router.get('/block-deals', getBlockDealsLatest);
router.get('/block-deals/history', getBlockDealsHistory);
router.post('/block-deals/sync', apiKeyAuth, postBlockDealsSync);

router.get('/mutual-funds', getMutualFundsLatest);
router.get('/mutual-funds/history', getMutualFundsHistory);
router.get('/mutual-funds/top-holders', getMutualFundsTopHolders);
router.post('/mutual-funds/sync', apiKeyAuth, postMutualFundsSync);

router.get('/insider-trades', getInsiderTradesLatest);
router.get('/insider-trades/history', getInsiderTradesHistory);
router.get('/insider-trades/summary', getInsiderTradesSummary);
router.post('/insider-trades/sync', apiKeyAuth, postInsiderTradesSync);

router.get('/shareholding', getShareholdingLatest);
router.get('/shareholding/history', getShareholdingHistory);
router.get('/shareholding/trends', getShareholdingTrends);
router.post('/shareholding/sync', apiKeyAuth, postShareholdingSync);

router.get('/corporate-actions', getCorporateActionsLatest);
router.get('/corporate-actions/history', getCorporateActionsHistory);
router.get('/corporate-actions/summary', getCorporateActionsSummary);
router.post('/corporate-actions/sync', apiKeyAuth, postCorporateActionsSync);

router.get('/earnings-calendar', getEarningsCalendarLatest);
router.get('/earnings-calendar/history', getEarningsCalendarHistory);
router.get('/earnings-calendar/summary', getEarningsCalendarSummary);
router.post('/earnings-calendar/sync', apiKeyAuth, postEarningsCalendarSync);

module.exports = router;
