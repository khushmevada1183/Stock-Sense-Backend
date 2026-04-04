const { query } = require('../../db/client');

const upsertMarketSnapshot = async (snapshot) => {
  const capturedAt = snapshot.capturedAt || new Date().toISOString();

  const result = await query(
    `
      INSERT INTO market_snapshots (
        captured_minute,
        captured_at,
        source,
        trending,
        price_shockers,
        nse_most_active,
        bse_most_active,
        metadata
      )
      VALUES (
        date_trunc('minute', $1::timestamptz),
        $1::timestamptz,
        $2,
        $3::jsonb,
        $4::jsonb,
        $5::jsonb,
        $6::jsonb,
        $7::jsonb
      )
      ON CONFLICT (captured_minute)
      DO UPDATE SET
        captured_at = EXCLUDED.captured_at,
        source = EXCLUDED.source,
        trending = EXCLUDED.trending,
        price_shockers = EXCLUDED.price_shockers,
        nse_most_active = EXCLUDED.nse_most_active,
        bse_most_active = EXCLUDED.bse_most_active,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING
        captured_minute AS "capturedMinute",
        captured_at AS "capturedAt",
        source,
        trending,
        price_shockers AS "priceShockers",
        nse_most_active AS "nseMostActive",
        bse_most_active AS "bseMostActive",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `,
    [
      capturedAt,
      snapshot.source || 'stock-nse-india',
      JSON.stringify(snapshot.trending || {}),
      JSON.stringify(snapshot.priceShockers || {}),
      JSON.stringify(snapshot.nseMostActive || {}),
      JSON.stringify(snapshot.bseMostActive || {}),
      JSON.stringify(snapshot.metadata || {}),
    ]
  );

  return result.rows[0];
};

const getLatestMarketSnapshot = async () => {
  const result = await query(
    `
      SELECT
        captured_minute AS "capturedMinute",
        captured_at AS "capturedAt",
        source,
        trending,
        price_shockers AS "priceShockers",
        nse_most_active AS "nseMostActive",
        bse_most_active AS "bseMostActive",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM market_snapshots
      ORDER BY captured_minute DESC
      LIMIT 1;
    `
  );

  return result.rows[0] || null;
};

const listMarketSnapshots = async ({ from = null, to = null, limit = 60 }) => {
  const result = await query(
    `
      SELECT
        captured_minute AS "capturedMinute",
        captured_at AS "capturedAt",
        source,
        trending,
        price_shockers AS "priceShockers",
        nse_most_active AS "nseMostActive",
        bse_most_active AS "bseMostActive",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM market_snapshots
      WHERE ($1::timestamptz IS NULL OR captured_minute >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR captured_minute <= $2::timestamptz)
      ORDER BY captured_minute DESC
      LIMIT $3;
    `,
    [from, to, limit]
  );

  return result.rows;
};

module.exports = {
  upsertMarketSnapshot,
  getLatestMarketSnapshot,
  listMarketSnapshots,
};