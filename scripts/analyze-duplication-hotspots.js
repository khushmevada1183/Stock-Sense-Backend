/* eslint-disable no-console */

const { query, closePool } = require('../src/db/client');

const run = async () => {
  const legacy52ExistsRes = await query(
    `SELECT to_regclass('public.stock_52_week_levels') IS NOT NULL AS exists;`
  );
  const legacy52Exists = Boolean(legacy52ExistsRes.rows[0]?.exists);

  const stockProfileVsMaster = await query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM stocks_master) AS stocks_master_rows,
      (SELECT COUNT(*)::bigint FROM stock_profile_details) AS profile_rows,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE NULLIF(BTRIM(website), '') IS NOT NULL) AS sm_website_filled,
      (SELECT COUNT(*)::bigint FROM stock_profile_details WHERE NULLIF(BTRIM(website), '') IS NOT NULL) AS sp_website_filled,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE NULLIF(BTRIM(headquarters), '') IS NOT NULL) AS sm_headquarters_filled,
      (SELECT COUNT(*)::bigint FROM stock_profile_details WHERE NULLIF(BTRIM(headquarters), '') IS NOT NULL) AS sp_headquarters_filled,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE founded_year IS NOT NULL) AS sm_founded_year_filled,
      (SELECT COUNT(*)::bigint FROM stock_profile_details WHERE founded_year IS NOT NULL) AS sp_founded_year_filled,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE employees IS NOT NULL) AS sm_employees_filled,
      (SELECT COUNT(*)::bigint FROM stock_profile_details WHERE employees IS NOT NULL) AS sp_employees_filled;
  `);

  const stockSectorVsMaster = await query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM stock_sector_taxonomy) AS taxonomy_rows,
      (SELECT COUNT(*)::bigint FROM stocks_master) AS master_rows,
      (SELECT COUNT(*)::bigint FROM stock_sector_taxonomy t JOIN stocks_master s ON s.symbol = t.symbol) AS overlap_symbols,
      (SELECT COUNT(*)::bigint FROM stock_sector_taxonomy WHERE NULLIF(BTRIM(sector), '') IS NOT NULL AND UPPER(sector) <> 'UNKNOWN') AS taxonomy_sector_meaningful,
      (SELECT COUNT(*)::bigint FROM stock_sector_taxonomy WHERE NULLIF(BTRIM(industry), '') IS NOT NULL AND UPPER(industry) <> 'UNKNOWN') AS taxonomy_industry_meaningful,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE NULLIF(BTRIM(sector), '') IS NOT NULL) AS master_sector_filled,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE NULLIF(BTRIM(industry), '') IS NOT NULL) AS master_industry_filled;
  `);

  const metricsVs52Week = await query(
    legacy52Exists
      ? `
          WITH latest AS (
            SELECT MAX(as_of_date) AS d
            FROM stock_metrics_snapshots
          )
          SELECT
            (SELECT COUNT(*)::bigint FROM stock_52_week_levels) AS levels_rows,
            (SELECT COUNT(*)::bigint FROM stock_52_week_levels WHERE week_52_high IS NOT NULL OR week_52_low IS NOT NULL) AS levels_with_52w,
            (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots) AS snapshot_rows,
            (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots s JOIN latest l ON s.as_of_date = l.d) AS latest_snapshot_rows,
            (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots s JOIN latest l ON s.as_of_date = l.d WHERE s.week_52_high IS NOT NULL OR s.week_52_low IS NOT NULL) AS latest_snapshot_with_52w,
            (SELECT d FROM latest) AS latest_as_of_date,
            (SELECT COUNT(*)::bigint FROM stock_52_week_levels l JOIN stock_metrics_snapshots s ON s.symbol = l.symbol JOIN latest d ON s.as_of_date = d.d) AS overlapping_symbols_latest;
        `
      : `
          WITH latest AS (
            SELECT MAX(as_of_date) AS d
            FROM stock_metrics_snapshots
          )
          SELECT
            0::bigint AS levels_rows,
            0::bigint AS levels_with_52w,
            (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots) AS snapshot_rows,
            (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots s JOIN latest l ON s.as_of_date = l.d) AS latest_snapshot_rows,
            (SELECT COUNT(*)::bigint FROM stock_metrics_snapshots s JOIN latest l ON s.as_of_date = l.d WHERE s.week_52_high IS NOT NULL OR s.week_52_low IS NOT NULL) AS latest_snapshot_with_52w,
            (SELECT d FROM latest) AS latest_as_of_date,
            0::bigint AS overlapping_symbols_latest;
        `
  );

  const ipoVsMaster = await query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM ipo_calendar) AS ipo_rows,
      (SELECT COUNT(*)::bigint FROM ipo_calendar WHERE NULLIF(BTRIM(symbol), '') IS NOT NULL) AS ipo_with_symbol,
      (SELECT COUNT(*)::bigint FROM ipo_calendar i JOIN stocks_master s ON UPPER(i.symbol) = UPPER(s.symbol)) AS ipo_symbol_overlap_master,
      (SELECT COUNT(*)::bigint FROM ipo_calendar WHERE listing_date IS NOT NULL) AS ipo_listing_date_filled,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE listing_date IS NOT NULL) AS master_listing_date_filled,
      (SELECT COUNT(*)::bigint FROM ipo_calendar WHERE lot_size IS NOT NULL) AS ipo_lot_size_filled,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE lot_size IS NOT NULL) AS master_lot_size_filled,
      (SELECT COUNT(*)::bigint FROM ipo_calendar WHERE is_sme IS TRUE) AS ipo_sme_true,
      (SELECT COUNT(*)::bigint FROM stocks_master WHERE is_sme IS TRUE) AS master_sme_true;
  `);

  const newsSymbolsType = await query(`
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_articles'
      AND column_name = 'symbols';
  `);

  const newsBridge = await query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM news_articles) AS article_rows,
      (SELECT COUNT(*)::bigint FROM news_articles WHERE symbols IS NOT NULL) AS articles_symbols_not_null,
      (SELECT COUNT(*)::bigint FROM news_article_symbols) AS bridge_rows,
      (SELECT COUNT(DISTINCT article_id)::bigint FROM news_article_symbols) AS bridge_distinct_articles;
  `);

  console.log(
    JSON.stringify(
      {
        ok: true,
        stockProfileVsMaster: stockProfileVsMaster.rows[0],
        stockSectorVsMaster: stockSectorVsMaster.rows[0],
        metricsVs52Week: metricsVs52Week.rows[0],
        ipoVsMaster: ipoVsMaster.rows[0],
        newsSymbolsType: newsSymbolsType.rows[0] || null,
        newsBridge: newsBridge.rows[0],
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
