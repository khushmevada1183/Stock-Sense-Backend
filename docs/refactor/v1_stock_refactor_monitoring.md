# V1 Stock Refactor Monitoring

This document defines the operational checks for P0-F monitoring of row growth, query latency, and mismatch alerts.

## Command

- Run once:
  - `npm run stocks:v1:monitor`

- Custom thresholds example:
  - `npm run stocks:v1:monitor -- --minProd1dRows24h=5 --minProd1dRows7d=500 --maxProbeLatencyMs=700`

## What It Checks

1. Row growth checks
- `prod_1d_rows_24h` should be at or above threshold.
- `prod_1d_rows_7d` should be at or above threshold.
- Additional telemetry: `prod_tick_rows_24h`, `test_rows_24h`.

2. Mismatch and isolation checks
- No smoke-source leakage into `dataset_type='prod'`.
- Metrics snapshot coverage should be >= threshold for eligible symbols with >=365 day span.
- News bridge mismatch count (`missing + unexpected`) should be <= threshold.

3. Query latency checks
- Probe-query latency max must remain <= threshold.
- If `pg_stat_statements` exists, mean execution latency for stock/news-domain statements is checked.

## Default Thresholds

- `minProd1dRows24h`: 0
- `minProd1dRows7d`: 100
- `maxSmokeLeakRows`: 0
- `minCoveragePercent`: 95
- `maxBridgeMismatchRows`: 0
- `maxProbeLatencyMs`: 1000
- `maxPgStatMeanExecMs`: 500

## Alert Behavior

- Script outputs JSON with `ok`, `checks`, `alerts`, and `stats`.
- Exit code is non-zero if any check fails.
- Suitable for cron, CI scheduled jobs, or external monitors.
