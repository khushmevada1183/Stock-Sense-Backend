const express = require('express');
const apiKeyAuth = require('../../middleware/apiKeyAuth');
const {
	getIpoCalendar,
	getIpo,
	getIpoSubscriptionsLatest,
	getIpoSubscriptionHistory,
	postIpoSubscriptionSync,
	getIpoGmpLatest,
	getIpoGmpHistory,
	postIpoGmpSync,
} = require('./ipo.controller');

const router = express.Router();

router.get('/calendar', getIpoCalendar);
router.get('/subscriptions/latest', getIpoSubscriptionsLatest);
router.post('/subscriptions/sync', apiKeyAuth, postIpoSubscriptionSync);
router.get('/gmp/latest', getIpoGmpLatest);
router.post('/gmp/sync', apiKeyAuth, postIpoGmpSync);
router.get('/:ipoId/subscription', getIpoSubscriptionHistory);
router.get('/:ipoId/gmp', getIpoGmpHistory);
router.get('/:ipoId', getIpo);

module.exports = router;
