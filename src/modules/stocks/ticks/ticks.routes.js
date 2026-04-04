const express = require('express');
const { createTicks, getTicks } = require('./ticks.controller');

const router = express.Router();

router.post('/:symbol/ticks', createTicks);
router.get('/:symbol/ticks', getTicks);

module.exports = router;
