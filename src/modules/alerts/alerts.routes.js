const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const {
  getEvaluatorStatus,
  listAlerts,
  createAlert,
  getAlert,
  patchAlert,
  removeAlert,
} = require('./alerts.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/evaluator/status', getEvaluatorStatus);
router.get('/', listAlerts);
router.post('/', createAlert);
router.get('/:alertId', getAlert);
router.patch('/:alertId', patchAlert);
router.delete('/:alertId', removeAlert);

module.exports = router;
