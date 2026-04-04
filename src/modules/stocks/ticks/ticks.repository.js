const { query } = require('../../../db/client');

const upsertTicks = async (symbol, ticks) => {
  const values = [];

  const valuePlaceholders = ticks.map((tick, index) => {
    const offset = index * 9;

    values.push(
      symbol,
      tick.timestamp,
      tick.open,
      tick.high,
      tick.low,
      tick.close,
      tick.volume,
      tick.source,
      JSON.stringify(tick.metadata || {})
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}::jsonb)`;
  });

  const sql = `
    INSERT INTO stock_price_ticks (
      symbol,
      ts,
      open,
      high,
      low,
      close,
      volume,
      source,
      metadata
    )
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (symbol, ts)
    DO UPDATE SET
      open = EXCLUDED.open,
      high = EXCLUDED.high,
      low = EXCLUDED.low,
      close = EXCLUDED.close,
      volume = EXCLUDED.volume,
      source = EXCLUDED.source,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING symbol, ts;
  `;

  const result = await query(sql, values);
  return result.rowCount;
};

const getTicks = async (symbol, options) => {
  const sql = `
    SELECT
      symbol,
      ts AS timestamp,
      open::DOUBLE PRECISION AS open,
      high::DOUBLE PRECISION AS high,
      low::DOUBLE PRECISION AS low,
      close::DOUBLE PRECISION AS close,
      volume,
      source,
      metadata
    FROM stock_price_ticks
    WHERE symbol = $1
      AND ($2::timestamptz IS NULL OR ts >= $2::timestamptz)
      AND ($3::timestamptz IS NULL OR ts <= $3::timestamptz)
    ORDER BY ts DESC
    LIMIT $4;
  `;

  const result = await query(sql, [symbol, options.from, options.to, options.limit]);

  return result.rows.map((row) => ({
    ...row,
    timestamp: row.timestamp instanceof Date
      ? row.timestamp.toISOString()
      : new Date(row.timestamp).toISOString(),
  }));
};

module.exports = {
  upsertTicks,
  getTicks,
};
