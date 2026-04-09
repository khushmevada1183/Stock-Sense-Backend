-- Normalize timeframe defaults after dataset/source-family classification.

UPDATE stock_price_ticks
SET timeframe = '1m'
WHERE dataset_type = 'test'
  AND (
    source_family = 'smoke'
    OR LOWER(COALESCE(source, '')) LIKE '%smoke%'
    OR LOWER(COALESCE(source, '')) LIKE '%test%'
  )
  AND (timeframe IS NULL OR timeframe = '1d');

UPDATE stock_price_ticks
SET timeframe = 'tick'
WHERE dataset_type = 'prod'
  AND source_family = 'live'
  AND (timeframe IS NULL OR timeframe = '1d');

UPDATE stock_price_ticks
SET timeframe = '1d'
WHERE dataset_type = 'prod'
  AND source_family = 'historical'
  AND (timeframe IS NULL OR timeframe <> '1d');

UPDATE stock_price_ticks
SET source_family = 'manual'
WHERE source_family IS NULL;
