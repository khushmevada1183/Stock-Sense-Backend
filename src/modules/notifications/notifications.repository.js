const { query } = require('../../db/client');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeUuidArray = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
};

const notificationSelectSql = `
  SELECT
    id::text AS id,
    user_id::text AS "userId",
    alert_id::text AS "alertId",
    delivery_key AS "deliveryKey",
    channel,
    provider,
    recipient,
    title,
    message,
    payload,
    status,
    attempts,
    last_attempt_at AS "lastAttemptAt",
    sent_at AS "sentAt",
    error_message AS "errorMessage",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM notification_deliveries
`;

const pushDeviceSelectSql = `
  SELECT
    id::text AS id,
    user_id::text AS "userId",
    provider,
    device_token AS "deviceToken",
    platform,
    is_active AS "isActive",
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM user_push_devices
`;

const createNotificationDeliveries = async (deliveries) => {
  if (!Array.isArray(deliveries) || deliveries.length === 0) {
    return [];
  }

  const created = [];

  for (const delivery of deliveries) {
    const result = await query(
      `
        INSERT INTO notification_deliveries (
          user_id,
          alert_id,
          delivery_key,
          channel,
          provider,
          recipient,
          title,
          message,
          payload,
          status
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::jsonb,
          'queued'
        )
        ON CONFLICT (delivery_key) DO NOTHING
        RETURNING
          id::text AS id,
          user_id::text AS "userId",
          alert_id::text AS "alertId",
          delivery_key AS "deliveryKey",
          channel,
          provider,
          recipient,
          title,
          message,
          payload,
          status,
          attempts,
          last_attempt_at AS "lastAttemptAt",
          sent_at AS "sentAt",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
      `,
      [
        delivery.userId,
        delivery.alertId || null,
        delivery.deliveryKey,
        delivery.channel,
        delivery.provider,
        delivery.recipient || null,
        delivery.title,
        delivery.message,
        JSON.stringify(delivery.payload || {}),
      ]
    );

    if (result.rows[0]) {
      created.push(result.rows[0]);
    }
  }

  return created;
};

const listNotificationDeliveriesByUser = async ({ userId, status = null, channel = null, limit = 50 }) => {
  const conditions = ['user_id = $1::uuid'];
  const values = [userId];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (channel) {
    values.push(channel);
    conditions.push(`channel = $${values.length}`);
  }

  values.push(toPositiveInt(limit, 50));

  const result = await query(
    `${notificationSelectSql}
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${values.length};`,
    values
  );

  return result.rows;
};

const registerPushDevice = async ({ userId, provider, deviceToken, platform, metadata }) => {
  const result = await query(
    `
      INSERT INTO user_push_devices (
        user_id,
        provider,
        device_token,
        platform,
        metadata,
        is_active
      )
      VALUES ($1::uuid, $2, $3, $4, $5::jsonb, true)
      ON CONFLICT (provider, device_token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        metadata = EXCLUDED.metadata,
        is_active = true,
        updated_at = NOW()
      RETURNING
        id::text AS id,
        user_id::text AS "userId",
        provider,
        device_token AS "deviceToken",
        platform,
        is_active AS "isActive",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `,
    [userId, provider, deviceToken, platform || null, JSON.stringify(metadata || {})]
  );

  return result.rows[0] || null;
};

const listPushDevicesByUser = async (userId) => {
  const result = await query(
    `${pushDeviceSelectSql}
     WHERE user_id = $1::uuid
     ORDER BY created_at DESC;`,
    [userId]
  );

  return result.rows;
};

const deactivatePushDevice = async ({ userId, deviceId }) => {
  const result = await query(
    `
      UPDATE user_push_devices
      SET is_active = false,
          updated_at = NOW()
      WHERE user_id = $1::uuid
        AND id = $2::uuid
      RETURNING
        id::text AS id,
        user_id::text AS "userId",
        provider,
        device_token AS "deviceToken",
        platform,
        is_active AS "isActive",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `,
    [userId, deviceId]
  );

  return result.rows[0] || null;
};

const listActivePushDevicesByUserIds = async (userIds) => {
  const normalizedUserIds = normalizeUuidArray(userIds);

  if (normalizedUserIds.length === 0) {
    return [];
  }

  const result = await query(
    `${pushDeviceSelectSql}
     WHERE user_id = ANY($1::uuid[])
       AND is_active = true
     ORDER BY created_at DESC;`,
    [normalizedUserIds]
  );

  return result.rows;
};

const claimQueuedNotificationDeliveries = async (limit = 50) => {
  const result = await query(
    `
      WITH next_batch AS (
        SELECT id
        FROM notification_deliveries
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE notification_deliveries nd
      SET
        status = 'processing',
        attempts = nd.attempts + 1,
        last_attempt_at = NOW(),
        error_message = NULL,
        updated_at = NOW()
      FROM next_batch
      WHERE nd.id = next_batch.id
      RETURNING
        nd.id::text AS id,
        nd.user_id::text AS "userId",
        nd.alert_id::text AS "alertId",
        nd.delivery_key AS "deliveryKey",
        nd.channel,
        nd.provider,
        nd.recipient,
        nd.title,
        nd.message,
        nd.payload,
        nd.status,
        nd.attempts,
        nd.last_attempt_at AS "lastAttemptAt",
        nd.sent_at AS "sentAt",
        nd.error_message AS "errorMessage",
        nd.created_at AS "createdAt",
        nd.updated_at AS "updatedAt";
    `,
    [toPositiveInt(limit, 50)]
  );

  return result.rows;
};

const markNotificationDeliverySent = async ({ deliveryId, providerResponse = null }) => {
  const result = await query(
    `
      UPDATE notification_deliveries
      SET
        status = 'sent',
        sent_at = NOW(),
        error_message = NULL,
        payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('providerResponse', $2::text),
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id::text AS id;
    `,
    [deliveryId, providerResponse || 'ok']
  );

  return result.rows[0] || null;
};

const markNotificationDeliveryFailed = async ({ deliveryId, errorMessage }) => {
  const result = await query(
    `
      UPDATE notification_deliveries
      SET
        status = 'failed',
        error_message = $2,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id::text AS id;
    `,
    [deliveryId, String(errorMessage || 'Notification delivery failed').slice(0, 2000)]
  );

  return result.rows[0] || null;
};

module.exports = {
  createNotificationDeliveries,
  listNotificationDeliveriesByUser,
  registerPushDevice,
  listPushDevicesByUser,
  deactivatePushDevice,
  listActivePushDevicesByUserIds,
  claimQueuedNotificationDeliveries,
  markNotificationDeliverySent,
  markNotificationDeliveryFailed,
};
