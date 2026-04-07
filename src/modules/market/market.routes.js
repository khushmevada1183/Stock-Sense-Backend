const express = require('express');
const {
	syncSnapshot,
	getLatest,
	getOverview,
	getIndexHistory,
	getSectorHeatmap,
	get52WeekHigh,
	get52WeekLow,
	getStatus,
	getHistory,
	getSocketStatus,
	getLiveTickStatus,
	syncLiveTicks,
} = require('./market.controller');

const router = express.Router();

router.get('/overview', getOverview);
router.get('/indices/:name', getIndexHistory);
router.get('/sector-heatmap', getSectorHeatmap);
router.get('/52-week-high', get52WeekHigh);
router.get('/52-week-low', get52WeekLow);
router.post('/snapshot/sync', syncSnapshot);
router.get('/snapshot/status', getStatus);
router.get('/socket/status', getSocketStatus);
router.get('/ticks/status', getLiveTickStatus);
router.post('/ticks/sync', syncLiveTicks);
router.get('/snapshot/latest', getLatest);
router.get('/snapshot/history', getHistory);

module.exports = router;