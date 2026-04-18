-- Phase 1 zero-risk wins:
-- 1) Enable query telemetry via pg_stat_statements.
-- 2) Enable no-data-loss compression lifecycle on stock_price_ticks.
--
-- Note:
-- Some managed Timescale deployments (for example Apache-only license mode)
-- do not support native compression features. This migration is intentionally
-- resilient and will emit NOTICE logs instead of failing hard in that case.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_available_extensions
    WHERE name = 'pg_stat_statements'
  ) THEN
    BEGIN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable pg_stat_statements: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_stat_statements extension not available on this PostgreSQL instance.';
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    EXECUTE '
      ALTER TABLE stock_price_ticks
      SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = ''symbol,dataset_type,timeframe,source_family'',
        timescaledb.compress_orderby = ''ts DESC''
      )
    ';

    PERFORM add_compression_policy(
      'stock_price_ticks',
      INTERVAL '30 days',
      if_not_exists => TRUE
    );
  EXCEPTION
    WHEN SQLSTATE '0A000' THEN
      RAISE NOTICE 'Skipping compression setup: %', SQLERRM;
    WHEN undefined_function THEN
      RAISE NOTICE 'Compression policy function unavailable in current Timescale build.';
    WHEN OTHERS THEN
      RAISE NOTICE 'Compression setup failed with non-fatal error: %', SQLERRM;
  END;
END
$$;