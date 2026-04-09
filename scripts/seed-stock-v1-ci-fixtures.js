/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const parsePositiveInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parsePositiveNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeSymbol = (value) => {
  const symbol = String(value || '')
    .trim()
    .toUpperCase();

  return /^[A-Z0-9._&-]{1,20}$/.test(symbol) ? symbol : null;
};

const run = async () => {
  const args = process.argv.slice(2);

  const symbol = normalizeSymbol(readArgValue(args, '--symbol')) || 'V1CIGATE';
  const historyDays = parsePositiveInt(readArgValue(args, '--historyDays'), 420);
  const basePrice = parsePositiveNumber(readArgValue(args, '--basePrice'), 275);
  const source = readArgValue(args, '--source') || 'stocks-v1-ci-seed';

  const insertResult = await query(
    `
      INSERT INTO stock_price_ticks (
        symbol,
        ts,
        open,
        high,
        low,
        close,
        volume,
        source,
        metadata,
        dataset_type,
        timeframe,
        source_family
      )
      SELECT
        $1::text AS symbol,
        (
          date_trunc('day', NOW())
          - (series.day_offset || ' days')::interval
          + INTERVAL '9 hours 15 minutes'
        )::timestamptz AS ts,
        ROUND(($2::numeric + (series.day_offset * 0.12)::numeric), 4) AS open,
        ROUND(($2::numeric + (series.day_offset * 0.12)::numeric + 1.15), 4) AS high,
        ROUND(($2::numeric + (series.day_offset * 0.12)::numeric - 1.05), 4) AS low,
        ROUND(($2::numeric + (series.day_offset * 0.12)::numeric + 0.35), 4) AS close,
        (75000 + (series.day_offset * 40))::bigint AS volume,
        $3::text AS source,
        jsonb_build_object(
          'seedTag', 'stocks-v1-ci-fixtures',
          'seededAt', NOW(),
          'dayOffset', series.day_offset
        ) AS metadata,
        'prod'::text AS dataset_type,
        '1d'::text AS timeframe,
        'historical'::text AS source_family
      FROM generate_series(0, $4::int) AS series(day_offset)
      ON CONFLICT (symbol, ts)
      DO UPDATE
      SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        dataset_type = EXCLUDED.dataset_type,
        timeframe = EXCLUDED.timeframe,
        source_family = EXCLUDED.source_family,
        updated_at = NOW();
    `,
    [symbol, basePrice, source, historyDays]
  );

  const statsResult = await query(
    `
      SELECT
        COUNT(*)::int AS prod_1d_count,
        MIN(ts) AS min_ts,
        MAX(ts) AS max_ts
      FROM stock_price_ticks
      WHERE symbol = $1
        AND dataset_type = 'prod'
        AND timeframe = '1d';
    `,
    [symbol]
  );

  const stats = statsResult.rows[0] || {};

  console.log(
    JSON.stringify(
      {
        ok: true,
        symbol,
        historyDays,
        basePrice,
        source,
        rowsAffected: insertResult.rowCount,
        stats: {
          prod1dCount: Number(stats.prod_1d_count || 0),
          minTs: stats.min_ts || null,
          maxTs: stats.max_ts || null,
        },
      },
      null,
      2
    )
  );
};

run()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
