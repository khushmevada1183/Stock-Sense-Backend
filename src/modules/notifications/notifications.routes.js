const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const {
  getDeliveryStatus,
  getNotifications,
  getPushDevices,
  postPushDevice,
  deletePushDevice,
} = require('./notifications.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/delivery/status', getDeliveryStatus);
router.get('/', getNotifications);
router.get('/push-devices', getPushDevices);
router.post('/push-devices', postPushDevice);
router.delete('/push-devices/:deviceId', deletePushDevice);

module.exports = router;
