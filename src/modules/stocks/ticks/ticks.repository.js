const { query } = require('../../../db/client');

const HISTORY_VIEW_BY_BUCKET = Object.freeze({
  '1m': 'stock_price_candles_1m',
  '5m': 'stock_price_candles_5m',
  '15m': 'stock_price_candles_15m',
  '1d': 'stock_price_candles_1d',
});

const HISTORY_INTERVAL_BY_BUCKET = Object.freeze({
  '1m': '1 minute',
  '5m': '5 minutes',
  '15m': '15 minutes',
  '1d': '1 day',
});

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

const mapHistoryRows = (rows) => {
  return rows.map((row) => ({
    ...row,
    timestamp: row.timestamp instanceof Date
      ? row.timestamp.toISOString()
      : new Date(row.timestamp).toISOString(),
  }));
};

const getHistoryCandlesFromContinuousAggregate = async (symbol, options) => {
  const viewName = HISTORY_VIEW_BY_BUCKET[options.bucket];

  const sql = `
    SELECT
      symbol,
      bucket AS timestamp,
      open::DOUBLE PRECISION AS open,
      high::DOUBLE PRECISION AS high,
      low::DOUBLE PRECISION AS low,
      close::DOUBLE PRECISION AS close,
      volume
    FROM ${viewName}
    WHERE symbol = $1
      AND ($2::timestamptz IS NULL OR bucket >= $2::timestamptz)
      AND ($3::timestamptz IS NULL OR bucket <= $3::timestamptz)
    ORDER BY bucket DESC
    LIMIT $4;
  `;

  const result = await query(sql, [symbol, options.from, options.to, options.limit]);
  return mapHistoryRows(result.rows);
};

const getHistoryCandlesFromHypertable = async (symbol, options) => {
  const interval = HISTORY_INTERVAL_BY_BUCKET[options.bucket];

  const sql = `
    SELECT
      symbol,
      time_bucket(INTERVAL '${interval}', ts) AS timestamp,
      (array_agg(close ORDER BY ts ASC))[1]::DOUBLE PRECISION AS open,
      max(COALESCE(high, close))::DOUBLE PRECISION AS high,
      min(COALESCE(low, close))::DOUBLE PRECISION AS low,
      (array_agg(close ORDER BY ts DESC))[1]::DOUBLE PRECISION AS close,
      COALESCE(sum(volume), 0)::BIGINT AS volume
    FROM stock_price_ticks
    WHERE symbol = $1
      AND ($2::timestamptz IS NULL OR ts >= $2::timestamptz)
      AND ($3::timestamptz IS NULL OR ts <= $3::timestamptz)
    GROUP BY symbol, time_bucket(INTERVAL '${interval}', ts)
    ORDER BY timestamp DESC
    LIMIT $4;
  `;

  const result = await query(sql, [symbol, options.from, options.to, options.limit]);
  return mapHistoryRows(result.rows);
};

const getHistoryCandles = async (symbol, options) => {
  let aggregateItems = [];

  try {
    aggregateItems = await getHistoryCandlesFromContinuousAggregate(symbol, options);
  } catch (error) {
    const shouldFallback =
      error.code === '42P01' ||
      error.code === '55000' ||
      String(error.message || '').includes('has not been populated');

    if (!shouldFallback) {
      throw error;
    }
  }

  if (aggregateItems.length > 0) {
    return {
      source: 'continuous_aggregate',
      items: aggregateItems,
    };
  }

  const fallbackItems = await getHistoryCandlesFromHypertable(symbol, options);

  return {
    source: 'hypertable_fallback',
    items: fallbackItems,
  };
};

module.exports = {
  upsertTicks,
  getTicks,
  getHistoryCandles,
};
