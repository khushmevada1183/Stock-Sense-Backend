const { query } = require('../../db/client');

const alertSelectSql = `
  SELECT
    id::text AS id,
    user_id::text AS "userId",
    symbol,
    alert_type AS "alertType",
    target_value::DOUBLE PRECISION AS "targetValue",
    is_active AS "isActive",
    metadata,
    last_triggered_at AS "lastTriggeredAt",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM price_alerts
`;

const listAlertsByUser = async ({ userId, symbol = null, isActive = null }) => {
  const conditions = ['user_id = $1'];
  const values = [userId];

  if (symbol !== null) {
    values.push(symbol);
    conditions.push(`symbol = $${values.length}`);
  }

  if (isActive !== null) {
    values.push(isActive);
    conditions.push(`is_active = $${values.length}`);
  }

  const result = await query(
    `${alertSelectSql}
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC;`,
    values
  );

  return result.rows;
};

const createAlert = async ({ userId, symbol, alertType, targetValue, isActive, metadata }) => {
  const result = await query(
    `
      INSERT INTO price_alerts (user_id, symbol, alert_type, target_value, is_active, metadata)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      RETURNING
        id::text AS id,
        user_id::text AS "userId",
        symbol,
        alert_type AS "alertType",
        target_value::DOUBLE PRECISION AS "targetValue",
        is_active AS "isActive",
        metadata,
        last_triggered_at AS "lastTriggeredAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `,
    [userId, symbol, alertType, targetValue, isActive, JSON.stringify(metadata || {})]
  );

  return result.rows[0];
};

const getAlertById = async ({ userId, alertId }) => {
  const result = await query(
    `${alertSelectSql}
     WHERE user_id = $1
       AND id = $2
     LIMIT 1;`,
    [userId, alertId]
  );

  return result.rows[0] || null;
};

const updateAlert = async ({ userId, alertId, symbol, alertType, targetValue, isActive, metadata }) => {
  const fields = [];
  const values = [];

  if (symbol !== undefined) {
    fields.push(`symbol = $${values.length + 1}`);
    values.push(symbol);
  }

  if (alertType !== undefined) {
    fields.push(`alert_type = $${values.length + 1}`);
    values.push(alertType);
  }

  if (targetValue !== undefined) {
    fields.push(`target_value = $${values.length + 1}`);
    values.push(targetValue);
  }

  if (isActive !== undefined) {
    fields.push(`is_active = $${values.length + 1}`);
    values.push(isActive);
  }

  if (metadata !== undefined) {
    fields.push(`metadata = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(metadata));
  }

  fields.push('updated_at = NOW()');

  values.push(userId, alertId);

  const result = await query(
    `
      UPDATE price_alerts
      SET ${fields.join(', ')}
      WHERE user_id = $${values.length - 1}
        AND id = $${values.length}
      RETURNING id::text AS id;
    `,
    values
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getAlertById({ userId, alertId });
};

const deleteAlert = async ({ userId, alertId }) => {
  const result = await query(
    `
      DELETE FROM price_alerts
      WHERE user_id = $1
        AND id = $2
      RETURNING id::text AS id;
    `,
    [userId, alertId]
  );

  return result.rowCount > 0;
};

const listActiveAlerts = async () => {
  const result = await query(
    `${alertSelectSql}
     WHERE is_active = true
     ORDER BY created_at ASC;`
  );

  return result.rows;
};

const getSymbolTickSnapshots = async (symbols) => {
  const normalizedSymbols = Array.isArray(symbols)
    ? [...new Set(symbols.map((symbol) => String(symbol || '').trim().toUpperCase()).filter(Boolean))]
    : [];

  if (normalizedSymbols.length === 0) {
    return [];
  }

  const result = await query(
    `
      WITH ranked AS (
        SELECT
          symbol,
          ts,
          close::DOUBLE PRECISION AS close,
          COALESCE(volume, 0)::DOUBLE PRECISION AS volume,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY ts DESC) AS rn
        FROM stock_price_ticks
        WHERE symbol = ANY($1::text[])
      ),
      latest AS (
        SELECT
          symbol,
          close AS current_price,
          volume AS current_volume,
          ts AS current_ts
        FROM ranked
        WHERE rn = 1
      ),
      previous AS (
        SELECT symbol, close AS previous_close
        FROM ranked
        WHERE rn = 2
      ),
      volume_reference AS (
        SELECT
          symbol,
          AVG(volume)::DOUBLE PRECISION AS average_volume
        FROM ranked
        WHERE rn BETWEEN 2 AND 21
        GROUP BY symbol
      )
      SELECT
        latest.symbol,
        latest.current_price AS "currentPrice",
        latest.current_volume AS "currentVolume",
        previous.previous_close AS "previousClose",
        volume_reference.average_volume AS "averageVolume",
        latest.current_ts AS "currentTs"
      FROM latest
      LEFT JOIN previous ON previous.symbol = latest.symbol
      LEFT JOIN volume_reference ON volume_reference.symbol = latest.symbol;
    `,
    [normalizedSymbols]
  );

  return result.rows;
};

const markAlertsTriggered = async (alertIds, triggeredAtIso) => {
  const normalizedAlertIds = Array.isArray(alertIds)
    ? [...new Set(alertIds.map((alertId) => String(alertId || '').trim()).filter(Boolean))]
    : [];

  if (normalizedAlertIds.length === 0) {
    return [];
  }

  const result = await query(
    `
      UPDATE price_alerts
      SET
        last_triggered_at = $2::timestamptz,
        updated_at = NOW()
      WHERE id = ANY($1::uuid[])
      RETURNING id::text AS id;
    `,
    [normalizedAlertIds, triggeredAtIso]
  );

  return result.rows;
};

module.exports = {
  listAlertsByUser,
  createAlert,
  getAlertById,
  updateAlert,
  deleteAlert,
  listActiveAlerts,
  getSymbolTickSnapshots,
  markAlertsTriggered,
};
