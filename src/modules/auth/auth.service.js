const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../../utils/errorHandler');
const {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserLastLogin,
  updateUserPassword,
  markUserEmailVerified,
  updateUserProfile,
  createUserSession,
  listActiveSessionsByUserId,
  enforceMaxActiveSessions,
  findActiveSessionByHash,
  revokeUserSessionByHash,
  revokeActiveSessionsByUserId,
  findOAuthIdentity,
  createOAuthIdentity,
  createPasswordResetToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  revokeActiveEmailVerificationTokensByUserId,
  createAuthAuditLog,
  listAuthAuditLogsByUserId,
  getLoginAttempt,
  upsertLoginAttempt,
  deleteLoginAttempt,
} = require('./auth.repository');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const RESET_EXPIRES_MINUTES = Number.parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES || '30', 10);
const EMAIL_VERIFICATION_OTP_EXPIRES_MINUTES = toPositiveInt(
  process.env.EMAIL_VERIFICATION_OTP_EXPIRES_MINUTES,
  10
);
const BCRYPT_SALT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const LOGIN_MAX_ATTEMPTS = toPositiveInt(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 5);
const LOGIN_WINDOW_MINUTES = toPositiveInt(process.env.AUTH_LOGIN_WINDOW_MINUTES, 15);
const LOGIN_BLOCK_MINUTES = toPositiveInt(process.env.AUTH_LOGIN_BLOCK_MINUTES, 60);
const EXPOSE_RESET_TOKEN =
  String(process.env.AUTH_EXPOSE_RESET_TOKEN || '').toLowerCase() === 'true' ||
  (process.env.NODE_ENV || 'development') !== 'production';
const EXPOSE_EMAIL_VERIFICATION_OTP =
  String(process.env.AUTH_EXPOSE_EMAIL_VERIFICATION_OTP || '').toLowerCase() === 'true' ||
  (process.env.NODE_ENV || 'development') !== 'production';
const REQUIRE_EMAIL_VERIFIED_FOR_LOGIN =
  String(process.env.AUTH_REQUIRE_EMAIL_VERIFIED_FOR_LOGIN || 'false').toLowerCase() === 'true';
const AUTH_MAX_ACTIVE_SESSIONS = toPositiveInt(process.env.AUTH_MAX_ACTIVE_SESSIONS, 5);
const GOOGLE_OAUTH_CLIENT_ID = String(process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
const FACEBOOK_APP_ID = String(process.env.FACEBOOK_APP_ID || '').trim();
const FACEBOOK_APP_SECRET = String(process.env.FACEBOOK_APP_SECRET || '').trim();

const LOGIN_ATTEMPT_SCOPE = 'ip';
const OAUTH_SUPPORTED_PROVIDERS = ['google', 'facebook'];

const googleOauthClient = GOOGLE_OAUTH_CLIENT_ID ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID) : null;

const hashOpaqueToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateSixDigitOtp = () => {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
};

const logAuthEvent = async ({
  userId = null,
  eventType,
  eventStatus = 'success',
  context = {},
  metadata = {},
}) => {
  try {
    await createAuthAuditLog({
      userId,
      eventType,
      eventStatus,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata,
    });
  } catch (error) {
    console.error(`[AUTH_AUDIT] Failed to write event ${eventType}: ${error.message}`);
  }
};

const enforceSessionPolicy = async (userId) => {
  await enforceMaxActiveSessions({
    userId,
    maxActiveSessions: AUTH_MAX_ACTIVE_SESSIONS,
  });
};

const verifyGoogleOAuthToken = async (idToken) => {
  const token = String(idToken || '').trim();
  if (!token) {
    throw new ApiError('Google idToken is required', 400, 'ERR_INVALID_OAUTH_PAYLOAD');
  }

  if (!googleOauthClient) {
    throw new ApiError('Google OAuth is not configured', 503, 'ERR_OAUTH_NOT_CONFIGURED');
  }

  try {
    const ticket = await googleOauthClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      throw new ApiError('Google OAuth payload is incomplete', 401, 'ERR_INVALID_OAUTH_TOKEN');
    }

    return {
      provider: 'google',
      providerUserId: payload.sub,
      email: String(payload.email).toLowerCase(),
      fullName: payload.name || payload.email,
      emailVerified: Boolean(payload.email_verified),
      avatarUrl: payload.picture || null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Google OAuth token is invalid or expired', 401, 'ERR_INVALID_OAUTH_TOKEN');
  }
};

const verifyFacebookOAuthToken = async (accessToken) => {
  const token = String(accessToken || '').trim();
  if (!token) {
    throw new ApiError('Facebook accessToken is required', 400, 'ERR_INVALID_OAUTH_PAYLOAD');
  }

  try {
    if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
      const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
      const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: token,
          access_token: appAccessToken,
        },
        timeout: 10000,
      });

      const debugData = debugResponse.data?.data;
      if (!debugData?.is_valid || (FACEBOOK_APP_ID && debugData.app_id !== FACEBOOK_APP_ID)) {
        throw new ApiError('Facebook OAuth token is invalid', 401, 'ERR_INVALID_OAUTH_TOKEN');
      }
    }

    const meResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: token,
      },
      timeout: 10000,
    });

    const me = meResponse.data;
    if (!me?.id || !me?.email) {
      throw new ApiError('Facebook OAuth payload is incomplete', 401, 'ERR_INVALID_OAUTH_TOKEN');
    }

    return {
      provider: 'facebook',
      providerUserId: String(me.id),
      email: String(me.email).toLowerCase(),
      fullName: me.name || me.email,
      emailVerified: true,
      avatarUrl: me.picture?.data?.url || null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Facebook OAuth token is invalid or expired', 401, 'ERR_INVALID_OAUTH_TOKEN');
  }
};

const resolveOAuthProfile = async (payload) => {
  const provider = String(payload.provider || '').trim().toLowerCase();
  if (!OAUTH_SUPPORTED_PROVIDERS.includes(provider)) {
    throw new ApiError('Unsupported OAuth provider', 400, 'ERR_INVALID_OAUTH_PROVIDER');
  }

  if (provider === 'google') {
    return verifyGoogleOAuthToken(payload.idToken);
  }

  return verifyFacebookOAuthToken(payload.accessToken);
};

const buildTokenPayload = (user) => {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };
};

const getThrottleIdentifier = (context = {}) => {
  return String(context.ipAddress || 'unknown').trim().toLowerCase();
};

const getRetryAfterSeconds = (blockedUntil) => {
  if (!blockedUntil) {
    return LOGIN_BLOCK_MINUTES * 60;
  }

  const blockedUntilMs = new Date(blockedUntil).getTime();
  const remainingMs = blockedUntilMs - Date.now();
  if (remainingMs <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(remainingMs / 1000));
};

const assertLoginNotBlocked = async (context = {}) => {
  const identifier = getThrottleIdentifier(context);
  const attempt = await getLoginAttempt({
    scope: LOGIN_ATTEMPT_SCOPE,
    identifier,
  });

  if (attempt?.blockedUntil && new Date(attempt.blockedUntil).getTime() > Date.now()) {
    throw new ApiError('Too many failed login attempts. Try again later.', 429, 'ERR_LOGIN_RATE_LIMITED', {
      retryAfterSeconds: getRetryAfterSeconds(attempt.blockedUntil),
    });
  }

  return identifier;
};

const recordLoginFailure = async (identifier) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStartMs = Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000;

  const existing = await getLoginAttempt({
    scope: LOGIN_ATTEMPT_SCOPE,
    identifier,
  });

  const shouldAccumulate =
    existing?.lastFailedAt && new Date(existing.lastFailedAt).getTime() >= windowStartMs;

  const failedCount = shouldAccumulate ? existing.failedCount + 1 : 1;
  const firstFailedAt = shouldAccumulate ? existing.firstFailedAt || nowIso : nowIso;
  const blocked = failedCount >= LOGIN_MAX_ATTEMPTS;
  const blockedUntil = blocked
    ? new Date(Date.now() + LOGIN_BLOCK_MINUTES * 60 * 1000).toISOString()
    : null;

  await upsertLoginAttempt({
    scope: LOGIN_ATTEMPT_SCOPE,
    identifier,
    failedCount,
    firstFailedAt,
    lastFailedAt: nowIso,
    blockedUntil,
  });

  return {
    blocked,
    blockedUntil,
  };
};

const clearLoginFailures = async (identifier) => {
  await deleteLoginAttempt({
    scope: LOGIN_ATTEMPT_SCOPE,
    identifier,
  });
};

const issueEmailVerificationOtp = async (userId) => {
  const verificationOtp = generateSixDigitOtp();
  const otpHash = hashOpaqueToken(`email-verify:${verificationOtp}`);
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_OTP_EXPIRES_MINUTES * 60 * 1000
  ).toISOString();

  await revokeActiveEmailVerificationTokensByUserId(userId);
  await createEmailVerificationToken({
    userId,
    otpHash,
    expiresAt,
  });

  return {
    expiresAt,
    ...(EXPOSE_EMAIL_VERIFICATION_OTP ? { verificationOtp } : {}),
  };
};

const issueAuthTokens = (user) => {
  const payload = buildTokenPayload(user);
  const accessToken = jwt.sign(
    {
      ...payload,
      tokenType: 'access',
      jti: crypto.randomUUID(),
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
  const refreshToken = jwt.sign(
    {
      ...payload,
      tokenType: 'refresh',
      jti: crypto.randomUUID(),
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  return {
    accessToken,
    refreshToken,
  };
};

const getRefreshTokenExpiry = (refreshToken) => {
  const decoded = jwt.decode(refreshToken);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000).toISOString();
  }

  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
};

const verifyRefreshToken = (token) => {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    if (payload?.tokenType !== 'refresh') {
      throw new ApiError('Invalid refresh token', 401, 'ERR_UNAUTHORIZED');
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Invalid or expired refresh token', 401, 'ERR_UNAUTHORIZED');
  }
};

const registerUser = async (payload, context = {}) => {
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw new ApiError('Email is already registered', 409, 'ERR_EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(payload.password, BCRYPT_SALT_ROUNDS);
  const user = await createUser({
    email: payload.email,
    passwordHash,
    fullName: payload.fullName,
    phone: payload.phone,
  });
  const emailVerification = await issueEmailVerificationOtp(user.id);

  const tokens = issueAuthTokens(user);
  await createUserSession({
    userId: user.id,
    refreshTokenHash: hashOpaqueToken(tokens.refreshToken),
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt: getRefreshTokenExpiry(tokens.refreshToken),
  });
  await enforceSessionPolicy(user.id);
  await logAuthEvent({
    userId: user.id,
    eventType: 'signup',
    context,
    metadata: { method: 'email_password' },
  });

  return {
    user,
    ...tokens,
    emailVerification: {
      required: true,
      expiresAt: emailVerification.expiresAt,
      ...(emailVerification.verificationOtp
        ? { verificationOtp: emailVerification.verificationOtp }
        : {}),
    },
  };
};

const loginUser = async (payload, context = {}) => {
  const throttleIdentifier = await assertLoginNotBlocked(context);
  const user = await findUserByEmail(payload.email);

  if (!user || !user.isActive) {
    const failure = await recordLoginFailure(throttleIdentifier);
    if (failure.blocked) {
      await logAuthEvent({
        eventType: 'login',
        eventStatus: 'failure',
        context,
        metadata: { email: payload.email, reason: 'rate_limited' },
      });
      throw new ApiError('Too many failed login attempts. Try again later.', 429, 'ERR_LOGIN_RATE_LIMITED', {
        retryAfterSeconds: getRetryAfterSeconds(failure.blockedUntil),
      });
    }
    await logAuthEvent({
      eventType: 'login',
      eventStatus: 'failure',
      context,
      metadata: { email: payload.email, reason: 'invalid_credentials' },
    });
    throw new ApiError('Invalid email or password', 401, 'ERR_INVALID_CREDENTIALS');
  }

  const passwordOk = await bcrypt.compare(payload.password, user.passwordHash);
  if (!passwordOk) {
    const failure = await recordLoginFailure(throttleIdentifier);
    if (failure.blocked) {
      await logAuthEvent({
        userId: user.id,
        eventType: 'login',
        eventStatus: 'failure',
        context,
        metadata: { email: payload.email, reason: 'rate_limited' },
      });
      throw new ApiError('Too many failed login attempts. Try again later.', 429, 'ERR_LOGIN_RATE_LIMITED', {
        retryAfterSeconds: getRetryAfterSeconds(failure.blockedUntil),
      });
    }
    await logAuthEvent({
      userId: user.id,
      eventType: 'login',
      eventStatus: 'failure',
      context,
      metadata: { email: payload.email, reason: 'invalid_credentials' },
    });
    throw new ApiError('Invalid email or password', 401, 'ERR_INVALID_CREDENTIALS');
  }

  if (REQUIRE_EMAIL_VERIFIED_FOR_LOGIN && !user.isEmailVerified) {
    await clearLoginFailures(throttleIdentifier);
    await logAuthEvent({
      userId: user.id,
      eventType: 'login',
      eventStatus: 'failure',
      context,
      metadata: { email: payload.email, reason: 'email_not_verified' },
    });
    throw new ApiError('Email verification is required before login', 403, 'ERR_EMAIL_NOT_VERIFIED');
  }

  await clearLoginFailures(throttleIdentifier);

  await updateUserLastLogin(user.id);

  const profile = await findUserById(user.id);
  const tokens = issueAuthTokens(profile);

  await createUserSession({
    userId: profile.id,
    refreshTokenHash: hashOpaqueToken(tokens.refreshToken),
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt: getRefreshTokenExpiry(tokens.refreshToken),
  });
  await enforceSessionPolicy(profile.id);
  await logAuthEvent({
    userId: profile.id,
    eventType: 'login',
    context,
    metadata: { method: 'email_password' },
  });

  return {
    user: profile,
    ...tokens,
  };
};

const loginWithOAuth = async (payload, context = {}) => {
  let oauthProfile;

  try {
    oauthProfile = await resolveOAuthProfile(payload);
    const existingIdentity = await findOAuthIdentity({
      provider: oauthProfile.provider,
      providerUserId: oauthProfile.providerUserId,
    });

    let user = null;
    if (existingIdentity) {
      user = await findUserById(existingIdentity.userId);
      if (!user || !user.isActive) {
        throw new ApiError('OAuth account is not active', 403, 'ERR_ACCOUNT_INACTIVE');
      }
    } else {
      const userByEmail = await findUserByEmail(oauthProfile.email);
      if (userByEmail && !userByEmail.isActive) {
        throw new ApiError('OAuth account is not active', 403, 'ERR_ACCOUNT_INACTIVE');
      }

      user = userByEmail;
      if (!user) {
        const generatedPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(generatedPassword, BCRYPT_SALT_ROUNDS);
        user = await createUser({
          email: oauthProfile.email,
          passwordHash,
          fullName: oauthProfile.fullName,
          phone: null,
        });
      }

      await createOAuthIdentity({
        userId: user.id,
        provider: oauthProfile.provider,
        providerUserId: oauthProfile.providerUserId,
        providerEmail: oauthProfile.email,
      });
    }

    if (oauthProfile.emailVerified && !user.isEmailVerified) {
      await markUserEmailVerified(user.id);
    }

    if (oauthProfile.avatarUrl && !user.avatarUrl) {
      await updateUserProfile(user.id, { avatarUrl: oauthProfile.avatarUrl });
    }

    await updateUserLastLogin(user.id);
    const profile = await findUserById(user.id);
    const tokens = issueAuthTokens(profile);

    await createUserSession({
      userId: profile.id,
      refreshTokenHash: hashOpaqueToken(tokens.refreshToken),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: getRefreshTokenExpiry(tokens.refreshToken),
    });
    await enforceSessionPolicy(profile.id);

    await logAuthEvent({
      userId: profile.id,
      eventType: 'oauth_login',
      context,
      metadata: { provider: oauthProfile.provider },
    });

    return {
      user: profile,
      provider: oauthProfile.provider,
      ...tokens,
    };
  } catch (error) {
    await logAuthEvent({
      eventType: 'oauth_login',
      eventStatus: 'failure',
      context,
      metadata: {
        provider: payload.provider,
        reason: error.code || error.message,
      },
    });
    throw error;
  }
};

const refreshAuthTokens = async (refreshToken, context = {}) => {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const activeSession = await findActiveSessionByHash(refreshTokenHash);

    if (!activeSession || activeSession.userId !== payload.sub) {
      throw new ApiError('Invalid or expired refresh token', 401, 'ERR_UNAUTHORIZED');
    }

    const user = await findUserById(activeSession.userId);
    if (!user || !user.isActive) {
      throw new ApiError('Invalid or expired refresh token', 401, 'ERR_UNAUTHORIZED');
    }

    const tokens = issueAuthTokens(user);

    await revokeUserSessionByHash(refreshTokenHash);
    await createUserSession({
      userId: user.id,
      refreshTokenHash: hashOpaqueToken(tokens.refreshToken),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: getRefreshTokenExpiry(tokens.refreshToken),
    });
    await enforceSessionPolicy(user.id);

    await logAuthEvent({
      userId: user.id,
      eventType: 'refresh',
      context,
    });

    return {
      user,
      ...tokens,
    };
  } catch (error) {
    await logAuthEvent({
      eventType: 'refresh',
      eventStatus: 'failure',
      context,
      metadata: { reason: error.code || error.message },
    });
    throw error;
  }
};

const logoutUser = async (refreshToken, context = {}) => {
  if (!refreshToken) {
    await logAuthEvent({
      eventType: 'logout',
      context,
      metadata: { mode: 'no_token' },
    });
    return { success: true };
  }

  let userId = null;
  try {
    const payload = verifyRefreshToken(refreshToken);
    userId = payload.sub;
  } catch (_error) {
    userId = null;
  }

  await revokeUserSessionByHash(hashOpaqueToken(refreshToken));
  await logAuthEvent({
    userId,
    eventType: 'logout',
    context,
  });
  return { success: true };
};

const forgotPassword = async ({ email }) => {
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    await logAuthEvent({
      eventType: 'forgot_password',
      eventStatus: 'failure',
      metadata: { email, reason: 'user_not_found' },
    });
    return {
      success: true,
      message: 'If the account exists, a password reset token has been generated.',
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60 * 1000).toISOString();

  await createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });
  await logAuthEvent({
    userId: user.id,
    eventType: 'forgot_password',
    metadata: { email },
  });

  return {
    success: true,
    message: 'Password reset token generated.',
    expiresAt,
    ...(EXPOSE_RESET_TOKEN ? { resetToken: rawToken } : {}),
  };
};

const resetPassword = async ({ token, newPassword }) => {
  const tokenHash = hashOpaqueToken(token);
  const consumed = await consumePasswordResetToken(tokenHash);

  if (!consumed) {
    throw new ApiError('Reset token is invalid or expired', 400, 'ERR_INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await updateUserPassword(consumed.user_id, passwordHash);
  await revokeActiveSessionsByUserId(consumed.user_id);
  await logAuthEvent({
    userId: consumed.user_id,
    eventType: 'reset_password',
  });

  return {
    success: true,
    message: 'Password reset successful',
  };
};

const resendEmailVerificationOtp = async ({ email }) => {
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    await logAuthEvent({
      eventType: 'resend_verification',
      eventStatus: 'failure',
      metadata: { email, reason: 'user_not_found' },
    });
    return {
      success: true,
      message: 'If the account exists, a verification code has been generated.',
    };
  }

  if (user.isEmailVerified) {
    await logAuthEvent({
      userId: user.id,
      eventType: 'resend_verification',
      metadata: { email, reason: 'already_verified' },
    });
    return {
      success: true,
      message: 'Email is already verified.',
    };
  }

  const emailVerification = await issueEmailVerificationOtp(user.id);
  await logAuthEvent({
    userId: user.id,
    eventType: 'resend_verification',
    metadata: { email },
  });

  return {
    success: true,
    message: 'Verification code generated.',
    expiresAt: emailVerification.expiresAt,
    ...(emailVerification.verificationOtp
      ? { verificationOtp: emailVerification.verificationOtp }
      : {}),
  };
};

const verifyEmailOtp = async ({ email, verificationOtp }) => {
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    await logAuthEvent({
      eventType: 'verify_email',
      eventStatus: 'failure',
      metadata: { email, reason: 'user_not_found' },
    });
    throw new ApiError('Verification code is invalid or expired', 400, 'ERR_INVALID_EMAIL_VERIFICATION_CODE');
  }

  const consumed = await consumeEmailVerificationToken({
    userId: user.id,
    otpHash: hashOpaqueToken(`email-verify:${verificationOtp}`),
  });

  if (!consumed) {
    await logAuthEvent({
      userId: user.id,
      eventType: 'verify_email',
      eventStatus: 'failure',
      metadata: { email, reason: 'invalid_otp' },
    });
    throw new ApiError('Verification code is invalid or expired', 400, 'ERR_INVALID_EMAIL_VERIFICATION_CODE');
  }

  await markUserEmailVerified(user.id);
  await revokeActiveEmailVerificationTokensByUserId(user.id);
  await logAuthEvent({
    userId: user.id,
    eventType: 'verify_email',
    metadata: { email },
  });

  const profile = await findUserById(user.id);

  return {
    success: true,
    message: 'Email verified successfully.',
    user: profile,
  };
};

const logoutAllUserSessions = async (userId, context = {}) => {
  await revokeActiveSessionsByUserId(userId);
  await logAuthEvent({
    userId,
    eventType: 'logout_all',
    context,
  });

  return {
    success: true,
    message: 'All active sessions revoked.',
  };
};

const getUserActiveSessions = async (userId, { limit = 20 } = {}) => {
  return listActiveSessionsByUserId(userId, { limit: toPositiveInt(limit, 20) });
};

const getUserAuthAuditLogs = async (userId, { limit = 50 } = {}) => {
  return listAuthAuditLogsByUserId(userId, { limit: toPositiveInt(limit, 50) });
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    throw new ApiError('Invalid or expired access token', 401, 'ERR_UNAUTHORIZED');
  }
};

const getProfileByUserId = async (userId) => {
  const user = await findUserById(userId);
  if (!user || !user.isActive) {
    throw new ApiError('User not found', 404, 'ERR_USER_NOT_FOUND');
  }
  return user;
};

const updateProfileByUserId = async (userId, payload) => {
  const user = await updateUserProfile(userId, payload);
  if (!user || !user.isActive) {
    throw new ApiError('User not found', 404, 'ERR_USER_NOT_FOUND');
  }
  return user;
};

module.exports = {
  registerUser,
  loginUser,
  loginWithOAuth,
  logoutUser,
  logoutAllUserSessions,
  getUserActiveSessions,
  getUserAuthAuditLogs,
  resendEmailVerificationOtp,
  verifyEmailOtp,
  forgotPassword,
  resetPassword,
  refreshAuthTokens,
  verifyAccessToken,
  getProfileByUserId,
  updateProfileByUserId,
};
