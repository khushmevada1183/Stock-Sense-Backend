const asyncHandler = require('../../shared/middleware/asyncHandler');
const { ApiError } = require('../../utils/errorHandler');
const { getBearerToken } = require('./auth.validation');
const { verifyAccessToken, assertActiveAccessSession } = require('./auth.service');

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req.headers.authorization);
  const payload = verifyAccessToken(token);
  await assertActiveAccessSession(payload);

  req.auth = {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    fullName: payload.fullName,
    sessionId: payload.sid || null,
  };

  next();
});

const requireRole = (allowedRoles = []) => {
  return asyncHandler(async (req, res, next) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.length) {
      return next();
    }

    const currentRole = req.auth?.role;
    if (!currentRole || !roles.includes(currentRole)) {
      throw new ApiError('Forbidden: insufficient role privileges', 403, 'ERR_FORBIDDEN');
    }

    next();
  });
};

module.exports = {
  requireAuth,
  requireRole,
};
