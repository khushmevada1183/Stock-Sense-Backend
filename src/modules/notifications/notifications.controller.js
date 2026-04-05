const asyncHandler = require('../../shared/middleware/asyncHandler');
const { ApiError } = require('../../utils/errorHandler');
const {
  normalizePushDeviceId,
  normalizeRegisterPushDevicePayload,
  normalizeNotificationListQuery,
} = require('./notifications.validation');
const {
  listUserNotifications,
  registerUserPushDevice,
  listUserPushDevices,
  removeUserPushDevice,
} = require('./notifications.service');
const {
  getNotificationDeliverySchedulerStatus,
} = require('../../jobs/notificationDeliveryScheduler');

const getUserIdFromRequest = (req) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError('Authentication required', 401, 'ERR_UNAUTHORIZED');
  }

  return String(userId);
};

const getDeliveryStatus = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      scheduler: getNotificationDeliverySchedulerStatus(),
    },
  });
});

const getNotifications = asyncHandler(async (req, res) => {
  const query = normalizeNotificationListQuery(req.query);
  const notifications = await listUserNotifications(getUserIdFromRequest(req), query);

  res.status(200).json({
    success: true,
    data: {
      count: notifications.length,
      notifications,
    },
  });
});

const getPushDevices = asyncHandler(async (req, res) => {
  const devices = await listUserPushDevices(getUserIdFromRequest(req));

  res.status(200).json({
    success: true,
    data: {
      count: devices.length,
      devices,
    },
  });
});

const postPushDevice = asyncHandler(async (req, res) => {
  const payload = normalizeRegisterPushDevicePayload(req.body);
  const device = await registerUserPushDevice(getUserIdFromRequest(req), payload);

  res.status(201).json({
    success: true,
    data: {
      device,
    },
  });
});

const deletePushDevice = asyncHandler(async (req, res) => {
  const deviceId = normalizePushDeviceId(req.params.deviceId);
  const removed = await removeUserPushDevice(getUserIdFromRequest(req), deviceId);

  if (!removed) {
    throw new ApiError('Push device not found', 404, 'ERR_PUSH_DEVICE_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      device: removed,
    },
  });
});

module.exports = {
  getDeliveryStatus,
  getNotifications,
  getPushDevices,
  postPushDevice,
  deletePushDevice,
};
