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
  jobs/
    marketSyncScheduler.js # In-process recurring market sync runtime state
    syncMarketSnapshots.js # CLI runner for one-time/watch market sync
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

## Scripts

- `npm run db:migrate` to apply migrations.
- `npm run db:check` to verify DB and Timescale readiness.
- `npm run market:sync` to fetch and persist one market snapshot.
- `npm run market:sync:watch` to keep market snapshots updated continuously.

## Scheduler Environment Variables

- `MARKET_SYNC_ENABLED=true` enables in-process scheduler on server startup.
- `MARKET_SYNC_INTERVAL_MS=60000` controls recurring sync interval.
- `MARKET_SYNC_RUN_ON_START=true` performs immediate sync when scheduler starts.
- `MARKET_SYNC_STALE_AFTER_MS=180000` controls stale threshold in status endpoint.
