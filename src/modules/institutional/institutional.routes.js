const express = require('express');
const apiKeyAuth = require('../../middleware/apiKeyAuth');
const {
  getFiiDiiLatest,
  getFiiDiiHistory,
  getFiiDiiCumulative,
  postFiiDiiSync,
} = require('./institutional.controller');

const router = express.Router();

router.get('/fii-dii', getFiiDiiLatest);
router.get('/fii-dii/history', getFiiDiiHistory);
router.get('/fii-dii/cumulative', getFiiDiiCumulative);
router.post('/fii-dii/sync', apiKeyAuth, postFiiDiiSync);

module.exports = router;
