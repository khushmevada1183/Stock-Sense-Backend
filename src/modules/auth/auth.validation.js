const { ApiError } = require('../../utils/errorHandler');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError('A valid email is required', 400, 'ERR_INVALID_EMAIL');
  }
  return email;
};

const normalizePassword = (value, fieldName = 'password') => {
  const password = String(value || '');
  if (password.length < 8) {
    throw new ApiError(`${fieldName} must be at least 8 characters`, 400, 'ERR_INVALID_PASSWORD');
  }
  if (password.length > 128) {
    throw new ApiError(`${fieldName} must be at most 128 characters`, 400, 'ERR_INVALID_PASSWORD');
  }
  return password;
};

const normalizeFullName = (value) => {
  const fullName = String(value || '').trim();
  if (!fullName) {
    throw new ApiError('fullName is required', 400, 'ERR_INVALID_PAYLOAD');
  }
  if (fullName.length > 120) {
    throw new ApiError('fullName must be at most 120 characters', 400, 'ERR_INVALID_PAYLOAD');
  }
  return fullName;
};

const normalizeOptionalPhone = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const phone = String(value).trim();
  if (phone.length > 20) {
    throw new ApiError('phone must be at most 20 characters', 400, 'ERR_INVALID_PAYLOAD');
  }
  return phone;
};

const normalizeOptionalAvatarUrl = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const avatarUrl = String(value).trim();
  if (avatarUrl.length > 500) {
    throw new ApiError('avatarUrl must be at most 500 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  return avatarUrl;
};

const normalizeSignupPayload = (body = {}) => {
  return {
    email: normalizeEmail(body.email),
    password: normalizePassword(body.password),
    fullName: normalizeFullName(body.fullName),
    phone: normalizeOptionalPhone(body.phone),
  };
};

const normalizeLoginPayload = (body = {}) => {
  return {
    email: normalizeEmail(body.email),
    password: normalizePassword(body.password),
  };
};

const normalizeForgotPasswordPayload = (body = {}) => {
  return {
    email: normalizeEmail(body.email),
  };
};

const normalizeRefreshPayload = (body = {}) => {
  const refreshToken = String(body.refreshToken || '').trim();
  if (!refreshToken || refreshToken.length < 20) {
    throw new ApiError('A valid refreshToken is required', 400, 'ERR_INVALID_REFRESH_TOKEN');
  }

  return {
    refreshToken,
  };
};

const normalizeResendEmailVerificationPayload = (body = {}) => {
  return {
    email: normalizeEmail(body.email),
  };
};

const normalizeOAuthLoginPayload = (body = {}) => {
  const provider = String(body.provider || '').trim().toLowerCase();
  if (!['google', 'facebook'].includes(provider)) {
    throw new ApiError('provider must be google or facebook', 400, 'ERR_INVALID_OAUTH_PROVIDER');
  }

  if (provider === 'google') {
    const idToken = String(body.idToken || body.token || '').trim();
    if (!idToken || idToken.length < 20) {
      throw new ApiError('A valid Google idToken is required', 400, 'ERR_INVALID_OAUTH_PAYLOAD');
    }
    return { provider, idToken };
  }

  const accessToken = String(body.accessToken || body.token || '').trim();
  if (!accessToken || accessToken.length < 20) {
    throw new ApiError('A valid Facebook accessToken is required', 400, 'ERR_INVALID_OAUTH_PAYLOAD');
  }

  return {
    provider,
    accessToken,
  };
};

const normalizeListLimitQuery = (query = {}, defaultLimit = 20, maxLimit = 100) => {
  const parsed = Number.parseInt(query.limit, 10);
  if (!Number.isFinite(parsed)) {
    return { limit: defaultLimit };
  }

  if (parsed < 1 || parsed > maxLimit) {
    throw new ApiError(`limit must be between 1 and ${maxLimit}`, 400, 'ERR_INVALID_LIMIT');
  }

  return { limit: parsed };
};

const normalizeEmailVerificationPayload = (body = {}) => {
  const verificationOtp = String(body.verificationOtp || '').trim();
  if (!/^\d{6}$/.test(verificationOtp)) {
    throw new ApiError('verificationOtp must be a 6-digit code', 400, 'ERR_INVALID_EMAIL_VERIFICATION_CODE');
  }

  return {
    email: normalizeEmail(body.email),
    verificationOtp,
  };
};

const normalizeResetPasswordPayload = (body = {}) => {
  const token = String(body.token || '').trim();
  if (!token || token.length < 20) {
    throw new ApiError('A valid reset token is required', 400, 'ERR_INVALID_RESET_TOKEN');
  }

  return {
    token,
    newPassword: normalizePassword(body.newPassword, 'newPassword'),
  };
};

const normalizeProfileUpdatePayload = (body = {}) => {
  const payload = {};

  if (body.fullName !== undefined) {
    payload.fullName = normalizeFullName(body.fullName);
  }

  if (body.phone !== undefined) {
    payload.phone = normalizeOptionalPhone(body.phone);
  }

  if (body.avatarUrl !== undefined) {
    payload.avatarUrl = normalizeOptionalAvatarUrl(body.avatarUrl);
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError('No profile fields provided for update', 400, 'ERR_INVALID_PAYLOAD');
  }

  return payload;
};

const getBearerToken = (authorizationHeader) => {
  const header = String(authorizationHeader || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) {
    throw new ApiError('Authorization bearer token is required', 401, 'ERR_UNAUTHORIZED');
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw new ApiError('Authorization bearer token is required', 401, 'ERR_UNAUTHORIZED');
  }

  return token;
};

module.exports = {
  normalizeSignupPayload,
  normalizeLoginPayload,
  normalizeOAuthLoginPayload,
  normalizeRefreshPayload,
  normalizeResendEmailVerificationPayload,
  normalizeEmailVerificationPayload,
  normalizeListLimitQuery,
  normalizeForgotPasswordPayload,
  normalizeResetPasswordPayload,
  normalizeProfileUpdatePayload,
  getBearerToken,
};
