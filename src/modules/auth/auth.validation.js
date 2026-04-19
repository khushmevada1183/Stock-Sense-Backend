const { ApiError } = require('../../utils/errorHandler');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const normalizeOptionalGender = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const gender = String(value).trim().toLowerCase();
  const allowedValues = ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'];
  if (!allowedValues.includes(gender)) {
    throw new ApiError(
      'gender must be one of: male, female, non_binary, other, prefer_not_to_say',
      400,
      'ERR_INVALID_PAYLOAD'
    );
  }

  return gender;
};

const normalizeOptionalDob = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const dob = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    throw new ApiError('dob must be in YYYY-MM-DD format', 400, 'ERR_INVALID_PAYLOAD');
  }

  const parsed = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError('dob is invalid', 400, 'ERR_INVALID_PAYLOAD');
  }

  if (parsed.getTime() > Date.now()) {
    throw new ApiError('dob cannot be in the future', 400, 'ERR_INVALID_PAYLOAD');
  }

  return dob;
};

const normalizeOptionalIncomeRange = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const incomeRange = String(value).trim();
  if (incomeRange.length > 80) {
    throw new ApiError('incomeRange must be at most 80 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  return incomeRange;
};

const normalizeOptionalOccupation = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const occupation = String(value).trim();
  if (occupation.length > 120) {
    throw new ApiError('occupation must be at most 120 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  return occupation;
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

const normalizeChangePasswordPayload = (body = {}) => {
  const oldPassword = normalizePassword(body.oldPassword, 'oldPassword');
  const newPassword = normalizePassword(body.newPassword, 'newPassword');

  if (oldPassword === newPassword) {
    throw new ApiError('newPassword must be different from oldPassword', 400, 'ERR_INVALID_PASSWORD');
  }

  return {
    oldPassword,
    newPassword,
  };
};

const normalizeLogoutDevicePayload = (body = {}) => {
  const sessionId = String(body.sessionId || '').trim();
  if (!UUID_V4_REGEX.test(sessionId)) {
    throw new ApiError('A valid sessionId is required', 400, 'ERR_INVALID_PAYLOAD');
  }

  return {
    sessionId,
  };
};

const normalizeReportActivityPayload = (body = {}) => {
  const type = String(body.type || '').trim().toLowerCase();
  const message = String(body.message || '').trim();
  const details = body.details === undefined || body.details === null ? null : body.details;

  if (!type) {
    throw new ApiError('type is required', 400, 'ERR_INVALID_PAYLOAD');
  }

  if (type.length > 60) {
    throw new ApiError('type must be at most 60 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  if (!message) {
    throw new ApiError('message is required', 400, 'ERR_INVALID_PAYLOAD');
  }

  if (message.length > 1000) {
    throw new ApiError('message must be at most 1000 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  return {
    type,
    message,
    details,
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

  if (body.gender !== undefined) {
    payload.gender = normalizeOptionalGender(body.gender);
  }

  if (body.dob !== undefined) {
    payload.dob = normalizeOptionalDob(body.dob);
  }

  if (body.incomeRange !== undefined) {
    payload.incomeRange = normalizeOptionalIncomeRange(body.incomeRange);
  }

  if (body.occupation !== undefined) {
    payload.occupation = normalizeOptionalOccupation(body.occupation);
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
  normalizeChangePasswordPayload,
  normalizeLogoutDevicePayload,
  normalizeReportActivityPayload,
  normalizeProfileUpdatePayload,
  getBearerToken,
};
