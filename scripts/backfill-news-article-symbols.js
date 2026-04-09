/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const getBridgeStats = async () => {
  const result = await query(
    `
      WITH expected AS (
        SELECT
          na.id::uuid AS article_id,
          UPPER(BTRIM(raw_symbol)) AS symbol
        FROM news_articles na
        CROSS JOIN LATERAL unnest(COALESCE(na.symbols, ARRAY[]::text[])) AS raw_symbol
        WHERE NULLIF(BTRIM(raw_symbol), '') IS NOT NULL
        GROUP BY na.id::uuid, UPPER(BTRIM(raw_symbol))
      )
      SELECT
        (SELECT COUNT(*)::int FROM news_articles) AS article_count,
        (SELECT COUNT(*)::int FROM expected) AS expected_bridge_rows,
        (SELECT COUNT(*)::int FROM news_article_symbols) AS actual_bridge_rows;
    `
  );

  return result.rows[0];
};

const run = async () => {
  const args = process.argv.slice(2);
  const skipRefresh = parseBoolean(readArgValue(args, '--skipRefresh'), false);

  const before = await getBridgeStats();

  const deleteResult = await query(
    `
      DELETE FROM news_article_symbols nas
      USING news_articles na
      WHERE na.id = nas.article_id
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(COALESCE(na.symbols, ARRAY[]::text[])) AS raw_symbol
          WHERE UPPER(BTRIM(raw_symbol)) = nas.symbol
        );
    `
  );

  const upsertResult = await query(
    `
      WITH normalized AS (
        SELECT
          na.id::uuid AS article_id,
          UPPER(BTRIM(raw_symbol)) AS symbol
        FROM news_articles na
        CROSS JOIN LATERAL unnest(COALESCE(na.symbols, ARRAY[]::text[])) AS raw_symbol
        WHERE NULLIF(BTRIM(raw_symbol), '') IS NOT NULL
        GROUP BY na.id::uuid, UPPER(BTRIM(raw_symbol))
      )
      INSERT INTO news_article_symbols (article_id, symbol, relevance_score)
      SELECT
        normalized.article_id,
        normalized.symbol,
        1
      FROM normalized
      ON CONFLICT (article_id, symbol)
      DO UPDATE SET relevance_score = EXCLUDED.relevance_score;
    `
  );

  let candleViewsRefreshed = false;
  if (!skipRefresh) {
    await query('SELECT refresh_stock_price_candle_views();');
    candleViewsRefreshed = true;
  }

  const after = await getBridgeStats();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'news-symbol-bridge-backfill',
        skipRefresh,
        candleViewsRefreshed,
        deletedOutdatedBridgeRows: deleteResult.rowCount || 0,
        upsertedBridgeRows: upsertResult.rowCount || 0,
        before,
        after,
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
