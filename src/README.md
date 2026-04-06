# Backend V1 Architecture (Postgres + Timescale)

This folder is the new backend foundation for Stock Sense.

## Goals

- Keep existing routes stable while introducing a versioned backend architecture.
- Use Neon Postgres with TimescaleDB for time-series stock data.
- Enforce clean boundaries between route, controller, service, and repository layers.

## Folder Structure

```text
src/
  config/
    env.js                # Environment parsing and validation
    database.js           # PG/Neon connection config
  db/
    client.js             # Shared PG pool + transaction helpers
    check.js              # DB readiness check script
    migrate.js            # SQL migration runner
    migrations/
      001_enable_timescaledb.sql
      002_create_stock_price_ticks.sql
      003_create_portfolio_core.sql
      004_create_market_snapshots.sql
      005_create_auth_core.sql
      006_create_auth_login_attempts.sql
      007_create_email_verification_tokens.sql
      008_add_user_role_claims.sql
      009_create_oauth_identities.sql
      010_create_auth_audit_logs.sql
      011_create_watchlists.sql
      012_create_price_alerts.sql
      013_create_stock_candles_continuous_aggregates.sql
      014_create_notification_delivery.sql
      015_create_ipo_calendar.sql
      016_create_ipo_subscription_snapshots.sql
      017_create_ipo_gmp_snapshots.sql
      018_create_fii_dii_activity.sql
      019_create_block_deals.sql
      020_create_mutual_fund_holdings.sql
      021_create_insider_trades.sql
      022_create_shareholding_patterns.sql
      023_create_corporate_actions.sql
      024_create_earnings_calendar.sql
  jobs/
    marketSyncScheduler.js # In-process recurring market sync runtime state
    syncMarketSnapshots.js # CLI runner for one-time/watch market sync
    syncFiiDiiFlows.js      # CLI runner for one-time/watch FII/DII flow sync
    syncBlockDeals.js       # CLI runner for one-time/watch block deals sync
    syncMutualFundHoldings.js # CLI runner for one-time/watch mutual-fund holdings sync
    syncInsiderTrades.js    # CLI runner for one-time/watch insider-trades sync
    syncShareholdingPatterns.js # CLI runner for one-time/watch shareholding sync
    syncCorporateActions.js # CLI runner for one-time/watch corporate-actions sync
    syncEarningsCalendar.js # CLI runner for one-time/watch earnings-calendar sync
  middleware/
    apiKeyAuth.js         # API key validation middleware
    inputValidation.js    # Query/input sanitization middleware
    rateLimitMiddleware.js
  modules/
    auth/
      auth.routes.js
      auth.controller.js
      auth.service.js
      auth.repository.js
      auth.validation.js
      auth.middleware.js
    health/
      health.routes.js
      health.controller.js
      health.repository.js
    market/
      market.routes.js
      market.controller.js
      market.service.js
      market.repository.js
    portfolio/
      portfolio.routes.js
      portfolio.controller.js
      portfolio.service.js
      portfolio.repository.js
      portfolio.validation.js
    watchlists/
      watchlists.routes.js
      watchlists.controller.js
      watchlists.service.js
      watchlists.repository.js
      watchlists.validation.js
    alerts/
      alerts.routes.js
      alerts.controller.js
      alerts.service.js
      alerts.repository.js
      alerts.validation.js
    institutional/
      institutional.routes.js
      institutional.controller.js
      institutional.service.js
      institutional.repository.js
      institutional.validation.js
    stocks/
      ticks/
        ticks.routes.js
        ticks.controller.js
        ticks.service.js
        ticks.repository.js
        ticks.validation.js
  routes/
    v1/
      index.js            # API v1 route aggregator
  realtime/
    socketServer.js       # Socket.IO server + optional Redis adapter runtime
  shared/
    middleware/
      asyncHandler.js
  utils/
    cacheManager.js
    errorHandler.js
    liveLogger.js
    mockData.js
```

## Naming Conventions

- Route files: `*.routes.js`
- Controller files: `*.controller.js`
- Service files: `*.service.js`
- Repository files: `*.repository.js`
- Validation files: `*.validation.js`

## API Base

All new endpoints are mounted under `/api/v1`.

Portfolio endpoints under `/api/v1/portfolios` require `Authorization: Bearer <access_token>`.
User scope is derived from JWT claims (no `userId` query/body/header override).

## API Docs

- Swagger UI: `GET /api-docs`
- OpenAPI spec JSON: `GET /openapi.json`

## Auth Endpoints

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/oauth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/sessions`
- `GET /api/v1/auth/audit-logs`
- `GET /api/v1/auth/profile`
- `PATCH /api/v1/auth/profile`

## Auth Security Environment Variables

- `AUTH_LOGIN_MAX_ATTEMPTS=5` max failed attempts inside the active window.
- `AUTH_LOGIN_WINDOW_MINUTES=15` rolling window used to accumulate failed attempts.
- `AUTH_LOGIN_BLOCK_MINUTES=60` temporary block duration after max attempts is reached.
- `AUTH_MAX_ACTIVE_SESSIONS=5` maximum concurrent active refresh sessions per user.
- `AUTH_EXPOSE_RESET_TOKEN=false` keep reset tokens hidden in production unless explicitly enabled.
- `EMAIL_VERIFICATION_OTP_EXPIRES_MINUTES=10` expiry for signup/resend verification OTP.
- `AUTH_EXPOSE_EMAIL_VERIFICATION_OTP=false` keep OTP hidden in production unless explicitly enabled.
- `AUTH_REQUIRE_EMAIL_VERIFIED_FOR_LOGIN=false` optionally block login until email is verified.
- User roles are persisted on `users.role` (`user`, `premium_user`, `admin`) and emitted in JWT `role` claims.
- OAuth providers currently supported: `google`, `facebook`.
- OAuth configuration: `GOOGLE_OAUTH_CLIENT_ID`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.

## Market Snapshot Endpoints

- `POST /api/v1/market/snapshot/sync` to run sync immediately.
- `GET /api/v1/market/snapshot/latest` to fetch latest persisted snapshot.
- `GET /api/v1/market/snapshot/history` to fetch snapshot history.
- `GET /api/v1/market/snapshot/status` to inspect scheduler and freshness status.
- `GET /api/v1/market/socket/status` to inspect websocket runtime plus live-tick scheduler status.
- `GET /api/v1/market/ticks/status` to inspect live-tick stream state, symbol subscriptions, and health.
- `POST /api/v1/market/ticks/sync` to trigger one live-tick stream cycle (`symbols`, `persist`, `includeDefaultSymbols`).

## Portfolio Endpoints

- `GET /api/v1/portfolios/export?portfolioId=<uuid>` to export holdings/summary CSV (portfolioId optional).
- `GET /api/v1/portfolios/:portfolioId/holdings` to fetch holdings for a single portfolio.
- `GET /api/v1/portfolios/:portfolioId/summary` to fetch summary metrics for a single portfolio.

## Watchlist Endpoints

- `GET /api/v1/watchlists` list current user's watchlists.
- `POST /api/v1/watchlists` create a watchlist.
- `GET /api/v1/watchlists/:watchlistId` get one watchlist with ordered items.
- `PATCH /api/v1/watchlists/:watchlistId` update watchlist metadata.
- `DELETE /api/v1/watchlists/:watchlistId` delete watchlist.
- `POST /api/v1/watchlists/:watchlistId/items` add symbol to watchlist.
- `DELETE /api/v1/watchlists/:watchlistId/items/:itemId` remove one symbol from watchlist.
- `PATCH /api/v1/watchlists/:watchlistId/items/reorder` reorder watchlist items.

## Alert Endpoints

- `GET /api/v1/alerts` list current user's alerts (supports `symbol` and `isActive` filters).
- `GET /api/v1/alerts/evaluator/status` returns alert evaluator scheduler runtime status.
- `POST /api/v1/alerts` create a price alert.
- `GET /api/v1/alerts/:alertId` get one alert.
- `PATCH /api/v1/alerts/:alertId` update one alert.
- `DELETE /api/v1/alerts/:alertId` delete one alert.

## Notification Endpoints

- `GET /api/v1/notifications` list current user's notification delivery history.
- `GET /api/v1/notifications/delivery/status` returns notification delivery scheduler runtime status.
- `GET /api/v1/notifications/push-devices` list registered push devices for current user.
- `POST /api/v1/notifications/push-devices` register/re-activate a push device token.
- `DELETE /api/v1/notifications/push-devices/:deviceId` deactivate a push device token.

## IPO Endpoints

- `GET /api/v1/ipo/calendar` get seeded IPO calendar data (supports `status`, `from`, `to`, `grouped`, `limit`).
- `GET /api/v1/ipo/:ipoId` get one IPO entry by id.
- `GET /api/v1/ipo/subscriptions/latest` get latest subscription snapshot for each IPO.
- `GET /api/v1/ipo/:ipoId/subscription` get latest and historical subscription snapshots for a single IPO.
- `POST /api/v1/ipo/subscriptions/sync` trigger scraper sync run (API key protected when keys are configured).
- `GET /api/v1/ipo/gmp/latest` get latest GMP snapshot for each IPO.
- `GET /api/v1/ipo/:ipoId/gmp` get latest and historical GMP snapshots for a single IPO.
- `POST /api/v1/ipo/gmp/sync` trigger GMP scraper sync run (API key protected when keys are configured).

## Institutional Endpoints

- `GET /api/v1/institutional/fii-dii` get latest daily FII/DII flow summary (`segment`, `limit` supported).
- `GET /api/v1/institutional/fii-dii/history` get historical activity rows (`from`, `to`, `segment`, `limit` supported).
- `GET /api/v1/institutional/fii-dii/cumulative` get monthly/yearly cumulative net flows (`range`, `segment`, `limit` supported).
- `POST /api/v1/institutional/fii-dii/sync` trigger FII/DII scraper sync run (API key protected when keys are configured).
- `GET /api/v1/institutional/block-deals` get latest-day block/bulk deals (`date`, `exchange`, `symbol`, `dealType`, `limit` supported).
- `GET /api/v1/institutional/block-deals/history` get historical block/bulk deals (`from`, `to`, `exchange`, `symbol`, `dealType`, `limit` supported).
- `POST /api/v1/institutional/block-deals/sync` trigger block-deals scraper sync run (API key protected when keys are configured).
- `GET /api/v1/institutional/mutual-funds` get latest monthly mutual-fund holdings (`month`, `symbol`, `amc`, `scheme`, `limit` supported).
- `GET /api/v1/institutional/mutual-funds/history` get historical mutual-fund holdings (`from`, `to`, `symbol`, `amc`, `scheme`, `limit` supported).
- `GET /api/v1/institutional/mutual-funds/top-holders` get top holders by market value (`month`, `symbol`, `limit` supported).
- `POST /api/v1/institutional/mutual-funds/sync` trigger mutual-fund holdings scraper sync run (API key protected when keys are configured).
- `GET /api/v1/institutional/insider-trades` get latest-day insider trades (`date`, `symbol`, `transactionType`, `insider`, `role`, `limit` supported).
- `GET /api/v1/institutional/insider-trades/history` get historical insider trades (`from`, `to`, `symbol`, `transactionType`, `insider`, `role`, `limit` supported).
- `GET /api/v1/institutional/insider-trades/summary` get monthly/yearly insider trade aggregates (`range`, `symbol`, `transactionType`, `limit` supported).
- `POST /api/v1/institutional/insider-trades/sync` trigger insider-trades scraper sync run (API key protected when keys are configured).
- `GET /api/v1/institutional/shareholding` get latest-quarter shareholding rows (`period`, `symbol`, `limit` supported).
- `GET /api/v1/institutional/shareholding/history` get historical quarter-wise shareholding rows (`from`, `to`, `symbol`, `limit` supported).
- `GET /api/v1/institutional/shareholding/trends` get quarterly/yearly shareholding aggregates (`range`, `symbol`, `limit` supported).
- `POST /api/v1/institutional/shareholding/sync` trigger shareholding scraper sync run (API key protected when keys are configured).
- `GET /api/v1/institutional/corporate-actions` get latest-day corporate actions (`date`, `symbol`, `actionType`, `limit` supported).
- `GET /api/v1/institutional/corporate-actions/history` get historical corporate actions (`from`, `to`, `symbol`, `actionType`, `limit` supported).
- `GET /api/v1/institutional/corporate-actions/summary` get monthly/yearly corporate-action aggregates (`range`, `symbol`, `actionType`, `limit` supported).
- `POST /api/v1/institutional/corporate-actions/sync` trigger corporate-actions scraper sync run (API key protected when keys are configured).
- `GET /api/v1/institutional/earnings-calendar` get latest-day earnings events (`date`, `symbol`, `fiscalQuarter`, `limit` supported).
- `GET /api/v1/institutional/earnings-calendar/history` get historical earnings events (`from`, `to`, `symbol`, `fiscalQuarter`, `limit` supported).
- `GET /api/v1/institutional/earnings-calendar/summary` get monthly/yearly earnings aggregates (`range`, `symbol`, `fiscalQuarter`, `limit` supported).
- `POST /api/v1/institutional/earnings-calendar/sync` trigger earnings-calendar seeding run (API key protected when keys are configured).

## Stock Endpoints

- `POST /api/v1/stocks/:symbol/ticks` ingest/upsert raw ticks.
- `GET /api/v1/stocks/:symbol/ticks` list raw ticks from hypertable.
- `GET /api/v1/stocks/:symbol/history?bucket=1m|5m|15m|1d` list OHLCV candles.
  - Uses Timescale materialized aggregate views when available.
  - Falls back to hypertable aggregation if views are missing or not yet materialized.

## Scripts

- `npm run db:migrate` to apply migrations.
- `npm run db:check` to verify DB and Timescale readiness.
- `npm run market:sync` to fetch and persist one market snapshot.
- `npm run market:sync:watch` to keep market snapshots updated continuously.
- `npm run market:ticks:sync` to run one live-tick stream cycle for subscribed/default symbols.
- `npm run market:ticks:watch` to run live-tick streaming continuously on interval.
- `npm run alerts:evaluate` to run one alert evaluator pass.
- `npm run alerts:evaluate:watch` to keep evaluating alerts on interval.
- `npm run websocket:smoke` to verify websocket connectivity and ping/pong handshake.
- `npm run market:ticks:smoke` to verify stock-room live tick streaming and tick persistence end-to-end.
- `npm run notifications:process` to process queued notification deliveries once.
- `npm run notifications:process:watch` to keep processing queued deliveries on interval.
- `npm run notifications:smoke` to run end-to-end notification delivery smoke test.
- `npm run ipo:seed` to seed/update IPO calendar entries in Postgres.
- `npm run ipo:smoke` to seed and verify IPO calendar APIs end-to-end.
- `npm run ipo:subscriptions:sync` to run one IPO subscription scraper pass.
- `npm run ipo:subscriptions:watch` to run IPO subscription scraper continuously on interval.
- `npm run ipo:subscriptions:smoke` to run end-to-end IPO subscription scraper/API smoke test.
- `npm run ipo:gmp:sync` to run one IPO GMP scraper pass.
- `npm run ipo:gmp:watch` to run IPO GMP scraper continuously on interval.
- `npm run ipo:gmp:smoke` to run end-to-end IPO GMP scraper/API smoke test.
- `npm run institutional:fii-dii:sync` to run one FII/DII scraper pass.
- `npm run institutional:fii-dii:watch` to run FII/DII scraper continuously on interval.
- `npm run institutional:fii-dii:smoke` to run end-to-end FII/DII scraper/API smoke test.
- `npm run institutional:block-deals:sync` to run one block-deals scraper pass.
- `npm run institutional:block-deals:watch` to run block-deals scraper continuously on interval.
- `npm run institutional:block-deals:smoke` to run end-to-end block-deals scraper/API smoke test.
- `npm run institutional:mutual-funds:sync` to run one mutual-fund holdings scraper pass.
- `npm run institutional:mutual-funds:watch` to run mutual-fund holdings scraper continuously on interval.
- `npm run institutional:mutual-funds:smoke` to run end-to-end mutual-fund holdings scraper/API smoke test.
- `npm run institutional:insider-trades:sync` to run one insider-trades scraper pass.
- `npm run institutional:insider-trades:watch` to run insider-trades scraper continuously on interval.
- `npm run institutional:insider-trades:smoke` to run end-to-end insider-trades scraper/API smoke test.
- `npm run institutional:shareholding:sync` to run one shareholding-pattern scraper pass.
- `npm run institutional:shareholding:watch` to run shareholding-pattern scraper continuously on interval.
- `npm run institutional:shareholding:smoke` to run end-to-end shareholding scraper/API smoke test.
- `npm run institutional:corporate-actions:sync` to run one corporate-actions scraper pass.
- `npm run institutional:corporate-actions:watch` to run corporate-actions scraper continuously on interval.
- `npm run institutional:corporate-actions:smoke` to run end-to-end corporate-actions scraper/API smoke test.
- `npm run institutional:earnings-calendar:sync` to run one earnings-calendar seeding pass.
- `npm run institutional:earnings-calendar:watch` to run earnings-calendar seeding continuously on interval.
- `npm run institutional:earnings-calendar:smoke` to run end-to-end earnings-calendar seeding/API smoke test.

## Scheduler Environment Variables

- `MARKET_SYNC_ENABLED=true` enables in-process scheduler on server startup.
- `MARKET_SYNC_INTERVAL_MS=60000` controls recurring sync interval.
- `MARKET_SYNC_RUN_ON_START=true` performs immediate sync when scheduler starts.
- `MARKET_SYNC_STALE_AFTER_MS=180000` controls stale threshold in status endpoint.
- `ALERT_EVALUATOR_ENABLED=true` enables in-process alert evaluator scheduler on server startup.
- `ALERT_EVALUATOR_INTERVAL_MS=30000` controls recurring alert evaluation cadence.
- `ALERT_EVALUATOR_RUN_ON_START=true` performs immediate alert evaluation on startup.
- `ALERT_EVALUATOR_MARKET_HOURS_ONLY=true` evaluates alerts only during configured market window.
- `ALERT_EVALUATOR_FORCE_RUN=false` bypasses market-hours gating when set to `true`.
- `ALERT_EVALUATOR_COOLDOWN_SECONDS=300` minimum seconds between repeated trigger stamps for same alert.
- `ALERT_MARKET_TIMEZONE=Asia/Kolkata` timezone used for market-hours gating.
- `ALERT_MARKET_OPEN_HHMM=0915` market open in HHMM format.
- `ALERT_MARKET_CLOSE_HHMM=1530` market close in HHMM format.
- `ALERT_MARKET_WEEKDAYS=1,2,3,4,5` valid trading weekdays (`0=Sunday`, `6=Saturday`).
- `NOTIFICATION_DELIVERY_ENABLED=true` enables in-process notification delivery scheduler on server startup.
- `NOTIFICATION_DELIVERY_INTERVAL_MS=30000` controls recurring notification processing cadence.
- `NOTIFICATION_DELIVERY_RUN_ON_START=true` processes queued notifications immediately on startup.
- `NOTIFICATION_DELIVERY_BATCH_SIZE=50` max queued notifications claimed per processing run.
- `NOTIFICATION_EMAIL_MODE=mock` email delivery mode (`mock` or `webhook`).
- `NOTIFICATION_EMAIL_WEBHOOK_URL=` optional webhook URL used when email mode is `webhook`.
- `NOTIFICATION_PUSH_MODE=mock` push delivery mode (`mock` or `webhook`).
- `NOTIFICATION_PUSH_WEBHOOK_URL=` optional webhook URL used when push mode is `webhook`.
- `IPO_SUBSCRIPTION_SYNC_INTERVAL_MS=3600000` interval for IPO subscription scraper watch mode.
- `IPO_GMP_SYNC_INTERVAL_MS=3600000` interval for IPO GMP scraper watch mode.
- `FII_DII_SYNC_INTERVAL_MS=86400000` interval for FII/DII scraper watch mode.
- `BLOCK_DEALS_SYNC_INTERVAL_MS=21600000` interval for block-deals scraper watch mode.
- `MUTUAL_FUND_HOLDINGS_SYNC_INTERVAL_MS=86400000` interval for mutual-fund holdings scraper watch mode.
- `INSIDER_TRADES_SYNC_INTERVAL_MS=86400000` interval for insider-trades scraper watch mode.
- `SHAREHOLDING_SYNC_INTERVAL_MS=86400000` interval for shareholding scraper watch mode.
- `CORPORATE_ACTIONS_SYNC_INTERVAL_MS=86400000` interval for corporate-actions scraper watch mode.
- `EARNINGS_CALENDAR_SYNC_INTERVAL_MS=86400000` interval for earnings-calendar seeding watch mode.
- `WEBSOCKET_ENABLED=true` enables Socket.IO runtime on server startup.
- `WEBSOCKET_PATH=/socket.io` Socket.IO transport path.
- `WEBSOCKET_CORS_ORIGIN=*` comma-separated websocket CORS origins or `*`.
- `WEBSOCKET_PING_INTERVAL_MS=25000` websocket ping interval in milliseconds.
- `WEBSOCKET_PING_TIMEOUT_MS=20000` websocket ping timeout in milliseconds.
- `WEBSOCKET_REDIS_ADAPTER_ENABLED=true` enables Redis pub/sub adapter for Socket.IO.
- `WEBSOCKET_REDIS_URL=redis://localhost:6379` websocket adapter Redis URL (falls back to `REDIS_URL`).
- `LIVE_TICK_STREAM_ENABLED=true` enables in-process live tick stream scheduler.
- `LIVE_TICK_STREAM_INTERVAL_MS=15000` interval for live tick quote fetch cycles.
- `LIVE_TICK_STREAM_RUN_ON_START=true` runs one stream cycle immediately at scheduler startup.
- `LIVE_TICK_STREAM_PERSIST_TICKS=true` persists streamed ticks into `stock_price_ticks`.
- `LIVE_TICK_STREAM_INCLUDE_DEFAULT_SYMBOLS=true` includes default symbols even without active socket subscriptions.
- `LIVE_TICK_STREAM_DEFAULT_SYMBOLS=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK` default symbols used for stream cycles.
- `LIVE_TICK_STREAM_MAX_SYMBOLS=30` max symbols processed per stream cycle.

## Cache Environment Variables

- `CACHE_ENABLED=true` enables service-level cache-aside reads.
- `CACHE_MAX_SIZE=10000` sets max in-memory cache entries before LRU eviction.
- `CACHE_REDIS_ENABLED=false` enables Redis-backed cache storage when set to `true`.
- `REDIS_URL=redis://localhost:6379` Redis connection URL used when Redis cache is enabled.
- `CACHE_REDIS_NAMESPACE=stock_sense_backend` key namespace/prefix for Redis cache records.
- `REDIS_CONNECT_TIMEOUT_MS=3000` Redis connect timeout in milliseconds.
- `CACHE_MARKET_LATEST_TTL_MS=30000` TTL for `GET /api/v1/market/snapshot/latest`.
- `CACHE_MARKET_HISTORY_TTL_MS=30000` TTL for `GET /api/v1/market/snapshot/history`.
- `CACHE_STOCK_TICKS_TTL_MS=60000` TTL for `GET /api/v1/stocks/:symbol/ticks`.
- `CACHE_STOCK_HISTORY_TTL_MS=300000` TTL for `GET /api/v1/stocks/:symbol/history`.

When Redis cache is enabled and reachable, market/stock cache-aside reads use Redis with in-memory hydration fallback. If Redis is disabled or unavailable, cache behavior automatically falls back to in-memory only.

Cache invalidation notes:

- Market snapshot sync clears market snapshot cache tags.
- Tick ingestion clears symbol-scoped stock cache tags.
