const { query } = require('../../../db/client');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toIsoTimestamp = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

const upsertTechnicalIndicatorRows = async (
  symbol,
  bucket,
  rows,
  { source = 'technicalindicators', metadata = {} } = {}
) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const values = [];

  const placeholders = rows.map((row, index) => {
    const offset = index * 6;

    values.push(
      symbol,
      bucket,
      row.timestamp,
      JSON.stringify(row.indicators || {}),
      row.source || source,
      JSON.stringify(row.metadata || metadata || {})
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb, $${offset + 5}, $${offset + 6}::jsonb)`;
  });

  const sql = `
    INSERT INTO technical_indicators (
      symbol,
      bucket,
      ts,
      indicators,
      source,
      metadata
    )
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (symbol, bucket, ts)
    DO UPDATE SET
      indicators = EXCLUDED.indicators,
      source = EXCLUDED.source,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING symbol, bucket, ts;
  `;

  const result = await query(sql, values);
  return result.rowCount;
};

const getStoredTechnicalIndicators = async (symbol, bucket, options = {}) => {
  const limit = toPositiveInt(options.limit, 240);
  const from = options.from || null;
  const to = options.to || null;

  const result = await query(
    `
      SELECT
        symbol,
        bucket,
        ts AS timestamp,
        indicators,
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM technical_indicators
      WHERE symbol = $1
        AND bucket = $2
        AND ($3::timestamptz IS NULL OR ts >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR ts <= $4::timestamptz)
      ORDER BY ts DESC
      LIMIT $5;
    `,
    [symbol, bucket, from, to, limit]
  );

  return result.rows.map((row) => ({
    ...row,
    timestamp: toIsoTimestamp(row.timestamp),
  }));
};

const listRecentSymbolsFromTicks = async (limit = 50) => {
  const normalizedLimit = toPositiveInt(limit, 50);

  const result = await query(
    `
      SELECT symbol
      FROM stock_price_ticks
      GROUP BY symbol
      ORDER BY MAX(ts) DESC
      LIMIT $1;
    `,
    [normalizedLimit]
  );

  return result.rows.map((row) => row.symbol);
};

module.exports = {
  upsertTechnicalIndicatorRows,
  getStoredTechnicalIndicators,
  listRecentSymbolsFromTicks,
};
