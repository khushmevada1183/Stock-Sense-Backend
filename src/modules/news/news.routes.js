const express = require('express');
const {
  getFeed,
  getFeedByCategory,
  getTrending,
  getAlerts,
  postSyncNews,
  postSyncSentiment,
  getFearGreedIndex,
} = require('./news.controller');

const router = express.Router();

router.get('/', getFeed);
router.get('/trending', getTrending);
router.get('/alerts', getAlerts);
router.get('/fear-greed', getFearGreedIndex);
router.get('/category/:category', getFeedByCategory);

router.post('/sync', postSyncNews);
router.post('/sentiment/sync', postSyncSentiment);

module.exports = router;
