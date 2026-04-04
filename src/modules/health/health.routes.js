const express = require('express');
const { getServiceHealth, getDatabaseHealthStatus } = require('./health.controller');

const router = express.Router();

router.get('/', getServiceHealth);
router.get('/db', getDatabaseHealthStatus);

module.exports = router;
