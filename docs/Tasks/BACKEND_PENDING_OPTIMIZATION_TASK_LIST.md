# Backend Pending Optimization Task List

Last updated: 2026-04-19
Owner: Backend
Status: Phase 1 in progress

## Phase 1 Execution Update (2026-04-19)

- [x] Added migration [api/src/db/migrations/036_enable_pgstat_and_ticks_compression.sql](api/src/db/migrations/036_enable_pgstat_and_ticks_compression.sql) to:
  - enable `pg_stat_statements` if available,
  - enable Timescale compression on `stock_price_ticks`,
  - add 30-day compression policy (no data deletion).
- [x] Added telemetry reporting script [api/scripts/report-pg-stat-statements.js](api/scripts/report-pg-stat-statements.js).
- [x] Added npm command `npm run db:pgstat:report` in [api/package.json](api/package.json).
- [x] Runtime execution completed:
  - backup snapshot captured: `docs/refactor/backups/phase1-zero-risk-start-neondb-20260418T200813Z.sql`
  - migration applied successfully (`npm run db:migrate`)
  - telemetry baseline captured (`npm run db:pgstat:report -- --limit=10`)
- [x] Verified runtime state:
  - `pg_stat_extension_enabled=true`
  - `hypertable=stock_price_ticks`
  - `compression_enabled=false`
  - `jobs_count=0`
- [x] Compression blocker documented:
  - current managed Timescale environment reports compression feature unsupported under current Apache license mode.
  - migration 036 now handles this safely with NOTICE logs so deployment remains non-breaking.
- [x] API compatibility preserved: no response-shape or contract changes in this phase.

## 1) Goal

Reduce Neon/Timescale cost and API latency without breaking current frontend contracts.

Primary success targets:
- Lower DB storage growth rate.
- Lower API payload/egress for high-traffic market endpoints.
- Keep backward compatibility for existing frontend consumers.
- Add safe rollback points for every production change.

## 2) Current Baseline (from neon-db-analysis-2026-04-19)

- Database size: 395 MB.
- Largest public table: market_snapshots (157 MB).
- stock_price_ticks hypertable chunks: 159.
- stock_price_ticks compression: disabled (platform capability blocker in current license mode).
- stock_price_ticks retention policy: not configured.
- pg_stat_statements: enabled.
- market_snapshots average JSON payload per row: about 16,138 bytes.

## 3) Execution Rules

- Do not delete historical data until lean history read-path is validated.
- Additive and backward-compatible API changes first.
- Every migration requires:
  - pre-change backup snapshot,
  - smoke test pass,
  - rollback plan documented.

## 4) Prioritized Workstreams

## WS-0: Safety and Baseline (P0)

### OPT-001: Pre-optimization backup snapshot
- Priority: P0
- Effort: S
- Dependency: none
- Tasks:
  - Run DB backup snapshot with clear label.
  - Store artifact under docs/refactor/backups with timestamp.
- Deliverables:
  - Snapshot artifact path recorded.
- Acceptance:
  - Snapshot exists and restore test command documented.

### OPT-002: Baseline report checkpoint
- Priority: P0
- Effort: S
- Dependency: OPT-001
- Tasks:
  - Capture pre-change metrics: DB size, table sizes, p95 API latency, endpoint payload sizes.
  - Save summary report under docs/reports.
- Deliverables:
  - baseline-optimization-metrics-YYYY-MM-DD.md
- Acceptance:
  - Metrics can be compared after each optimization wave.

## WS-1: Query Visibility and Diagnostics (P0)

### OPT-003: Enable pg_stat_statements extension
- Priority: P0
- Effort: S
- Dependency: OPT-001
- Tasks:
  - Create extension in production DB.
  - Confirm queryable from app connection.
- Deliverables:
  - Migration or admin runbook note.
- Acceptance:
  - SELECT from pg_stat_statements succeeds.

### OPT-004: Query telemetry collection window
- Priority: P0
- Effort: S
- Dependency: OPT-003
- Tasks:
  - Reset pg_stat_statements once.
  - Collect 24-72 hours representative traffic.
  - Export top queries by rows, calls, total_exec_time.
- Deliverables:
  - docs/reports/pg-stat-statements-baseline-YYYY-MM-DD.json
- Acceptance:
  - Top 20 expensive queries identified with action owner.

## WS-2: Egress and Payload Optimization (P0)

### OPT-005: Add lightweight market snapshot history response mode
- Priority: P0
- Effort: M
- Dependency: OPT-002
- Tasks:
  - Add optional query mode for market snapshot history to return only:
    - capturedMinute,
    - capturedAt,
    - source.
  - Keep current full payload mode as default for compatibility.
- Deliverables:
  - Repository/service/controller updates in market module.
  - API docs update.
- Acceptance:
  - Lightweight mode reduces response bytes significantly.
  - Existing callers remain unaffected.

### OPT-006: Add dedicated count-only path for snapshot stats use-cases
- Priority: P0
- Effort: S
- Dependency: OPT-005
- Tasks:
  - Add endpoint or parameter path that returns only totalCount and pagination metadata.
  - Update market dashboard usage where only count is needed.
- Deliverables:
  - Backend endpoint and frontend callsite update.
- Acceptance:
  - Count cards no longer transfer full snapshot payload arrays.

### OPT-007: Pagination hardening for heavy listing endpoints
- Priority: P1
- Effort: M
- Dependency: OPT-004
- Tasks:
  - Audit market and institutional list APIs for max limits and sane defaults.
  - Enforce strict max page size where unbounded risk exists.
- Deliverables:
  - Limit matrix document and code updates.
- Acceptance:
  - No unbounded list endpoint remains in v1 API.

## WS-3: Timescale Lifecycle Optimization (No Data Loss First) (P0)

### OPT-008: Enable chunk compression for stock_price_ticks
- Priority: P0
- Effort: M
- Dependency: OPT-001
- Tasks:
  - Configure compression settings for stock_price_ticks.
  - Add compression policy for older chunks (example start point: older than 30 days).
- Deliverables:
  - SQL migration for compression config + policy.
- Acceptance:
  - New compression policy appears in timescaledb_information.jobs.
  - Query regression smoke tests pass.

### OPT-009: Validate compressed query performance and correctness
- Priority: P0
- Effort: S
- Dependency: OPT-008
- Tasks:
  - Run history endpoints and indicator queries over compressed windows.
  - Compare key outputs against pre-compression baseline.
- Deliverables:
  - Compression validation report.
- Acceptance:
  - No material output drift.
  - p95 latency stable or improved for historical reads.

### OPT-010: Define retention policy proposal (not applied yet)
- Priority: P0
- Effort: S
- Dependency: OPT-009
- Tasks:
  - Produce retention options (90d, 180d, 365d) and feature impact table.
  - Map each option to frontend lookback requirements.
- Deliverables:
  - retention-impact-assessment.md
- Acceptance:
  - Retention decision approved by product/engineering.

## WS-4: Lean Historical Layer (P1)

### OPT-011: Design 2-tier history model
- Priority: P1
- Effort: M
- Dependency: OPT-010
- Tasks:
  - Keep raw recent table for rich data.
  - Create lean historical layer with only symbol/time/OHLC/(volume optional).
  - Define cutoff boundary between raw and lean tiers.
- Deliverables:
  - Architecture doc with ERD and query routing rules.
- Acceptance:
  - Approved design with clear migration strategy.

### OPT-012: Implement lean history storage and backfill
- Priority: P1
- Effort: L
- Dependency: OPT-011
- Tasks:
  - Create lean history table or true continuous aggregate path.
  - Backfill from stock_price_ticks.
  - Add indexes for symbol + time range reads.
- Deliverables:
  - Migration(s), backfill script, verification report.
- Acceptance:
  - Historical endpoints can serve old ranges from lean layer.

### OPT-013: API read-routing to lean history for old ranges
- Priority: P1
- Effort: M
- Dependency: OPT-012
- Tasks:
  - Route old-date-range reads to lean layer.
  - Keep recent reads on raw table.
  - Preserve response shape.
- Deliverables:
  - Service/repository routing updates.
- Acceptance:
  - No frontend regression in charts and history views.

## WS-5: Controlled Raw Retention (Potential Data Deletion) (P2)

### OPT-014: Apply conservative raw retention policy
- Priority: P2
- Effort: S
- Dependency: OPT-013
- Tasks:
  - Add retention policy only after lean layer validation.
  - Start with conservative horizon (example: 180 days).
- Deliverables:
  - SQL migration for add_retention_policy.
- Acceptance:
  - Old raw chunks drop as expected.
  - Historical UX remains correct via lean layer.

### OPT-015: Retention monitoring and rollback readiness
- Priority: P2
- Effort: S
- Dependency: OPT-014
- Tasks:
  - Monitor chunk drops, endpoint errors, and historical query health.
  - Keep rollback procedure documented.
- Deliverables:
  - Retention operations runbook.
- Acceptance:
  - Zero production incidents in 7-day observation window.

## WS-6: Index and SQL Cleanup (P1)

### OPT-016: Zero-scan index review and cleanup plan
- Priority: P1
- Effort: M
- Dependency: OPT-004
- Tasks:
  - Re-check low/zero scan indexes after telemetry window.
  - Keep required unique/PK indexes regardless of scan count.
  - Propose drop list for truly unused secondary indexes.
- Deliverables:
  - index-cleanup-proposal.md
- Acceptance:
  - Approved drop list with rollback SQL.

### OPT-017: Apply safe index cleanup in small batches
- Priority: P1
- Effort: M
- Dependency: OPT-016
- Tasks:
  - Drop unused non-critical indexes incrementally.
  - Measure latency and execution-plan effects after each batch.
- Deliverables:
  - Migration files and post-change metrics.
- Acceptance:
  - No regression in critical endpoint performance.

## WS-7: Validation, QA, and Rollout Governance (P0)

### OPT-018: Smoke and regression suite for optimization changes
- Priority: P0
- Effort: M
- Dependency: each optimization PR
- Tasks:
  - Run auth/portfolio/market/stocks smoke suites.
  - Add targeted tests for lightweight history and tiered reads.
- Deliverables:
  - CI test updates and reports.
- Acceptance:
  - All optimization PRs blocked on green smoke + regression checks.

### OPT-019: Performance and cost scorecard after each wave
- Priority: P0
- Effort: S
- Dependency: OPT-002
- Tasks:
  - Compare post-wave metrics against baseline:
    - DB size and growth,
    - endpoint payload bytes,
    - p95 latency,
    - query call counts and row counts.
- Deliverables:
  - optimization-wave-scorecard-YYYY-MM-DD.md
- Acceptance:
  - Clear pass/fail gate for proceeding to next wave.

## 5) Suggested Sprint Breakdown

Sprint A (start now):
- OPT-001, OPT-002, OPT-003, OPT-004, OPT-005, OPT-006, OPT-008, OPT-009.

Sprint B:
- OPT-007, OPT-010, OPT-011, OPT-012, OPT-013.

Sprint C:
- OPT-014, OPT-015, OPT-016, OPT-017, OPT-018, OPT-019.

## 6) Do-Not-Start Until Approved

- Any retention policy that permanently drops raw chunks.
- Any response-shape breaking API changes.
- Any index drops without telemetry evidence and rollback SQL.

## 7) Start Command (Recommended)

First actionable block to begin immediately:
- Enable pg_stat_statements.
- Add market snapshot lightweight history mode.
- Add stock_price_ticks compression policy (no retention yet).
