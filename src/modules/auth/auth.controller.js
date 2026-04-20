const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  normalizeSignupPayload,
  normalizeLoginPayload,
  normalizeOAuthLoginPayload,
  normalizeRefreshPayload,
  normalizeResendEmailVerificationPayload,
  normalizeEmailVerificationPayload,
  normalizeVerifyResetCodePayload,
  normalizeListLimitQuery,
  normalizeForgotPasswordPayload,
  normalizeResetPasswordPayload,
  normalizeChangePasswordPayload,
  normalizeLogoutDevicePayload,
  normalizeReportActivityPayload,
  normalizeProfileUpdatePayload,
} = require('./auth.validation');
const {
  registerUser,
  loginUser,
  loginWithOAuth,
  refreshAuthTokens,
  logoutUser,
  logoutAllUserSessions,
  getUserActiveSessions,
  getUserAuthAuditLogs,
  resendEmailVerificationOtp,
  verifyEmailOtp,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePasswordByUserId,
  getProfileByUserId,
  updateProfileByUserId,
  logoutDeviceByUserId,
  reportActivityByUserId,
} = require('./auth.service');

const getRequestContext = (req) => {
  return {
    userAgent: req.headers['user-agent'] || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
  };
};

const signup = asyncHandler(async (req, res) => {
  const payload = normalizeSignupPayload(req.body);
  const data = await registerUser(payload, getRequestContext(req));

  res.status(201).json({
    success: true,
    data,
  });
});

const login = asyncHandler(async (req, res) => {
  const payload = normalizeLoginPayload(req.body);
  const data = await loginUser(payload, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

const oauthLogin = asyncHandler(async (req, res) => {
  const payload = normalizeOAuthLoginPayload(req.body);
  const data = await loginWithOAuth(payload, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const payload = normalizeRefreshPayload(req.body);
  const data = await refreshAuthTokens(payload.refreshToken, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken ? String(req.body.refreshToken) : null;
  const data = await logoutUser(refreshToken, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

const logoutAll = asyncHandler(async (req, res) => {
  const data = await logoutAllUserSessions(req.auth.userId, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

const getSessions = asyncHandler(async (req, res) => {
  const query = normalizeListLimitQuery(req.query, 20, 100);
  const sessions = await getUserActiveSessions(req.auth.userId, {
    ...query,
    currentSessionId: req.auth.sessionId,
  });

  res.status(200).json({
    success: true,
    data: {
      count: sessions.length,
      sessions,
    },
  });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const query = normalizeListLimitQuery(req.query, 50, 200);
  const auditLogs = await getUserAuthAuditLogs(req.auth.userId, query);

  res.status(200).json({
    success: true,
    data: {
      count: auditLogs.length,
      auditLogs,
    },
  });
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const payload = normalizeResendEmailVerificationPayload(req.body);
  const data = await resendEmailVerificationOtp(payload);

  res.status(200).json({
    success: true,
    data,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const payload = normalizeEmailVerificationPayload(req.body);
  const data = await verifyEmailOtp(payload);

  res.status(200).json({
    success: true,
    data,
  });
});

const forgotPasswordController = asyncHandler(async (req, res) => {
  const payload = normalizeForgotPasswordPayload(req.body);
  const data = await forgotPassword(payload);

  res.status(200).json({
    success: true,
    data,
  });
});

const verifyResetCodeController = asyncHandler(async (req, res) => {
  const payload = normalizeVerifyResetCodePayload(req.body);
  const data = await verifyResetCode(payload);

  res.status(200).json({
    success: true,
    data,
  });
});

const resetPasswordController = asyncHandler(async (req, res) => {
  const payload = normalizeResetPasswordPayload(req.body);
  const data = await resetPassword(payload);

  res.status(200).json({
    success: true,
    data,
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const data = await getProfileByUserId(req.auth.userId);

  res.status(200).json({
    success: true,
    data,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const payload = normalizeProfileUpdatePayload(req.body);
  const data = await updateProfileByUserId(req.auth.userId, payload);

  res.status(200).json({
    success: true,
    data,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const payload = normalizeChangePasswordPayload(req.body);
  const data = await changePasswordByUserId(req.auth.userId, payload, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

const logoutDevice = asyncHandler(async (req, res) => {
  const payload = normalizeLogoutDevicePayload(req.body);
  const data = await logoutDeviceByUserId(req.auth.userId, payload, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

const reportActivity = asyncHandler(async (req, res) => {
  const payload = normalizeReportActivityPayload(req.body);
  const data = await reportActivityByUserId(req.auth.userId, payload, getRequestContext(req));

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  signup,
  login,
  oauthLogin,
  refresh,
  logout,
  logoutAll,
  getSessions,
  getAuditLogs,
  resendEmailVerification,
  verifyEmail,
  forgotPasswordController,
  verifyResetCodeController,
  resetPasswordController,
  getProfile,
  updateProfile,
  changePassword,
  logoutDevice,
  reportActivity,
};
