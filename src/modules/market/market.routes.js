const express = require('express');
const {
	syncSnapshot,
	getLatest,
	getStatus,
	getHistory,
	getSocketStatus,
	getLiveTickStatus,
	syncLiveTicks,
} = require('./market.controller');

const router = express.Router();

router.post('/snapshot/sync', syncSnapshot);
router.get('/snapshot/status', getStatus);
router.get('/socket/status', getSocketStatus);
router.get('/ticks/status', getLiveTickStatus);
router.post('/ticks/sync', syncLiveTicks);
router.get('/snapshot/latest', getLatest);
router.get('/snapshot/history', getHistory);

module.exports = router;