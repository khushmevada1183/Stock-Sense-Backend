-- Lossless storage optimization:
-- `stock_price_ticks_ts_idx` is a duplicate of `idx_stock_price_ticks_ts_desc`.
-- Dropping the redundant index reduces storage and write amplification without
-- removing any data or changing query results.

DROP INDEX IF EXISTS stock_price_ticks_ts_idx;