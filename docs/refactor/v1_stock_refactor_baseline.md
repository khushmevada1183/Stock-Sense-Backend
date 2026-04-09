# V1 Stock Refactor Baseline

This artifact captures baseline profiling for the in-place V1 stock data refactor (P0-A) and is intended to be compared with post-cutover snapshots.

## Baseline Snapshot Metadata

- Generated at: 2026-04-09T11:17:50.486Z
- Generator command: `npm run stocks:v1:profile`
- SQL reference: `scripts/sql/v1_stock_refactor_profiling.sql`

## Core Row Counts

| Table / Metric | Value |
|---|---:|
| `stock_price_ticks` rows | 18,372 |
| `stock_metrics_snapshots` rows | 327 |
| `stock_profile_details` rows | 607 |
| `news_articles` rows | 85 |
| `news_article_symbols` rows | 680 |
| Active symbols (`stocks_master.is_active = true`) | 2,210 |

## Tick Dimension Distribution (Prod vs Test Isolation)

| dataset_type | timeframe | source_family | source | rows | min_ts | max_ts |
|---|---|---|---|---:|---|---|
| prod | 1d | historical | nse_historical_daily | 18,270 | 2023-04-10T10:00:00.000Z | 2026-04-08T10:00:00.000Z |
| prod | tick | live | nse_live_quote_poll | 42 | 2026-04-06T18:14:56.095Z | 2026-04-09T10:56:02.315Z |
| test | 1m | smoke | alerts-evaluator-smoke | 8 | 2026-04-05T18:04:51.371Z | 2026-04-09T10:56:03.557Z |
| test | 1m | smoke | cache-smoke | 12 | 2026-04-05T17:33:36.504Z | 2026-04-09T10:56:01.398Z |
| test | 1m | smoke | notification-smoke | 4 | 2026-04-05T18:24:33.834Z | 2026-04-09T10:56:06.949Z |
| test | 1m | smoke | timescale-smoke | 36 | 2026-04-05T17:19:11.860Z | 2026-04-09T10:55:59.657Z |

## Null Safety Checks

| Check | Value |
|---|---:|
| `dataset_type IS NULL` in `stock_price_ticks` | 0 |
| `timeframe IS NULL` in `stock_price_ticks` | 0 |
| `source_family IS NULL` in `stock_price_ticks` | 0 |

## News Bridge Integrity

| Check | Value |
|---|---:|
| Expected exploded rows from `news_articles.symbols` | 680 |
| Actual rows in `news_article_symbols` | 680 |
| Missing bridge mappings | 0 |
| Unexpected bridge rows | 0 |

## Symbol Coverage

| Coverage Metric | Value |
|---|---:|
| Active symbols | 2,210 |
| Profile-covered symbols | 607 |
| Metrics-covered symbols | 327 |
| Profile coverage % | 27.47% |
| Metrics coverage % | 14.80% |

## Table Size and Retention Estimates

| Table | Total Size | Estimated Rows | min_ts | max_ts | Retention Days |
|---|---:|---:|---|---|---:|
| `stock_price_ticks` | 64 kB | -1 | 2023-04-10T10:00:00.000Z | 2026-04-09T10:56:06.949Z | 1095.04 |
| `stock_metrics_snapshots` | 200 kB | 319 | 2026-04-08T00:00:00.000Z | 2026-04-08T00:00:00.000Z | 0.00 |
| `stock_profile_details` | 400 kB | 600 | - | - | - |
| `news_articles` | 552 kB | 85 | 2026-04-08T03:30:00.000Z | 2026-04-08T10:11:04.000Z | 0.28 |
| `news_article_symbols` | 272 kB | 680 | 2026-04-09T10:03:57.038Z | 2026-04-09T10:03:57.038Z | 0.00 |

## Interpretation Against Refactor Goals

- Separate test and production data is operational (`prod` and `test` rows are distinguishable by `dataset_type` and source dimensions).
- Stock metrics and stock profile structures are active and populated.
- News is isolated in `news_articles` with normalized symbol linkage in `news_article_symbols`.
- Multi-year history now exists for targeted symbols, and metrics coverage for eligible 1-year symbols is passing in validation.

## Next Baseline Follow-Up

1. Re-run baseline after full historical backfill beyond 365 days.
2. Compare coverage deltas for `stock_metrics_snapshots` and `stock_profile_details`.
3. Attach environment-level backup/snapshot ID once infra snapshot is captured.
