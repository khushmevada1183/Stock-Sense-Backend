const express = require('express');
const { createTicks, getTicks, getHistory } = require('./ticks.controller');

const router = express.Router();

router.post('/:symbol/ticks', createTicks);
router.get('/:symbol/ticks', getTicks);
router.get('/:symbol/history', getHistory);

module.exports = router;
