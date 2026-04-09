const { query } = require('../../../db/client');
const { getDefaultReadDatasetType } = require('../datasetPolicy');

const DATASET_TYPES = new Set(['prod', 'test']);
const TIMEFRAMES = new Set(['tick', '1m', '5m', '15m', '1d']);
const SOURCE_FAMILIES = new Set(['historical', 'live', 'smoke', 'backfill', 'manual']);

const DEFAULT_WRITE_DATASET_TYPE = 'prod';
const DEFAULT_READ_DATASET_TYPE = getDefaultReadDatasetType();
const DEFAULT_TIMEFRAME = '1d';
const DEFAULT_SOURCE_FAMILY = 'manual';

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

const normalizeLower = (value) => String(value || '').trim().toLowerCase();

const normalizeDatasetType = (value) => {
  const normalized = normalizeLower(value);
  return DATASET_TYPES.has(normalized) ? normalized : null;
};

const normalizeTimeframe = (value) => {
  const normalized = normalizeLower(value);
  return TIMEFRAMES.has(normalized) ? normalized : null;
};

const normalizeSourceFamily = (value) => {
  const normalized = normalizeLower(value);
  return SOURCE_FAMILIES.has(normalized) ? normalized : null;
};

const inferDatasetTypeFromSource = (source) => {
  if (source.includes('smoke') || source.includes('test')) {
    return 'test';
  }

  return 'prod';
};

const inferTimeframeFromSource = (source) => {
  if (source.includes('live') || source.includes('tick')) {
    return 'tick';
  }

  if (source.includes('15m')) {
    return '15m';
  }

  if (source.includes('5m')) {
    return '5m';
  }

  if (source.includes('1m')) {
    return '1m';
  }

  if (source.includes('historical') || source.includes('daily')) {
    return '1d';
  }

  return DEFAULT_TIMEFRAME;
};

const inferSourceFamilyFromSource = (source) => {
  if (source.includes('historical') || source.includes('daily')) {
    return 'historical';
  }

  if (source.includes('live') || source.includes('tick') || source.includes('poll')) {
    return 'live';
  }

  if (source.includes('smoke') || source.includes('test')) {
    return 'smoke';
  }

  if (source.includes('backfill') || source.includes('bootstrap')) {
    return 'backfill';
  }

  return DEFAULT_SOURCE_FAMILY;
};

const resolveTickDimensions = (tick = {}) => {
  const source = normalizeLower(tick.source || 'nse') || 'nse';

  const datasetType = normalizeDatasetType(tick.datasetType)
    || inferDatasetTypeFromSource(source)
    || DEFAULT_WRITE_DATASET_TYPE;

  const timeframe = normalizeTimeframe(tick.timeframe)
    || inferTimeframeFromSource(source)
    || DEFAULT_TIMEFRAME;

  const sourceFamily = normalizeSourceFamily(tick.sourceFamily)
    || inferSourceFamilyFromSource(source)
    || DEFAULT_SOURCE_FAMILY;

  return {
    source,
    datasetType,
    timeframe,
    sourceFamily,
  };
};

const upsertTicks = async (symbol, ticks) => {
  const values = [];

  const valuePlaceholders = ticks.map((tick, index) => {
    const offset = index * 12;
    const dimensions = resolveTickDimensions(tick);

    values.push(
      symbol,
      tick.timestamp,
      tick.open,
      tick.high,
      tick.low,
      tick.close,
      tick.volume,
      dimensions.source,
      dimensions.datasetType,
      dimensions.timeframe,
      dimensions.sourceFamily,
      JSON.stringify(tick.metadata || {})
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}::jsonb)`;
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
      dataset_type,
      timeframe,
      source_family,
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
      dataset_type = EXCLUDED.dataset_type,
      timeframe = EXCLUDED.timeframe,
      source_family = EXCLUDED.source_family,
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
      t.symbol,
      t.ts AS timestamp,
      t.open::DOUBLE PRECISION AS open,
      t.high::DOUBLE PRECISION AS high,
      t.low::DOUBLE PRECISION AS low,
      t.close::DOUBLE PRECISION AS close,
      t.volume,
      t.source,
      t.dataset_type AS "datasetType",
      t.timeframe,
      t.source_family AS "sourceFamily",
      t.metadata
    FROM stock_price_ticks t
    WHERE t.symbol = $1
      AND ($2::timestamptz IS NULL OR t.ts >= $2::timestamptz)
      AND ($3::timestamptz IS NULL OR t.ts <= $3::timestamptz)
      AND ($4::text IS NULL OR t.dataset_type = $4)
    ORDER BY ts DESC
    LIMIT $5;
  `;

  const result = await query(sql, [
    symbol,
    options.from,
    options.to,
    options.datasetType ?? DEFAULT_READ_DATASET_TYPE,
    options.limit,
  ]);

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
      AND ($4::text IS NULL OR dataset_type = $4)
    GROUP BY symbol, time_bucket(INTERVAL '${interval}', ts)
    ORDER BY timestamp DESC
    LIMIT $5;
  `;

  const result = await query(sql, [
    symbol,
    options.from,
    options.to,
    options.datasetType ?? DEFAULT_READ_DATASET_TYPE,
    options.limit,
  ]);
  return mapHistoryRows(result.rows);
};

const getHistoryCandles = async (symbol, options) => {
  let aggregateItems = [];

  const datasetType = options.datasetType ?? DEFAULT_READ_DATASET_TYPE;

  if (datasetType === 'prod') {
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
