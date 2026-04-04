const express = require('express');
const { syncSnapshot, getLatest, getStatus, getHistory } = require('./market.controller');

const router = express.Router();

router.post('/snapshot/sync', syncSnapshot);
router.get('/snapshot/status', getStatus);
router.get('/snapshot/latest', getLatest);
router.get('/snapshot/history', getHistory);

module.exports = router;