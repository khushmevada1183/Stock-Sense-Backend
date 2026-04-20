const { query } = require('../../db/client');

const toUserProfile = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    gender: row.gender,
    dob: row.dob,
    incomeRange: row.income_range,
    occupation: row.occupation,
    isEmailVerified: row.is_email_verified,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
};

const findUserByEmail = async (email) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        email,
        role,
        password_hash,
        full_name,
        phone,
        avatar_url,
        gender,
        dob,
        income_range,
        occupation,
        is_email_verified,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE email = $1
      LIMIT 1;
    `,
    [email]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...toUserProfile(row),
    passwordHash: row.password_hash,
  };
};

const findUserById = async (userId) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        email,
        role,
        full_name,
        phone,
        avatar_url,
        gender,
        dob,
        income_range,
        occupation,
        is_email_verified,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = $1::uuid
      LIMIT 1;
    `,
    [userId]
  );

  return toUserProfile(result.rows[0]);
};

const findUserAuthById = async (userId) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        email,
        role,
        password_hash,
        full_name,
        phone,
        avatar_url,
        gender,
        dob,
        income_range,
        occupation,
        is_email_verified,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = $1::uuid
      LIMIT 1;
    `,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...toUserProfile(row),
    passwordHash: row.password_hash,
  };
};

const findUsersByIds = async (userIds) => {
  const normalizedUserIds = Array.isArray(userIds)
    ? [...new Set(userIds.map((userId) => String(userId || '').trim()).filter(Boolean))]
    : [];

  if (normalizedUserIds.length === 0) {
    return [];
  }

  const result = await query(
    `
      SELECT
        id::text AS id,
        email,
        role,
        full_name,
        phone,
        avatar_url,
        gender,
        dob,
        income_range,
        occupation,
        is_email_verified,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ANY($1::uuid[])
        AND is_active = true;
    `,
    [normalizedUserIds]
  );

  return result.rows.map((row) => toUserProfile(row));
};

const createUser = async ({ email, passwordHash, fullName, phone }) => {
  const result = await query(
    `
      INSERT INTO users (email, password_hash, full_name, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id::text AS id,
        email,
        role,
        full_name,
        phone,
        avatar_url,
        gender,
        dob,
        income_range,
        occupation,
        is_email_verified,
        is_active,
        created_at,
        updated_at,
        last_login_at;
    `,
    [email, passwordHash, fullName, phone]
  );

  return toUserProfile(result.rows[0]);
};

const updateUserLastLogin = async (userId) => {
  await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1::uuid;', [userId]);
};

const updateUserPassword = async (userId, passwordHash) => {
  await query(
    'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1::uuid;',
    [userId, passwordHash]
  );
};

const markUserEmailVerified = async (userId) => {
  await query(
    `
      UPDATE users
      SET is_email_verified = TRUE,
          updated_at = NOW()
      WHERE id = $1::uuid;
    `,
    [userId]
  );
};

const updateUserProfile = async (userId, updates) => {
  const fields = [];
  const values = [];

  if (updates.fullName !== undefined) {
    values.push(updates.fullName);
    fields.push(`full_name = $${values.length}`);
  }

  if (updates.phone !== undefined) {
    values.push(updates.phone);
    fields.push(`phone = $${values.length}`);
  }

  if (updates.avatarUrl !== undefined) {
    values.push(updates.avatarUrl);
    fields.push(`avatar_url = $${values.length}`);
  }

  if (updates.gender !== undefined) {
    values.push(updates.gender);
    fields.push(`gender = $${values.length}`);
  }

  if (updates.dob !== undefined) {
    values.push(updates.dob);
    fields.push(`dob = $${values.length}::date`);
  }

  if (updates.incomeRange !== undefined) {
    values.push(updates.incomeRange);
    fields.push(`income_range = $${values.length}`);
  }

  if (updates.occupation !== undefined) {
    values.push(updates.occupation);
    fields.push(`occupation = $${values.length}`);
  }

  if (!fields.length) {
    return findUserById(userId);
  }

  values.push(userId);

  const result = await query(
    `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}::uuid
      RETURNING
        id::text AS id,
        email,
        role,
        full_name,
        phone,
        avatar_url,
        gender,
        dob,
        income_range,
        occupation,
        is_email_verified,
        is_active,
        created_at,
        updated_at,
        last_login_at;
    `,
    values
  );

  return toUserProfile(result.rows[0]);
};

const createUserSession = async ({ sessionId = null, userId, refreshTokenHash, userAgent, ipAddress, expiresAt }) => {
  const result = await query(
    `
      INSERT INTO user_sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, last_used_at)
      VALUES (COALESCE($1::uuid, gen_random_uuid()), $2::uuid, $3, $4, $5::inet, $6::timestamptz, NOW())
      RETURNING
        id::text AS id,
        user_id::text AS "userId",
        created_at AS "createdAt",
        last_used_at AS "lastUsedAt",
        expires_at AS "expiresAt";
    `,
    [sessionId, userId, refreshTokenHash, userAgent || null, ipAddress || null, expiresAt]
  );

  return result.rows[0] || null;
};

const listActiveSessionsByUserId = async (userId, { limit = 20 } = {}) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        user_agent AS "userAgent",
        ip_address::text AS "ipAddress",
        created_at AS "createdAt",
        last_used_at AS "lastUsedAt",
        expires_at AS "expiresAt"
      FROM user_sessions
      WHERE user_id = $1::uuid
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY last_used_at DESC, created_at DESC
      LIMIT $2;
    `,
    [userId, limit]
  );

  return result.rows;
};

const findActiveSessionById = async ({ sessionId, userId }) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        user_id::text AS "userId",
        user_agent AS "userAgent",
        ip_address::text AS "ipAddress",
        created_at AS "createdAt",
        last_used_at AS "lastUsedAt",
        expires_at AS "expiresAt"
      FROM user_sessions
      WHERE id = $1::uuid
        AND user_id = $2::uuid
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1;
    `,
    [sessionId, userId]
  );

  return result.rows[0] || null;
};

const enforceMaxActiveSessions = async ({ userId, maxActiveSessions }) => {
  await query(
    `
      WITH sessions_to_revoke AS (
        SELECT id
        FROM user_sessions
        WHERE user_id = $1::uuid
          AND revoked_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        OFFSET $2
      )
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE id IN (SELECT id FROM sessions_to_revoke);
    `,
    [userId, maxActiveSessions]
  );
};

const findActiveSessionByHash = async (refreshTokenHash) => {
  const result = await query(
    `
      SELECT
        id::text AS "sessionId",
        user_id::text AS "userId",
        expires_at AS "expiresAt"
      FROM user_sessions
      WHERE refresh_token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1;
    `,
    [refreshTokenHash]
  );

  return result.rows[0] || null;
};

const revokeUserSessionByHash = async (refreshTokenHash) => {
  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE refresh_token_hash = $1
        AND revoked_at IS NULL;
    `,
    [refreshTokenHash]
  );
};

const revokeActiveSessionById = async ({ sessionId, userId }) => {
  const result = await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE id = $1::uuid
        AND user_id = $2::uuid
        AND revoked_at IS NULL
        AND expires_at > NOW()
      RETURNING id::text AS id;
    `,
    [sessionId, userId]
  );

  return result.rows[0] || null;
};

const revokeActiveSessionsByUserId = async (userId) => {
  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1::uuid
        AND revoked_at IS NULL;
    `,
    [userId]
  );
};

const touchUserSessionActivity = async ({ sessionId, userId }) => {
  await query(
    `
      UPDATE user_sessions
      SET last_used_at = NOW()
      WHERE id = $1::uuid
        AND user_id = $2::uuid
        AND revoked_at IS NULL
        AND expires_at > NOW();
    `,
    [sessionId, userId]
  );
};

const findOAuthIdentity = async ({ provider, providerUserId }) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        user_id::text AS "userId",
        provider,
        provider_user_id AS "providerUserId",
        provider_email AS "providerEmail",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM oauth_identities
      WHERE provider = $1
        AND provider_user_id = $2
      LIMIT 1;
    `,
    [provider, providerUserId]
  );

  return result.rows[0] || null;
};

const createOAuthIdentity = async ({ userId, provider, providerUserId, providerEmail }) => {
  const result = await query(
    `
      INSERT INTO oauth_identities (user_id, provider, provider_user_id, provider_email)
      VALUES ($1::uuid, $2, $3, $4)
      ON CONFLICT (provider, provider_user_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        provider_email = EXCLUDED.provider_email,
        updated_at = NOW()
      RETURNING
        id::text AS id,
        user_id::text AS "userId",
        provider,
        provider_user_id AS "providerUserId",
        provider_email AS "providerEmail",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `,
    [userId, provider, providerUserId, providerEmail || null]
  );

  return result.rows[0] || null;
};

const createPasswordResetToken = async ({ userId, tokenHash, expiresAt }) => {
  const result = await query(
    `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1::uuid, $2, $3::timestamptz)
      ON CONFLICT (token_hash)
      DO NOTHING
      RETURNING id::text AS id;
    `,
    [userId, tokenHash, expiresAt]
  );

  return result.rows[0] || null;
};

const findPasswordResetTokenByHash = async ({ userId, tokenHash }) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        user_id::text AS user_id,
        expires_at AS expires_at
      FROM password_reset_tokens
      WHERE user_id = $1::uuid
        AND token_hash = $2
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1;
    `,
    [userId, tokenHash]
  );

  return result.rows[0] || null;
};

const createPasswordResetSessionToken = async ({
  userId,
  tokenHash,
  sessionTokenHash,
  sessionExpiresAt,
}) => {
  const result = await query(
    `
      WITH candidate AS (
        SELECT id
        FROM password_reset_tokens
        WHERE user_id = $1::uuid
          AND token_hash = $2
          AND used_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      )
      UPDATE password_reset_tokens
      SET
        reset_session_token_hash = $3,
        reset_session_expires_at = $4::timestamptz,
        verified_at = NOW()
      WHERE id IN (SELECT id FROM candidate)
      RETURNING
        id::text AS id,
        user_id::text AS user_id,
        reset_session_expires_at AS reset_session_expires_at;
    `,
    [userId, tokenHash, sessionTokenHash, sessionExpiresAt]
  );

  return result.rows[0] || null;
};

const consumePasswordResetSessionToken = async ({ sessionTokenHash }) => {
  const result = await query(
    `
      WITH candidate AS (
        SELECT id
        FROM password_reset_tokens
        WHERE reset_session_token_hash = $1
          AND used_at IS NULL
          AND reset_session_expires_at > NOW()
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      )
      UPDATE password_reset_tokens
      SET
        used_at = NOW(),
        reset_session_token_hash = NULL,
        reset_session_expires_at = NULL
      WHERE id IN (SELECT id FROM candidate)
      RETURNING user_id::text AS user_id;
    `,
    [sessionTokenHash]
  );

  return result.rows[0] || null;
};

const revokeActivePasswordResetTokensByUserId = async (userId) => {
  await query(
    `
      UPDATE password_reset_tokens
      SET
        used_at = NOW(),
        reset_session_token_hash = NULL,
        reset_session_expires_at = NULL
      WHERE user_id = $1::uuid
        AND used_at IS NULL
        AND expires_at > NOW();
    `,
    [userId]
  );
};

const createEmailVerificationToken = async ({ userId, otpHash, expiresAt }) => {
  await query(
    `
      INSERT INTO email_verification_tokens (user_id, otp_hash, expires_at)
      VALUES ($1::uuid, $2, $3::timestamptz);
    `,
    [userId, otpHash, expiresAt]
  );
};

const consumeEmailVerificationToken = async ({ userId, otpHash }) => {
  const result = await query(
    `
      WITH candidate AS (
        SELECT id
        FROM email_verification_tokens
        WHERE user_id = $1::uuid
          AND otp_hash = $2
          AND used_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      )
      UPDATE email_verification_tokens
      SET used_at = NOW()
      WHERE id IN (SELECT id FROM candidate)
      RETURNING id::text AS id, user_id::text AS user_id;
    `,
    [userId, otpHash]
  );

  return result.rows[0] || null;
};

const revokeActiveEmailVerificationTokensByUserId = async (userId) => {
  await query(
    `
      UPDATE email_verification_tokens
      SET used_at = NOW()
      WHERE user_id = $1::uuid
        AND used_at IS NULL
        AND expires_at > NOW();
    `,
    [userId]
  );
};

const createAuthAuditLog = async ({
  userId = null,
  eventType,
  eventStatus = 'success',
  ipAddress = null,
  userAgent = null,
  metadata = {},
}) => {
  await query(
    `
      INSERT INTO auth_audit_logs (
        user_id,
        event_type,
        event_status,
        ip_address,
        user_agent,
        metadata
      )
      VALUES ($1::uuid, $2, $3, $4::inet, $5, $6::jsonb);
    `,
    [userId, eventType, eventStatus, ipAddress, userAgent, JSON.stringify(metadata || {})]
  );
};

const listAuthAuditLogsByUserId = async (userId, { limit = 50 } = {}) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        user_id::text AS "userId",
        event_type AS "eventType",
        event_status AS "eventStatus",
        ip_address::text AS "ipAddress",
        user_agent AS "userAgent",
        metadata,
        created_at AS "createdAt"
      FROM auth_audit_logs
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2;
    `,
    [userId, limit]
  );

  return result.rows;
};

const getLoginAttempt = async ({ scope, identifier }) => {
  const result = await query(
    `
      SELECT
        scope,
        identifier,
        failed_count AS "failedCount",
        first_failed_at AS "firstFailedAt",
        last_failed_at AS "lastFailedAt",
        blocked_until AS "blockedUntil"
      FROM auth_login_attempts
      WHERE scope = $1
        AND identifier = $2
      LIMIT 1;
    `,
    [scope, identifier]
  );

  return result.rows[0] || null;
};

const upsertLoginAttempt = async ({
  scope,
  identifier,
  failedCount,
  firstFailedAt,
  lastFailedAt,
  blockedUntil,
}) => {
  const result = await query(
    `
      INSERT INTO auth_login_attempts (
        scope,
        identifier,
        failed_count,
        first_failed_at,
        last_failed_at,
        blocked_until
      )
      VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6::timestamptz)
      ON CONFLICT (scope, identifier)
      DO UPDATE SET
        failed_count = EXCLUDED.failed_count,
        first_failed_at = EXCLUDED.first_failed_at,
        last_failed_at = EXCLUDED.last_failed_at,
        blocked_until = EXCLUDED.blocked_until,
        updated_at = NOW()
      RETURNING
        scope,
        identifier,
        failed_count AS "failedCount",
        first_failed_at AS "firstFailedAt",
        last_failed_at AS "lastFailedAt",
        blocked_until AS "blockedUntil";
    `,
    [scope, identifier, failedCount, firstFailedAt, lastFailedAt, blockedUntil]
  );

  return result.rows[0] || null;
};

const deleteLoginAttempt = async ({ scope, identifier }) => {
  await query(
    `
      DELETE FROM auth_login_attempts
      WHERE scope = $1
        AND identifier = $2;
    `,
    [scope, identifier]
  );
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserAuthById,
  findUsersByIds,
  createUser,
  updateUserLastLogin,
  updateUserPassword,
  markUserEmailVerified,
  updateUserProfile,
  createUserSession,
  listActiveSessionsByUserId,
  findActiveSessionById,
  enforceMaxActiveSessions,
  findActiveSessionByHash,
  revokeUserSessionByHash,
  revokeActiveSessionById,
  revokeActiveSessionsByUserId,
  touchUserSessionActivity,
  findOAuthIdentity,
  createOAuthIdentity,
  createPasswordResetToken,
  findPasswordResetTokenByHash,
  createPasswordResetSessionToken,
  consumePasswordResetSessionToken,
  revokeActivePasswordResetTokensByUserId,
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  revokeActiveEmailVerificationTokensByUserId,
  createAuthAuditLog,
  listAuthAuditLogsByUserId,
  getLoginAttempt,
  upsertLoginAttempt,
  deleteLoginAttempt,
};
