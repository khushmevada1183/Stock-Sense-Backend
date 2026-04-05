const asyncHandler = require('../../shared/middleware/asyncHandler');
const { ApiError } = require('../../utils/errorHandler');
const {
  normalizeAlertId,
  normalizeAlertCreatePayload,
  normalizeAlertUpdatePayload,
  normalizeAlertListQuery,
} = require('./alerts.validation');
const {
  listUserAlerts,
  createUserAlert,
  getUserAlert,
  updateUserAlert,
  deleteUserAlert,
} = require('./alerts.service');
const { getAlertEvaluatorSchedulerStatus } = require('../../jobs/alertEvaluatorScheduler');

const getUserIdFromRequest = (req) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError('Authentication required', 401, 'ERR_UNAUTHORIZED');
  }

  return String(userId);
};

const listAlerts = asyncHandler(async (req, res) => {
  const filters = normalizeAlertListQuery(req.query);
  const alerts = await listUserAlerts(getUserIdFromRequest(req), filters);

  res.status(200).json({
    success: true,
    data: {
      alerts,
    },
  });
});

const getEvaluatorStatus = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      scheduler: getAlertEvaluatorSchedulerStatus(),
    },
  });
});

const createAlert = asyncHandler(async (req, res) => {
  const payload = normalizeAlertCreatePayload(req.body);
  const alert = await createUserAlert(getUserIdFromRequest(req), payload);

  res.status(201).json({
    success: true,
    data: {
      alert,
    },
  });
});

const getAlert = asyncHandler(async (req, res) => {
  const alertId = normalizeAlertId(req.params.alertId);
  const alert = await getUserAlert(getUserIdFromRequest(req), alertId);

  if (!alert) {
    throw new ApiError('Alert not found', 404, 'ERR_ALERT_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      alert,
    },
  });
});

const patchAlert = asyncHandler(async (req, res) => {
  const alertId = normalizeAlertId(req.params.alertId);
  const payload = normalizeAlertUpdatePayload(req.body);

  const alert = await updateUserAlert(getUserIdFromRequest(req), alertId, payload);

  if (!alert) {
    throw new ApiError('Alert not found', 404, 'ERR_ALERT_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      alert,
    },
  });
});

const removeAlert = asyncHandler(async (req, res) => {
  const alertId = normalizeAlertId(req.params.alertId);
  const deleted = await deleteUserAlert(getUserIdFromRequest(req), alertId);

  if (!deleted) {
    throw new ApiError('Alert not found', 404, 'ERR_ALERT_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'Alert deleted successfully',
    },
  });
});

module.exports = {
  getEvaluatorStatus,
  listAlerts,
  createAlert,
  getAlert,
  patchAlert,
  removeAlert,
};
