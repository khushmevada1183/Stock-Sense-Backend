# STOCK SENSE Unified Master Plan (Phase-Wise Detailed Merge)

This document merges both source plans into one operationally usable phase-wise master file with requirement coverage mapping and preserved source detail.

## Sources Merged

- Source A: STOCKSENSE_MASTER_PLAN.md (2611 lines)
- Source B: STOCKSENSE_MASTER_PLAN2.md.md (1889 lines)

## Merge Method (No-Loss Strategy)

1. Built a phase-wise crosswalk between Source A phases (0-18) and Source B requirements (1-30).
2. Preserved Source A detailed 2-year roadmap section verbatim.
3. Preserved Source B requirements and phased implementation roadmap verbatim.
4. Kept both original files unchanged and retained full-content appendices here to avoid omissions.

## Unified Phase Crosswalk (Detailed)

| Phase | Timeline | Requirement Coverage (Plan2) | Detailed Focus (Merged) |
|---|---|---|---|
| Phase 0 | Month 1 | Req 1, 2, 11, 12, 13, 14, 15, 16 | Setup infra, DB foundation, CI/CD, security + observability baseline |
| Phase 1 | Months 2-3 | Req 3, 8, 9, 11, 17, 20, 23, 24, 25, 26 | Core stock/market APIs, ingestion, cache strategy, TA + search |
| Phase 2 | Months 4-5 | Req 19, 22, 25, 29 | Portfolio, watchlists, alerts, IPO tracking + user workflows |
| Phase 3 | Month 6 | Req 8, 20, 21, 22, 23 | Institutional datasets, corporate/insider/mutual-fund layers |
| Phase 4 | Month 7 | Req 5, 10, 12, 13 | WebSocket and queue-driven real-time infra + scaling readiness |
| Phase 5 | Month 8 | Req 8, 21, 23, 29 | News ingestion, sentiment, fear-greed, notification surfaces |
| Phase 6 | Months 9-10 | Req 7, 18 | ML prediction v1, model evaluation, backtesting, service exposure |
| Phase 7 | Months 11-12 | Req 6, 14, 15, 27, 29 | Subscription, launch hardening, admin/ops controls |
| Phase 8 | Months 13-15 | Req 7, 13 | ML v2 (LSTM/Transformer/ensemble) and model quality uplift |
| Phase 9 | Months 14-16 | Req 3, 8, 24, 26 | Options/derivatives chain, OI/PCR/greeks and analytics |
| Phase 10 | Months 15-17 | Req 3, 20, 25, 26 | Advanced screeners, templates, and factor-based discovery |
| Phase 11 | Months 16-18 | Req 3, 4, 6, 10, 27 | Developer API platform, SDKs, docs, API key governance |
| Phase 12 | Months 17-19 | Req 21, 27, 29 | Social/community intelligence and user collaboration features |
| Phase 13 | Months 18-20 | Req 4, 5, 9, 12, 29 | Mobile optimization, compressed streams, offline-aware patterns |
| Phase 14 | Months 19-21 | Req 8, 23, 24 | Macro/global signals integrated into market intelligence |
| Phase 15 | Months 20-22 | Req 1, 3, 6, 14, 17 | Enterprise + white-label + broker integration path |
| Phase 16 | Months 21-23 | Req 7, 21, 28 | AI v2 NL interface, report generation, assisted workflows |
| Phase 17 | Months 22-24 | Req 3, 12, 14 | Geo expansion, multi-market capability, compliance extension |
| Phase 18 | Month 24+ | Req 11, 13, 14, 15, 16, 18 | Continuous excellence, auditability, scale and resilience loop |

## Merged Detailed Phase Guidance

- Execution baseline: Source A phase granularity (Phase 0 to Phase 18).
- Governance baseline: Source B requirement acceptance criteria (Req 1 to Req 30).
- Delivery control: Each sprint/milestone should map to both a Source A phase and Source B requirement IDs.
- Completion rule per phase: Mark phase done only after associated requirement acceptance criteria are demonstrably met.

## Live Execution Status (Updated 2026-04-07)

Legend:
- [x] Completed
- [ ] Pending

### Current Phase Completion State

- [ ] Phase 0 complete
- [ ] Phase 1 complete
- [x] Phase 2 complete

### Recently Completed (Backend)

- [x] Portfolio user isolation via JWT auth context
- [x] Portfolio CSV export endpoint
- [x] Portfolio route-based holdings and summary endpoints
- [x] Portfolio FIFO lot-level cost basis and realized/unrealized P&L computation
- [x] Portfolio XIRR service with aggregate and per-portfolio endpoints
- [x] Portfolio performance chart time-series API (aggregate and per-portfolio)
- [x] Phase 4 market overview websocket room updates wired from snapshot sync + manual sync
- [x] Phase 4 per-stock live price rooms (stock:* room subscriptions + tick emission)
- [x] Phase 4 portfolio real-time P&L websocket updates from live tick stream
- [x] Phase 4 alert trigger websocket events (alerts:user:* room subscriptions + evaluator emit)
- [x] Watchlist CRUD with reordering
- [x] Price alert CRUD foundation (all 6 alert types)
- [x] OpenAPI/Swagger updates for new endpoints with visual verification
- [x] TimescaleDB candle aggregate views (1m/5m/15m/1d) + stock history API
- [x] Cache-aside layer for market snapshots + stock ticks/history with TTL and invalidation
- [x] GitHub Actions CI workflow for lint + test on pull requests
- [x] External Redis cache wiring with automatic in-memory fallback
- [x] Alert evaluator background job with 30s cadence during market hours
- [x] Notification delivery pipeline (email + push) with outbox, scheduler, and provider fallback modes
- [x] IPO calendar seeding and v1 APIs backed by Postgres
- [x] IPO subscription data scraper with v1 subscription APIs
- [x] GMP tracking with v1 APIs and sync job
- [x] FII/DII daily data scraper with institutional APIs and sync job
- [x] Block deals scraper (NSE/BSE) with institutional APIs and sync job
- [x] Mutual fund holdings data pipeline (SEBI monthly data) with institutional APIs and sync job
- [x] Insider trading data ingestion with institutional APIs and sync job
- [x] Standard API response builder + shared response helper middleware with request-id metadata
- [x] Shared pagination utility (page/limit/offset + pagination metadata)
- [x] Request context middleware with X-Request-ID propagation
- [x] Winston structured logging baseline (ELK integration deferred)
- [x] Phase 1 APIs: GET /market/overview, GET /market/indices/:name, GET /stocks/:symbol
- [x] Phase 1 API baseline: GET /stocks/search (Postgres fallback active; Elasticsearch deferred to later upgrade)
- [x] Phase 1 API baseline: GET /stocks/:symbol/quote (non-Redis fallback)
- [x] Phase 1 technical indicators: 15+ indicators implemented with precompute storage and /stocks/:symbol/technical API
- [x] Phase 1 technical indicators scheduler: 15-minute market-hours recompute job
- [x] Phase 1 fundamentals: company_fundamentals + financial statement storage with ratio computation service
- [x] Phase 1 fundamentals APIs: GET /stocks/:symbol/fundamental and GET /stocks/:symbol/financials
- [x] Phase 1 fundamentals scheduler: recurring quarterly-results sync job (Node scheduler; Celery equivalent deferred)
- [x] Phase 1 sector taxonomy seeding + peer comparison API (GET /stocks/:symbol/peers)
- [x] Phase 1 sector heatmap aggregation API (GET /market/sector-heatmap)
- [x] Phase 1 52-week tracking + APIs (GET /market/52-week-high and /market/52-week-low)

### Immediate Pending (Next Plan Targets)

- [ ] Phase 0 Docker Compose stack (TimescaleDB, Redis, Kafka, Elasticsearch) (deferred for now)
- [ ] Phase 0 Kafka topics creation (deferred for now)
- [ ] Phase 1 Elasticsearch full-text engine (external Elasticsearch/OpenSearch service) (deferred for later upgrade; Postgres search fallback active)
- [ ] Phase 0 Timescale upgrade for true continuous aggregate policies (currently using materialized aggregate views)
- [x] Phase 3 shareholding pattern quarterly data
- [x] Phase 3 corporate actions scraper
- [x] Phase 3 earnings calendar seeding
- [x] Phase 4 WebSocket server with Socket.io + Redis adapter
- [x] Phase 4 live tick streaming from NSE WebSocket feed
- [x] Phase 4 market overview real-time updates room

## Verbatim Source A Phase Roadmap

## 13. 2-YEAR PHASE ROADMAP — STEP BY STEP

---

### YEAR 1 — FOUNDATION & PRODUCT-MARKET FIT (Months 1-12)

---

#### PHASE 0: Setup & Infrastructure (Month 1 — Weeks 1-4)

**Week 1: Development Environment**
- [ ] Initialize monorepo with Turborepo
- [ ] Set up Docker Compose (TimescaleDB, Redis, Kafka, Elasticsearch) (deferred for now)
- [ ] Configure TypeScript, ESLint, Prettier across all apps
- [x] Set up GitHub Actions CI (lint + test on every PR)
- [x] Create all database migration files (V001 to V013)
- [ ] Seed stocks_master with all 2000+ NSE-listed stocks
- [ ] Set up Flyway for migration management

**Week 2: Auth System**
- [x] Implement users, user_sessions tables
- [x] JWT auth (access + refresh token pair)
- [x] Google OAuth integration
- [ ] Email OTP verification (AWS SES)
- [x] Password hashing (bcrypt)
- [x] Rate limiting middleware
- [x] Auth APIs: register, login, logout, refresh, forgot-password

**Week 3: Core Data Pipeline**
- [ ] NSE REST API integration for end-of-day data
- [ ] Data ingestion worker (Python Celery)
- [ ] Populate stock_prices with 5 years of historical data
- [x] Set up TimescaleDB aggregate candle views (1min, 5min, 15min, 1day) (continuous policies deferred by current license)
- [x] Redis caching layer setup (external Redis enabled with automatic in-memory fallback)
- [ ] Kafka topics creation (deferred for now)

**Week 4: API Foundation**
- [x] Express.js server with all middleware
- [x] Response builder utility (standard API response format)
- [x] Error handler middleware
- [x] Pagination utility
- [ ] Logging (Winston + ELK) (Winston baseline completed; ELK deferred)
- [x] API documentation (Swagger/OpenAPI)
- [ ] Deploy to staging (AWS ECS or single EC2)

---

#### PHASE 1: Core Stock Data APIs (Months 2-3)

**Month 2, Week 1-2: Market & Stock APIs**
- [x] GET /market/overview (indices, breadth, gainers/losers)
- [x] GET /market/indices/:name with OHLCV history
- [ ] GET /stocks/search (Elasticsearch full-text) (deferred for later upgrade; v1 currently uses Postgres fallback)
- [x] GET /stocks/:symbol (full profile)
- [ ] GET /stocks/:symbol/quote (live price from Redis) (v1 endpoint currently uses non-Redis fallback)
- [x] GET /stocks/:symbol/history (from TimescaleDB aggregate views with hypertable fallback)

**Month 2, Week 3-4: Technical Analysis**
- [x] Implement all 15+ technical indicators in Node.js (using `technicalindicators` library)
- [x] Store precomputed indicators in technical_indicators table
- [x] GET /stocks/:symbol/technical API
- [x] Background job to recompute indicators every 15 minutes (market hours)
- [ ] Cache indicator results in Redis (60s TTL during market hours) (60s cache active via cache manager fallback; dedicated Redis rollout deferred)

**Month 3, Week 1-2: Fundamental Data**
- [x] Integration with Screener.in API or NSE for quarterly results (v1 uses NSE-backed legacy integration)
- [x] Populate company_fundamentals table
- [x] Ratio computation service (P/E, P/B, ROE, ROCE etc.)
- [x] GET /stocks/:symbol/fundamental API
- [x] GET /stocks/:symbol/financials API (statements)
- [x] Quarterly results sync Celery job (implemented as Node scheduler/worker equivalent in current backend)

**Month 3, Week 3-4: Peer Comparison & Sector**
- [x] Sector/Industry taxonomy seeding
- [x] GET /stocks/:symbol/peers (same sector, sorted by market cap)
- [x] Sector heatmap aggregation
- [x] GET /market/sector-heatmap API
- [x] 52-week high/low tracking
- [x] GET /market/52-week-high and /52-week-low

---

#### PHASE 2: User Features (Months 4-5)

**Month 4: Portfolio Management**
- [x] Portfolio CRUD APIs
- [x] Transaction recording (buy/sell)
- [x] FIFO cost basis computation
- [x] Live P&L calculation
- [x] XIRR service implementation
- [x] Sector allocation analytics
- [x] Portfolio export (CSV)
- [x] Portfolio performance charts data

**Month 5: Watchlists, Alerts, IPO**
- [x] Watchlist CRUD with reordering
- [x] Price alert system (all 6 alert types)
- [x] Alert evaluator background job (runs every 30s in market hours)
- [x] Push notifications (FCM-compatible pipeline with webhook/mock fallback)
- [x] Email notifications (SES-compatible pipeline with webhook/mock fallback)
- [x] IPO calendar seeding and APIs
- [x] IPO subscription data scraper
- [x] GMP tracking

---

#### PHASE 3: Institutional & Advanced Data (Month 6)

- [x] FII/DII daily data scraper and APIs
- [x] Block deals scraper (NSE/BSE data)
- [x] Mutual fund holdings data pipeline (SEBI monthly data)
- [x] Insider trading data ingestion
- [x] Shareholding pattern quarterly data
- [x] Corporate actions scraper
- [x] Earnings calendar seeding
- [x] GET /institutional/* APIs

---

#### PHASE 4: Real-Time Infrastructure (Month 7)

- [x] WebSocket server with Socket.io + Redis adapter
- [x] Live tick streaming from NSE WebSocket feed
- [x] Market overview real-time updates room
- [x] Per-stock live price rooms
- [x] Portfolio real-time P&L updates
- [x] Alert triggers via WebSocket
- [ ] Kafka consumer for tick-to-WebSocket pipeline
- [ ] Load test WebSocket at 10,000 concurrent connections
- [ ] Horizontal scaling setup

---

#### PHASE 5: News & Sentiment (Month 8)

- [ ] News scraper for Moneycontrol, ET, BS, Livemint
- [ ] NewsAPI.org integration
- [ ] News article storage and categorization
- [ ] FinBERT sentiment model setup in ml-service
- [ ] Batch sentiment processing Celery job
- [ ] Social sentiment scraper (Twitter/X API, Reddit)
- [ ] Fear & Greed Index computation
- [ ] GET /news/* APIs
- [ ] GET /stocks/:symbol/sentiment API

---

#### PHASE 6: ML Prediction Engine — Phase 1 (Month 9-10)

- [ ] Python FastAPI ml-service setup
- [ ] Feature engineering pipeline (120 features)
- [ ] XGBoost direction model (baseline)
- [ ] LightGBM return magnitude model
- [ ] MLflow model registry setup
- [ ] Train on NSE top 200 stocks (Nifty 200)
- [ ] Backtest framework implementation
- [ ] Validate: directional accuracy > 55% (baseline target)
- [ ] stock_predictions table population job
- [ ] GET /predictions/:symbol API
- [ ] Prediction accuracy tracking

---

#### PHASE 7: Monetization & Launch (Months 11-12)

**Month 11: Subscription System**
- [ ] subscription_plans table seeding (Free/Pro/Elite/Institutional)
- [ ] Razorpay subscription integration
- [ ] Webhook handler for subscription events
- [ ] Subscription middleware (feature gating)
- [ ] API rate limiting by subscription tier
- [ ] GET /subscriptions/* APIs
- [ ] Billing dashboard data

**Month 12: Production Hardening & Launch**
- [ ] Move to EKS (Kubernetes on AWS)
- [ ] TimescaleDB on RDS with Multi-AZ
- [ ] ElastiCache Redis cluster
- [ ] MSK Kafka cluster
- [ ] CloudFront CDN for static assets
- [ ] Load testing (k6): 10,000 RPS target
- [ ] Monitoring: Prometheus + Grafana dashboards
- [ ] Alerting: PagerDuty for P0 incidents
- [ ] Security audit
- [ ] **BETA LAUNCH** — invite 1,000 users
- [ ] **PUBLIC LAUNCH**

---

### YEAR 2 — SCALE & COMPETITIVE MOAT (Months 13-24)

---

#### PHASE 8: ML Prediction Engine — Phase 2 (Months 13-15)

- [ ] LSTM sequence model for temporal patterns
- [ ] Transformer (attention-based) model for multi-stock patterns
- [ ] Ensemble meta-learner (learns optimal weights per sector+horizon)
- [ ] Expand to ALL NSE-listed stocks (2000+)
- [ ] Add 1-week and 1-month prediction horizons
- [ ] Real-time feature store (Feast) integration
- [ ] Improve directional accuracy to > 62%
- [ ] Prediction confidence calibration
- [ ] Achieve Sharpe Ratio > 1.5 in backtest
- [ ] "AI Stock Picks of the Day" feature
- [ ] User feedback loop (thumbs up/down → model retraining signal)

---

#### PHASE 9: Options & Derivatives (Months 14-16)

- [ ] Options chain data from NSE (real-time)
- [ ] options_chain TimescaleDB hypertable
- [ ] Options Greeks computation (Black-Scholes)
- [ ] OI analysis, PCR ratio
- [ ] Max Pain calculation
- [ ] Put-Call Ratio trend
- [ ] Implied Volatility surface
- [ ] GET /stocks/:symbol/options API
- [ ] Options screener (high OI, unusual activity)
- [ ] Options P&L calculator tool

---

#### PHASE 10: Advanced Screener & Tools (Months 15-17)

- [ ] Dynamic screener engine (30+ filter conditions)
- [ ] Prebuilt screener templates (Buffett criteria, Graham number, momentum, etc.)
- [ ] Community screeners (public/private)
- [ ] Sector rotation analysis tool
- [ ] Relative strength ranking (RSR)
- [ ] Mean reversion signals
- [ ] Bulk/Block deal screener
- [ ] FII/DII flow screener
- [ ] Insider buying screener

---

#### PHASE 11: Developer API Platform (Months 16-18)

- [ ] API key management system
- [ ] API usage tracking and billing
- [ ] Public API documentation portal (Stoplight or Redocly)
- [ ] SDK packages: Python, Node.js, JavaScript
- [ ] GraphQL API endpoint
- [ ] WebSocket streaming API for external developers
- [ ] API marketplace listing (RapidAPI)
- [ ] Developer portal with sandbox environment
- [ ] Institutional data packages (bulk historical data)

---

#### PHASE 12: Social & Community Features (Months 17-19)

- [ ] Expert analyst profiles (SEBI RA verified)
- [ ] Analysis posts / trade ideas
- [ ] Portfolio sharing (optional, anonymized)
- [ ] Discussion threads per stock
- [ ] Follow system for analysts
- [ ] Prediction leaderboard (who predicted correctly)
- [ ] Paper trading (simulated portfolio with virtual ₹10L)
- [ ] Community watchlists

---

#### PHASE 13: Mobile API Optimization (Months 18-20)

- [ ] GraphQL for mobile (batched, efficient queries)
- [ ] Offline-first support (sync strategy)
- [ ] Push notification service hardening (FCM + APNs)
- [ ] Compressed WebSocket payload (protobuf)
- [ ] Smart caching headers
- [ ] Low-bandwidth mode API
- [ ] WebView APIs for embedded use

---

#### PHASE 14: Macro & Global Integration (Months 19-21)

- [ ] Global indices (S&P500, Nasdaq, DJIA, Hang Seng, Nikkei)
- [ ] USD/INR, EUR/INR FX rates
- [ ] Crude oil, Gold, Silver prices
- [ ] US Fed interest rate tracker
- [ ] RBI rate decisions calendar
- [ ] Macro dashboard (India GDP, CPI, IIP data from data.gov.in)
- [ ] DXY Dollar Index correlation
- [ ] Macro impact on sector predictions

---

#### PHASE 15: Enterprise & White-Label (Months 20-22)

- [ ] Multi-tenant architecture
- [ ] White-label API (custom branding)
- [ ] Broker integration (Zerodha Kite, AngelOne, Upstox APIs)
- [ ] Direct trade execution from platform (via broker API)
- [ ] SEBI-compliant reporting tools
- [ ] Compliance audit logs
- [ ] SSO (SAML/OAuth) for enterprise
- [ ] Custom data delivery (SFTP, S3)

---

#### PHASE 16: AI V2 — Natural Language & Generative (Months 21-23)

- [ ] NL query interface: "Show me profitable IT stocks with low PE"
- [ ] AI stock analysis reports (LLM-generated summaries)
- [ ] AI earnings call transcript analysis (NSE publishes PDFs)
- [ ] AI portfolio risk assessment
- [ ] AI-powered news summarization
- [ ] Voice interface for market queries
- [ ] Fine-tune LLM on Indian financial corpus (regulatory filings, earnings)

---

#### PHASE 17: Geographic Expansion (Months 22-24)

- [ ] Sri Lanka Stock Exchange (CSE) integration
- [ ] Bangladesh Stock Exchange
- [ ] SGX (Singapore, for NRIs)
- [ ] Multi-currency portfolio tracking
- [ ] Currency-adjusted returns
- [ ] NRI-specific features (DTAA, foreign portfolio)
- [ ] Multi-language UI (Hindi, Gujarati, Tamil, Telugu)

---

#### PHASE 18: Continuous Excellence (Month 24 — Ongoing)

- [ ] ML model accuracy review: directional accuracy target > 65%
- [ ] Database performance audit (EXPLAIN ANALYZE on all slow queries)
- [ ] P99 API latency < 200ms for all endpoints
- [ ] Security penetration testing (external firm)
- [ ] SOC 2 Type II certification
- [ ] ISO 27001 certification
- [ ] SEBI RA + RIA license (for advisory features)
- [ ] RBI payment aggregator license (for subscription billing)
- [ ] Series A fundraise preparation
- [ ] 1M monthly active users milestone

---

## Verbatim Source B Requirements (Req 1-30)

## Requirements

### Requirement 1: Backend Architecture Foundation

**User Story:** As a platform architect, I want a scalable microservices-based backend architecture, so that the system can handle millions of users and scale horizontally as demand grows.

#### Acceptance Criteria

1. THE API_Gateway SHALL route incoming requests to appropriate microservices based on URL patterns and load balancing algorithms
2. THE Backend_System SHALL implement microservices for Stock_Service, IPO_Service, News_Service, Prediction_Service, Portfolio_Service, Auth_Service, and Market_Service as independent deployable units
3. WHEN a microservice fails, THE Load_Balancer SHALL redirect traffic to healthy instances without service interruption
4. THE Backend_System SHALL organize code in a modular folder structure with separation of concerns (controllers, services, repositories, models, middleware)
5. THE API_Gateway SHALL enforce rate limiting of 1000 requests per minute for authenticated users and 100 requests per minute for anonymous users
6. THE Backend_System SHALL implement service discovery for dynamic microservice registration and health checking
7. WHEN system load exceeds 70% capacity, THE Auto_Scaling_System SHALL provision additional service instances within 2 minutes

### Requirement 2: Database Schema and Data Management

**User Story:** As a backend developer, I want a comprehensive PostgreSQL database schema with TimescaleDB for time-series data, so that I can efficiently store and query stock prices, user data, and financial information.

#### Acceptance Criteria

1. THE Primary_DB SHALL implement tables for users, stocks, market_indices, ipos, news_articles, portfolios, portfolio_holdings, watchlists, alerts, financial_statements, company_profiles, sectors, commodities, user_sessions, api_keys, and audit_logs
2. THE Time_Series_DB SHALL store stock_prices with columns (stock_id, timestamp, open, high, low, close, volume, vwap) partitioned by time intervals of 7 days
3. THE Time_Series_DB SHALL store intraday_prices with 1-minute granularity for real-time charting
4. THE Primary_DB SHALL implement B-tree indexes on frequently queried columns (stock_symbol, user_id, timestamp, sector_id)
5. THE Primary_DB SHALL implement composite indexes on (stock_id, timestamp) for time-range queries
6. THE Primary_DB SHALL enforce foreign key constraints between related tables (portfolios.user_id → users.id, portfolio_holdings.stock_id → stocks.id)
7. THE Primary_DB SHALL partition large tables (stock_prices, news_articles) by date ranges to optimize query performance
8. THE Primary_DB SHALL implement JSONB columns for flexible schema fields (company_profiles.metadata, stocks.technical_indicators)
9. WHEN a database query exceeds 500ms execution time, THE Monitoring_System SHALL log a slow query warning
10. THE Backup_System SHALL create automated daily backups of Primary_DB and Time_Series_DB with 30-day retention


### Requirement 3: RESTful API Design and Implementation

**User Story:** As a frontend developer, I want well-designed RESTful APIs with consistent response formats, so that I can easily integrate backend services with the Next.js application.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose RESTful endpoints following pattern /api/v1/{resource} for all services
2. THE Stock_Service SHALL provide endpoints: GET /api/v1/stocks, GET /api/v1/stocks/{symbol}, GET /api/v1/stocks/{symbol}/prices, GET /api/v1/stocks/{symbol}/historical
3. THE IPO_Service SHALL provide endpoints: GET /api/v1/ipos, GET /api/v1/ipos/{id}, GET /api/v1/ipos/upcoming, GET /api/v1/ipos/current, GET /api/v1/ipos/past
4. THE News_Service SHALL provide endpoints: GET /api/v1/news, GET /api/v1/news/{category}, GET /api/v1/news/trending, GET /api/v1/news/alerts
5. THE Portfolio_Service SHALL provide endpoints: GET /api/v1/portfolios, POST /api/v1/portfolios, GET /api/v1/portfolios/{id}/holdings, POST /api/v1/portfolios/{id}/holdings, DELETE /api/v1/portfolios/{id}/holdings/{holding_id}
6. THE Market_Service SHALL provide endpoints: GET /api/v1/indices, GET /api/v1/sectors, GET /api/v1/commodities
7. THE Prediction_Service SHALL provide endpoints: GET /api/v1/predictions/{symbol}, POST /api/v1/predictions/batch
8. WHEN an API request succeeds, THE API_Gateway SHALL return responses with status code 200 and JSON format {success: true, data: {}, metadata: {}}
9. WHEN an API request fails, THE API_Gateway SHALL return error responses with appropriate status codes (400, 401, 403, 404, 500) and format {success: false, error: {code, message, details}}
10. THE API_Gateway SHALL implement pagination for list endpoints with query parameters (page, limit, sort, order) and return metadata (total_count, page, limit, has_next)
11. THE API_Gateway SHALL support filtering and search via query parameters (symbol, sector, date_from, date_to, category)
12. THE API_Gateway SHALL include response headers (X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID) for debugging and monitoring

### Requirement 4: GraphQL API for Complex Queries

**User Story:** As a frontend developer, I want a GraphQL API for complex nested queries, so that I can fetch related data in a single request and reduce network overhead.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose a GraphQL endpoint at /api/v1/graphql
2. THE GraphQL_Server SHALL implement types for Stock, IPO, News, Portfolio, User, MarketIndex, Sector, Commodity, Prediction
3. THE GraphQL_Server SHALL implement queries: stock(symbol), stocks(filter), ipo(id), ipos(status), news(category), portfolio(id), marketIndices, predictions(symbol)
4. THE GraphQL_Server SHALL implement mutations: createPortfolio, addHolding, removeHolding, createAlert, updateWatchlist
5. THE GraphQL_Server SHALL support nested queries to fetch related data (stock with company_profile, financial_statements, and predictions in one request)
6. THE GraphQL_Server SHALL implement DataLoader pattern to batch and cache database queries and prevent N+1 query problems
7. WHEN a GraphQL query exceeds depth of 5 levels, THE GraphQL_Server SHALL reject the query with error "Query too complex"
8. THE GraphQL_Server SHALL enforce query complexity limits of 1000 points per request to prevent resource exhaustion

### Requirement 5: WebSocket Real-Time Data Streaming

**User Story:** As a user, I want real-time stock price updates without refreshing the page, so that I can make timely investment decisions based on live market data.

#### Acceptance Criteria

1. THE WebSocket_Server SHALL accept client connections at wss://api.domain.com/ws
2. WHEN a client connects, THE WebSocket_Server SHALL authenticate the connection using JWT tokens
3. THE WebSocket_Server SHALL support subscription messages with format {action: "subscribe", channel: "stock_prices", symbols: ["RELIANCE", "TCS"]}
4. WHEN a stock price updates, THE WebSocket_Server SHALL broadcast messages to subscribed clients within 100ms
5. THE WebSocket_Server SHALL support channels: stock_prices, market_indices, ipo_updates, news_alerts, portfolio_updates
6. THE WebSocket_Server SHALL limit each client to 50 concurrent subscriptions
7. WHEN a client disconnects, THE WebSocket_Server SHALL clean up subscriptions and release resources
8. THE WebSocket_Server SHALL implement heartbeat ping/pong messages every 30 seconds to detect stale connections
9. THE WebSocket_Server SHALL compress messages using permessage-deflate to reduce bandwidth usage

### Requirement 6: Authentication and Authorization System

**User Story:** As a user, I want secure authentication with JWT tokens and OAuth support, so that my account and portfolio data are protected from unauthorized access.

#### Acceptance Criteria

1. THE Auth_Service SHALL implement user registration with email verification
2. THE Auth_Service SHALL implement login with email/password and return JWT access tokens (15-minute expiry) and refresh tokens (7-day expiry)
3. THE Auth_Service SHALL support OAuth 2.0 authentication with Google and Facebook providers
4. THE Auth_Service SHALL hash passwords using bcrypt with salt rounds of 12
5. THE Auth_Service SHALL implement role-based access control (RBAC) with roles: user, premium_user, admin
6. THE API_Gateway SHALL validate JWT tokens on protected endpoints and reject requests with expired or invalid tokens
7. THE Auth_Service SHALL implement token refresh endpoint POST /api/v1/auth/refresh that accepts refresh tokens and returns new access tokens
8. THE Auth_Service SHALL implement logout endpoint that invalidates refresh tokens
9. THE Auth_Service SHALL implement rate limiting of 5 failed login attempts per IP address within 15 minutes, then block for 1 hour
10. THE Auth_Service SHALL store user sessions in Redis with automatic expiration
11. THE Auth_Service SHALL implement API key authentication for third-party integrations with scoped permissions


### Requirement 7: Stock Prediction Machine Learning Pipeline

**User Story:** As a data scientist, I want a complete ML pipeline for training and deploying stock prediction models, so that the platform can provide accurate AI-powered investment recommendations.

#### Acceptance Criteria

1. THE ML_Pipeline SHALL implement feature engineering to extract technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands) from historical stock prices
2. THE ML_Pipeline SHALL implement feature engineering to extract fundamental features from financial statements (P/E ratio, debt-to-equity, revenue growth, profit margins)
3. THE ML_Pipeline SHALL implement sentiment analysis on news articles to generate sentiment scores for each stock
4. THE Feature_Store SHALL store computed features with versioning and timestamps for reproducibility
5. THE ML_Pipeline SHALL support training multiple model types (LSTM, GRU, Transformer, XGBoost, Random Forest) for ensemble predictions
6. THE ML_Pipeline SHALL implement automated model training on a weekly schedule using the latest 5 years of historical data
7. THE ML_Pipeline SHALL split data into training (70%), validation (15%), and test (15%) sets with temporal ordering preserved
8. THE ML_Pipeline SHALL evaluate models using metrics: RMSE, MAE, MAPE, directional accuracy, and Sharpe ratio
9. THE Model_Registry SHALL store trained models with metadata (training_date, features_used, hyperparameters, performance_metrics, version)
10. WHEN a new model achieves 5% better performance than the current production model, THE ML_Pipeline SHALL trigger a model promotion workflow
11. THE Prediction_Service SHALL load models from Model_Registry and serve predictions with latency under 200ms
12. THE Prediction_Service SHALL implement A/B testing to compare predictions from different model versions with 10% traffic split
13. THE ML_Pipeline SHALL implement model monitoring to detect data drift and trigger retraining when prediction accuracy drops below 60%
14. THE ML_Pipeline SHALL generate prediction confidence scores and uncertainty estimates for each prediction
15. THE Prediction_Service SHALL cache predictions in Redis with 1-hour TTL to reduce computation costs

### Requirement 8: Data Ingestion and ETL Pipeline

**User Story:** As a backend engineer, I want automated data pipelines to ingest stock prices, news, and financial data from external sources, so that the platform always has up-to-date information.

#### Acceptance Criteria

1. THE Data_Pipeline SHALL integrate with Third_Party_Providers (NSE API, BSE API, financial data vendors) to fetch real-time stock prices
2. THE Data_Pipeline SHALL fetch stock prices every 1 minute during market hours (9:15 AM - 3:30 PM IST) and every 15 minutes after hours
3. THE Data_Pipeline SHALL fetch end-of-day historical prices daily at 6:00 PM IST
4. THE Data_Pipeline SHALL fetch IPO data from SEBI and stock exchange websites daily at 8:00 AM IST
5. THE Data_Pipeline SHALL aggregate news from multiple sources (RSS feeds, news APIs, web scraping) every 5 minutes
6. THE Data_Pipeline SHALL fetch financial statements quarterly within 24 hours of company earnings releases
7. THE Data_Pipeline SHALL implement data validation to check for missing values, outliers, and data quality issues
8. WHEN data validation fails, THE Data_Pipeline SHALL log errors and send alerts to the monitoring system
9. THE Data_Pipeline SHALL implement idempotent data ingestion to handle duplicate data and retries safely
10. THE Data_Pipeline SHALL transform raw data into normalized formats before storing in databases
11. THE Data_Pipeline SHALL use Message_Queue to decouple data ingestion from processing for fault tolerance
12. THE Data_Pipeline SHALL implement exponential backoff retry logic with maximum 5 attempts when Third_Party_Provider APIs fail
13. THE Data_Pipeline SHALL track data freshness metrics and alert when data is stale beyond 10 minutes during market hours

### Requirement 9: Caching Strategy for Performance Optimization

**User Story:** As a backend engineer, I want multi-layer caching with Redis and CDN, so that the system can serve high-traffic requests with low latency and reduced database load.

#### Acceptance Criteria

1. THE Cache_Layer SHALL implement Redis cluster with master-replica configuration for high availability
2. THE Cache_Layer SHALL cache frequently accessed data: stock prices (1-minute TTL), market indices (30-second TTL), stock lists (5-minute TTL)
3. THE Cache_Layer SHALL cache API responses with cache keys based on endpoint, query parameters, and user permissions
4. THE Cache_Layer SHALL implement cache-aside pattern where services check cache before querying databases
5. WHEN cache misses occur, THE Service SHALL fetch data from database, store in cache, and return to client
6. THE Cache_Layer SHALL implement cache invalidation when underlying data changes (stock price updates, portfolio modifications)
7. THE Cache_Layer SHALL use Redis pub/sub for cache invalidation across multiple service instances
8. THE API_Gateway SHALL implement HTTP caching headers (Cache-Control, ETag, Last-Modified) for client-side caching
9. THE CDN SHALL cache static assets (company logos, charts, images) with 24-hour TTL
10. THE Cache_Layer SHALL implement cache warming for popular stocks during pre-market hours
11. THE Cache_Layer SHALL monitor cache hit rates and alert when hit rate drops below 80%
12. THE Cache_Layer SHALL implement cache compression for large objects to reduce memory usage


### Requirement 10: Message Queue for Asynchronous Processing

**User Story:** As a backend engineer, I want a message queue system for asynchronous task processing, so that long-running operations don't block API responses and the system can handle traffic spikes.

#### Acceptance Criteria

1. THE Message_Queue SHALL implement Apache Kafka for high-throughput event streaming with topics: stock_price_updates, news_ingestion, prediction_requests, email_notifications, audit_logs
2. THE Message_Queue SHALL implement RabbitMQ for task queues with queues: portfolio_calculations, report_generation, data_exports, batch_predictions
3. THE Stock_Service SHALL publish stock price updates to Kafka topic for real-time distribution to WebSocket_Server and Cache_Layer
4. THE News_Service SHALL consume news_ingestion messages, process articles, and store in Primary_DB
5. THE Prediction_Service SHALL consume prediction_requests from queue, generate predictions asynchronously, and publish results
6. THE Message_Queue SHALL implement dead letter queues for failed messages with automatic retry after 5 minutes
7. THE Message_Queue SHALL guarantee at-least-once delivery semantics for critical operations (portfolio updates, transactions)
8. THE Message_Queue SHALL implement message partitioning by stock_symbol to ensure ordered processing per stock
9. THE Message_Queue SHALL implement consumer groups for parallel processing with automatic load balancing
10. WHEN message processing fails 3 times, THE Message_Queue SHALL move message to dead letter queue and alert monitoring system
11. THE Message_Queue SHALL retain messages for 7 days for replay and debugging purposes
12. THE Message_Queue SHALL monitor queue depths and alert when queue size exceeds 10,000 messages

### Requirement 11: Database Query Optimization and Indexing

**User Story:** As a database administrator, I want optimized database queries with proper indexing, so that the system can handle millions of queries per day with sub-second response times.

#### Acceptance Criteria

1. THE Primary_DB SHALL implement B-tree indexes on columns: stocks.symbol, users.email, portfolios.user_id, news_articles.category, ipos.status
2. THE Primary_DB SHALL implement composite indexes on (stock_id, timestamp DESC) for time-series queries
3. THE Primary_DB SHALL implement GIN indexes on JSONB columns for efficient JSON querying
4. THE Primary_DB SHALL implement full-text search indexes on news_articles.title and news_articles.content using PostgreSQL tsvector
5. THE Time_Series_DB SHALL use TimescaleDB hypertables with automatic chunk creation for stock_prices table
6. THE Time_Series_DB SHALL implement continuous aggregates for pre-computed metrics (daily OHLC, weekly averages, monthly statistics)
7. THE Primary_DB SHALL implement materialized views for complex aggregations (sector performance, top gainers/losers) with hourly refresh
8. THE Primary_DB SHALL use connection pooling with minimum 10 and maximum 100 connections per service
9. THE Primary_DB SHALL implement read replicas for read-heavy operations with automatic failover
10. THE Primary_DB SHALL implement query result caching at database level for repeated queries
11. WHEN a query performs full table scan on tables with more than 100,000 rows, THE Monitoring_System SHALL log a warning
12. THE Primary_DB SHALL implement database partitioning for tables exceeding 10 million rows

### Requirement 12: Horizontal Scaling and Load Balancing

**User Story:** As a DevOps engineer, I want horizontal scaling capabilities with load balancing, so that the system can automatically scale to handle millions of concurrent users.

#### Acceptance Criteria

1. THE Load_Balancer SHALL distribute incoming requests across multiple API_Gateway instances using round-robin algorithm
2. THE Load_Balancer SHALL implement health checks every 10 seconds and remove unhealthy instances from rotation
3. THE Load_Balancer SHALL implement sticky sessions for WebSocket connections to maintain connection state
4. THE Backend_System SHALL deploy each microservice with minimum 2 instances for high availability
5. WHEN CPU utilization exceeds 70% for 5 minutes, THE Auto_Scaling_System SHALL add new service instances
6. WHEN CPU utilization drops below 30% for 10 minutes, THE Auto_Scaling_System SHALL remove excess instances
7. THE Backend_System SHALL implement stateless services that can scale horizontally without session affinity
8. THE Backend_System SHALL use Kubernetes for container orchestration with automatic pod scheduling and scaling
9. THE Backend_System SHALL implement circuit breakers to prevent cascading failures when downstream services are unavailable
10. THE Backend_System SHALL implement request timeouts of 30 seconds to prevent resource exhaustion
11. THE Backend_System SHALL implement graceful shutdown to drain connections before terminating instances
12. THE Load_Balancer SHALL support blue-green deployments for zero-downtime updates

### Requirement 13: Monitoring, Logging, and Observability

**User Story:** As a DevOps engineer, I want comprehensive monitoring and logging infrastructure, so that I can detect issues proactively and debug problems quickly.

#### Acceptance Criteria

1. THE Monitoring_System SHALL implement Prometheus for metrics collection with 15-second scrape intervals
2. THE Monitoring_System SHALL implement Grafana dashboards for visualizing metrics: request rates, error rates, latency percentiles, CPU/memory usage, database connections
3. THE Monitoring_System SHALL implement ELK stack (Elasticsearch, Logstash, Kibana) for centralized log aggregation
4. THE Backend_System SHALL log all API requests with fields: timestamp, request_id, user_id, endpoint, method, status_code, response_time, error_message
5. THE Backend_System SHALL implement structured logging in JSON format for machine parsing
6. THE Backend_System SHALL implement distributed tracing using OpenTelemetry to track requests across microservices
7. THE Monitoring_System SHALL implement alerting rules for critical conditions: error rate > 5%, latency p95 > 1000ms, database connection pool exhausted, disk usage > 80%
8. THE Monitoring_System SHALL send alerts via email, Slack, and PagerDuty based on severity levels
9. THE Monitoring_System SHALL implement application performance monitoring (APM) to track slow transactions and database queries
10. THE Monitoring_System SHALL track business metrics: daily active users, API usage per endpoint, prediction accuracy, revenue metrics
11. THE Monitoring_System SHALL implement log retention policy: 7 days hot storage, 90 days cold storage, then deletion
12. THE Monitoring_System SHALL implement uptime monitoring with external health checks every 1 minute


### Requirement 14: Security and Compliance

**User Story:** As a security engineer, I want comprehensive security measures and compliance controls, so that user data is protected and the platform meets financial regulatory requirements.

#### Acceptance Criteria

1. THE Backend_System SHALL encrypt all data in transit using TLS 1.3
2. THE Primary_DB SHALL encrypt all data at rest using AES-256 encryption
3. THE Backend_System SHALL implement input validation and sanitization to prevent SQL injection, XSS, and CSRF attacks
4. THE Backend_System SHALL implement CORS policies to restrict API access to authorized domains
5. THE Backend_System SHALL implement security headers (HSTS, X-Frame-Options, X-Content-Type-Options, CSP)
6. THE Auth_Service SHALL implement multi-factor authentication (MFA) for premium users and admins
7. THE Backend_System SHALL implement API request signing for sensitive operations (portfolio transactions, account changes)
8. THE Backend_System SHALL mask sensitive data in logs (passwords, tokens, credit card numbers, PII)
9. THE Compliance_Module SHALL implement GDPR compliance with user data export and deletion capabilities
10. THE Compliance_Module SHALL implement audit logging for all data access and modifications with immutable logs
11. THE Backend_System SHALL implement rate limiting per user and per IP to prevent abuse and DDoS attacks
12. THE Backend_System SHALL conduct automated security scanning for vulnerabilities in dependencies
13. THE Backend_System SHALL implement secrets management using HashiCorp Vault or AWS Secrets Manager
14. THE Backend_System SHALL implement role-based access control for admin operations with principle of least privilege
15. THE Backend_System SHALL implement data retention policies compliant with financial regulations (7 years for transaction data)

### Requirement 15: CI/CD Pipeline and Deployment Automation

**User Story:** As a DevOps engineer, I want automated CI/CD pipelines for testing and deployment, so that code changes can be deployed safely and quickly to production.

#### Acceptance Criteria

1. THE CI_CD_Pipeline SHALL trigger automated builds on every git push to main branch
2. THE CI_CD_Pipeline SHALL run unit tests with minimum 80% code coverage requirement
3. THE CI_CD_Pipeline SHALL run integration tests against test databases and mock external services
4. THE CI_CD_Pipeline SHALL run static code analysis and linting to enforce code quality standards
5. THE CI_CD_Pipeline SHALL run security scanning for vulnerabilities in dependencies and container images
6. THE CI_CD_Pipeline SHALL build Docker images and push to container registry with semantic versioning tags
7. THE CI_CD_Pipeline SHALL deploy to staging environment automatically after successful builds
8. THE CI_CD_Pipeline SHALL run smoke tests and end-to-end tests in staging environment
9. THE CI_CD_Pipeline SHALL require manual approval for production deployments
10. THE CI_CD_Pipeline SHALL implement blue-green deployment strategy for zero-downtime releases
11. THE CI_CD_Pipeline SHALL implement automatic rollback when health checks fail after deployment
12. THE CI_CD_Pipeline SHALL implement database migration automation with rollback capabilities
13. THE CI_CD_Pipeline SHALL send deployment notifications to team Slack channel with deployment status and changelog
14. THE CI_CD_Pipeline SHALL implement infrastructure as code using Terraform or CloudFormation
15. THE CI_CD_Pipeline SHALL maintain deployment history and artifacts for 90 days

### Requirement 16: Backup and Disaster Recovery

**User Story:** As a database administrator, I want automated backup and disaster recovery procedures, so that data can be restored quickly in case of failures or data corruption.

#### Acceptance Criteria

1. THE Backup_System SHALL create automated full database backups daily at 2:00 AM UTC
2. THE Backup_System SHALL create incremental backups every 6 hours
3. THE Backup_System SHALL store backups in geographically distributed locations (minimum 2 regions)
4. THE Backup_System SHALL encrypt backups using AES-256 encryption
5. THE Backup_System SHALL retain daily backups for 30 days, weekly backups for 90 days, and monthly backups for 1 year
6. THE Backup_System SHALL test backup restoration monthly to verify backup integrity
7. THE Backup_System SHALL implement point-in-time recovery capability with 5-minute granularity
8. THE Backup_System SHALL maintain recovery time objective (RTO) of 1 hour and recovery point objective (RPO) of 5 minutes
9. THE Backup_System SHALL implement automated failover to standby database replicas within 30 seconds
10. THE Backup_System SHALL document disaster recovery procedures with step-by-step runbooks
11. THE Backup_System SHALL conduct disaster recovery drills quarterly to validate procedures
12. THE Backup_System SHALL backup Redis cache state for critical data with 1-hour intervals

### Requirement 17: Third-Party Integration Management

**User Story:** As a backend engineer, I want robust third-party API integration with error handling and fallbacks, so that external service failures don't break the platform.

#### Acceptance Criteria

1. THE Data_Pipeline SHALL integrate with NSE API for real-time stock prices with API key authentication
2. THE Data_Pipeline SHALL integrate with BSE API for stock data with fallback to alternative providers
3. THE News_Service SHALL integrate with news APIs (NewsAPI, Google News, RSS feeds) with aggregation from minimum 5 sources
4. THE Backend_System SHALL implement circuit breaker pattern for third-party API calls with 50% failure threshold
5. WHEN Third_Party_Provider API fails, THE Backend_System SHALL use cached data and mark data as stale
6. THE Backend_System SHALL implement request timeout of 10 seconds for third-party API calls
7. THE Backend_System SHALL implement exponential backoff retry with maximum 3 attempts for failed API calls
8. THE Backend_System SHALL monitor third-party API usage and alert when approaching rate limits
9. THE Backend_System SHALL implement webhook endpoints for receiving real-time data from providers
10. THE Backend_System SHALL validate and sanitize all data received from third-party sources
11. THE Backend_System SHALL maintain service level agreements (SLAs) documentation for each third-party provider
12. THE Backend_System SHALL implement fallback data sources for critical data (stock prices, market indices)


### Requirement 18: Testing Strategy and Quality Assurance

**User Story:** As a QA engineer, I want comprehensive testing coverage across unit, integration, and load testing, so that the platform is reliable and performs well under high traffic.

#### Acceptance Criteria

1. THE Backend_System SHALL implement unit tests for all business logic with minimum 80% code coverage
2. THE Backend_System SHALL implement integration tests for API endpoints with test databases
3. THE Backend_System SHALL implement end-to-end tests for critical user flows (registration, login, portfolio creation, stock search)
4. THE Backend_System SHALL implement load tests simulating 100,000 concurrent users with target response time under 500ms
5. THE Backend_System SHALL implement stress tests to identify system breaking points and bottlenecks
6. THE Backend_System SHALL implement contract tests for API versioning and backward compatibility
7. THE Backend_System SHALL implement property-based tests for data validation and business logic invariants
8. THE Backend_System SHALL implement chaos engineering tests to validate system resilience (random service failures, network latency)
9. THE Backend_System SHALL run automated tests in CI/CD pipeline before every deployment
10. THE Backend_System SHALL implement test data factories for consistent test data generation
11. THE Backend_System SHALL implement API mocking for third-party services in test environments
12. THE Backend_System SHALL maintain test documentation with test scenarios and expected outcomes

### Requirement 19: Portfolio Management Service

**User Story:** As a user, I want to manage my stock portfolio with real-time performance tracking, so that I can monitor my investments and make informed decisions.

#### Acceptance Criteria

1. THE Portfolio_Service SHALL allow users to create multiple portfolios with unique names
2. THE Portfolio_Service SHALL allow users to add holdings with fields: stock_symbol, quantity, purchase_price, purchase_date
3. THE Portfolio_Service SHALL calculate portfolio metrics: total_value, total_investment, profit_loss, profit_loss_percentage, day_change
4. THE Portfolio_Service SHALL calculate holding-level metrics: current_value, invested_value, profit_loss, profit_loss_percentage, day_change
5. THE Portfolio_Service SHALL update portfolio values in real-time when stock prices change
6. THE Portfolio_Service SHALL track historical portfolio performance with daily snapshots
7. THE Portfolio_Service SHALL implement watchlists for tracking stocks without ownership
8. THE Portfolio_Service SHALL implement price alerts with conditions: price_above, price_below, percentage_change
9. WHEN alert conditions are met, THE Portfolio_Service SHALL send notifications via email and push notifications
10. THE Portfolio_Service SHALL generate portfolio reports with charts and performance analytics
11. THE Portfolio_Service SHALL implement portfolio sharing with read-only access for other users
12. THE Portfolio_Service SHALL validate stock symbols before adding holdings and reject invalid symbols

### Requirement 20: Company Profile and Financial Data Service

**User Story:** As a user, I want detailed company profiles with financial statements and peer comparisons, so that I can perform fundamental analysis before investing.

#### Acceptance Criteria

1. THE Stock_Service SHALL provide company profiles with fields: company_name, sector, industry, market_cap, description, website, headquarters, founded_year, employees
2. THE Stock_Service SHALL provide financial statements: income_statement, balance_sheet, cash_flow_statement with quarterly and annual data
3. THE Stock_Service SHALL calculate financial ratios: P/E, P/B, debt_to_equity, current_ratio, ROE, ROA, profit_margin, revenue_growth
4. THE Stock_Service SHALL provide management team information with fields: name, designation, experience, education
5. THE Stock_Service SHALL provide peer comparison with metrics: market_cap, P/E, revenue, profit_margin for companies in same sector
6. THE Stock_Service SHALL provide analyst target prices with fields: analyst_name, target_price, rating, date
7. THE Stock_Service SHALL provide dividend history with fields: ex_date, dividend_amount, dividend_yield
8. THE Stock_Service SHALL provide corporate actions: stock splits, bonus issues, rights issues with dates and ratios
9. THE Stock_Service SHALL provide shareholding patterns: promoter_holding, institutional_holding, retail_holding with quarterly updates
10. THE Stock_Service SHALL cache company profile data with 24-hour TTL to reduce database load

### Requirement 21: News Aggregation and Sentiment Analysis

**User Story:** As a user, I want aggregated financial news with sentiment analysis, so that I can stay informed about market trends and company developments.

#### Acceptance Criteria

1. THE News_Service SHALL aggregate news from minimum 10 sources including financial websites, RSS feeds, and news APIs
2. THE News_Service SHALL categorize news into categories: companies, markets, economy, IPOs, commodities, global, regulatory
3. THE News_Service SHALL extract entities from news articles: company_names, stock_symbols, people, locations
4. THE News_Service SHALL implement sentiment analysis to classify articles as positive, negative, or neutral with confidence scores
5. THE News_Service SHALL calculate stock-specific sentiment scores based on related news articles
6. THE News_Service SHALL implement trending news detection based on article frequency and engagement metrics
7. THE News_Service SHALL implement news deduplication to remove duplicate articles from different sources
8. THE News_Service SHALL provide news search with full-text search on title and content
9. THE News_Service SHALL implement news alerts for user-selected stocks and keywords
10. THE News_Service SHALL provide news feed with pagination and filtering by category, date, and sentiment
11. THE News_Service SHALL extract and display article images with fallback to default images
12. THE News_Service SHALL track news article views and engagement for trending calculation


### Requirement 22: IPO Tracking and Management

**User Story:** As a user, I want comprehensive IPO tracking with bidding information and listing performance, so that I can participate in IPOs and track their performance.

#### Acceptance Criteria

1. THE IPO_Service SHALL track IPOs with fields: company_name, symbol, issue_size, price_range, bidding_start_date, bidding_end_date, listing_date, lot_size, issue_type
2. THE IPO_Service SHALL categorize IPOs by status: upcoming, current, closed, listed
3. THE IPO_Service SHALL provide subscription status with category-wise data: QIB, NII, retail with subscription multiples
4. THE IPO_Service SHALL calculate listing gains with formula: ((listing_price - issue_price) / issue_price) * 100
5. THE IPO_Service SHALL provide IPO documents: RHP, DRHP with download links
6. THE IPO_Service SHALL provide IPO timeline with key dates: announcement, bidding period, allotment, listing
7. THE IPO_Service SHALL implement IPO alerts for bidding start, bidding end, and listing dates
8. THE IPO_Service SHALL provide IPO analysis with fields: grey_market_premium, analyst_recommendations, subscription_expectations
9. THE IPO_Service SHALL track SME IPOs separately with is_sme flag
10. THE IPO_Service SHALL provide historical IPO performance data for analysis
11. THE IPO_Service SHALL integrate with registrar websites for allotment status checking
12. THE IPO_Service SHALL cache IPO data with 1-hour TTL during bidding period and 24-hour TTL otherwise

### Requirement 23: Market Indices and Sector Performance

**User Story:** As a user, I want real-time market indices and sector performance tracking, so that I can understand overall market trends and sector rotations.

#### Acceptance Criteria

1. THE Market_Service SHALL track major indices: NIFTY 50, SENSEX, NIFTY Bank, NIFTY IT, NIFTY Pharma, NIFTY Auto with real-time updates
2. THE Market_Service SHALL provide index data with fields: current_value, day_change, day_change_percentage, day_high, day_low, open, previous_close
3. THE Market_Service SHALL calculate sector performance with aggregated metrics from constituent stocks
4. THE Market_Service SHALL provide sector-wise top gainers and losers
5. THE Market_Service SHALL track market breadth indicators: advances, declines, unchanged, 52-week highs, 52-week lows
6. THE Market_Service SHALL provide market sentiment indicators: VIX, put-call ratio, FII/DII activity
7. THE Market_Service SHALL track global indices: Dow Jones, NASDAQ, S&P 500, Nikkei, Hang Seng for correlation analysis
8. THE Market_Service SHALL provide historical index data for charting and analysis
9. THE Market_Service SHALL calculate index returns: 1-day, 1-week, 1-month, 3-month, 6-month, 1-year, 5-year
10. THE Market_Service SHALL broadcast index updates via WebSocket every 1 second during market hours
11. THE Market_Service SHALL cache index data with 30-second TTL for API responses

### Requirement 24: Commodities Tracking

**User Story:** As a user, I want to track commodity prices including gold, silver, and crude oil, so that I can diversify my investment analysis beyond equities.

#### Acceptance Criteria

1. THE Market_Service SHALL track commodities: gold, silver, crude oil, natural gas, copper with real-time prices
2. THE Market_Service SHALL provide commodity data with fields: current_price, day_change, day_change_percentage, unit (per gram, per barrel)
3. THE Market_Service SHALL provide historical commodity prices for charting
4. THE Market_Service SHALL track currency exchange rates: USD/INR, EUR/INR, GBP/INR
5. THE Market_Service SHALL provide commodity price alerts with user-defined thresholds
6. THE Market_Service SHALL integrate with commodity data providers for accurate pricing
7. THE Market_Service SHALL cache commodity data with 5-minute TTL

### Requirement 25: Search and Filtering Capabilities

**User Story:** As a user, I want powerful search and filtering for stocks, so that I can quickly find investment opportunities matching my criteria.

#### Acceptance Criteria

1. THE Stock_Service SHALL implement full-text search on stock symbols and company names with autocomplete
2. THE Stock_Service SHALL provide search results within 100ms for queries
3. THE Stock_Service SHALL implement filters: sector, market_cap_range, price_range, volume_range, P/E_range, dividend_yield_range
4. THE Stock_Service SHALL implement sorting: price, market_cap, volume, day_change_percentage, P/E_ratio
5. THE Stock_Service SHALL implement stock screeners with predefined criteria: top_gainers, top_losers, most_active, 52_week_high, 52_week_low, high_dividend_yield
6. THE Stock_Service SHALL implement custom screener with user-defined criteria combinations
7. THE Stock_Service SHALL provide search suggestions based on user search history
8. THE Stock_Service SHALL implement fuzzy search to handle typos and partial matches
9. THE Stock_Service SHALL cache search results with 5-minute TTL
10. THE Stock_Service SHALL track popular searches for analytics

### Requirement 26: Technical Analysis and Charting Data

**User Story:** As a user, I want technical indicators and charting data, so that I can perform technical analysis for trading decisions.

#### Acceptance Criteria

1. THE Stock_Service SHALL provide OHLCV data (open, high, low, close, volume) with multiple timeframes: 1-minute, 5-minute, 15-minute, 1-hour, 1-day, 1-week, 1-month
2. THE Stock_Service SHALL calculate technical indicators: SMA (20, 50, 200), EMA (12, 26), RSI (14), MACD, Bollinger Bands, Stochastic Oscillator
3. THE Stock_Service SHALL provide candlestick pattern detection: doji, hammer, shooting star, engulfing patterns
4. THE Stock_Service SHALL provide support and resistance levels based on historical price action
5. THE Stock_Service SHALL provide volume analysis with volume moving averages
6. THE Stock_Service SHALL provide pivot points for intraday trading
7. THE Stock_Service SHALL cache technical indicator calculations with 1-minute TTL
8. THE Stock_Service SHALL pre-calculate indicators for popular stocks to reduce latency
9. THE Stock_Service SHALL provide chart data in formats compatible with Chart.js and Recharts libraries


### Requirement 27: Admin Dashboard and Management

**User Story:** As an admin, I want a comprehensive admin dashboard for system management, so that I can monitor platform health, manage users, and configure system settings.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide user management with capabilities: view users, suspend users, reset passwords, manage roles
2. THE Admin_Dashboard SHALL provide system health monitoring with real-time metrics: active users, API requests per minute, error rates, database connections
3. THE Admin_Dashboard SHALL provide content moderation for user-generated content and comments
4. THE Admin_Dashboard SHALL provide configuration management for system settings: rate limits, cache TTLs, feature flags
5. THE Admin_Dashboard SHALL provide audit logs viewer with filtering by user, action, date range
6. THE Admin_Dashboard SHALL provide data management tools: manual data refresh, cache invalidation, database maintenance
7. THE Admin_Dashboard SHALL provide analytics dashboard with business metrics: user growth, engagement, revenue, popular stocks
8. THE Admin_Dashboard SHALL implement role-based access control with granular permissions
9. THE Admin_Dashboard SHALL provide API key management for third-party integrations
10. THE Admin_Dashboard SHALL provide notification management for sending platform-wide announcements

### Requirement 28: Learning Resources Management

**User Story:** As a user, I want access to educational content about stock market investing, so that I can improve my investment knowledge and skills.

#### Acceptance Criteria

1. THE Content_Service SHALL provide learning resources with categories: basics, technical_analysis, fundamental_analysis, options_trading, risk_management
2. THE Content_Service SHALL provide articles, videos, and tutorials with rich media content
3. THE Content_Service SHALL implement content search and filtering by category, difficulty level, and topic
4. THE Content_Service SHALL track user progress through learning modules
5. THE Content_Service SHALL provide quizzes and assessments to test knowledge
6. THE Content_Service SHALL implement content recommendations based on user interests and portfolio
7. THE Content_Service SHALL provide glossary of financial terms with definitions
8. THE Content_Service SHALL cache learning content with 24-hour TTL

### Requirement 29: Notification System

**User Story:** As a user, I want timely notifications for price alerts, news, and portfolio updates, so that I don't miss important market events.

#### Acceptance Criteria

1. THE Notification_Service SHALL support notification channels: email, push notifications, SMS, in-app notifications
2. THE Notification_Service SHALL send price alert notifications when user-defined conditions are met
3. THE Notification_Service SHALL send news alert notifications for followed stocks and keywords
4. THE Notification_Service SHALL send portfolio update notifications for significant changes (>5% day change)
5. THE Notification_Service SHALL send IPO alert notifications for bidding dates and listings
6. THE Notification_Service SHALL implement notification preferences with user-configurable settings per notification type
7. THE Notification_Service SHALL implement notification batching to avoid overwhelming users with multiple notifications
8. THE Notification_Service SHALL implement notification delivery tracking with read/unread status
9. THE Notification_Service SHALL implement notification history with 90-day retention
10. THE Notification_Service SHALL use Message_Queue for asynchronous notification delivery
11. THE Notification_Service SHALL implement notification templates for consistent formatting
12. THE Notification_Service SHALL respect quiet hours and do-not-disturb settings

### Requirement 30: 2-Year Phased Implementation Roadmap

**User Story:** As a project manager, I want a detailed 2-year implementation roadmap, so that the team can execute the platform development in manageable phases with clear milestones.

#### Acceptance Criteria

1. THE Implementation_Plan SHALL define Phase 1 (Months 1-6) with deliverables: core backend architecture, database schema, authentication system, basic stock data APIs, deployment infrastructure
2. THE Implementation_Plan SHALL define Phase 1 milestones: Month 1 - architecture design and setup, Month 2 - database implementation, Month 3 - authentication and user management, Month 4 - stock data APIs, Month 5 - market indices and IPO APIs, Month 6 - testing and staging deployment
3. THE Implementation_Plan SHALL define Phase 2 (Months 7-12) with deliverables: portfolio management, news aggregation, WebSocket real-time data, advanced search, technical indicators, admin dashboard
4. THE Implementation_Plan SHALL define Phase 2 milestones: Month 7 - portfolio service, Month 8 - news service and sentiment analysis, Month 9 - WebSocket implementation, Month 10 - technical analysis features, Month 11 - admin dashboard, Month 12 - performance optimization and production launch
5. THE Implementation_Plan SHALL define Phase 3 (Months 13-18) with deliverables: ML prediction pipeline, feature engineering, model training infrastructure, prediction APIs, A/B testing framework, notification system
6. THE Implementation_Plan SHALL define Phase 3 milestones: Month 13 - ML infrastructure setup, Month 14 - feature engineering, Month 15 - model training and evaluation, Month 16 - prediction service deployment, Month 17 - A/B testing and optimization, Month 18 - notification system
7. THE Implementation_Plan SHALL define Phase 4 (Months 19-24) with deliverables: advanced scaling, performance optimization, mobile app backend, premium features, analytics platform, international expansion preparation
8. THE Implementation_Plan SHALL define Phase 4 milestones: Month 19 - horizontal scaling implementation, Month 20 - caching optimization, Month 21 - mobile app APIs, Month 22 - premium features and monetization, Month 23 - analytics and reporting, Month 24 - international market support
9. THE Implementation_Plan SHALL define success metrics for each phase: Phase 1 - 10,000 users, Phase 2 - 100,000 users, Phase 3 - 500,000 users, Phase 4 - 2,000,000 users
10. THE Implementation_Plan SHALL define performance targets: Phase 1 - 1000 req/sec, Phase 2 - 10,000 req/sec, Phase 3 - 50,000 req/sec, Phase 4 - 200,000 req/sec
11. THE Implementation_Plan SHALL allocate team resources: Phase 1 - 5 engineers, Phase 2 - 8 engineers, Phase 3 - 12 engineers, Phase 4 - 15 engineers
12. THE Implementation_Plan SHALL define risk mitigation strategies for each phase with contingency plans

## Verbatim Source B 2-Year Implementation Roadmap

## 2-Year Implementation Roadmap

### Phase 1: Foundation (Months 1-6)

**Objective**: Build core backend infrastructure and basic functionality

#### Month 1: Architecture Design and Setup
- Finalize microservices architecture design
- Set up development environment and tooling
- Initialize Git repositories and CI/CD pipelines
- Set up cloud infrastructure (Kubernetes cluster, databases)
- Configure monitoring and logging infrastructure
- Team onboarding and training

**Deliverables**: Architecture documentation, development environment, CI/CD pipeline

#### Month 2: Database Implementation
- Design and implement PostgreSQL schema
- Set up TimescaleDB for time-series data
- Implement database migrations framework
- Set up Redis cluster for caching
- Create database seed data for testing
- Implement backup and recovery procedures

**Deliverables**: Complete database schema, migration scripts, backup system

#### Month 3: Authentication and User Management
- Implement Auth Service with JWT authentication
- Implement user registration and login
- Implement OAuth 2.0 integration (Google, Facebook)
- Implement role-based access control
- Implement session management with Redis
- Implement password reset and email verification

**Deliverables**: Fully functional authentication system, user management APIs

#### Month 4: Stock Data APIs
- Implement Stock Service microservice
- Integrate with NSE/BSE APIs for stock data
- Implement stock listing and details endpoints
- Implement stock price endpoints (current, historical)
- Implement stock search functionality
- Set up data ingestion pipeline for stock prices
- Implement caching for stock data

**Deliverables**: Stock Service with complete API endpoints, data ingestion pipeline

#### Month 5: Market Indices and IPO APIs
- Implement Market Service for indices and sectors
- Implement IPO Service for IPO tracking
- Integrate with market data providers
- Implement real-time index updates
- Implement IPO listing and subscription tracking
- Set up data ingestion for IPO data

**Deliverables**: Market Service and IPO Service with complete APIs

#### Month 6: Testing and Staging Deployment
- Comprehensive unit and integration testing
- Load testing with 1,000 concurrent users
- Security testing and vulnerability scanning
- Performance optimization
- Deploy to staging environment
- User acceptance testing
- Documentation completion

**Deliverables**: Tested and deployed staging environment, complete API documentation

**Success Metrics**: 10,000 registered users, 1,000 req/sec throughput, 99% uptime

---

### Phase 2: Core Features (Months 7-12)

**Objective**: Implement user-facing features and real-time capabilities

#### Month 7: Portfolio Management
- Implement Portfolio Service microservice
- Implement portfolio CRUD operations
- Implement holdings management
- Implement portfolio performance calculations
- Implement real-time portfolio value updates
- Implement portfolio snapshots for historical tracking

**Deliverables**: Complete portfolio management system

#### Month 8: News Service and Sentiment Analysis
- Implement News Service microservice
- Integrate with multiple news sources (APIs, RSS feeds)
- Implement news aggregation and deduplication
- Implement sentiment analysis using NLP
- Implement news categorization and entity extraction
- Implement news search with Elasticsearch
- Implement trending news detection

**Deliverables**: News aggregation system with sentiment analysis

#### Month 9: WebSocket Real-Time Data
- Implement WebSocket Service
- Implement real-time stock price streaming
- Implement real-time index updates
- Implement subscription management
- Integrate with Kafka for event streaming
- Implement connection management and scaling
- Load testing with 10,000 concurrent WebSocket connections

**Deliverables**: Real-time data streaming via WebSocket

#### Month 10: Technical Analysis Features
- Implement technical indicator calculations (SMA, EMA, RSI, MACD)
- Implement candlestick pattern detection
- Implement support/resistance level detection
- Implement charting data endpoints
- Optimize indicator calculations with caching
- Pre-calculate indicators for popular stocks

**Deliverables**: Complete technical analysis capabilities

#### Month 11: Admin Dashboard
- Implement admin authentication and authorization
- Implement user management interface
- Implement system health monitoring dashboard
- Implement content moderation tools
- Implement configuration management
- Implement audit log viewer
- Implement analytics dashboard

**Deliverables**: Fully functional admin dashboard

#### Month 12: Performance Optimization and Production Launch
- Database query optimization and indexing
- Implement advanced caching strategies
- Horizontal scaling implementation
- Load testing with 10,000 concurrent users
- Security hardening and penetration testing
- Production deployment
- Marketing and user acquisition campaign
- 24/7 monitoring and on-call setup

**Deliverables**: Production-ready platform with 100,000 users

**Success Metrics**: 100,000 registered users, 10,000 req/sec throughput, 99.9% uptime

---

### Phase 3: ML & Predictions (Months 13-18)

**Objective**: Implement machine learning pipeline and stock predictions

#### Month 13: ML Infrastructure Setup
- Set up ML training infrastructure (GPU instances)
- Implement Feature Store for ML features
- Implement Model Registry with MLflow
- Set up data pipeline for ML training data
- Implement feature versioning and tracking
- Set up experiment tracking

**Deliverables**: Complete ML infrastructure

#### Month 14: Feature Engineering
- Implement technical feature extraction (indicators, patterns)
- Implement fundamental feature extraction (financial ratios)
- Implement sentiment feature extraction from news
- Implement feature transformation and normalization
- Implement feature selection and importance analysis
- Create training datasets with 5 years of historical data

**Deliverables**: Comprehensive feature engineering pipeline

#### Month 15: Model Training and Evaluation
- Implement LSTM model for time-series prediction
- Implement Transformer model for sequence modeling
- Implement XGBoost for ensemble predictions
- Implement model training pipeline with hyperparameter tuning
- Implement model evaluation with multiple metrics
- Implement backtesting framework
- Train models on historical data

**Deliverables**: Trained ML models with performance metrics

#### Month 16: Prediction Service Deployment
- Implement Prediction Service microservice
- Implement model loading and inference
- Implement prediction caching
- Implement batch prediction endpoints
- Integrate predictions with frontend
- Implement prediction confidence scores
- Deploy models to production

**Deliverables**: Production prediction service

#### Month 17: A/B Testing and Optimization
- Implement A/B testing framework
- Deploy multiple model versions
- Implement traffic splitting for A/B tests
- Collect user feedback on predictions
- Implement model monitoring and drift detection
- Optimize model inference latency
- Retrain models with latest data

**Deliverables**: Optimized prediction system with A/B testing

#### Month 18: Notification System
- Implement Notification Service
- Implement email notifications
- Implement push notifications
- Implement SMS notifications
- Implement price alerts
- Implement news alerts
- Implement portfolio alerts
- Implement notification preferences

**Deliverables**: Complete notification system

**Success Metrics**: 500,000 registered users, 50,000 req/sec throughput, 65% prediction accuracy

---

### Phase 4: Scale & Optimize (Months 19-24)

**Objective**: Scale to millions of users and optimize for performance

#### Month 19: Horizontal Scaling Implementation
- Implement auto-scaling for all microservices
- Implement database read replicas
- Implement database sharding for large tables
- Implement multi-region deployment
- Implement global load balancing
- Optimize Kubernetes resource allocation
- Load testing with 100,000 concurrent users

**Deliverables**: Horizontally scalable infrastructure

#### Month 20: Advanced Caching Optimization
- Implement CDN for static assets
- Implement edge caching for API responses
- Implement cache warming strategies
- Implement intelligent cache invalidation
- Optimize Redis cluster configuration
- Implement cache compression
- Achieve 90%+ cache hit rate

**Deliverables**: Optimized caching layer

#### Month 21: Mobile App Backend APIs
- Design mobile-optimized API endpoints
- Implement GraphQL for flexible queries
- Implement mobile push notification infrastructure
- Implement mobile-specific authentication (biometric)
- Implement offline sync capabilities
- Optimize payload sizes for mobile
- Implement mobile analytics

**Deliverables**: Mobile-optimized backend APIs

#### Month 22: Premium Features and Monetization
- Implement subscription management
- Implement payment gateway integration
- Implement premium feature access control
- Implement advanced analytics for premium users
- Implement custom alerts and notifications
- Implement portfolio analytics and reports
- Implement API access for developers

**Deliverables**: Premium features and monetization system

#### Month 23: Analytics and Reporting Platform
- Implement data warehouse for analytics
- Implement ETL pipeline for analytics data
- Implement business intelligence dashboards
- Implement user behavior analytics
- Implement revenue analytics
- Implement prediction performance analytics
- Implement custom report generation

**Deliverables**: Complete analytics platform

#### Month 24: International Expansion Preparation
- Implement multi-currency support
- Implement internationalization (i18n)
- Integrate with international stock exchanges
- Implement regional compliance requirements
- Implement multi-language support
- Optimize for global latency
- Set up international payment gateways

**Deliverables**: Platform ready for international markets

**Success Metrics**: 2,000,000 registered users, 200,000 req/sec throughput, 99.95% uptime, $10M+ ARR

---

## Full Source A (Complete Copy for Traceability)

# 📈 STOCK SENSE — MULTIBILLION DOLLAR MASTER PLAN
### Complete Backend Architecture, Database Design, API Specs, ML/AI Prediction Engine & 2-Year Phase Roadmap

> **Vision**: Build the Bloomberg Terminal of India — a predictive, AI-first stock intelligence platform for 1.4 billion people.  
> **Target**: ₹10,000 Cr+ valuation | 10M+ users | Real-time stock prediction at scale

---

## TABLE OF CONTENTS

1. [Frontend Analysis & What Backend Must Power](#1-frontend-analysis)
2. [Tech Stack Decision](#2-tech-stack)
3. [Complete Folder Structure](#3-folder-structure)
4. [Database Design — PostgreSQL + TimescaleDB](#4-database-design)
5. [Core Modules & Business Logic](#5-core-modules)
6. [Complete API Specification](#6-api-specification)
7. [ML/AI Prediction Engine](#7-ml-prediction-engine)
8. [Real-Time Infrastructure](#8-real-time-infrastructure)
9. [Caching & Optimization Strategy](#9-caching-optimization)
10. [Security Architecture](#10-security)
11. [DevOps & Infrastructure](#11-devops)
12. [Monetization Architecture](#12-monetization)
13. [2-Year Phase Roadmap — Step by Step](#13-roadmap)

---

## 1. FRONTEND ANALYSIS — WHAT THE BACKEND MUST POWER

After analyzing Stock Sense's frontend, these are ALL the modules and their exact backend requirements:

### Module 1: Market Overview & Live Indices
- Live Sensex, Nifty 50, Nifty Bank, Nifty IT, Nifty FMCG ticks
- Advance/Decline ratio, Market Breadth, VWAP
- **Requires**: WebSocket server, tick aggregation, TimescaleDB hypertable

### Module 2: Stock Detail Page (Per Symbol)
- Real-time price, OHLCV, circuit limits
- 52-week high/low, Beta, Volatility
- **Requires**: Stock quotes API, price history API with time-series data

### Module 3: Technical Analysis (15+ Indicators)
- RSI, MACD, Bollinger Bands, EMA/SMA (20/50/200), Stochastic, ATR, OBV
- Support/Resistance auto-detection, Chart patterns
- **Requires**: TA computation engine (Python/TA-Lib), precomputed indicator cache

### Module 4: Fundamental Analysis
- P/E, P/B, ROE, ROCE, Debt-to-Equity, EPS Growth
- Quarterly/Annual financial statements (Income, Balance Sheet, Cash Flow)
- **Requires**: Financial statements schema, ratio computation, earnings calendar

### Module 5: Peer Comparison
- Industry benchmarking against 5-10 peers
- Sector averages computation
- **Requires**: Sector/industry taxonomy, aggregation queries

### Module 6: Institutional Intelligence (FII/DII)
- Daily FII/DII net buy/sell flows
- Block deals > ₹5Cr tracking
- Mutual fund holdings (top 10 holders per stock)
- Insider/promoter transactions
- **Requires**: FII_DII_flows table, block_deals table, mf_holdings table, insider_trades table

### Module 7: IPO Intelligence
- Upcoming IPO calendar, lot size, price band, GMP
- Subscription data (retail/QIB/NII), allotment tracking
- Post-listing performance
- **Requires**: ipos table, ipo_subscription table, ipo_performance table

### Module 8: Portfolio Management
- Multi-portfolio, buy/sell transaction tracking
- P&L, XIRR, portfolio beta, sector allocation
- **Requires**: portfolios, portfolio_holdings, transactions tables

### Module 9: Price Alerts
- Target price alerts, % move alerts, volume spike alerts
- **Requires**: price_alerts table, notification queue, alert evaluation engine

### Module 10: News & Sentiment
- Real-time financial news per stock and market-wide
- AI sentiment scoring (positive/negative/neutral)
- News impact on price correlation
- **Requires**: news_articles table, sentiment_scores, NLP pipeline

### Module 11: Social Sentiment
- Twitter/Reddit/StockTwits sentiment aggregation
- Fear & Greed Index computation
- **Requires**: social_sentiment table, ML sentiment classifier

### Module 12: Stock Prediction Engine (FINAL GOAL)
- Price prediction (1D, 1W, 1M horizon)
- Confidence intervals, feature importance
- **Requires**: ML model serving infrastructure, feature store, prediction_logs table

### Module 13: Authentication & User Management
- JWT + OAuth (Google), subscription tiers
- **Requires**: users, sessions, subscriptions tables

### Module 14: Watchlists
- Multiple watchlists, drag-to-reorder
- **Requires**: watchlists, watchlist_items tables

### Module 15: Options & Derivatives (Phase 2)
- OI, PCR, Max Pain, Options Chain
- **Requires**: options_chain table, oi_analysis

---

## 2. TECH STACK DECISION

### Backend Runtime
```
Runtime:         Node.js 20 LTS (Primary API)
ML/AI Engine:    Python 3.11 (FastAPI — prediction microservice)
Task Queue:      Python Celery (data ingestion workers)
```

### Databases
```
Primary DB:      PostgreSQL 16 + TimescaleDB 2.x extension
  → TimescaleDB: YES — ABSOLUTELY REQUIRED
  → Why: Stock price data is pure time-series. TimescaleDB gives:
         - Automatic time partitioning (chunks by day/week)
         - 10-100x faster time-range queries vs plain Postgres
         - Continuous aggregates (pre-computed OHLCV candles)
         - Data retention policies (auto-compress old data)
         - Built on Postgres so all SQL/joins work normally

Cache:           Redis 7 (Upstash for managed)
Search:          Elasticsearch 8 (for stock/company full-text search)
Message Broker:  Apache Kafka (real-time tick streaming)
Object Store:    AWS S3 (model artifacts, CSV exports)
```

### API Layer
```
REST API:        Express.js + TypeScript (Node.js)
ML API:          FastAPI (Python)
GraphQL:         Apollo Server (for complex nested queries)
WebSocket:       Socket.io + Redis adapter (horizontal scaling)
API Gateway:     Kong / AWS API Gateway
```

### ML/AI Stack
```
Data Science:    pandas, numpy, scipy
ML Models:       scikit-learn, XGBoost, LightGBM, Prophet
Deep Learning:   PyTorch (LSTM, Transformer models)
NLP:             HuggingFace transformers (FinBERT for sentiment)
Feature Store:   Feast (open-source)
Model Registry:  MLflow
Experiment:      Weights & Biases (W&B)
```

### Infrastructure
```
Cloud:           AWS (primary) + GCP (ML workloads)
Container:       Docker + Kubernetes (EKS)
CI/CD:           GitHub Actions → ArgoCD
Monitoring:      Prometheus + Grafana + Datadog
Logging:         ELK Stack (Elasticsearch + Logstash + Kibana)
CDN:             CloudFront
```

---

## 3. COMPLETE FOLDER STRUCTURE

```
stocksense-backend/
│
├── apps/                              # Monorepo applications
│   ├── api/                           # Main Node.js REST API
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── database.ts        # Postgres connection pool
│   │   │   │   ├── redis.ts           # Redis client config
│   │   │   │   ├── kafka.ts           # Kafka producer/consumer
│   │   │   │   ├── elasticsearch.ts   # ES client
│   │   │   │   └── env.ts             # Env validation (zod)
│   │   │   │
│   │   │   ├── modules/               # Feature modules (domain-driven)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.middleware.ts
│   │   │   │   │   ├── auth.schema.ts
│   │   │   │   │   └── strategies/
│   │   │   │   │       ├── jwt.strategy.ts
│   │   │   │   │       └── google.strategy.ts
│   │   │   │   │
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.routes.ts
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   ├── users.repository.ts
│   │   │   │   │   └── users.schema.ts
│   │   │   │   │
│   │   │   │   ├── stocks/
│   │   │   │   │   ├── stocks.routes.ts
│   │   │   │   │   ├── stocks.controller.ts
│   │   │   │   │   ├── stocks.service.ts
│   │   │   │   │   ├── stocks.repository.ts
│   │   │   │   │   ├── stocks.schema.ts
│   │   │   │   │   └── stocks.types.ts
│   │   │   │   │
│   │   │   │   ├── market/
│   │   │   │   │   ├── market.routes.ts
│   │   │   │   │   ├── market.controller.ts
│   │   │   │   │   ├── market.service.ts
│   │   │   │   │   ├── market.repository.ts
│   │   │   │   │   └── indices.service.ts
│   │   │   │   │
│   │   │   │   ├── technical/
│   │   │   │   │   ├── technical.routes.ts
│   │   │   │   │   ├── technical.controller.ts
│   │   │   │   │   ├── technical.service.ts
│   │   │   │   │   ├── indicators/
│   │   │   │   │   │   ├── rsi.ts
│   │   │   │   │   │   ├── macd.ts
│   │   │   │   │   │   ├── bollinger.ts
│   │   │   │   │   │   ├── movingAverages.ts
│   │   │   │   │   │   ├── stochastic.ts
│   │   │   │   │   │   ├── atr.ts
│   │   │   │   │   │   ├── obv.ts
│   │   │   │   │   │   ├── vwap.ts
│   │   │   │   │   │   └── supertrend.ts
│   │   │   │   │   └── patterns/
│   │   │   │   │       ├── candlePatterns.ts
│   │   │   │   │       └── chartPatterns.ts
│   │   │   │   │
│   │   │   │   ├── fundamental/
│   │   │   │   │   ├── fundamental.routes.ts
│   │   │   │   │   ├── fundamental.controller.ts
│   │   │   │   │   ├── fundamental.service.ts
│   │   │   │   │   ├── ratios.service.ts
│   │   │   │   │   └── screener.service.ts
│   │   │   │   │
│   │   │   │   ├── institutional/
│   │   │   │   │   ├── institutional.routes.ts
│   │   │   │   │   ├── institutional.controller.ts
│   │   │   │   │   ├── fii_dii.service.ts
│   │   │   │   │   ├── blockDeals.service.ts
│   │   │   │   │   ├── mutualFunds.service.ts
│   │   │   │   │   └── insiderTrading.service.ts
│   │   │   │   │
│   │   │   │   ├── ipo/
│   │   │   │   │   ├── ipo.routes.ts
│   │   │   │   │   ├── ipo.controller.ts
│   │   │   │   │   ├── ipo.service.ts
│   │   │   │   │   └── ipo.repository.ts
│   │   │   │   │
│   │   │   │   ├── portfolio/
│   │   │   │   │   ├── portfolio.routes.ts
│   │   │   │   │   ├── portfolio.controller.ts
│   │   │   │   │   ├── portfolio.service.ts
│   │   │   │   │   ├── portfolio.repository.ts
│   │   │   │   │   ├── pnl.service.ts
│   │   │   │   │   └── xirr.service.ts
│   │   │   │   │
│   │   │   │   ├── alerts/
│   │   │   │   │   ├── alerts.routes.ts
│   │   │   │   │   ├── alerts.controller.ts
│   │   │   │   │   ├── alerts.service.ts
│   │   │   │   │   └── alertEvaluator.service.ts
│   │   │   │   │
│   │   │   │   ├── news/
│   │   │   │   │   ├── news.routes.ts
│   │   │   │   │   ├── news.controller.ts
│   │   │   │   │   ├── news.service.ts
│   │   │   │   │   └── news.repository.ts
│   │   │   │   │
│   │   │   │   ├── sentiment/
│   │   │   │   │   ├── sentiment.routes.ts
│   │   │   │   │   ├── sentiment.controller.ts
│   │   │   │   │   ├── sentiment.service.ts
│   │   │   │   │   └── fearGreed.service.ts
│   │   │   │   │
│   │   │   │   ├── predictions/
│   │   │   │   │   ├── predictions.routes.ts
│   │   │   │   │   ├── predictions.controller.ts
│   │   │   │   │   ├── predictions.service.ts
│   │   │   │   │   └── predictions.repository.ts
│   │   │   │   │
│   │   │   │   ├── watchlist/
│   │   │   │   │   ├── watchlist.routes.ts
│   │   │   │   │   ├── watchlist.controller.ts
│   │   │   │   │   └── watchlist.service.ts
│   │   │   │   │
│   │   │   │   ├── screener/
│   │   │   │   │   ├── screener.routes.ts
│   │   │   │   │   ├── screener.controller.ts
│   │   │   │   │   └── screener.service.ts
│   │   │   │   │
│   │   │   │   ├── options/
│   │   │   │   │   ├── options.routes.ts
│   │   │   │   │   ├── options.controller.ts
│   │   │   │   │   ├── optionsChain.service.ts
│   │   │   │   │   └── greeks.service.ts
│   │   │   │   │
│   │   │   │   ├── subscriptions/
│   │   │   │   │   ├── subscriptions.routes.ts
│   │   │   │   │   ├── subscriptions.controller.ts
│   │   │   │   │   ├── subscriptions.service.ts
│   │   │   │   │   └── razorpay.service.ts
│   │   │   │   │
│   │   │   │   └── search/
│   │   │   │       ├── search.routes.ts
│   │   │   │       ├── search.controller.ts
│   │   │   │       └── search.service.ts
│   │   │   │
│   │   │   ├── websocket/             # Real-time WebSocket handlers
│   │   │   │   ├── wsServer.ts        # Socket.io server setup
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── marketTicker.handler.ts
│   │   │   │   │   ├── stockTick.handler.ts
│   │   │   │   │   ├── alert.handler.ts
│   │   │   │   │   └── orderBook.handler.ts
│   │   │   │   └── rooms/
│   │   │   │       ├── stockRoom.ts
│   │   │   │       └── marketRoom.ts
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── rateLimiter.middleware.ts
│   │   │   │   ├── subscription.middleware.ts
│   │   │   │   ├── cache.middleware.ts
│   │   │   │   ├── validate.middleware.ts
│   │   │   │   ├── logger.middleware.ts
│   │   │   │   └── errorHandler.middleware.ts
│   │   │   │
│   │   │   ├── shared/
│   │   │   │   ├── types/
│   │   │   │   │   ├── stock.types.ts
│   │   │   │   │   ├── api.types.ts
│   │   │   │   │   └── user.types.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── pagination.ts
│   │   │   │   │   ├── dateHelpers.ts
│   │   │   │   │   ├── numberFormat.ts
│   │   │   │   │   ├── indianMarketHours.ts
│   │   │   │   │   └── responseBuilder.ts
│   │   │   │   └── constants/
│   │   │   │       ├── indices.ts
│   │   │   │       ├── sectors.ts
│   │   │   │       └── exchanges.ts
│   │   │   │
│   │   │   ├── jobs/                  # Background jobs (cron)
│   │   │   │   ├── marketDataSync.job.ts
│   │   │   │   ├── indicatorCompute.job.ts
│   │   │   │   ├── alertEvaluator.job.ts
│   │   │   │   ├── newsIngestion.job.ts
│   │   │   │   ├── sentimentCompute.job.ts
│   │   │   │   ├── portfolioValuation.job.ts
│   │   │   │   ├── earningsCalendar.job.ts
│   │   │   │   └── modelPrediction.job.ts
│   │   │   │
│   │   │   ├── graphql/               # GraphQL (Phase 2)
│   │   │   │   ├── schema.graphql
│   │   │   │   ├── resolvers/
│   │   │   │   └── dataloaders/
│   │   │   │
│   │   │   └── app.ts                 # Express app bootstrap
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   │
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ml-service/                    # Python FastAPI ML microservice
│   │   ├── app/
│   │   │   ├── main.py                # FastAPI app entry
│   │   │   ├── api/
│   │   │   │   ├── predictions.py     # Prediction endpoints
│   │   │   │   ├── sentiment.py       # NLP sentiment endpoints
│   │   │   │   └── features.py        # Feature engineering endpoints
│   │   │   ├── models/
│   │   │   │   ├── lstm_model.py      # LSTM price predictor
│   │   │   │   ├── xgboost_model.py   # XGBoost for direction
│   │   │   │   ├── prophet_model.py   # Meta Prophet for trends
│   │   │   │   ├── transformer.py     # Attention-based model
│   │   │   │   └── ensemble.py        # Ensemble combiner
│   │   │   ├── features/
│   │   │   │   ├── technical_features.py
│   │   │   │   ├── fundamental_features.py
│   │   │   │   ├── sentiment_features.py
│   │   │   │   └── macro_features.py
│   │   │   ├── training/
│   │   │   │   ├── train.py
│   │   │   │   ├── evaluate.py
│   │   │   │   ├── hyperopt.py
│   │   │   │   └── backtesting.py
│   │   │   ├── nlp/
│   │   │   │   ├── finbert_sentiment.py
│   │   │   │   ├── news_processor.py
│   │   │   │   └── social_scraper.py
│   │   │   └── utils/
│   │   │       ├── db.py              # TimescaleDB queries
│   │   │       ├── cache.py           # Redis cache
│   │   │       └── logger.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── data-ingestion/                # Data pipeline workers
│       ├── workers/
│       │   ├── nse_tick_worker.py     # NSE live data ingestion
│       │   ├── bse_worker.py          # BSE data ingestion
│       │   ├── news_worker.py         # News API scrapers
│       │   ├── fii_dii_worker.py      # FII/DII daily data
│       │   ├── fundamental_worker.py  # Quarterly results
│       │   ├── ipo_worker.py          # IPO calendar scraper
│       │   └── social_worker.py       # Twitter/Reddit scraper
│       ├── scrapers/
│       │   ├── nse_scraper.py
│       │   ├── bse_scraper.py
│       │   ├── moneycontrol_scraper.py
│       │   └── screener_scraper.py
│       ├── kafka_producer.py
│       ├── celery_app.py
│       └── requirements.txt
│
├── infrastructure/                    # IaC and DevOps
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── rds.tf                     # TimescaleDB on RDS
│   │   ├── eks.tf                     # Kubernetes cluster
│   │   ├── elasticache.tf             # Redis cluster
│   │   ├── msk.tf                     # Managed Kafka
│   │   └── variables.tf
│   ├── kubernetes/
│   │   ├── deployments/
│   │   ├── services/
│   │   ├── ingress/
│   │   └── hpa/                       # Horizontal Pod Autoscaler
│   ├── docker-compose.yml             # Local development
│   └── docker-compose.prod.yml
│
├── database/
│   ├── migrations/                    # Flyway SQL migrations
│   │   ├── V001__create_users.sql
│   │   ├── V002__create_stocks.sql
│   │   ├── V003__create_timeseries.sql
│   │   ├── V004__create_fundamentals.sql
│   │   ├── V005__create_institutional.sql
│   │   ├── V006__create_portfolios.sql
│   │   ├── V007__create_alerts.sql
│   │   ├── V008__create_news.sql
│   │   ├── V009__create_sentiment.sql
│   │   ├── V010__create_ipo.sql
│   │   ├── V011__create_predictions.sql
│   │   ├── V012__create_options.sql
│   │   └── V013__create_subscriptions.sql
│   ├── seeds/                         # Reference data
│   │   ├── stocks_master.sql          # All NSE/BSE listed stocks
│   │   ├── sectors.sql
│   │   └── indices_composition.sql
│   └── continuous_aggregates/         # TimescaleDB aggregates
│       ├── ohlcv_1min.sql
│       ├── ohlcv_5min.sql
│       ├── ohlcv_15min.sql
│       ├── ohlcv_1hour.sql
│       └── ohlcv_1day.sql
│
├── packages/                          # Shared packages
│   ├── shared-types/                  # TypeScript types shared across apps
│   └── shared-utils/                  # Common utilities
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-prod.yml
│
├── docker-compose.yml
├── turbo.json                         # Turborepo config
├── package.json
└── README.md
```

---

## 4. DATABASE DESIGN — POSTGRESQL + TIMESCALEDB

### WHY TIMESCALEDB? (The Decision Explained)

TimescaleDB extends PostgreSQL specifically for time-series data. Stock prices are the most classic time-series data that exists. Benefits:

| Feature | Plain PostgreSQL | TimescaleDB |
|---------|-----------------|-------------|
| Query 1M OHLCV rows by date range | 8-15 seconds | < 100ms |
| Storage (after compression) | 100GB | 10-15GB |
| Continuous aggregates (candles) | Manual CRON | Built-in automatic |
| Data retention policies | Manual partitioning | Automatic chunk management |
| Real-time aggregation | Slow | Native |

**Use TimescaleDB for**: stock_prices, market_ticks, indicator_values, options_chain
**Use regular Postgres tables for**: users, stocks_master, portfolios, alerts, ipo data

---

### SCHEMA DEFINITIONS — EVERY TABLE, COLUMN, INDEX

---

#### TABLE: users
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(15) UNIQUE,
    name            VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    provider        VARCHAR(50) DEFAULT 'email',    -- 'email','google','apple'
    provider_id     VARCHAR(255),                   -- OAuth provider user ID
    password_hash   TEXT,                           -- NULL for OAuth users
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    risk_profile    VARCHAR(20) DEFAULT 'moderate', -- 'conservative','moderate','aggressive'
    kyc_status      VARCHAR(20) DEFAULT 'pending',  -- 'pending','verified','rejected'
    pan_number      VARCHAR(10),                    -- encrypted
    preferences     JSONB DEFAULT '{}',             -- UI preferences, default watchlist, etc.
    timezone        VARCHAR(50) DEFAULT 'Asia/Kolkata',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ                     -- soft delete
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
```

---

#### TABLE: user_sessions
```sql
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   TEXT UNIQUE NOT NULL,
    device_info     JSONB,                          -- browser, OS, IP
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token);
```

---

#### TABLE: subscriptions
```sql
CREATE TABLE subscription_plans (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,           -- 'free','pro','elite','institutional'
    price_monthly   DECIMAL(10,2),
    price_yearly    DECIMAL(10,2),
    features        JSONB NOT NULL,                 -- {predictions: true, api_access: true, ...}
    api_rate_limit  INTEGER DEFAULT 100,            -- requests per minute
    watchlist_limit INTEGER DEFAULT 5,
    alert_limit     INTEGER DEFAULT 10,
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    plan_id             INTEGER REFERENCES subscription_plans(id),
    status              VARCHAR(20) DEFAULT 'active', -- 'active','cancelled','expired','paused'
    razorpay_sub_id     VARCHAR(255),               -- Razorpay subscription ID
    razorpay_customer_id VARCHAR(255),
    current_period_start TIMESTAMPTZ,
    current_period_end  TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
```

---

#### TABLE: stocks_master (Reference table — plain Postgres)
```sql
CREATE TABLE stocks_master (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(30) UNIQUE NOT NULL,    -- 'RELIANCE', 'TCS', 'INFY'
    isin            VARCHAR(12) UNIQUE,             -- IN-series ISIN
    company_name    VARCHAR(255) NOT NULL,
    exchange        VARCHAR(10) NOT NULL,            -- 'NSE', 'BSE', 'BOTH'
    nse_symbol      VARCHAR(30),
    bse_code        VARCHAR(10),
    series          VARCHAR(5) DEFAULT 'EQ',        -- 'EQ','BE','SM',etc.
    sector          VARCHAR(100),                   -- SEBI classification
    industry        VARCHAR(100),
    index_membership JSONB DEFAULT '[]',            -- ['NIFTY50','NIFTY100','SENSEX']
    listing_date    DATE,
    face_value      DECIMAL(10,2),
    lot_size        INTEGER DEFAULT 1,              -- F&O lot size
    is_fo_eligible  BOOLEAN DEFAULT FALSE,
    is_sme          BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    logo_url        TEXT,
    website         TEXT,
    description     TEXT,
    headquarters    VARCHAR(255),
    employees       INTEGER,
    founded_year    INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stocks_symbol ON stocks_master(symbol);
CREATE INDEX idx_stocks_isin ON stocks_master(isin);
CREATE INDEX idx_stocks_sector ON stocks_master(sector);
CREATE INDEX idx_stocks_exchange ON stocks_master(exchange);
-- Full text search index
CREATE INDEX idx_stocks_fts ON stocks_master 
    USING GIN(to_tsvector('english', company_name || ' ' || symbol));
```

---

#### TABLE: stock_prices (TIMESCALEDB HYPERTABLE — Core)
```sql
CREATE TABLE stock_prices (
    time            TIMESTAMPTZ NOT NULL,           -- tick timestamp
    symbol          VARCHAR(30) NOT NULL,
    open            DECIMAL(12,4),
    high            DECIMAL(12,4),
    low             DECIMAL(12,4),
    close           DECIMAL(12,4) NOT NULL,
    volume          BIGINT,
    turnover        DECIMAL(18,2),                  -- in rupees
    trades          INTEGER,                        -- number of trades
    delivery_volume BIGINT,                         -- delivery quantity
    delivery_pct    DECIMAL(5,2),                   -- delivery %
    vwap            DECIMAL(12,4),
    upper_circuit   DECIMAL(12,4),
    lower_circuit   DECIMAL(12,4),
    bid             DECIMAL(12,4),
    ask             DECIMAL(12,4),
    PRIMARY KEY (time, symbol)
);

-- Convert to TimescaleDB hypertable (partition by day)
SELECT create_hypertable('stock_prices', 'time', 
    chunk_time_interval => INTERVAL '1 day');

-- Compression policy (compress data older than 7 days)
ALTER TABLE stock_prices SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('stock_prices', INTERVAL '7 days');

-- Retention: keep 10 years of data
SELECT add_retention_policy('stock_prices', INTERVAL '10 years');

CREATE INDEX idx_sp_symbol_time ON stock_prices(symbol, time DESC);
```

---

#### CONTINUOUS AGGREGATES (Pre-computed OHLCV candles)
```sql
-- 1-minute candles
CREATE MATERIALIZED VIEW ohlcv_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    symbol,
    FIRST(open, time)   AS open,
    MAX(high)           AS high,
    MIN(low)            AS low,
    LAST(close, time)   AS close,
    SUM(volume)         AS volume,
    SUM(turnover)       AS turnover
FROM stock_prices
GROUP BY bucket, symbol
WITH NO DATA;

SELECT add_continuous_aggregate_policy('ohlcv_1min',
    start_offset => INTERVAL '2 hours',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- 5-minute candles
CREATE MATERIALIZED VIEW ohlcv_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', time) AS bucket,
    symbol,
    FIRST(open, time)  AS open,
    MAX(high)          AS high,
    MIN(low)           AS low,
    LAST(close, time)  AS close,
    SUM(volume)        AS volume
FROM stock_prices GROUP BY bucket, symbol WITH NO DATA;

-- Similar views for 15min, 1hour, 1day, 1week
-- (follow same pattern, adjust time_bucket interval)
```

---

#### TABLE: market_indices
```sql
CREATE TABLE market_indices (
    time            TIMESTAMPTZ NOT NULL,
    index_name      VARCHAR(50) NOT NULL,           -- 'NIFTY50','SENSEX','BANKNIFTY'
    open            DECIMAL(12,2),
    high            DECIMAL(12,2),
    low             DECIMAL(12,2),
    close           DECIMAL(12,2) NOT NULL,
    volume          BIGINT,
    advances        INTEGER,                        -- advancing stocks count
    declines        INTEGER,                        -- declining stocks count
    unchanged       INTEGER,
    advance_decline_ratio DECIMAL(8,4),
    PRIMARY KEY (time, index_name)
);

SELECT create_hypertable('market_indices', 'time',
    chunk_time_interval => INTERVAL '1 week');
```

---

#### TABLE: technical_indicators (Precomputed, cached in TimescaleDB)
```sql
CREATE TABLE technical_indicators (
    time            TIMESTAMPTZ NOT NULL,
    symbol          VARCHAR(30) NOT NULL,
    timeframe       VARCHAR(10) NOT NULL,           -- '1min','5min','15min','1hour','1day'
    -- Moving Averages
    ema_9           DECIMAL(12,4),
    ema_20          DECIMAL(12,4),
    ema_50          DECIMAL(12,4),
    ema_200         DECIMAL(12,4),
    sma_20          DECIMAL(12,4),
    sma_50          DECIMAL(12,4),
    sma_200         DECIMAL(12,4),
    -- Momentum
    rsi_14          DECIMAL(8,4),
    macd            DECIMAL(12,6),
    macd_signal     DECIMAL(12,6),
    macd_histogram  DECIMAL(12,6),
    stoch_k         DECIMAL(8,4),
    stoch_d         DECIMAL(8,4),
    -- Volatility
    bb_upper        DECIMAL(12,4),                 -- Bollinger Band upper
    bb_middle       DECIMAL(12,4),
    bb_lower        DECIMAL(12,4),
    bb_width        DECIMAL(8,6),
    atr_14          DECIMAL(12,4),
    -- Volume
    obv             BIGINT,
    vwap            DECIMAL(12,4),
    -- Trend
    supertrend      DECIMAL(12,4),
    supertrend_direction VARCHAR(4),               -- 'up','down'
    adx             DECIMAL(8,4),
    -- Signals
    signal          VARCHAR(20),                   -- 'strong_buy','buy','neutral','sell','strong_sell'
    signal_strength DECIMAL(5,2),                  -- 0-100
    PRIMARY KEY (time, symbol, timeframe)
);

SELECT create_hypertable('technical_indicators', 'time',
    chunk_time_interval => INTERVAL '1 week');

CREATE INDEX idx_ti_symbol_tf_time ON technical_indicators(symbol, timeframe, time DESC);
```

---

#### TABLE: company_fundamentals
```sql
CREATE TABLE company_fundamentals (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    period_type     VARCHAR(10) NOT NULL,           -- 'quarterly','annual'
    period_end_date DATE NOT NULL,
    -- Income Statement
    revenue         DECIMAL(18,2),                 -- in lakhs
    gross_profit    DECIMAL(18,2),
    ebitda          DECIMAL(18,2),
    ebit            DECIMAL(18,2),
    pat             DECIMAL(18,2),                 -- Profit After Tax
    eps             DECIMAL(12,4),                 -- Earnings Per Share
    eps_diluted     DECIMAL(12,4),
    revenue_growth  DECIMAL(8,4),                  -- QoQ or YoY %
    pat_growth      DECIMAL(8,4),
    -- Balance Sheet
    total_assets    DECIMAL(18,2),
    total_equity    DECIMAL(18,2),
    total_debt      DECIMAL(18,2),
    cash_equivalents DECIMAL(18,2),
    book_value_per_share DECIMAL(12,4),
    -- Cash Flow
    cfo             DECIMAL(18,2),                 -- Cash from Operations
    cfi             DECIMAL(18,2),                 -- Cash from Investing
    cff             DECIMAL(18,2),                 -- Cash from Financing
    free_cash_flow  DECIMAL(18,2),
    capex           DECIMAL(18,2),
    -- Ratios (computed)
    pe_ratio        DECIMAL(10,4),
    pb_ratio        DECIMAL(10,4),
    ps_ratio        DECIMAL(10,4),
    ev_ebitda       DECIMAL(10,4),
    roe             DECIMAL(8,4),
    roce            DECIMAL(8,4),
    roa             DECIMAL(8,4),
    debt_to_equity  DECIMAL(10,4),
    current_ratio   DECIMAL(10,4),
    quick_ratio     DECIMAL(10,4),
    gross_margin    DECIMAL(8,4),
    net_margin      DECIMAL(8,4),
    -- Dividends
    dividend_per_share DECIMAL(10,4),
    dividend_yield  DECIMAL(8,4),
    payout_ratio    DECIMAL(8,4),
    -- Source
    source          VARCHAR(50),                   -- 'bse','nse','screener'
    raw_data        JSONB,                          -- original API response preserved
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, period_type, period_end_date)
);

CREATE INDEX idx_cf_symbol_period ON company_fundamentals(symbol, period_end_date DESC);
```

---

#### TABLE: stock_valuation (Live valuation metrics — updated daily)
```sql
CREATE TABLE stock_valuation (
    symbol              VARCHAR(30) PRIMARY KEY REFERENCES stocks_master(symbol),
    market_cap          DECIMAL(20,2),             -- in crores
    enterprise_value    DECIMAL(20,2),
    shares_outstanding  BIGINT,
    float_shares        BIGINT,
    promoter_holding    DECIMAL(8,4),              -- %
    fii_holding         DECIMAL(8,4),
    dii_holding         DECIMAL(8,4),
    public_holding      DECIMAL(8,4),
    week_52_high        DECIMAL(12,4),
    week_52_low         DECIMAL(12,4),
    week_52_high_date   DATE,
    week_52_low_date    DATE,
    beta                DECIMAL(8,4),              -- vs Nifty 50
    avg_volume_30d      BIGINT,
    avg_volume_3m       BIGINT,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### TABLE: fii_dii_activity
```sql
CREATE TABLE fii_dii_activity (
    date            DATE NOT NULL,
    category        VARCHAR(10) NOT NULL,           -- 'FII','DII'
    segment         VARCHAR(20) NOT NULL,           -- 'equity','debt','hybrid'
    gross_buy       DECIMAL(18,2),                 -- in crores
    gross_sell      DECIMAL(18,2),
    net_value       DECIMAL(18,2),                 -- buy - sell
    PRIMARY KEY (date, category, segment)
);

CREATE INDEX idx_fii_dii_date ON fii_dii_activity(date DESC);
```

---

#### TABLE: block_deals
```sql
CREATE TABLE block_deals (
    id              SERIAL PRIMARY KEY,
    deal_date       DATE NOT NULL,
    exchange        VARCHAR(10) NOT NULL,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    client_name     VARCHAR(255),
    deal_type       VARCHAR(4) NOT NULL,            -- 'BUY','SELL'
    quantity        BIGINT NOT NULL,
    price           DECIMAL(12,4) NOT NULL,
    value_crores    DECIMAL(18,2),
    block_type      VARCHAR(10) DEFAULT 'block',    -- 'block','bulk'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_block_deals_symbol ON block_deals(symbol, deal_date DESC);
CREATE INDEX idx_block_deals_date ON block_deals(deal_date DESC);
```

---

#### TABLE: mutual_fund_holdings
```sql
CREATE TABLE mutual_fund_holdings (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    fund_name       VARCHAR(255) NOT NULL,
    fund_house      VARCHAR(100),
    scheme_type     VARCHAR(50),                   -- 'large_cap','mid_cap','flexi'
    month_year      DATE NOT NULL,                 -- first day of the month
    shares_held     BIGINT,
    value_crores    DECIMAL(18,2),
    portfolio_pct   DECIMAL(8,4),                  -- % of fund's portfolio
    change_shares   BIGINT,                        -- change vs previous month
    change_type     VARCHAR(10),                   -- 'increased','decreased','new','exited'
    UNIQUE(symbol, fund_name, month_year)
);

CREATE INDEX idx_mf_symbol ON mutual_fund_holdings(symbol, month_year DESC);
```

---

#### TABLE: insider_trades
```sql
CREATE TABLE insider_trades (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    trade_date      DATE NOT NULL,
    person_name     VARCHAR(255) NOT NULL,
    person_category VARCHAR(50),                   -- 'promoter','director','CEO','CFO'
    trade_type      VARCHAR(10) NOT NULL,           -- 'buy','sell','pledge','revoke'
    shares          BIGINT,
    price           DECIMAL(12,4),
    value_crores    DECIMAL(18,2),
    shareholding_pre  DECIMAL(8,4),                -- % before trade
    shareholding_post DECIMAL(8,4),                -- % after trade
    exchange        VARCHAR(10),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insider_symbol ON insider_trades(symbol, trade_date DESC);
```

---

#### TABLE: ipos
```sql
CREATE TABLE ipos (
    id              SERIAL PRIMARY KEY,
    company_name    VARCHAR(255) NOT NULL,
    symbol          VARCHAR(30),                   -- assigned after listing
    exchange        VARCHAR(10) DEFAULT 'NSE',
    -- IPO Details
    ipo_type        VARCHAR(20) DEFAULT 'mainboard', -- 'mainboard','sme'
    issue_type      VARCHAR(20),                   -- 'fresh','ofs','mixed'
    price_band_low  DECIMAL(10,2),
    price_band_high DECIMAL(10,2),
    lot_size        INTEGER,
    issue_size_cr   DECIMAL(18,2),                 -- total issue size in crores
    fresh_issue_cr  DECIMAL(18,2),
    ofs_cr          DECIMAL(18,2),
    gmp             DECIMAL(10,2),                 -- Grey Market Premium
    gmp_percent     DECIMAL(8,4),
    -- Timeline
    open_date       DATE,
    close_date      DATE,
    allotment_date  DATE,
    refund_date     DATE,
    listing_date    DATE,
    -- Results
    listing_price   DECIMAL(10,2),
    listing_gain_pct DECIMAL(8,4),
    current_price   DECIMAL(10,2),                -- live (after listing)
    -- Company Info
    sector          VARCHAR(100),
    lead_managers   JSONB,                         -- array of strings
    registrar       VARCHAR(255),
    promoter_holding_pre  DECIMAL(8,4),
    promoter_holding_post DECIMAL(8,4),
    -- DRHP links
    drhp_url        TEXT,
    rha_url         TEXT,
    status          VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming','open','allotted','listed'
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ipos_status ON ipos(status, open_date);
CREATE INDEX idx_ipos_listing_date ON ipos(listing_date DESC);
```

---

#### TABLE: ipo_subscription
```sql
CREATE TABLE ipo_subscription (
    id              SERIAL PRIMARY KEY,
    ipo_id          INTEGER REFERENCES ipos(id),
    snapshot_time   TIMESTAMPTZ NOT NULL,          -- time of subscription update
    qib_times       DECIMAL(10,4),                 -- QIB subscription times
    nii_times       DECIMAL(10,4),                 -- NII (HNI) subscription times
    retail_times    DECIMAL(10,4),                 -- Retail subscription times
    employee_times  DECIMAL(10,4),
    total_times     DECIMAL(10,4),
    total_bids      BIGINT,
    total_amount_cr DECIMAL(18,2),
    UNIQUE(ipo_id, snapshot_time)
);
```

---

#### TABLE: portfolios
```sql
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    currency        VARCHAR(3) DEFAULT 'INR',
    is_default      BOOLEAN DEFAULT FALSE,
    color           VARCHAR(7),                    -- hex color for UI
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user ON portfolios(user_id);
```

---

#### TABLE: portfolio_transactions
```sql
CREATE TABLE portfolio_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    transaction_type VARCHAR(10) NOT NULL,          -- 'buy','sell','dividend','split','bonus'
    transaction_date DATE NOT NULL,
    quantity        DECIMAL(12,4) NOT NULL,         -- decimal for split adjustments
    price           DECIMAL(12,4) NOT NULL,
    brokerage       DECIMAL(10,4) DEFAULT 0,
    taxes           DECIMAL(10,4) DEFAULT 0,        -- STT, GST, stamp duty
    total_amount    DECIMAL(18,4),                  -- computed: qty * price + brokerage + taxes
    notes           TEXT,
    exchange        VARCHAR(10) DEFAULT 'NSE',
    order_id        VARCHAR(100),                   -- broker order ID (optional)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ptx_portfolio ON portfolio_transactions(portfolio_id, transaction_date DESC);
CREATE INDEX idx_ptx_symbol ON portfolio_transactions(symbol, transaction_date DESC);
```

---

#### TABLE: portfolio_holdings (Computed view, refreshed on transaction)
```sql
CREATE TABLE portfolio_holdings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    quantity        DECIMAL(12,4) NOT NULL,
    avg_buy_price   DECIMAL(12,4) NOT NULL,
    total_invested  DECIMAL(18,4),
    current_price   DECIMAL(12,4),
    current_value   DECIMAL(18,4),
    unrealized_pnl  DECIMAL(18,4),
    unrealized_pnl_pct DECIMAL(8,4),
    realized_pnl    DECIMAL(18,4),
    first_buy_date  DATE,
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, symbol)
);

CREATE INDEX idx_ph_portfolio ON portfolio_holdings(portfolio_id);
```

---

#### TABLE: watchlists
```sql
CREATE TABLE watchlists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE watchlist_items (
    id              SERIAL PRIMARY KEY,
    watchlist_id    UUID REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    sort_order      INTEGER DEFAULT 0,
    notes           TEXT,
    added_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(watchlist_id, symbol)
);

CREATE INDEX idx_wi_watchlist ON watchlist_items(watchlist_id, sort_order);
```

---

#### TABLE: price_alerts
```sql
CREATE TABLE price_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    alert_type      VARCHAR(30) NOT NULL,           -- 'price_above','price_below','pct_change','volume_spike','rsi_level','macd_crossover'
    condition_value DECIMAL(12,4),                  -- target price / % / RSI level
    timeframe       VARCHAR(10) DEFAULT '1day',
    is_active       BOOLEAN DEFAULT TRUE,
    is_repeating    BOOLEAN DEFAULT FALSE,          -- re-trigger after firing
    notification_channels JSONB DEFAULT '["push","email"]', -- where to notify
    triggered_count INTEGER DEFAULT 0,
    last_triggered  TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    message         TEXT,                           -- custom message
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON price_alerts(user_id, is_active);
CREATE INDEX idx_alerts_symbol ON price_alerts(symbol, is_active);
```

---

#### TABLE: news_articles
```sql
CREATE TABLE news_articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headline        TEXT NOT NULL,
    summary         TEXT,
    content         TEXT,
    url             TEXT UNIQUE,
    image_url       TEXT,
    source          VARCHAR(100),                   -- 'moneycontrol','et','bs','livemint'
    author          VARCHAR(255),
    published_at    TIMESTAMPTZ NOT NULL,
    symbols         VARCHAR(30)[],                  -- array of relevant stock symbols
    sectors         VARCHAR(100)[],
    tags            VARCHAR(50)[],
    language        VARCHAR(5) DEFAULT 'en',
    sentiment_score DECIMAL(5,4),                  -- -1 to 1
    sentiment_label VARCHAR(10),                   -- 'positive','negative','neutral'
    impact_score    DECIMAL(5,4),                  -- predicted market impact (0-1)
    is_featured     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_symbols ON news_articles USING GIN(symbols);
CREATE INDEX idx_news_sentiment ON news_articles(sentiment_label, published_at DESC);
-- Full text search
CREATE INDEX idx_news_fts ON news_articles USING GIN(
    to_tsvector('english', headline || ' ' || COALESCE(summary, ''))
);
```

---

#### TABLE: social_sentiment
```sql
CREATE TABLE social_sentiment (
    time            TIMESTAMPTZ NOT NULL,
    symbol          VARCHAR(30),                   -- NULL = market-wide
    platform        VARCHAR(20) NOT NULL,           -- 'twitter','reddit','stocktwits'
    mention_count   INTEGER DEFAULT 0,
    positive_count  INTEGER DEFAULT 0,
    negative_count  INTEGER DEFAULT 0,
    neutral_count   INTEGER DEFAULT 0,
    sentiment_score DECIMAL(5,4),                  -- -1 to 1
    trending_rank   INTEGER,
    PRIMARY KEY (time, platform, COALESCE(symbol, 'MARKET'))
);

SELECT create_hypertable('social_sentiment', 'time',
    chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_ss_symbol ON social_sentiment(symbol, time DESC);
```

---

#### TABLE: fear_greed_index
```sql
CREATE TABLE fear_greed_index (
    date            DATE PRIMARY KEY,
    score           INTEGER NOT NULL,              -- 0-100
    label           VARCHAR(20) NOT NULL,           -- 'extreme_fear','fear','neutral','greed','extreme_greed'
    -- Components
    market_momentum DECIMAL(5,2),                  -- vs 125-day MA
    stock_strength  DECIMAL(5,2),                  -- 52-week highs vs lows
    stock_breadth   DECIMAL(5,2),                  -- McClellan Volume Summation
    put_call_ratio  DECIMAL(5,2),
    market_volatility DECIMAL(5,2),               -- India VIX
    safe_haven_demand DECIMAL(5,2),               -- FII flows into debt
    junk_bond_demand  DECIMAL(5,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### TABLE: stock_predictions (The Core — ML Output)
```sql
CREATE TABLE stock_predictions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    predicted_at    TIMESTAMPTZ NOT NULL,
    model_version   VARCHAR(50) NOT NULL,           -- 'ensemble_v2.3'
    horizon         VARCHAR(10) NOT NULL,           -- '1day','1week','1month'
    -- Price Predictions
    predicted_price     DECIMAL(12,4),
    predicted_return_pct DECIMAL(8,4),
    confidence          DECIMAL(5,4),               -- 0-1
    prediction_low      DECIMAL(12,4),              -- lower bound (95% CI)
    prediction_high     DECIMAL(12,4),              -- upper bound (95% CI)
    -- Direction
    direction           VARCHAR(4),                 -- 'up','down'
    direction_probability DECIMAL(5,4),
    -- Signal
    signal              VARCHAR(20),               -- 'strong_buy','buy','hold','sell','strong_sell'
    signal_strength     DECIMAL(5,2),              -- 0-100
    -- Feature Importance (top features that drove prediction)
    feature_importance  JSONB,
    -- Actual vs Predicted (filled later for backtesting)
    actual_price        DECIMAL(12,4),             -- filled when horizon expires
    actual_return_pct   DECIMAL(8,4),
    was_correct         BOOLEAN,
    error_pct           DECIMAL(8,4),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('stock_predictions', 'predicted_at',
    chunk_time_interval => INTERVAL '1 week');

CREATE INDEX idx_pred_symbol_horizon ON stock_predictions(symbol, horizon, predicted_at DESC);
CREATE INDEX idx_pred_model ON stock_predictions(model_version, predicted_at DESC);
```

---

#### TABLE: options_chain (Phase 2 — TIMESCALEDB)
```sql
CREATE TABLE options_chain (
    time            TIMESTAMPTZ NOT NULL,
    symbol          VARCHAR(30) NOT NULL,           -- underlying
    expiry_date     DATE NOT NULL,
    strike_price    DECIMAL(10,2) NOT NULL,
    option_type     CHAR(2) NOT NULL,               -- 'CE' or 'PE'
    ltp             DECIMAL(10,4),
    change          DECIMAL(10,4),
    bid             DECIMAL(10,4),
    ask             DECIMAL(10,4),
    volume          BIGINT,
    open_interest   BIGINT,
    oi_change       BIGINT,
    -- Greeks
    iv              DECIMAL(8,4),                   -- Implied Volatility
    delta           DECIMAL(8,6),
    gamma           DECIMAL(10,8),
    theta           DECIMAL(10,6),
    vega            DECIMAL(10,6),
    PRIMARY KEY (time, symbol, expiry_date, strike_price, option_type)
);

SELECT create_hypertable('options_chain', 'time',
    chunk_time_interval => INTERVAL '1 day');
```

---

#### TABLE: corporate_actions
```sql
CREATE TABLE corporate_actions (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    action_type     VARCHAR(30) NOT NULL,           -- 'dividend','bonus','split','rights','buyback','merger'
    ex_date         DATE,
    record_date     DATE,
    payment_date    DATE,
    -- Action-specific values
    value           DECIMAL(12,4),                  -- dividend amount / bonus ratio / split ratio
    ratio_from      INTEGER,                        -- for split/bonus: "1 for N"
    ratio_to        INTEGER,
    details         TEXT,
    announced_at    DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ca_symbol ON corporate_actions(symbol, ex_date DESC);
CREATE INDEX idx_ca_ex_date ON corporate_actions(ex_date);
```

---

#### TABLE: earnings_calendar
```sql
CREATE TABLE earnings_calendar (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(30) REFERENCES stocks_master(symbol),
    result_date     DATE NOT NULL,
    period_type     VARCHAR(10),                   -- 'Q1','Q2','Q3','Q4','Annual'
    period_end_date DATE,
    is_confirmed    BOOLEAN DEFAULT FALSE,
    -- Pre-earnings estimates
    eps_estimate    DECIMAL(12,4),
    revenue_estimate DECIMAL(18,2),
    -- Post-earnings actuals (filled after announcement)
    eps_actual      DECIMAL(12,4),
    revenue_actual  DECIMAL(18,2),
    eps_surprise_pct DECIMAL(8,4),                 -- (actual-estimate)/estimate * 100
    post_result_move DECIMAL(8,4),                 -- price move next day %
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, result_date)
);
```

---

#### TABLE: screener_queries (Saved screener filters)
```sql
CREATE TABLE screener_queries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(100),
    description     TEXT,
    is_public       BOOLEAN DEFAULT FALSE,
    query_json      JSONB NOT NULL,                -- filter conditions
    result_count    INTEGER,
    run_count       INTEGER DEFAULT 0,
    last_run_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### TABLE: api_usage_logs (Rate limiting & analytics)
```sql
CREATE TABLE api_usage_logs (
    time            TIMESTAMPTZ NOT NULL,
    user_id         UUID REFERENCES users(id),
    endpoint        VARCHAR(255),
    method          VARCHAR(10),
    status_code     INTEGER,
    response_time_ms INTEGER,
    ip_address      INET,
    api_key_id      UUID
);

SELECT create_hypertable('api_usage_logs', 'time',
    chunk_time_interval => INTERVAL '1 day');
SELECT add_retention_policy('api_usage_logs', INTERVAL '90 days');
```

---

## 5. CORE MODULES & BUSINESS LOGIC

### Module: Indian Market Hours Service
```typescript
// src/shared/utils/indianMarketHours.ts
export const MARKET_TIMEZONE = 'Asia/Kolkata';
export const MARKET_OPEN = { hour: 9, minute: 15 };
export const MARKET_CLOSE = { hour: 15, minute: 30 };
export const PRE_MARKET_OPEN = { hour: 9, minute: 0 };

export function isMarketOpen(): boolean {
    const now = new Date();
    const ist = toZonedTime(now, MARKET_TIMEZONE);
    const day = ist.getDay();
    if (day === 0 || day === 6) return false; // Weekend
    const h = ist.getHours(), m = ist.getMinutes();
    const mins = h * 60 + m;
    return mins >= 9 * 60 + 15 && mins < 15 * 60 + 30;
}

export function getNextMarketOpen(): Date {
    // Logic to find next trading day, accounting for NSE holidays
}
```

### Module: Alert Evaluation Engine
The alert evaluator runs every 30 seconds during market hours. It queries Redis for active alerts, compares against live prices, and publishes triggered alerts to a queue.

```typescript
// apps/api/src/jobs/alertEvaluator.job.ts
export class AlertEvaluatorJob {
    async evaluate(): Promise<void> {
        const activeAlerts = await this.alertRepo.getActiveAlerts();
        const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
        const prices = await this.redis.mget(symbols.map(s => `price:${s}`));
        
        for (const alert of activeAlerts) {
            const currentPrice = prices[alert.symbol];
            if (this.isTriggered(alert, currentPrice)) {
                await this.triggerAlert(alert, currentPrice);
            }
        }
    }

    private isTriggered(alert: PriceAlert, price: number): boolean {
        switch (alert.alert_type) {
            case 'price_above':  return price >= alert.condition_value;
            case 'price_below':  return price <= alert.condition_value;
            case 'pct_change':   return Math.abs(this.getPctChange(alert.symbol)) >= alert.condition_value;
            case 'volume_spike': return this.getVolumeRatio(alert.symbol) >= alert.condition_value;
            case 'rsi_level':    return Math.abs(this.getRSI(alert.symbol) - alert.condition_value) <= 2;
        }
    }
}
```

### Module: Portfolio P&L and XIRR Service
```typescript
// Computes unrealized P&L, realized P&L, and XIRR for each portfolio
export class PortfolioPnLService {
    async computeHoldings(portfolioId: string): Promise<HoldingWithPnL[]> {
        const transactions = await this.txnRepo.getByPortfolio(portfolioId);
        const holdings = this.aggregateHoldings(transactions); // FIFO cost basis
        const symbols = Object.keys(holdings);
        const livePrices = await this.getLivePrices(symbols);
        
        return holdings.map(h => ({
            ...h,
            currentPrice: livePrices[h.symbol],
            currentValue: h.quantity * livePrices[h.symbol],
            unrealizedPnl: (livePrices[h.symbol] - h.avgBuyPrice) * h.quantity,
            unrealizedPnlPct: ((livePrices[h.symbol] - h.avgBuyPrice) / h.avgBuyPrice) * 100
        }));
    }

    computeXIRR(transactions: Transaction[]): number {
        // Newton-Raphson iteration for XIRR computation
        // Cash flows: buys as negative, sells + current value as positive
    }
}
```

### Module: Technical Indicator Engine (Node.js)
```typescript
// Computes all TA indicators for given OHLCV data
import { RSI, MACD, BollingerBands, EMA, ATR, Stochastic } from 'technicalindicators';

export class TechnicalService {
    async getIndicators(symbol: string, timeframe: string): Promise<IndicatorSet> {
        // First check Redis cache
        const cached = await this.redis.get(`indicators:${symbol}:${timeframe}`);
        if (cached) return JSON.parse(cached);
        
        // Fetch OHLCV from TimescaleDB
        const candles = await this.db.query(`
            SELECT bucket as time, open, high, low, close, volume
            FROM ohlcv_${timeframe}
            WHERE symbol = $1
            ORDER BY bucket DESC
            LIMIT 500
        `, [symbol]);
        
        const closes = candles.map(c => c.close).reverse();
        const highs = candles.map(c => c.high).reverse();
        const lows = candles.map(c => c.low).reverse();
        
        const indicators = {
            rsi: RSI.calculate({ values: closes, period: 14 }).slice(-1)[0],
            macd: MACD.calculate({ values: closes, ... }).slice(-1)[0],
            bb: BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 }).slice(-1)[0],
            ema20: EMA.calculate({ values: closes, period: 20 }).slice(-1)[0],
            // ... more indicators
        };
        
        // Cache for 60 seconds during market hours
        await this.redis.setex(`indicators:${symbol}:${timeframe}`, 60, JSON.stringify(indicators));
        return indicators;
    }
}
```

### Module: Stock Screener Engine
```typescript
// Dynamic query builder for stock screening
export class ScreenerService {
    async runScreener(filters: ScreenerFilter[]): Promise<StockResult[]> {
        let query = this.db('stocks_master as s')
            .join('stock_valuation as v', 's.symbol', 'v.symbol')
            .join('company_fundamentals as f', function() {
                this.on('s.symbol', 'f.symbol')
                    .andOn('f.period_type', db.raw("'annual'"))
                    .andOn('f.period_end_date', db.raw(
                        `(SELECT MAX(period_end_date) FROM company_fundamentals WHERE symbol = s.symbol AND period_type = 'annual')`
                    ));
            });
        
        filters.forEach(filter => {
            switch(filter.field) {
                case 'market_cap': query = query.whereBetween('v.market_cap', [filter.min, filter.max]); break;
                case 'pe_ratio':   query = query.whereBetween('f.pe_ratio', [filter.min, filter.max]); break;
                case 'roe':        query = query.where('f.roe', '>=', filter.min); break;
                case 'sector':     query = query.where('s.sector', filter.value); break;
                // ... 30+ filter conditions
            }
        });
        
        return query.orderBy(filters.sortBy || 'v.market_cap', 'desc').limit(200);
    }
}
```

---

## 6. COMPLETE API SPECIFICATION

### Base URL: `https://api.stocksense.in/v1`
### Auth Header: `Authorization: Bearer <jwt_token>`

---

### AUTH APIs
```
POST   /auth/register              → { email, password, name } → { user, token }
POST   /auth/login                 → { email, password } → { user, accessToken, refreshToken }
POST   /auth/logout                → Invalidate session
POST   /auth/refresh               → { refreshToken } → { accessToken }
POST   /auth/google                → OAuth Google login
POST   /auth/forgot-password       → Send OTP
POST   /auth/reset-password        → { otp, newPassword }
POST   /auth/verify-email          → { token }
GET    /auth/me                    → Current user profile
PATCH  /auth/me                    → Update profile
```

---

### MARKET APIs
```
GET    /market/overview            → All indices, breadth, top gainers/losers
GET    /market/indices             → Nifty50, Sensex, BankNifty etc. live
GET    /market/indices/:name/history?from=&to=&interval=  → OHLCV history
GET    /market/gainers?exchange=NSE&count=10  → Top gainers
GET    /market/losers              → Top losers
GET    /market/52-week-high        → Stocks hitting 52W high
GET    /market/52-week-low         → Stocks hitting 52W low
GET    /market/volume-toppers      → Highest volume stocks
GET    /market/circuit-breakers    → Stocks hitting upper/lower circuit
GET    /market/fear-greed          → Fear & Greed Index (current + history)
GET    /market/breadth             → Advance-Decline data
GET    /market/sector-heatmap      → Sector-wise performance
GET    /market/holidays            → NSE/BSE holiday calendar
```

---

### STOCK APIs
```
GET    /stocks/search?q=RELIANCE   → Autocomplete search
GET    /stocks/featured            → Featured/trending stocks
GET    /stocks/:symbol             → Full stock profile
GET    /stocks/:symbol/quote       → Live quote (price, change, volume)
GET    /stocks/:symbol/history?interval=1day&from=&to=  → OHLCV history
GET    /stocks/:symbol/technical?timeframe=1day  → All TA indicators
GET    /stocks/:symbol/technical/:indicator  → Specific indicator history
GET    /stocks/:symbol/fundamental  → Latest fundamentals + ratios
GET    /stocks/:symbol/financials?type=income&period=quarterly  → Financial statements
GET    /stocks/:symbol/peers       → Peer comparison
GET    /stocks/:symbol/institutional  → FII/MF/Insider holdings
GET    /stocks/:symbol/news        → Stock-specific news
GET    /stocks/:symbol/events      → Corporate actions, earnings dates
GET    /stocks/:symbol/options     → Options chain (Phase 2)
GET    /stocks/:symbol/prediction  → ML price prediction
GET    /stocks/:symbol/sentiment   → Social + news sentiment
GET    /stocks/:symbol/shareholders  → Shareholding pattern quarterly
```

---

### PORTFOLIO APIs
```
GET    /portfolios                 → List all portfolios
POST   /portfolios                 → Create portfolio
GET    /portfolios/:id             → Portfolio summary
DELETE /portfolios/:id
GET    /portfolios/:id/holdings    → Holdings with live P&L
GET    /portfolios/:id/performance → XIRR, absolute return, day P&L
GET    /portfolios/:id/transactions  → Transaction history (paginated)
POST   /portfolios/:id/transactions  → Add buy/sell transaction
PUT    /portfolios/:id/transactions/:txnId  → Edit transaction
DELETE /portfolios/:id/transactions/:txnId
GET    /portfolios/:id/analytics   → Sector allocation, diversification score
GET    /portfolios/:id/export?format=csv  → Export transactions
```

---

### IPO APIs
```
GET    /ipo                        → All IPOs (filtered by status)
GET    /ipo/upcoming               → Upcoming IPOs
GET    /ipo/open                   → Currently open for subscription
GET    /ipo/recently-listed        → Listed in last 30 days
GET    /ipo/:id                    → IPO detail
GET    /ipo/:id/subscription       → Live subscription data
GET    /ipo/:id/gmp-history        → GMP trend over time
GET    /ipo/calendar               → Calendar view
```

---

### INSTITUTIONAL APIs
```
GET    /institutional/fii-dii      → FII/DII daily net flows
GET    /institutional/fii-dii/history?from=&to=  → Historical flows
GET    /institutional/block-deals?date=&exchange=  → Block/Bulk deals
GET    /institutional/mf-holdings/:symbol  → Mutual fund holders
GET    /institutional/insider-trades/:symbol  → Insider transactions
GET    /institutional/fii-dii/cumulative  → Monthly/Yearly cumulative
```

---

### WATCHLIST APIs
```
GET    /watchlists                 → All user watchlists
POST   /watchlists                 → Create watchlist
GET    /watchlists/:id             → Watchlist with live quotes
POST   /watchlists/:id/stocks      → Add stock to watchlist
DELETE /watchlists/:id/stocks/:symbol  → Remove stock
PATCH  /watchlists/:id/stocks/reorder  → Update sort order
```

---

### ALERTS APIs
```
GET    /alerts                     → User's active alerts
POST   /alerts                     → Create alert
PUT    /alerts/:id                 → Update alert
DELETE /alerts/:id                 → Delete alert
GET    /alerts/history             → Triggered alerts history
PATCH  /alerts/:id/toggle          → Enable/disable alert
```

---

### SCREENER API
```
POST   /screener/run               → Run custom screener with filters
GET    /screener/presets           → Predefined screener templates
GET    /screener/fields            → Available filter fields with min/max
POST   /screener/save              → Save screener query
GET    /screener/saved             → User's saved screeners
```

---

### PREDICTION API (ML Service Proxy)
```
GET    /predictions/:symbol        → Latest prediction for symbol
GET    /predictions/:symbol/history  → Past predictions + accuracy
GET    /predictions/accuracy       → Model accuracy leaderboard
GET    /predictions/top-picks      → Top AI picks for the day
```

---

### SEARCH API (Elasticsearch)
```
GET    /search?q=&type=stock,news,screener  → Unified search
GET    /search/autocomplete?q=             → Fast autocomplete
```

---

### NEWS API
```
GET    /news                       → Latest market news (paginated)
GET    /news/:id                   → Article detail
GET    /news/categories            → News by category
GET    /news/sentiment             → Market sentiment from news
```

---

### SUBSCRIPTION API
```
GET    /subscriptions/plans        → Available plans
POST   /subscriptions/subscribe    → Create subscription (Razorpay)
POST   /subscriptions/cancel
GET    /subscriptions/current      → Current plan details
POST   /subscriptions/webhook      → Razorpay webhook handler
```

---

## 7. ML/AI PREDICTION ENGINE

### Architecture Overview

The prediction system is a Python FastAPI microservice that serves pre-computed predictions stored in `stock_predictions` table. Training happens offline via Celery jobs.

### Feature Engineering (120+ Features)

```python
# apps/ml-service/app/features/technical_features.py

TECHNICAL_FEATURES = [
    # Price-based (30 features)
    'returns_1d', 'returns_5d', 'returns_20d', 'returns_60d',
    'rsi_14', 'rsi_oversold', 'rsi_overbought',
    'macd', 'macd_signal', 'macd_histogram', 'macd_bullish_cross',
    'bb_position',           # Where price is within Bollinger Bands (0-1)
    'bb_squeeze',            # Band width < 1% = squeeze
    'stoch_k', 'stoch_d', 'stoch_oversold',
    'ema_9_20_cross',        # 9 EMA crossed above 20 EMA
    'price_vs_ema50',        # % above/below 50 EMA
    'price_vs_ema200',       # % above/below 200 EMA
    'supertrend_signal',
    'atr_14', 'atr_ratio',   # ATR / current price
    'high_52w_pct',          # % from 52W high
    'low_52w_pct',           # % from 52W low
    
    # Volume features (15 features)
    'volume_ratio_20d',      # Today's volume / 20D avg
    'obv_trend',             # OBV slope
    'delivery_pct',
    'volume_price_trend',
    
    # Fundamental features (25 features)
    'pe_ratio', 'pe_vs_sector',
    'pb_ratio', 'ps_ratio',
    'roe', 'roce',
    'debt_to_equity',
    'revenue_growth_qoq', 'revenue_growth_yoy',
    'pat_growth_qoq', 'pat_growth_yoy',
    'eps_surprise_last',     # Last earnings surprise
    'free_cash_flow_yield',
    
    # Sentiment features (15 features)
    'news_sentiment_1d', 'news_sentiment_7d',
    'social_sentiment_24h',
    'fii_net_7d',            # 7-day FII net flow
    'dii_net_7d',
    'promoter_holding_chg',  # Recent promoter holding change
    'fear_greed_score',
    
    # Market/Macro features (20 features)
    'nifty_returns_1d', 'nifty_returns_5d',
    'sector_returns_5d',
    'india_vix',
    'usd_inr_change',
    'crude_oil_change',
    'us_10y_yield',
    'correlation_nifty_30d',
    'beta',
    
    # Pattern features (15 features)
    'bullish_engulfing', 'bearish_engulfing',
    'doji', 'hammer', 'shooting_star',
    'morning_star', 'evening_star',
    'support_distance',      # % from nearest support
    'resistance_distance',   # % from nearest resistance
]
```

### Models

```python
# apps/ml-service/app/models/ensemble.py

class StockSenseEnsemble:
    """
    Ensemble of 4 models with learned weights per horizon and sector.
    Final prediction = weighted average of all model outputs.
    """
    
    def __init__(self):
        self.models = {
            'xgboost':     XGBoostDirectionModel(),     # Best for direction prediction
            'lgbm':        LGBMReturnModel(),            # Best for return magnitude
            'lstm':        LSTMSequenceModel(),          # Best for trend continuation
            'prophet':     ProphetTrendModel(),          # Best for long-horizon (1M)
        }
        # Weights learned per (sector, horizon) pair via meta-learning
        self.weights = self._load_weights()
    
    def predict(self, symbol: str, horizon: str) -> Prediction:
        features = self.feature_store.get(symbol)
        
        predictions = {}
        for name, model in self.models.items():
            predictions[name] = model.predict(features)
        
        sector = self.get_sector(symbol)
        weights = self.weights[f"{sector}_{horizon}"]
        
        # Weighted ensemble
        final_price = sum(predictions[m]['price'] * weights[m] for m in self.models)
        final_direction_prob = sum(predictions[m]['direction_prob'] * weights[m] for m in self.models)
        
        # Confidence from prediction agreement
        price_std = np.std([p['price'] for p in predictions.values()])
        confidence = max(0, 1 - (price_std / features['current_price']))
        
        return Prediction(
            predicted_price=final_price,
            direction='up' if final_direction_prob > 0.5 else 'down',
            direction_probability=final_direction_prob,
            confidence=confidence,
            prediction_low=final_price - 2 * price_std,
            prediction_high=final_price + 2 * price_std,
            feature_importance=self._get_feature_importance(features),
        )
```

### Backtesting Framework
```python
# apps/ml-service/app/training/backtesting.py

class Backtester:
    """
    Walk-forward backtesting: train on 2 years, test on next month, slide forward.
    Prevents look-ahead bias.
    """
    def run(self, symbol: str, start: date, end: date) -> BacktestReport:
        results = []
        for train_end in monthly_windows(start, end):
            model = self.train_model(symbol, end=train_end)
            preds = self.test_month(model, symbol, train_end)
            results.extend(preds)
        
        return BacktestReport(
            accuracy=self.compute_directional_accuracy(results),
            sharpe_ratio=self.compute_sharpe(results),
            max_drawdown=self.compute_drawdown(results),
            win_rate=self.compute_win_rate(results),
        )
```

### Model Training Schedule
```yaml
# Celery beat schedule
CELERYBEAT_SCHEDULE:
  retrain-models-weekly:
    task: ml.train_all_models
    schedule: "0 2 * * 0"  # Sunday 2AM

  compute-predictions-daily:
    task: ml.compute_predictions
    schedule: "0 16 * * 1-5"  # After market close 4PM
    
  update-model-accuracy:
    task: ml.update_accuracy_scores
    schedule: "0 17 * * 1-5"  # 5PM daily
```

### FinBERT News Sentiment Pipeline
```python
# apps/ml-service/app/nlp/finbert_sentiment.py
from transformers import pipeline

class FinBERTSentimentAnalyzer:
    def __init__(self):
        # FinBERT — BERT model fine-tuned on financial text
        self.pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            device=0 if torch.cuda.is_available() else -1
        )
    
    def analyze_batch(self, texts: List[str]) -> List[SentimentResult]:
        results = self.pipeline(texts, truncation=True, max_length=512)
        return [
            SentimentResult(
                label=r['label'],
                score=r['score'] if r['label'] == 'positive' 
                      else -r['score'] if r['label'] == 'negative' else 0
            ) for r in results
        ]
    
    def get_stock_sentiment(self, symbol: str, hours: int = 24) -> float:
        articles = self.db.get_recent_news(symbol, hours)
        if not articles:
            return 0.0
        scores = self.analyze_batch([a.headline + ' ' + (a.summary or '') for a in articles])
        # Weight by recency and source credibility
        return np.average([s.score for s in scores], 
                          weights=[self.recency_weight(a.published_at) for a in articles])
```

---

## 8. REAL-TIME INFRASTRUCTURE

### Kafka Topic Architecture
```
Topics:
├── market.ticks              → Raw tick data from NSE/BSE (partitioned by symbol)
├── market.ohlcv.1min         → 1-minute aggregated candles
├── stock.events              → Corporate actions, circuit breakers
├── alerts.triggered          → Alert evaluation results
├── news.raw                  → Raw news articles from scrapers
├── news.enriched             → News after sentiment analysis
├── predictions.ready         → New ML predictions available
└── notifications.send        → Push/Email notification queue
```

### WebSocket Room Structure
```typescript
// Socket.io rooms
'market:overview'             → All users on market overview page
'stock:{symbol}'              → Users viewing a specific stock
'portfolio:{portfolioId}'     → Portfolio live updates
'user:{userId}:alerts'        → Personal alert notifications

// Event types emitted
'tick'                        → { symbol, price, change, volume, timestamp }
'index_update'                → { index, value, change, ... }
'alert_triggered'             → { alertId, symbol, price, message }
'prediction_ready'            → { symbol, prediction }
```

### NSE Data Ingestion Worker
```python
# apps/data-ingestion/workers/nse_tick_worker.py

class NSETickWorker:
    """
    Connects to NSE's WebSocket API for real-time tick data.
    Falls back to REST polling every 3s if WebSocket disconnects.
    """
    async def run(self):
        async with websockets.connect(NSE_WS_URL, headers=self.auth_headers) as ws:
            async for message in ws:
                tick = self.parse_tick(message)
                
                # Write to TimescaleDB
                await self.db.execute("""
                    INSERT INTO stock_prices (time, symbol, open, high, low, close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (time, symbol) DO UPDATE 
                    SET close = EXCLUDED.close, high = GREATEST(stock_prices.high, EXCLUDED.high),
                        low = LEAST(stock_prices.low, EXCLUDED.low), volume = EXCLUDED.volume
                """, tick.time, tick.symbol, tick.open, tick.high, tick.low, tick.close, tick.volume)
                
                # Push to Redis (for WebSocket broadcast)
                await self.redis.set(f"price:{tick.symbol}", tick.close, ex=60)
                await self.redis.publish(f"tick:{tick.symbol}", tick.to_json())
                
                # Send to Kafka for downstream consumers
                await self.kafka.send('market.ticks', key=tick.symbol, value=tick.to_json())
```

---

## 9. CACHING & OPTIMIZATION STRATEGY

### Redis Cache Layers

| Cache Key | TTL | Data |
|-----------|-----|------|
| `price:{symbol}` | 5s | Live price (market hours), 24h (after close) |
| `quote:{symbol}` | 10s | Full quote with change data |
| `indicators:{symbol}:{tf}` | 60s | Technical indicators |
| `fundamentals:{symbol}` | 1h | Fundamental ratios |
| `peers:{symbol}` | 4h | Peer comparison data |
| `news:{symbol}` | 5m | Stock-specific news |
| `market:overview` | 15s | Market overview page data |
| `market:indices` | 5s | Live index values |
| `ipo:list` | 5m | IPO calendar |
| `screener:{hash}` | 5m | Screener results |
| `prediction:{symbol}` | 4h | ML prediction results |
| `fii_dii:today` | 1h | Today's FII/DII flows |

### Database Query Optimization

```sql
-- For frequently-accessed stock price history:
-- Use TimescaleDB's skip scan optimization
SET enable_indexscan = on;
SET timescaledb.enable_chunk_skipping = on;

-- For screener queries, use partial indexes:
CREATE INDEX idx_large_cap ON stock_valuation(market_cap DESC)
    WHERE market_cap > 2000; -- Only large caps (> 2000 Cr)

CREATE INDEX idx_profitable ON company_fundamentals(roe DESC)
    WHERE roe > 0 AND period_type = 'annual';

-- For news sentiment queries:
CREATE INDEX idx_news_symbol_sentiment ON news_articles(symbols, sentiment_label, published_at DESC)
    WHERE published_at > NOW() - INTERVAL '7 days';
```

### Connection Pooling
```typescript
// PgBouncer for connection pooling
// apps/api/src/config/database.ts
import { Pool } from 'pg';

export const db = new Pool({
    max: 20,                  // Max connections per API instance
    min: 5,                   // Min idle connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Use READ REPLICA for all SELECT queries
});

export const readDb = new Pool({
    host: process.env.DB_READ_HOST,   // Read replica endpoint
    max: 30,
    // ... same config
});
```

---

## 10. SECURITY ARCHITECTURE

### JWT Token Strategy
```
Access Token:   15 minutes (in memory / short lived)
Refresh Token:  30 days (httpOnly cookie + DB stored)
API Key:        Never expiring (for developer API, rate limited)
```

### Rate Limiting (Redis-based)
```typescript
// Per endpoint rate limits by subscription tier
const RATE_LIMITS = {
    free: {
        '/api/stocks/:symbol/quote': { windowMs: 60000, max: 10 },
        '/api/predictions':          { windowMs: 60000, max: 2 },
        'default':                   { windowMs: 60000, max: 30 },
    },
    pro: {
        'default':                   { windowMs: 60000, max: 300 },
        '/api/predictions':          { windowMs: 60000, max: 50 },
    },
    elite: {
        'default':                   { windowMs: 60000, max: 1000 },
    },
    institutional: {
        'default':                   { windowMs: 60000, max: 10000 },
    }
};
```

### Security Middleware Stack
```typescript
app.use(helmet());                  // Security headers
app.use(cors(corsConfig));          // CORS
app.use(morgan('combined'));        // Request logging
app.use(compression());             // gzip
app.use(express.json({ limit: '10kb' })); // Body size limit
app.use(rateLimiter);               // Rate limiting
app.use(authMiddleware);            // JWT validation
app.use(subscriptionMiddleware);    // Feature access control
app.use(sanitizeInput);             // XSS prevention
```

### Data Encryption
```
PAN Number:           AES-256-GCM encrypted at application layer
Password:             bcrypt (saltRounds=12)
API Keys:             SHA-256 hashed (only show once on creation)
Sensitive JSONB:      Column-level encryption via pgcrypto
```

---

## 11. DEVOPS & INFRASTRUCTURE

### Local Development (docker-compose.yml)
```yaml
version: '3.9'
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: stocksense
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: localpass
    ports: ["5432:5432"]
    volumes: ["./data/postgres:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181

  elasticsearch:
    image: elasticsearch:8.11.0
    ports: ["9200:9200"]
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"

  api:
    build: ./apps/api
    ports: ["10000:10000"]
    depends_on: [postgres, redis, kafka]
    env_file: .env

  ml-service:
    build: ./apps/ml-service
    ports: ["8001:8001"]
    depends_on: [postgres, redis]
    environment:
      MODEL_PATH: /models
    volumes: ["./models:/models"]
```

### Production Kubernetes Architecture
```
EKS Cluster:
├── api-deployment          (3-10 pods, HPA on CPU/RPS)
├── ml-service-deployment   (2-4 pods, GPU nodes for inference)
├── websocket-deployment    (2-6 pods, sticky sessions)
├── worker-deployment       (2-4 pods, data ingestion)
├── scheduler-deployment    (1 pod, Celery beat)
└── nginx-ingress           (with SSL termination)

Managed Services:
├── RDS PostgreSQL + TimescaleDB (db.r6g.xlarge, Multi-AZ)
├── ElastiCache Redis Cluster (cache.r6g.large x3)
├── MSK Kafka (kafka.m5.large x3 brokers)
└── OpenSearch (for Elasticsearch)
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:integration

  build-push:
    needs: test
    steps:
      - name: Build Docker image
        run: docker build -t stocksense-api:${{ github.sha }} ./apps/api
      - name: Push to ECR
        run: aws ecr get-login-password | docker login --username AWS ...

  deploy:
    needs: build-push
    steps:
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/api api=stocksense-api:${{ github.sha }}
          kubectl rollout status deployment/api --timeout=5m
```

---

## 12. MONETIZATION ARCHITECTURE

### Subscription Tiers

| Feature | Free | Pro (₹499/mo) | Elite (₹1499/mo) | Institutional (₹9999/mo) |
|---------|------|--------------|------------------|--------------------------|
| Live Quotes | Delayed 15min | Real-time | Real-time | Real-time |
| Watchlists | 1 (5 stocks) | 10 (unlimited stocks) | Unlimited | Unlimited |
| Price Alerts | 3 | 50 | Unlimited | Unlimited |
| Technical Analysis | Basic (5 indicators) | All 15+ | All + Custom | All + API |
| Portfolio Tracking | 1 portfolio | 5 portfolios | Unlimited | Unlimited |
| AI Predictions | None | Top 50 stocks | All stocks | All + API access |
| News Sentiment | Basic | Advanced | All + Historical | All + API |
| Screener | 5 filters | 20 filters | All filters | All + API |
| API Access | None | None | None | Full REST + WS |
| Data Export | None | CSV | CSV + Excel | Full data dumps |
| Options Chain | None | None | Yes | Yes |

### Revenue Streams (Path to ₹10,000 Cr)
1. **B2C Subscriptions** — Pro/Elite retail investors (India has 180M+ demat accounts)
2. **B2B API** — FinTechs, robo-advisors, wealth management apps buying the data
3. **White Label** — Banks/brokers licensing the analytics platform
4. **Advisory Marketplace** — SEBI-registered advisors using platform, 20% revenue share
5. **Advertising** — Targeted financial product ads (mutual funds, insurance)
6. **Data Sales** — Anonymized sentiment + prediction data to hedge funds

---

## 13. 2-YEAR PHASE ROADMAP — STEP BY STEP

---

### YEAR 1 — FOUNDATION & PRODUCT-MARKET FIT (Months 1-12)

---

#### PHASE 0: Setup & Infrastructure (Month 1 — Weeks 1-4)

**Week 1: Development Environment**
- [ ] Initialize monorepo with Turborepo
- [ ] Set up Docker Compose (TimescaleDB, Redis, Kafka, Elasticsearch)
- [ ] Configure TypeScript, ESLint, Prettier across all apps
- [ ] Set up GitHub Actions CI (lint + test on every PR)
- [ ] Create all database migration files (V001 to V013)
- [ ] Seed stocks_master with all 2000+ NSE-listed stocks
- [ ] Set up Flyway for migration management

**Week 2: Auth System**
- [ ] Implement users, user_sessions tables
- [ ] JWT auth (access + refresh token pair)
- [ ] Google OAuth integration
- [ ] Email OTP verification (AWS SES)
- [ ] Password hashing (bcrypt)
- [ ] Rate limiting middleware
- [ ] Auth APIs: register, login, logout, refresh, forgot-password

**Week 3: Core Data Pipeline**
- [ ] NSE REST API integration for end-of-day data
- [ ] Data ingestion worker (Python Celery)
- [ ] Populate stock_prices with 5 years of historical data
- [ ] Set up TimescaleDB continuous aggregates (1min, 5min, 15min, 1day)
- [ ] Redis caching layer setup
- [ ] Kafka topics creation

**Week 4: API Foundation**
- [ ] Express.js server with all middleware
- [ ] Response builder utility (standard API response format)
- [ ] Error handler middleware
- [ ] Pagination utility
- [ ] Logging (Winston + ELK)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deploy to staging (AWS ECS or single EC2)

---

#### PHASE 1: Core Stock Data APIs (Months 2-3)

**Month 2, Week 1-2: Market & Stock APIs**
- [ ] GET /market/overview (indices, breadth, gainers/losers)
- [ ] GET /market/indices/:name with OHLCV history
- [ ] GET /stocks/search (Elasticsearch full-text)
- [ ] GET /stocks/:symbol (full profile)
- [ ] GET /stocks/:symbol/quote (live price from Redis)
- [ ] GET /stocks/:symbol/history (from TimescaleDB continuous aggregates)

**Month 2, Week 3-4: Technical Analysis**
- [ ] Implement all 15+ technical indicators in Node.js (using `technicalindicators` library)
- [ ] Store precomputed indicators in technical_indicators table
- [ ] GET /stocks/:symbol/technical API
- [ ] Background job to recompute indicators every 15 minutes (market hours)
- [ ] Cache indicator results in Redis (60s TTL during market hours)

**Month 3, Week 1-2: Fundamental Data**
- [ ] Integration with Screener.in API or NSE for quarterly results
- [ ] Populate company_fundamentals table
- [ ] Ratio computation service (P/E, P/B, ROE, ROCE etc.)
- [ ] GET /stocks/:symbol/fundamental API
- [ ] GET /stocks/:symbol/financials API (statements)
- [ ] Quarterly results sync Celery job

**Month 3, Week 3-4: Peer Comparison & Sector**
- [ ] Sector/Industry taxonomy seeding
- [ ] GET /stocks/:symbol/peers (same sector, sorted by market cap)
- [ ] Sector heatmap aggregation
- [ ] GET /market/sector-heatmap API
- [ ] 52-week high/low tracking
- [ ] GET /market/52-week-high and /52-week-low

---

#### PHASE 2: User Features (Months 4-5)

**Month 4: Portfolio Management**
- [ ] Portfolio CRUD APIs
- [ ] Transaction recording (buy/sell)
- [ ] FIFO cost basis computation
- [ ] Live P&L calculation
- [ ] XIRR service implementation
- [ ] Sector allocation analytics
- [ ] Portfolio export (CSV)
- [ ] Portfolio performance charts data

**Month 5: Watchlists, Alerts, IPO**
- [ ] Watchlist CRUD with reordering
- [ ] Price alert system (all 6 alert types)
- [ ] Alert evaluator background job (runs every 30s in market hours)
- [ ] Push notifications (Firebase FCM) for triggered alerts
- [ ] Email notifications (AWS SES)
- [ ] IPO calendar seeding and APIs
- [ ] IPO subscription data scraper
- [ ] GMP tracking

---

#### PHASE 3: Institutional & Advanced Data (Month 6)

- [ ] FII/DII daily data scraper and APIs
- [x] Block deals scraper (NSE/BSE data)
- [x] Mutual fund holdings data pipeline (SEBI monthly data)
- [x] Insider trading data ingestion
- [x] Shareholding pattern quarterly data
- [x] Corporate actions scraper
- [x] Earnings calendar seeding
- [x] GET /institutional/* APIs

---

#### PHASE 4: Real-Time Infrastructure (Month 7)

- [x] WebSocket server with Socket.io + Redis adapter
- [x] Live tick streaming from NSE WebSocket feed
- [x] Market overview real-time updates room
- [x] Per-stock live price rooms
- [x] Portfolio real-time P&L updates
- [x] Alert triggers via WebSocket
- [ ] Kafka consumer for tick-to-WebSocket pipeline
- [ ] Load test WebSocket at 10,000 concurrent connections
- [ ] Horizontal scaling setup

---

#### PHASE 5: News & Sentiment (Month 8)

- [ ] News scraper for Moneycontrol, ET, BS, Livemint
- [ ] NewsAPI.org integration
- [ ] News article storage and categorization
- [ ] FinBERT sentiment model setup in ml-service
- [ ] Batch sentiment processing Celery job
- [ ] Social sentiment scraper (Twitter/X API, Reddit)
- [ ] Fear & Greed Index computation
- [ ] GET /news/* APIs
- [ ] GET /stocks/:symbol/sentiment API

---

#### PHASE 6: ML Prediction Engine — Phase 1 (Month 9-10)

- [ ] Python FastAPI ml-service setup
- [ ] Feature engineering pipeline (120 features)
- [ ] XGBoost direction model (baseline)
- [ ] LightGBM return magnitude model
- [ ] MLflow model registry setup
- [ ] Train on NSE top 200 stocks (Nifty 200)
- [ ] Backtest framework implementation
- [ ] Validate: directional accuracy > 55% (baseline target)
- [ ] stock_predictions table population job
- [ ] GET /predictions/:symbol API
- [ ] Prediction accuracy tracking

---

#### PHASE 7: Monetization & Launch (Months 11-12)

**Month 11: Subscription System**
- [ ] subscription_plans table seeding (Free/Pro/Elite/Institutional)
- [ ] Razorpay subscription integration
- [ ] Webhook handler for subscription events
- [ ] Subscription middleware (feature gating)
- [ ] API rate limiting by subscription tier
- [ ] GET /subscriptions/* APIs
- [ ] Billing dashboard data

**Month 12: Production Hardening & Launch**
- [ ] Move to EKS (Kubernetes on AWS)
- [ ] TimescaleDB on RDS with Multi-AZ
- [ ] ElastiCache Redis cluster
- [ ] MSK Kafka cluster
- [ ] CloudFront CDN for static assets
- [ ] Load testing (k6): 10,000 RPS target
- [ ] Monitoring: Prometheus + Grafana dashboards
- [ ] Alerting: PagerDuty for P0 incidents
- [ ] Security audit
- [ ] **BETA LAUNCH** — invite 1,000 users
- [ ] **PUBLIC LAUNCH**

---

### YEAR 2 — SCALE & COMPETITIVE MOAT (Months 13-24)

---

#### PHASE 8: ML Prediction Engine — Phase 2 (Months 13-15)

- [ ] LSTM sequence model for temporal patterns
- [ ] Transformer (attention-based) model for multi-stock patterns
- [ ] Ensemble meta-learner (learns optimal weights per sector+horizon)
- [ ] Expand to ALL NSE-listed stocks (2000+)
- [ ] Add 1-week and 1-month prediction horizons
- [ ] Real-time feature store (Feast) integration
- [ ] Improve directional accuracy to > 62%
- [ ] Prediction confidence calibration
- [ ] Achieve Sharpe Ratio > 1.5 in backtest
- [ ] "AI Stock Picks of the Day" feature
- [ ] User feedback loop (thumbs up/down → model retraining signal)

---

#### PHASE 9: Options & Derivatives (Months 14-16)

- [ ] Options chain data from NSE (real-time)
- [ ] options_chain TimescaleDB hypertable
- [ ] Options Greeks computation (Black-Scholes)
- [ ] OI analysis, PCR ratio
- [ ] Max Pain calculation
- [ ] Put-Call Ratio trend
- [ ] Implied Volatility surface
- [ ] GET /stocks/:symbol/options API
- [ ] Options screener (high OI, unusual activity)
- [ ] Options P&L calculator tool

---

#### PHASE 10: Advanced Screener & Tools (Months 15-17)

- [ ] Dynamic screener engine (30+ filter conditions)
- [ ] Prebuilt screener templates (Buffett criteria, Graham number, momentum, etc.)
- [ ] Community screeners (public/private)
- [ ] Sector rotation analysis tool
- [ ] Relative strength ranking (RSR)
- [ ] Mean reversion signals
- [ ] Bulk/Block deal screener
- [ ] FII/DII flow screener
- [ ] Insider buying screener

---

#### PHASE 11: Developer API Platform (Months 16-18)

- [ ] API key management system
- [ ] API usage tracking and billing
- [ ] Public API documentation portal (Stoplight or Redocly)
- [ ] SDK packages: Python, Node.js, JavaScript
- [ ] GraphQL API endpoint
- [ ] WebSocket streaming API for external developers
- [ ] API marketplace listing (RapidAPI)
- [ ] Developer portal with sandbox environment
- [ ] Institutional data packages (bulk historical data)

---

#### PHASE 12: Social & Community Features (Months 17-19)

- [ ] Expert analyst profiles (SEBI RA verified)
- [ ] Analysis posts / trade ideas
- [ ] Portfolio sharing (optional, anonymized)
- [ ] Discussion threads per stock
- [ ] Follow system for analysts
- [ ] Prediction leaderboard (who predicted correctly)
- [ ] Paper trading (simulated portfolio with virtual ₹10L)
- [ ] Community watchlists

---

#### PHASE 13: Mobile API Optimization (Months 18-20)

- [ ] GraphQL for mobile (batched, efficient queries)
- [ ] Offline-first support (sync strategy)
- [ ] Push notification service hardening (FCM + APNs)
- [ ] Compressed WebSocket payload (protobuf)
- [ ] Smart caching headers
- [ ] Low-bandwidth mode API
- [ ] WebView APIs for embedded use

---

#### PHASE 14: Macro & Global Integration (Months 19-21)

- [ ] Global indices (S&P500, Nasdaq, DJIA, Hang Seng, Nikkei)
- [ ] USD/INR, EUR/INR FX rates
- [ ] Crude oil, Gold, Silver prices
- [ ] US Fed interest rate tracker
- [ ] RBI rate decisions calendar
- [ ] Macro dashboard (India GDP, CPI, IIP data from data.gov.in)
- [ ] DXY Dollar Index correlation
- [ ] Macro impact on sector predictions

---

#### PHASE 15: Enterprise & White-Label (Months 20-22)

- [ ] Multi-tenant architecture
- [ ] White-label API (custom branding)
- [ ] Broker integration (Zerodha Kite, AngelOne, Upstox APIs)
- [ ] Direct trade execution from platform (via broker API)
- [ ] SEBI-compliant reporting tools
- [ ] Compliance audit logs
- [ ] SSO (SAML/OAuth) for enterprise
- [ ] Custom data delivery (SFTP, S3)

---

#### PHASE 16: AI V2 — Natural Language & Generative (Months 21-23)

- [ ] NL query interface: "Show me profitable IT stocks with low PE"
- [ ] AI stock analysis reports (LLM-generated summaries)
- [ ] AI earnings call transcript analysis (NSE publishes PDFs)
- [ ] AI portfolio risk assessment
- [ ] AI-powered news summarization
- [ ] Voice interface for market queries
- [ ] Fine-tune LLM on Indian financial corpus (regulatory filings, earnings)

---

#### PHASE 17: Geographic Expansion (Months 22-24)

- [ ] Sri Lanka Stock Exchange (CSE) integration
- [ ] Bangladesh Stock Exchange
- [ ] SGX (Singapore, for NRIs)
- [ ] Multi-currency portfolio tracking
- [ ] Currency-adjusted returns
- [ ] NRI-specific features (DTAA, foreign portfolio)
- [ ] Multi-language UI (Hindi, Gujarati, Tamil, Telugu)

---

#### PHASE 18: Continuous Excellence (Month 24 — Ongoing)

- [ ] ML model accuracy review: directional accuracy target > 65%
- [ ] Database performance audit (EXPLAIN ANALYZE on all slow queries)
- [ ] P99 API latency < 200ms for all endpoints
- [ ] Security penetration testing (external firm)
- [ ] SOC 2 Type II certification
- [ ] ISO 27001 certification
- [ ] SEBI RA + RIA license (for advisory features)
- [ ] RBI payment aggregator license (for subscription billing)
- [ ] Series A fundraise preparation
- [ ] 1M monthly active users milestone

---

## APPENDIX A: KEY TECHNICAL METRICS TARGETS

| Metric | Month 6 Target | Month 12 Target | Month 24 Target |
|--------|---------------|-----------------|-----------------|
| API P50 latency | < 100ms | < 50ms | < 30ms |
| API P99 latency | < 500ms | < 200ms | < 100ms |
| WebSocket connections | 1,000 | 10,000 | 100,000 |
| DB queries/sec | 500 | 5,000 | 50,000 |
| Data freshness (live) | 5s | 2s | < 1s |
| Prediction accuracy (1D direction) | 55% | 60% | 65%+ |
| System uptime | 99% | 99.5% | 99.95% |
| TimescaleDB compression ratio | — | 10:1 | 10:1 |

---

## APPENDIX B: NSE DATA SOURCES & APIs

| Data | Source | Frequency |
|------|--------|-----------|
| Live tick data | NSE WebSocket / Broker API | Real-time |
| EOD price data | NSE Bhav Copy (free) | Daily |
| FII/DII flows | SEBI website | Daily |
| Financial results | BSE/NSE corporate filings | Quarterly |
| MF holdings | AMFI / SEBI | Monthly |
| Insider trades | SEBI + NSE | Real-time filing |
| Block deals | NSE/BSE websites | Daily |
| IPO data | SEBI DRHP portal + NSE | As published |
| Economic data | RBI, data.gov.in | As published |
| Global macro | Alpha Vantage, Quandl | Daily |

---

## APPENDIX C: COST ESTIMATION (Year 1 Production)

| Service | Spec | Monthly Cost (USD) |
|---------|------|-------------------|
| RDS PostgreSQL+TimescaleDB | db.r6g.xlarge Multi-AZ | $450 |
| EKS Cluster (3 nodes) | m5.xlarge | $350 |
| ElastiCache Redis | r6g.large x3 | $280 |
| MSK Kafka | m5.large x3 | $350 |
| OpenSearch | r6g.large x2 | $250 |
| EC2 (ML service) | g4dn.xlarge (GPU) | $380 |
| S3 + CloudFront | Storage + CDN | $80 |
| SES (email) | 500k emails/mo | $50 |
| **Total** | | **~$2,190/month** |

At 1,000 Pro subscribers (₹499/mo = ~$6/mo), monthly revenue = $6,000 → profitable from 400 subscribers.

---

*Document Version: 1.0 | Created: April 2026 | Stock Sense Backend Master Plan*
*"From a stock tracker to the Bloomberg of India — one commit at a time."*


## Full Source B (Complete Copy for Traceability)

# Requirements Document: Scalable Stock Prediction Backend

## Introduction

This document specifies the requirements for a production-ready, highly scalable backend system for a stock market prediction platform. The system will serve millions of users with real-time stock data, market analysis, IPO tracking, news aggregation, portfolio management, and AI-powered stock predictions. The architecture is designed to support a 2-year growth trajectory toward building a multi-billion dollar company.

The backend will integrate with an existing Next.js frontend and provide RESTful APIs, GraphQL endpoints, and WebSocket connections for real-time data streaming. The system will leverage microservices architecture, distributed caching, message queues, and machine learning pipelines to deliver accurate predictions and handle high-volume traffic.

## Glossary

- **API_Gateway**: The entry point for all client requests that routes traffic to appropriate microservices
- **Stock_Service**: Microservice responsible for stock data management, real-time prices, and historical data
- **IPO_Service**: Microservice managing IPO listings, bidding information, and subscription tracking
- **News_Service**: Microservice aggregating and serving financial news from multiple sources
- **Prediction_Service**: Microservice serving ML-based stock predictions and recommendations
- **Portfolio_Service**: Microservice managing user portfolios, holdings, and performance tracking
- **Auth_Service**: Microservice handling user authentication, authorization, and session management
- **Market_Service**: Microservice tracking market indices, sector performance, and commodities
- **Data_Pipeline**: ETL system for ingesting, transforming, and loading data from external sources
- **ML_Pipeline**: Machine learning infrastructure for training, versioning, and deploying prediction models
- **Cache_Layer**: Distributed caching system using Redis for high-performance data retrieval
- **Message_Queue**: Asynchronous message broker (Kafka/RabbitMQ) for inter-service communication
- **Time_Series_DB**: TimescaleDB instance optimized for storing and querying time-series stock data
- **Primary_DB**: PostgreSQL database for relational data storage
- **WebSocket_Server**: Real-time bidirectional communication server for live data streaming
- **Rate_Limiter**: Component enforcing API usage limits per user/IP address
- **Load_Balancer**: Traffic distribution system across multiple service instances
- **Model_Registry**: Versioned storage for ML models with metadata and performance metrics
- **Feature_Store**: Centralized repository for ML features used in prediction models
- **Monitoring_System**: Observability stack including logging, metrics, and alerting (ELK, Prometheus, Grafana)
- **CI_CD_Pipeline**: Automated build, test, and deployment infrastructure
- **Backup_System**: Automated database backup and disaster recovery mechanism
- **Third_Party_Provider**: External APIs for market data (NSE, BSE, financial data vendors)
- **Client_Application**: Frontend Next.js application consuming backend APIs
- **Admin_Dashboard**: Internal tool for system monitoring, user management, and configuration
- **Compliance_Module**: Component ensuring regulatory compliance and data privacy (GDPR, financial regulations)

## Requirements

### Requirement 1: Backend Architecture Foundation

**User Story:** As a platform architect, I want a scalable microservices-based backend architecture, so that the system can handle millions of users and scale horizontally as demand grows.

#### Acceptance Criteria

1. THE API_Gateway SHALL route incoming requests to appropriate microservices based on URL patterns and load balancing algorithms
2. THE Backend_System SHALL implement microservices for Stock_Service, IPO_Service, News_Service, Prediction_Service, Portfolio_Service, Auth_Service, and Market_Service as independent deployable units
3. WHEN a microservice fails, THE Load_Balancer SHALL redirect traffic to healthy instances without service interruption
4. THE Backend_System SHALL organize code in a modular folder structure with separation of concerns (controllers, services, repositories, models, middleware)
5. THE API_Gateway SHALL enforce rate limiting of 1000 requests per minute for authenticated users and 100 requests per minute for anonymous users
6. THE Backend_System SHALL implement service discovery for dynamic microservice registration and health checking
7. WHEN system load exceeds 70% capacity, THE Auto_Scaling_System SHALL provision additional service instances within 2 minutes

### Requirement 2: Database Schema and Data Management

**User Story:** As a backend developer, I want a comprehensive PostgreSQL database schema with TimescaleDB for time-series data, so that I can efficiently store and query stock prices, user data, and financial information.

#### Acceptance Criteria

1. THE Primary_DB SHALL implement tables for users, stocks, market_indices, ipos, news_articles, portfolios, portfolio_holdings, watchlists, alerts, financial_statements, company_profiles, sectors, commodities, user_sessions, api_keys, and audit_logs
2. THE Time_Series_DB SHALL store stock_prices with columns (stock_id, timestamp, open, high, low, close, volume, vwap) partitioned by time intervals of 7 days
3. THE Time_Series_DB SHALL store intraday_prices with 1-minute granularity for real-time charting
4. THE Primary_DB SHALL implement B-tree indexes on frequently queried columns (stock_symbol, user_id, timestamp, sector_id)
5. THE Primary_DB SHALL implement composite indexes on (stock_id, timestamp) for time-range queries
6. THE Primary_DB SHALL enforce foreign key constraints between related tables (portfolios.user_id → users.id, portfolio_holdings.stock_id → stocks.id)
7. THE Primary_DB SHALL partition large tables (stock_prices, news_articles) by date ranges to optimize query performance
8. THE Primary_DB SHALL implement JSONB columns for flexible schema fields (company_profiles.metadata, stocks.technical_indicators)
9. WHEN a database query exceeds 500ms execution time, THE Monitoring_System SHALL log a slow query warning
10. THE Backup_System SHALL create automated daily backups of Primary_DB and Time_Series_DB with 30-day retention


### Requirement 3: RESTful API Design and Implementation

**User Story:** As a frontend developer, I want well-designed RESTful APIs with consistent response formats, so that I can easily integrate backend services with the Next.js application.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose RESTful endpoints following pattern /api/v1/{resource} for all services
2. THE Stock_Service SHALL provide endpoints: GET /api/v1/stocks, GET /api/v1/stocks/{symbol}, GET /api/v1/stocks/{symbol}/prices, GET /api/v1/stocks/{symbol}/historical
3. THE IPO_Service SHALL provide endpoints: GET /api/v1/ipos, GET /api/v1/ipos/{id}, GET /api/v1/ipos/upcoming, GET /api/v1/ipos/current, GET /api/v1/ipos/past
4. THE News_Service SHALL provide endpoints: GET /api/v1/news, GET /api/v1/news/{category}, GET /api/v1/news/trending, GET /api/v1/news/alerts
5. THE Portfolio_Service SHALL provide endpoints: GET /api/v1/portfolios, POST /api/v1/portfolios, GET /api/v1/portfolios/{id}/holdings, POST /api/v1/portfolios/{id}/holdings, DELETE /api/v1/portfolios/{id}/holdings/{holding_id}
6. THE Market_Service SHALL provide endpoints: GET /api/v1/indices, GET /api/v1/sectors, GET /api/v1/commodities
7. THE Prediction_Service SHALL provide endpoints: GET /api/v1/predictions/{symbol}, POST /api/v1/predictions/batch
8. WHEN an API request succeeds, THE API_Gateway SHALL return responses with status code 200 and JSON format {success: true, data: {}, metadata: {}}
9. WHEN an API request fails, THE API_Gateway SHALL return error responses with appropriate status codes (400, 401, 403, 404, 500) and format {success: false, error: {code, message, details}}
10. THE API_Gateway SHALL implement pagination for list endpoints with query parameters (page, limit, sort, order) and return metadata (total_count, page, limit, has_next)
11. THE API_Gateway SHALL support filtering and search via query parameters (symbol, sector, date_from, date_to, category)
12. THE API_Gateway SHALL include response headers (X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID) for debugging and monitoring

### Requirement 4: GraphQL API for Complex Queries

**User Story:** As a frontend developer, I want a GraphQL API for complex nested queries, so that I can fetch related data in a single request and reduce network overhead.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose a GraphQL endpoint at /api/v1/graphql
2. THE GraphQL_Server SHALL implement types for Stock, IPO, News, Portfolio, User, MarketIndex, Sector, Commodity, Prediction
3. THE GraphQL_Server SHALL implement queries: stock(symbol), stocks(filter), ipo(id), ipos(status), news(category), portfolio(id), marketIndices, predictions(symbol)
4. THE GraphQL_Server SHALL implement mutations: createPortfolio, addHolding, removeHolding, createAlert, updateWatchlist
5. THE GraphQL_Server SHALL support nested queries to fetch related data (stock with company_profile, financial_statements, and predictions in one request)
6. THE GraphQL_Server SHALL implement DataLoader pattern to batch and cache database queries and prevent N+1 query problems
7. WHEN a GraphQL query exceeds depth of 5 levels, THE GraphQL_Server SHALL reject the query with error "Query too complex"
8. THE GraphQL_Server SHALL enforce query complexity limits of 1000 points per request to prevent resource exhaustion

### Requirement 5: WebSocket Real-Time Data Streaming

**User Story:** As a user, I want real-time stock price updates without refreshing the page, so that I can make timely investment decisions based on live market data.

#### Acceptance Criteria

1. THE WebSocket_Server SHALL accept client connections at wss://api.domain.com/ws
2. WHEN a client connects, THE WebSocket_Server SHALL authenticate the connection using JWT tokens
3. THE WebSocket_Server SHALL support subscription messages with format {action: "subscribe", channel: "stock_prices", symbols: ["RELIANCE", "TCS"]}
4. WHEN a stock price updates, THE WebSocket_Server SHALL broadcast messages to subscribed clients within 100ms
5. THE WebSocket_Server SHALL support channels: stock_prices, market_indices, ipo_updates, news_alerts, portfolio_updates
6. THE WebSocket_Server SHALL limit each client to 50 concurrent subscriptions
7. WHEN a client disconnects, THE WebSocket_Server SHALL clean up subscriptions and release resources
8. THE WebSocket_Server SHALL implement heartbeat ping/pong messages every 30 seconds to detect stale connections
9. THE WebSocket_Server SHALL compress messages using permessage-deflate to reduce bandwidth usage

### Requirement 6: Authentication and Authorization System

**User Story:** As a user, I want secure authentication with JWT tokens and OAuth support, so that my account and portfolio data are protected from unauthorized access.

#### Acceptance Criteria

1. THE Auth_Service SHALL implement user registration with email verification
2. THE Auth_Service SHALL implement login with email/password and return JWT access tokens (15-minute expiry) and refresh tokens (7-day expiry)
3. THE Auth_Service SHALL support OAuth 2.0 authentication with Google and Facebook providers
4. THE Auth_Service SHALL hash passwords using bcrypt with salt rounds of 12
5. THE Auth_Service SHALL implement role-based access control (RBAC) with roles: user, premium_user, admin
6. THE API_Gateway SHALL validate JWT tokens on protected endpoints and reject requests with expired or invalid tokens
7. THE Auth_Service SHALL implement token refresh endpoint POST /api/v1/auth/refresh that accepts refresh tokens and returns new access tokens
8. THE Auth_Service SHALL implement logout endpoint that invalidates refresh tokens
9. THE Auth_Service SHALL implement rate limiting of 5 failed login attempts per IP address within 15 minutes, then block for 1 hour
10. THE Auth_Service SHALL store user sessions in Redis with automatic expiration
11. THE Auth_Service SHALL implement API key authentication for third-party integrations with scoped permissions


### Requirement 7: Stock Prediction Machine Learning Pipeline

**User Story:** As a data scientist, I want a complete ML pipeline for training and deploying stock prediction models, so that the platform can provide accurate AI-powered investment recommendations.

#### Acceptance Criteria

1. THE ML_Pipeline SHALL implement feature engineering to extract technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands) from historical stock prices
2. THE ML_Pipeline SHALL implement feature engineering to extract fundamental features from financial statements (P/E ratio, debt-to-equity, revenue growth, profit margins)
3. THE ML_Pipeline SHALL implement sentiment analysis on news articles to generate sentiment scores for each stock
4. THE Feature_Store SHALL store computed features with versioning and timestamps for reproducibility
5. THE ML_Pipeline SHALL support training multiple model types (LSTM, GRU, Transformer, XGBoost, Random Forest) for ensemble predictions
6. THE ML_Pipeline SHALL implement automated model training on a weekly schedule using the latest 5 years of historical data
7. THE ML_Pipeline SHALL split data into training (70%), validation (15%), and test (15%) sets with temporal ordering preserved
8. THE ML_Pipeline SHALL evaluate models using metrics: RMSE, MAE, MAPE, directional accuracy, and Sharpe ratio
9. THE Model_Registry SHALL store trained models with metadata (training_date, features_used, hyperparameters, performance_metrics, version)
10. WHEN a new model achieves 5% better performance than the current production model, THE ML_Pipeline SHALL trigger a model promotion workflow
11. THE Prediction_Service SHALL load models from Model_Registry and serve predictions with latency under 200ms
12. THE Prediction_Service SHALL implement A/B testing to compare predictions from different model versions with 10% traffic split
13. THE ML_Pipeline SHALL implement model monitoring to detect data drift and trigger retraining when prediction accuracy drops below 60%
14. THE ML_Pipeline SHALL generate prediction confidence scores and uncertainty estimates for each prediction
15. THE Prediction_Service SHALL cache predictions in Redis with 1-hour TTL to reduce computation costs

### Requirement 8: Data Ingestion and ETL Pipeline

**User Story:** As a backend engineer, I want automated data pipelines to ingest stock prices, news, and financial data from external sources, so that the platform always has up-to-date information.

#### Acceptance Criteria

1. THE Data_Pipeline SHALL integrate with Third_Party_Providers (NSE API, BSE API, financial data vendors) to fetch real-time stock prices
2. THE Data_Pipeline SHALL fetch stock prices every 1 minute during market hours (9:15 AM - 3:30 PM IST) and every 15 minutes after hours
3. THE Data_Pipeline SHALL fetch end-of-day historical prices daily at 6:00 PM IST
4. THE Data_Pipeline SHALL fetch IPO data from SEBI and stock exchange websites daily at 8:00 AM IST
5. THE Data_Pipeline SHALL aggregate news from multiple sources (RSS feeds, news APIs, web scraping) every 5 minutes
6. THE Data_Pipeline SHALL fetch financial statements quarterly within 24 hours of company earnings releases
7. THE Data_Pipeline SHALL implement data validation to check for missing values, outliers, and data quality issues
8. WHEN data validation fails, THE Data_Pipeline SHALL log errors and send alerts to the monitoring system
9. THE Data_Pipeline SHALL implement idempotent data ingestion to handle duplicate data and retries safely
10. THE Data_Pipeline SHALL transform raw data into normalized formats before storing in databases
11. THE Data_Pipeline SHALL use Message_Queue to decouple data ingestion from processing for fault tolerance
12. THE Data_Pipeline SHALL implement exponential backoff retry logic with maximum 5 attempts when Third_Party_Provider APIs fail
13. THE Data_Pipeline SHALL track data freshness metrics and alert when data is stale beyond 10 minutes during market hours

### Requirement 9: Caching Strategy for Performance Optimization

**User Story:** As a backend engineer, I want multi-layer caching with Redis and CDN, so that the system can serve high-traffic requests with low latency and reduced database load.

#### Acceptance Criteria

1. THE Cache_Layer SHALL implement Redis cluster with master-replica configuration for high availability
2. THE Cache_Layer SHALL cache frequently accessed data: stock prices (1-minute TTL), market indices (30-second TTL), stock lists (5-minute TTL)
3. THE Cache_Layer SHALL cache API responses with cache keys based on endpoint, query parameters, and user permissions
4. THE Cache_Layer SHALL implement cache-aside pattern where services check cache before querying databases
5. WHEN cache misses occur, THE Service SHALL fetch data from database, store in cache, and return to client
6. THE Cache_Layer SHALL implement cache invalidation when underlying data changes (stock price updates, portfolio modifications)
7. THE Cache_Layer SHALL use Redis pub/sub for cache invalidation across multiple service instances
8. THE API_Gateway SHALL implement HTTP caching headers (Cache-Control, ETag, Last-Modified) for client-side caching
9. THE CDN SHALL cache static assets (company logos, charts, images) with 24-hour TTL
10. THE Cache_Layer SHALL implement cache warming for popular stocks during pre-market hours
11. THE Cache_Layer SHALL monitor cache hit rates and alert when hit rate drops below 80%
12. THE Cache_Layer SHALL implement cache compression for large objects to reduce memory usage


### Requirement 10: Message Queue for Asynchronous Processing

**User Story:** As a backend engineer, I want a message queue system for asynchronous task processing, so that long-running operations don't block API responses and the system can handle traffic spikes.

#### Acceptance Criteria

1. THE Message_Queue SHALL implement Apache Kafka for high-throughput event streaming with topics: stock_price_updates, news_ingestion, prediction_requests, email_notifications, audit_logs
2. THE Message_Queue SHALL implement RabbitMQ for task queues with queues: portfolio_calculations, report_generation, data_exports, batch_predictions
3. THE Stock_Service SHALL publish stock price updates to Kafka topic for real-time distribution to WebSocket_Server and Cache_Layer
4. THE News_Service SHALL consume news_ingestion messages, process articles, and store in Primary_DB
5. THE Prediction_Service SHALL consume prediction_requests from queue, generate predictions asynchronously, and publish results
6. THE Message_Queue SHALL implement dead letter queues for failed messages with automatic retry after 5 minutes
7. THE Message_Queue SHALL guarantee at-least-once delivery semantics for critical operations (portfolio updates, transactions)
8. THE Message_Queue SHALL implement message partitioning by stock_symbol to ensure ordered processing per stock
9. THE Message_Queue SHALL implement consumer groups for parallel processing with automatic load balancing
10. WHEN message processing fails 3 times, THE Message_Queue SHALL move message to dead letter queue and alert monitoring system
11. THE Message_Queue SHALL retain messages for 7 days for replay and debugging purposes
12. THE Message_Queue SHALL monitor queue depths and alert when queue size exceeds 10,000 messages

### Requirement 11: Database Query Optimization and Indexing

**User Story:** As a database administrator, I want optimized database queries with proper indexing, so that the system can handle millions of queries per day with sub-second response times.

#### Acceptance Criteria

1. THE Primary_DB SHALL implement B-tree indexes on columns: stocks.symbol, users.email, portfolios.user_id, news_articles.category, ipos.status
2. THE Primary_DB SHALL implement composite indexes on (stock_id, timestamp DESC) for time-series queries
3. THE Primary_DB SHALL implement GIN indexes on JSONB columns for efficient JSON querying
4. THE Primary_DB SHALL implement full-text search indexes on news_articles.title and news_articles.content using PostgreSQL tsvector
5. THE Time_Series_DB SHALL use TimescaleDB hypertables with automatic chunk creation for stock_prices table
6. THE Time_Series_DB SHALL implement continuous aggregates for pre-computed metrics (daily OHLC, weekly averages, monthly statistics)
7. THE Primary_DB SHALL implement materialized views for complex aggregations (sector performance, top gainers/losers) with hourly refresh
8. THE Primary_DB SHALL use connection pooling with minimum 10 and maximum 100 connections per service
9. THE Primary_DB SHALL implement read replicas for read-heavy operations with automatic failover
10. THE Primary_DB SHALL implement query result caching at database level for repeated queries
11. WHEN a query performs full table scan on tables with more than 100,000 rows, THE Monitoring_System SHALL log a warning
12. THE Primary_DB SHALL implement database partitioning for tables exceeding 10 million rows

### Requirement 12: Horizontal Scaling and Load Balancing

**User Story:** As a DevOps engineer, I want horizontal scaling capabilities with load balancing, so that the system can automatically scale to handle millions of concurrent users.

#### Acceptance Criteria

1. THE Load_Balancer SHALL distribute incoming requests across multiple API_Gateway instances using round-robin algorithm
2. THE Load_Balancer SHALL implement health checks every 10 seconds and remove unhealthy instances from rotation
3. THE Load_Balancer SHALL implement sticky sessions for WebSocket connections to maintain connection state
4. THE Backend_System SHALL deploy each microservice with minimum 2 instances for high availability
5. WHEN CPU utilization exceeds 70% for 5 minutes, THE Auto_Scaling_System SHALL add new service instances
6. WHEN CPU utilization drops below 30% for 10 minutes, THE Auto_Scaling_System SHALL remove excess instances
7. THE Backend_System SHALL implement stateless services that can scale horizontally without session affinity
8. THE Backend_System SHALL use Kubernetes for container orchestration with automatic pod scheduling and scaling
9. THE Backend_System SHALL implement circuit breakers to prevent cascading failures when downstream services are unavailable
10. THE Backend_System SHALL implement request timeouts of 30 seconds to prevent resource exhaustion
11. THE Backend_System SHALL implement graceful shutdown to drain connections before terminating instances
12. THE Load_Balancer SHALL support blue-green deployments for zero-downtime updates

### Requirement 13: Monitoring, Logging, and Observability

**User Story:** As a DevOps engineer, I want comprehensive monitoring and logging infrastructure, so that I can detect issues proactively and debug problems quickly.

#### Acceptance Criteria

1. THE Monitoring_System SHALL implement Prometheus for metrics collection with 15-second scrape intervals
2. THE Monitoring_System SHALL implement Grafana dashboards for visualizing metrics: request rates, error rates, latency percentiles, CPU/memory usage, database connections
3. THE Monitoring_System SHALL implement ELK stack (Elasticsearch, Logstash, Kibana) for centralized log aggregation
4. THE Backend_System SHALL log all API requests with fields: timestamp, request_id, user_id, endpoint, method, status_code, response_time, error_message
5. THE Backend_System SHALL implement structured logging in JSON format for machine parsing
6. THE Backend_System SHALL implement distributed tracing using OpenTelemetry to track requests across microservices
7. THE Monitoring_System SHALL implement alerting rules for critical conditions: error rate > 5%, latency p95 > 1000ms, database connection pool exhausted, disk usage > 80%
8. THE Monitoring_System SHALL send alerts via email, Slack, and PagerDuty based on severity levels
9. THE Monitoring_System SHALL implement application performance monitoring (APM) to track slow transactions and database queries
10. THE Monitoring_System SHALL track business metrics: daily active users, API usage per endpoint, prediction accuracy, revenue metrics
11. THE Monitoring_System SHALL implement log retention policy: 7 days hot storage, 90 days cold storage, then deletion
12. THE Monitoring_System SHALL implement uptime monitoring with external health checks every 1 minute


### Requirement 14: Security and Compliance

**User Story:** As a security engineer, I want comprehensive security measures and compliance controls, so that user data is protected and the platform meets financial regulatory requirements.

#### Acceptance Criteria

1. THE Backend_System SHALL encrypt all data in transit using TLS 1.3
2. THE Primary_DB SHALL encrypt all data at rest using AES-256 encryption
3. THE Backend_System SHALL implement input validation and sanitization to prevent SQL injection, XSS, and CSRF attacks
4. THE Backend_System SHALL implement CORS policies to restrict API access to authorized domains
5. THE Backend_System SHALL implement security headers (HSTS, X-Frame-Options, X-Content-Type-Options, CSP)
6. THE Auth_Service SHALL implement multi-factor authentication (MFA) for premium users and admins
7. THE Backend_System SHALL implement API request signing for sensitive operations (portfolio transactions, account changes)
8. THE Backend_System SHALL mask sensitive data in logs (passwords, tokens, credit card numbers, PII)
9. THE Compliance_Module SHALL implement GDPR compliance with user data export and deletion capabilities
10. THE Compliance_Module SHALL implement audit logging for all data access and modifications with immutable logs
11. THE Backend_System SHALL implement rate limiting per user and per IP to prevent abuse and DDoS attacks
12. THE Backend_System SHALL conduct automated security scanning for vulnerabilities in dependencies
13. THE Backend_System SHALL implement secrets management using HashiCorp Vault or AWS Secrets Manager
14. THE Backend_System SHALL implement role-based access control for admin operations with principle of least privilege
15. THE Backend_System SHALL implement data retention policies compliant with financial regulations (7 years for transaction data)

### Requirement 15: CI/CD Pipeline and Deployment Automation

**User Story:** As a DevOps engineer, I want automated CI/CD pipelines for testing and deployment, so that code changes can be deployed safely and quickly to production.

#### Acceptance Criteria

1. THE CI_CD_Pipeline SHALL trigger automated builds on every git push to main branch
2. THE CI_CD_Pipeline SHALL run unit tests with minimum 80% code coverage requirement
3. THE CI_CD_Pipeline SHALL run integration tests against test databases and mock external services
4. THE CI_CD_Pipeline SHALL run static code analysis and linting to enforce code quality standards
5. THE CI_CD_Pipeline SHALL run security scanning for vulnerabilities in dependencies and container images
6. THE CI_CD_Pipeline SHALL build Docker images and push to container registry with semantic versioning tags
7. THE CI_CD_Pipeline SHALL deploy to staging environment automatically after successful builds
8. THE CI_CD_Pipeline SHALL run smoke tests and end-to-end tests in staging environment
9. THE CI_CD_Pipeline SHALL require manual approval for production deployments
10. THE CI_CD_Pipeline SHALL implement blue-green deployment strategy for zero-downtime releases
11. THE CI_CD_Pipeline SHALL implement automatic rollback when health checks fail after deployment
12. THE CI_CD_Pipeline SHALL implement database migration automation with rollback capabilities
13. THE CI_CD_Pipeline SHALL send deployment notifications to team Slack channel with deployment status and changelog
14. THE CI_CD_Pipeline SHALL implement infrastructure as code using Terraform or CloudFormation
15. THE CI_CD_Pipeline SHALL maintain deployment history and artifacts for 90 days

### Requirement 16: Backup and Disaster Recovery

**User Story:** As a database administrator, I want automated backup and disaster recovery procedures, so that data can be restored quickly in case of failures or data corruption.

#### Acceptance Criteria

1. THE Backup_System SHALL create automated full database backups daily at 2:00 AM UTC
2. THE Backup_System SHALL create incremental backups every 6 hours
3. THE Backup_System SHALL store backups in geographically distributed locations (minimum 2 regions)
4. THE Backup_System SHALL encrypt backups using AES-256 encryption
5. THE Backup_System SHALL retain daily backups for 30 days, weekly backups for 90 days, and monthly backups for 1 year
6. THE Backup_System SHALL test backup restoration monthly to verify backup integrity
7. THE Backup_System SHALL implement point-in-time recovery capability with 5-minute granularity
8. THE Backup_System SHALL maintain recovery time objective (RTO) of 1 hour and recovery point objective (RPO) of 5 minutes
9. THE Backup_System SHALL implement automated failover to standby database replicas within 30 seconds
10. THE Backup_System SHALL document disaster recovery procedures with step-by-step runbooks
11. THE Backup_System SHALL conduct disaster recovery drills quarterly to validate procedures
12. THE Backup_System SHALL backup Redis cache state for critical data with 1-hour intervals

### Requirement 17: Third-Party Integration Management

**User Story:** As a backend engineer, I want robust third-party API integration with error handling and fallbacks, so that external service failures don't break the platform.

#### Acceptance Criteria

1. THE Data_Pipeline SHALL integrate with NSE API for real-time stock prices with API key authentication
2. THE Data_Pipeline SHALL integrate with BSE API for stock data with fallback to alternative providers
3. THE News_Service SHALL integrate with news APIs (NewsAPI, Google News, RSS feeds) with aggregation from minimum 5 sources
4. THE Backend_System SHALL implement circuit breaker pattern for third-party API calls with 50% failure threshold
5. WHEN Third_Party_Provider API fails, THE Backend_System SHALL use cached data and mark data as stale
6. THE Backend_System SHALL implement request timeout of 10 seconds for third-party API calls
7. THE Backend_System SHALL implement exponential backoff retry with maximum 3 attempts for failed API calls
8. THE Backend_System SHALL monitor third-party API usage and alert when approaching rate limits
9. THE Backend_System SHALL implement webhook endpoints for receiving real-time data from providers
10. THE Backend_System SHALL validate and sanitize all data received from third-party sources
11. THE Backend_System SHALL maintain service level agreements (SLAs) documentation for each third-party provider
12. THE Backend_System SHALL implement fallback data sources for critical data (stock prices, market indices)


### Requirement 18: Testing Strategy and Quality Assurance

**User Story:** As a QA engineer, I want comprehensive testing coverage across unit, integration, and load testing, so that the platform is reliable and performs well under high traffic.

#### Acceptance Criteria

1. THE Backend_System SHALL implement unit tests for all business logic with minimum 80% code coverage
2. THE Backend_System SHALL implement integration tests for API endpoints with test databases
3. THE Backend_System SHALL implement end-to-end tests for critical user flows (registration, login, portfolio creation, stock search)
4. THE Backend_System SHALL implement load tests simulating 100,000 concurrent users with target response time under 500ms
5. THE Backend_System SHALL implement stress tests to identify system breaking points and bottlenecks
6. THE Backend_System SHALL implement contract tests for API versioning and backward compatibility
7. THE Backend_System SHALL implement property-based tests for data validation and business logic invariants
8. THE Backend_System SHALL implement chaos engineering tests to validate system resilience (random service failures, network latency)
9. THE Backend_System SHALL run automated tests in CI/CD pipeline before every deployment
10. THE Backend_System SHALL implement test data factories for consistent test data generation
11. THE Backend_System SHALL implement API mocking for third-party services in test environments
12. THE Backend_System SHALL maintain test documentation with test scenarios and expected outcomes

### Requirement 19: Portfolio Management Service

**User Story:** As a user, I want to manage my stock portfolio with real-time performance tracking, so that I can monitor my investments and make informed decisions.

#### Acceptance Criteria

1. THE Portfolio_Service SHALL allow users to create multiple portfolios with unique names
2. THE Portfolio_Service SHALL allow users to add holdings with fields: stock_symbol, quantity, purchase_price, purchase_date
3. THE Portfolio_Service SHALL calculate portfolio metrics: total_value, total_investment, profit_loss, profit_loss_percentage, day_change
4. THE Portfolio_Service SHALL calculate holding-level metrics: current_value, invested_value, profit_loss, profit_loss_percentage, day_change
5. THE Portfolio_Service SHALL update portfolio values in real-time when stock prices change
6. THE Portfolio_Service SHALL track historical portfolio performance with daily snapshots
7. THE Portfolio_Service SHALL implement watchlists for tracking stocks without ownership
8. THE Portfolio_Service SHALL implement price alerts with conditions: price_above, price_below, percentage_change
9. WHEN alert conditions are met, THE Portfolio_Service SHALL send notifications via email and push notifications
10. THE Portfolio_Service SHALL generate portfolio reports with charts and performance analytics
11. THE Portfolio_Service SHALL implement portfolio sharing with read-only access for other users
12. THE Portfolio_Service SHALL validate stock symbols before adding holdings and reject invalid symbols

### Requirement 20: Company Profile and Financial Data Service

**User Story:** As a user, I want detailed company profiles with financial statements and peer comparisons, so that I can perform fundamental analysis before investing.

#### Acceptance Criteria

1. THE Stock_Service SHALL provide company profiles with fields: company_name, sector, industry, market_cap, description, website, headquarters, founded_year, employees
2. THE Stock_Service SHALL provide financial statements: income_statement, balance_sheet, cash_flow_statement with quarterly and annual data
3. THE Stock_Service SHALL calculate financial ratios: P/E, P/B, debt_to_equity, current_ratio, ROE, ROA, profit_margin, revenue_growth
4. THE Stock_Service SHALL provide management team information with fields: name, designation, experience, education
5. THE Stock_Service SHALL provide peer comparison with metrics: market_cap, P/E, revenue, profit_margin for companies in same sector
6. THE Stock_Service SHALL provide analyst target prices with fields: analyst_name, target_price, rating, date
7. THE Stock_Service SHALL provide dividend history with fields: ex_date, dividend_amount, dividend_yield
8. THE Stock_Service SHALL provide corporate actions: stock splits, bonus issues, rights issues with dates and ratios
9. THE Stock_Service SHALL provide shareholding patterns: promoter_holding, institutional_holding, retail_holding with quarterly updates
10. THE Stock_Service SHALL cache company profile data with 24-hour TTL to reduce database load

### Requirement 21: News Aggregation and Sentiment Analysis

**User Story:** As a user, I want aggregated financial news with sentiment analysis, so that I can stay informed about market trends and company developments.

#### Acceptance Criteria

1. THE News_Service SHALL aggregate news from minimum 10 sources including financial websites, RSS feeds, and news APIs
2. THE News_Service SHALL categorize news into categories: companies, markets, economy, IPOs, commodities, global, regulatory
3. THE News_Service SHALL extract entities from news articles: company_names, stock_symbols, people, locations
4. THE News_Service SHALL implement sentiment analysis to classify articles as positive, negative, or neutral with confidence scores
5. THE News_Service SHALL calculate stock-specific sentiment scores based on related news articles
6. THE News_Service SHALL implement trending news detection based on article frequency and engagement metrics
7. THE News_Service SHALL implement news deduplication to remove duplicate articles from different sources
8. THE News_Service SHALL provide news search with full-text search on title and content
9. THE News_Service SHALL implement news alerts for user-selected stocks and keywords
10. THE News_Service SHALL provide news feed with pagination and filtering by category, date, and sentiment
11. THE News_Service SHALL extract and display article images with fallback to default images
12. THE News_Service SHALL track news article views and engagement for trending calculation


### Requirement 22: IPO Tracking and Management

**User Story:** As a user, I want comprehensive IPO tracking with bidding information and listing performance, so that I can participate in IPOs and track their performance.

#### Acceptance Criteria

1. THE IPO_Service SHALL track IPOs with fields: company_name, symbol, issue_size, price_range, bidding_start_date, bidding_end_date, listing_date, lot_size, issue_type
2. THE IPO_Service SHALL categorize IPOs by status: upcoming, current, closed, listed
3. THE IPO_Service SHALL provide subscription status with category-wise data: QIB, NII, retail with subscription multiples
4. THE IPO_Service SHALL calculate listing gains with formula: ((listing_price - issue_price) / issue_price) * 100
5. THE IPO_Service SHALL provide IPO documents: RHP, DRHP with download links
6. THE IPO_Service SHALL provide IPO timeline with key dates: announcement, bidding period, allotment, listing
7. THE IPO_Service SHALL implement IPO alerts for bidding start, bidding end, and listing dates
8. THE IPO_Service SHALL provide IPO analysis with fields: grey_market_premium, analyst_recommendations, subscription_expectations
9. THE IPO_Service SHALL track SME IPOs separately with is_sme flag
10. THE IPO_Service SHALL provide historical IPO performance data for analysis
11. THE IPO_Service SHALL integrate with registrar websites for allotment status checking
12. THE IPO_Service SHALL cache IPO data with 1-hour TTL during bidding period and 24-hour TTL otherwise

### Requirement 23: Market Indices and Sector Performance

**User Story:** As a user, I want real-time market indices and sector performance tracking, so that I can understand overall market trends and sector rotations.

#### Acceptance Criteria

1. THE Market_Service SHALL track major indices: NIFTY 50, SENSEX, NIFTY Bank, NIFTY IT, NIFTY Pharma, NIFTY Auto with real-time updates
2. THE Market_Service SHALL provide index data with fields: current_value, day_change, day_change_percentage, day_high, day_low, open, previous_close
3. THE Market_Service SHALL calculate sector performance with aggregated metrics from constituent stocks
4. THE Market_Service SHALL provide sector-wise top gainers and losers
5. THE Market_Service SHALL track market breadth indicators: advances, declines, unchanged, 52-week highs, 52-week lows
6. THE Market_Service SHALL provide market sentiment indicators: VIX, put-call ratio, FII/DII activity
7. THE Market_Service SHALL track global indices: Dow Jones, NASDAQ, S&P 500, Nikkei, Hang Seng for correlation analysis
8. THE Market_Service SHALL provide historical index data for charting and analysis
9. THE Market_Service SHALL calculate index returns: 1-day, 1-week, 1-month, 3-month, 6-month, 1-year, 5-year
10. THE Market_Service SHALL broadcast index updates via WebSocket every 1 second during market hours
11. THE Market_Service SHALL cache index data with 30-second TTL for API responses

### Requirement 24: Commodities Tracking

**User Story:** As a user, I want to track commodity prices including gold, silver, and crude oil, so that I can diversify my investment analysis beyond equities.

#### Acceptance Criteria

1. THE Market_Service SHALL track commodities: gold, silver, crude oil, natural gas, copper with real-time prices
2. THE Market_Service SHALL provide commodity data with fields: current_price, day_change, day_change_percentage, unit (per gram, per barrel)
3. THE Market_Service SHALL provide historical commodity prices for charting
4. THE Market_Service SHALL track currency exchange rates: USD/INR, EUR/INR, GBP/INR
5. THE Market_Service SHALL provide commodity price alerts with user-defined thresholds
6. THE Market_Service SHALL integrate with commodity data providers for accurate pricing
7. THE Market_Service SHALL cache commodity data with 5-minute TTL

### Requirement 25: Search and Filtering Capabilities

**User Story:** As a user, I want powerful search and filtering for stocks, so that I can quickly find investment opportunities matching my criteria.

#### Acceptance Criteria

1. THE Stock_Service SHALL implement full-text search on stock symbols and company names with autocomplete
2. THE Stock_Service SHALL provide search results within 100ms for queries
3. THE Stock_Service SHALL implement filters: sector, market_cap_range, price_range, volume_range, P/E_range, dividend_yield_range
4. THE Stock_Service SHALL implement sorting: price, market_cap, volume, day_change_percentage, P/E_ratio
5. THE Stock_Service SHALL implement stock screeners with predefined criteria: top_gainers, top_losers, most_active, 52_week_high, 52_week_low, high_dividend_yield
6. THE Stock_Service SHALL implement custom screener with user-defined criteria combinations
7. THE Stock_Service SHALL provide search suggestions based on user search history
8. THE Stock_Service SHALL implement fuzzy search to handle typos and partial matches
9. THE Stock_Service SHALL cache search results with 5-minute TTL
10. THE Stock_Service SHALL track popular searches for analytics

### Requirement 26: Technical Analysis and Charting Data

**User Story:** As a user, I want technical indicators and charting data, so that I can perform technical analysis for trading decisions.

#### Acceptance Criteria

1. THE Stock_Service SHALL provide OHLCV data (open, high, low, close, volume) with multiple timeframes: 1-minute, 5-minute, 15-minute, 1-hour, 1-day, 1-week, 1-month
2. THE Stock_Service SHALL calculate technical indicators: SMA (20, 50, 200), EMA (12, 26), RSI (14), MACD, Bollinger Bands, Stochastic Oscillator
3. THE Stock_Service SHALL provide candlestick pattern detection: doji, hammer, shooting star, engulfing patterns
4. THE Stock_Service SHALL provide support and resistance levels based on historical price action
5. THE Stock_Service SHALL provide volume analysis with volume moving averages
6. THE Stock_Service SHALL provide pivot points for intraday trading
7. THE Stock_Service SHALL cache technical indicator calculations with 1-minute TTL
8. THE Stock_Service SHALL pre-calculate indicators for popular stocks to reduce latency
9. THE Stock_Service SHALL provide chart data in formats compatible with Chart.js and Recharts libraries


### Requirement 27: Admin Dashboard and Management

**User Story:** As an admin, I want a comprehensive admin dashboard for system management, so that I can monitor platform health, manage users, and configure system settings.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide user management with capabilities: view users, suspend users, reset passwords, manage roles
2. THE Admin_Dashboard SHALL provide system health monitoring with real-time metrics: active users, API requests per minute, error rates, database connections
3. THE Admin_Dashboard SHALL provide content moderation for user-generated content and comments
4. THE Admin_Dashboard SHALL provide configuration management for system settings: rate limits, cache TTLs, feature flags
5. THE Admin_Dashboard SHALL provide audit logs viewer with filtering by user, action, date range
6. THE Admin_Dashboard SHALL provide data management tools: manual data refresh, cache invalidation, database maintenance
7. THE Admin_Dashboard SHALL provide analytics dashboard with business metrics: user growth, engagement, revenue, popular stocks
8. THE Admin_Dashboard SHALL implement role-based access control with granular permissions
9. THE Admin_Dashboard SHALL provide API key management for third-party integrations
10. THE Admin_Dashboard SHALL provide notification management for sending platform-wide announcements

### Requirement 28: Learning Resources Management

**User Story:** As a user, I want access to educational content about stock market investing, so that I can improve my investment knowledge and skills.

#### Acceptance Criteria

1. THE Content_Service SHALL provide learning resources with categories: basics, technical_analysis, fundamental_analysis, options_trading, risk_management
2. THE Content_Service SHALL provide articles, videos, and tutorials with rich media content
3. THE Content_Service SHALL implement content search and filtering by category, difficulty level, and topic
4. THE Content_Service SHALL track user progress through learning modules
5. THE Content_Service SHALL provide quizzes and assessments to test knowledge
6. THE Content_Service SHALL implement content recommendations based on user interests and portfolio
7. THE Content_Service SHALL provide glossary of financial terms with definitions
8. THE Content_Service SHALL cache learning content with 24-hour TTL

### Requirement 29: Notification System

**User Story:** As a user, I want timely notifications for price alerts, news, and portfolio updates, so that I don't miss important market events.

#### Acceptance Criteria

1. THE Notification_Service SHALL support notification channels: email, push notifications, SMS, in-app notifications
2. THE Notification_Service SHALL send price alert notifications when user-defined conditions are met
3. THE Notification_Service SHALL send news alert notifications for followed stocks and keywords
4. THE Notification_Service SHALL send portfolio update notifications for significant changes (>5% day change)
5. THE Notification_Service SHALL send IPO alert notifications for bidding dates and listings
6. THE Notification_Service SHALL implement notification preferences with user-configurable settings per notification type
7. THE Notification_Service SHALL implement notification batching to avoid overwhelming users with multiple notifications
8. THE Notification_Service SHALL implement notification delivery tracking with read/unread status
9. THE Notification_Service SHALL implement notification history with 90-day retention
10. THE Notification_Service SHALL use Message_Queue for asynchronous notification delivery
11. THE Notification_Service SHALL implement notification templates for consistent formatting
12. THE Notification_Service SHALL respect quiet hours and do-not-disturb settings

### Requirement 30: 2-Year Phased Implementation Roadmap

**User Story:** As a project manager, I want a detailed 2-year implementation roadmap, so that the team can execute the platform development in manageable phases with clear milestones.

#### Acceptance Criteria

1. THE Implementation_Plan SHALL define Phase 1 (Months 1-6) with deliverables: core backend architecture, database schema, authentication system, basic stock data APIs, deployment infrastructure
2. THE Implementation_Plan SHALL define Phase 1 milestones: Month 1 - architecture design and setup, Month 2 - database implementation, Month 3 - authentication and user management, Month 4 - stock data APIs, Month 5 - market indices and IPO APIs, Month 6 - testing and staging deployment
3. THE Implementation_Plan SHALL define Phase 2 (Months 7-12) with deliverables: portfolio management, news aggregation, WebSocket real-time data, advanced search, technical indicators, admin dashboard
4. THE Implementation_Plan SHALL define Phase 2 milestones: Month 7 - portfolio service, Month 8 - news service and sentiment analysis, Month 9 - WebSocket implementation, Month 10 - technical analysis features, Month 11 - admin dashboard, Month 12 - performance optimization and production launch
5. THE Implementation_Plan SHALL define Phase 3 (Months 13-18) with deliverables: ML prediction pipeline, feature engineering, model training infrastructure, prediction APIs, A/B testing framework, notification system
6. THE Implementation_Plan SHALL define Phase 3 milestones: Month 13 - ML infrastructure setup, Month 14 - feature engineering, Month 15 - model training and evaluation, Month 16 - prediction service deployment, Month 17 - A/B testing and optimization, Month 18 - notification system
7. THE Implementation_Plan SHALL define Phase 4 (Months 19-24) with deliverables: advanced scaling, performance optimization, mobile app backend, premium features, analytics platform, international expansion preparation
8. THE Implementation_Plan SHALL define Phase 4 milestones: Month 19 - horizontal scaling implementation, Month 20 - caching optimization, Month 21 - mobile app APIs, Month 22 - premium features and monetization, Month 23 - analytics and reporting, Month 24 - international market support
9. THE Implementation_Plan SHALL define success metrics for each phase: Phase 1 - 10,000 users, Phase 2 - 100,000 users, Phase 3 - 500,000 users, Phase 4 - 2,000,000 users
10. THE Implementation_Plan SHALL define performance targets: Phase 1 - 1000 req/sec, Phase 2 - 10,000 req/sec, Phase 3 - 50,000 req/sec, Phase 4 - 200,000 req/sec
11. THE Implementation_Plan SHALL allocate team resources: Phase 1 - 5 engineers, Phase 2 - 8 engineers, Phase 3 - 12 engineers, Phase 4 - 15 engineers
12. THE Implementation_Plan SHALL define risk mitigation strategies for each phase with contingency plans


## Database Schema Specifications

### PostgreSQL Primary Database Tables

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    preferences JSONB DEFAULT '{}'
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### stocks
```sql
CREATE TABLE stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    sector_id UUID REFERENCES sectors(id),
    industry VARCHAR(100),
    market_cap BIGINT,
    isin VARCHAR(20),
    exchange VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    listing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_sector ON stocks(sector_id);
CREATE INDEX idx_stocks_market_cap ON stocks(market_cap);
```

#### sectors
```sql
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### company_profiles
```sql
CREATE TABLE company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    description TEXT,
    website VARCHAR(255),
    headquarters VARCHAR(255),
    founded_year INTEGER,
    employees INTEGER,
    ceo VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_company_profiles_stock ON company_profiles(stock_id);
```

#### portfolios
```sql
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
```

#### portfolio_holdings
```sql
CREATE TABLE portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id),
    quantity DECIMAL(15, 4) NOT NULL,
    purchase_price DECIMAL(15, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_holdings_portfolio ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_holdings_stock ON portfolio_holdings(stock_id);
```

#### watchlists
```sql
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_id)
);
CREATE INDEX idx_watchlists_user ON watchlists(user_id);
```

#### alerts
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(15, 2),
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_stock ON alerts(stock_id);
CREATE INDEX idx_alerts_active ON alerts(is_active);
```

#### ipos
```sql
CREATE TABLE ipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    symbol VARCHAR(20),
    issue_size BIGINT,
    min_price DECIMAL(15, 2),
    max_price DECIMAL(15, 2),
    lot_size INTEGER,
    bidding_start_date DATE,
    bidding_end_date DATE,
    listing_date DATE,
    listing_price DECIMAL(15, 2),
    issue_type VARCHAR(50),
    is_sme BOOLEAN DEFAULT false,
    status VARCHAR(50),
    rhp_url VARCHAR(500),
    drhp_url VARCHAR(500),
    subscription_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ipos_status ON ipos(status);
CREATE INDEX idx_ipos_bidding_dates ON ipos(bidding_start_date, bidding_end_date);
CREATE INDEX idx_ipos_listing_date ON ipos(listing_date);
```

#### news_articles
```sql
CREATE TABLE news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    summary TEXT,
    source VARCHAR(100),
    author VARCHAR(100),
    url VARCHAR(1000) UNIQUE,
    image_url VARCHAR(1000),
    category VARCHAR(50),
    sentiment VARCHAR(20),
    sentiment_score DECIMAL(5, 4),
    published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    view_count INTEGER DEFAULT 0
);
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_sentiment ON news_articles(sentiment);
CREATE INDEX idx_news_fulltext ON news_articles USING GIN(to_tsvector('english', title || ' ' || content));
```

#### news_stock_mentions
```sql
CREATE TABLE news_stock_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    relevance_score DECIMAL(5, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(news_id, stock_id)
);
CREATE INDEX idx_mentions_news ON news_stock_mentions(news_id);
CREATE INDEX idx_mentions_stock ON news_stock_mentions(stock_id);
```

#### financial_statements
```sql
CREATE TABLE financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    statement_type VARCHAR(50) NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER,
    report_date DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, statement_type, period_type, fiscal_year, fiscal_quarter)
);
CREATE INDEX idx_financials_stock ON financial_statements(stock_id);
CREATE INDEX idx_financials_date ON financial_statements(report_date DESC);
```

#### market_indices
```sql
CREATE TABLE market_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    exchange VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### commodities
```sql
CREATE TABLE commodities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    unit VARCHAR(50),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

#### api_keys
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    scopes JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### TimescaleDB Time-Series Tables

#### stock_prices
```sql
CREATE TABLE stock_prices (
    time TIMESTAMPTZ NOT NULL,
    stock_id UUID NOT NULL REFERENCES stocks(id),
    open DECIMAL(15, 2),
    high DECIMAL(15, 2),
    low DECIMAL(15, 2),
    close DECIMAL(15, 2) NOT NULL,
    volume BIGINT,
    vwap DECIMAL(15, 2),
    trades INTEGER
);
SELECT create_hypertable('stock_prices', 'time', chunk_time_interval => INTERVAL '7 days');
CREATE INDEX idx_stock_prices_stock_time ON stock_prices(stock_id, time DESC);
```

#### intraday_prices
```sql
CREATE TABLE intraday_prices (
    time TIMESTAMPTZ NOT NULL,
    stock_id UUID NOT NULL REFERENCES stocks(id),
    price DECIMAL(15, 2) NOT NULL,
    volume BIGINT,
    bid DECIMAL(15, 2),
    ask DECIMAL(15, 2)
);
SELECT create_hypertable('intraday_prices', 'time', chunk_time_interval => INTERVAL '1 day');
CREATE INDEX idx_intraday_stock_time ON intraday_prices(stock_id, time DESC);
```

#### index_prices
```sql
CREATE TABLE index_prices (
    time TIMESTAMPTZ NOT NULL,
    index_id UUID NOT NULL REFERENCES market_indices(id),
    value DECIMAL(15, 2) NOT NULL,
    change DECIMAL(15, 2),
    change_percent DECIMAL(8, 4)
);
SELECT create_hypertable('index_prices', 'time', chunk_time_interval => INTERVAL '7 days');
CREATE INDEX idx_index_prices_index_time ON index_prices(index_id, time DESC);
```

#### commodity_prices
```sql
CREATE TABLE commodity_prices (
    time TIMESTAMPTZ NOT NULL,
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    price DECIMAL(15, 2) NOT NULL,
    change DECIMAL(15, 2),
    change_percent DECIMAL(8, 4)
);
SELECT create_hypertable('commodity_prices', 'time', chunk_time_interval => INTERVAL '7 days');
CREATE INDEX idx_commodity_prices_commodity_time ON commodity_prices(commodity_id, time DESC);
```

#### portfolio_snapshots
```sql
CREATE TABLE portfolio_snapshots (
    time TIMESTAMPTZ NOT NULL,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    total_value DECIMAL(20, 2) NOT NULL,
    total_investment DECIMAL(20, 2) NOT NULL,
    profit_loss DECIMAL(20, 2),
    profit_loss_percent DECIMAL(8, 4),
    day_change DECIMAL(20, 2),
    day_change_percent DECIMAL(8, 4)
);
SELECT create_hypertable('portfolio_snapshots', 'time', chunk_time_interval => INTERVAL '30 days');
CREATE INDEX idx_portfolio_snapshots_portfolio_time ON portfolio_snapshots(portfolio_id, time DESC);
```

### TimescaleDB Continuous Aggregates

```sql
-- Daily OHLCV aggregates
CREATE MATERIALIZED VIEW stock_prices_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS day,
    stock_id,
    first(open, time) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, time) AS close,
    sum(volume) AS volume
FROM stock_prices
GROUP BY day, stock_id;

-- Weekly OHLCV aggregates
CREATE MATERIALIZED VIEW stock_prices_weekly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', time) AS week,
    stock_id,
    first(open, time) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, time) AS close,
    sum(volume) AS volume
FROM stock_prices
GROUP BY week, stock_id;
```


## Backend Folder Structure

```
scalable-stock-prediction-backend/
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── rateLimit.middleware.ts
│   │   │   │   ├── cors.middleware.ts
│   │   │   │   └── logging.middleware.ts
│   │   │   ├── routes/
│   │   │   │   ├── index.ts
│   │   │   │   └── proxy.routes.ts
│   │   │   ├── config/
│   │   │   │   ├── gateway.config.ts
│   │   │   │   └── services.config.ts
│   │   │   ├── utils/
│   │   │   │   ├── loadBalancer.ts
│   │   │   │   └── serviceDiscovery.ts
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── user.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.service.ts
│   │   │   │   ├── oauth.service.ts
│   │   │   │   └── session.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── user.repository.ts
│   │   │   │   └── session.repository.ts
│   │   │   ├── models/
│   │   │   │   ├── user.model.ts
│   │   │   │   └── session.model.ts
│   │   │   ├── middleware/
│   │   │   │   └── validation.middleware.ts
│   │   │   ├── utils/
│   │   │   │   ├── bcrypt.util.ts
│   │   │   │   └── email.util.ts
│   │   │   ├── config/
│   │   │   │   └── auth.config.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── stock-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── stock.controller.ts
│   │   │   │   ├── price.controller.ts
│   │   │   │   ├── company.controller.ts
│   │   │   │   └── technical.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── stock.service.ts
│   │   │   │   ├── price.service.ts
│   │   │   │   ├── company.service.ts
│   │   │   │   ├── technical.service.ts
│   │   │   │   └── search.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── stock.repository.ts
│   │   │   │   ├── price.repository.ts
│   │   │   │   └── company.repository.ts
│   │   │   ├── models/
│   │   │   │   ├── stock.model.ts
│   │   │   │   ├── price.model.ts
│   │   │   │   └── company.model.ts
│   │   │   ├── utils/
│   │   │   │   ├── indicators.util.ts
│   │   │   │   └── cache.util.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── ipo-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   └── ipo.controller.ts
│   │   │   ├── services/
│   │   │   │   └── ipo.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── ipo.repository.ts
│   │   │   ├── models/
│   │   │   │   └── ipo.model.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── news-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   └── news.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── news.service.ts
│   │   │   │   ├── aggregation.service.ts
│   │   │   │   ├── sentiment.service.ts
│   │   │   │   └── entity.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── news.repository.ts
│   │   │   ├── models/
│   │   │   │   └── news.model.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── portfolio-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── portfolio.controller.ts
│   │   │   │   ├── holding.controller.ts
│   │   │   │   ├── watchlist.controller.ts
│   │   │   │   └── alert.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── portfolio.service.ts
│   │   │   │   ├── holding.service.ts
│   │   │   │   ├── calculation.service.ts
│   │   │   │   ├── watchlist.service.ts
│   │   │   │   └── alert.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── portfolio.repository.ts
│   │   │   │   ├── holding.repository.ts
│   │   │   │   └── alert.repository.ts
│   │   │   ├── models/
│   │   │   │   ├── portfolio.model.ts
│   │   │   │   └── holding.model.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── market-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── index.controller.ts
│   │   │   │   ├── sector.controller.ts
│   │   │   │   └── commodity.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── index.service.ts
│   │   │   │   ├── sector.service.ts
│   │   │   │   └── commodity.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── index.repository.ts
│   │   │   │   └── commodity.repository.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── prediction-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   └── prediction.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── prediction.service.ts
│   │   │   │   ├── model.service.ts
│   │   │   │   └── abtest.service.ts
│   │   │   ├── models/
│   │   │   │   └── prediction.model.ts
│   │   │   ├── ml/
│   │   │   │   ├── modelLoader.ts
│   │   │   │   └── inference.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── notification-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   └── notification.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── push.service.ts
│   │   │   │   └── sms.service.ts
│   │   │   ├── workers/
│   │   │   │   └── notification.worker.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── websocket-service/
│       ├── src/
│       │   ├── handlers/
│       │   │   ├── connection.handler.ts
│       │   │   ├── subscription.handler.ts
│       │   │   └── broadcast.handler.ts
│       │   ├── services/
│       │   │   ├── websocket.service.ts
│       │   │   └── pubsub.service.ts
│       │   └── server.ts
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
│
├── data-pipeline/
│   ├── ingestion/
│   │   ├── src/
│   │   │   ├── collectors/
│   │   │   │   ├── stock.collector.ts
│   │   │   │   ├── ipo.collector.ts
│   │   │   │   ├── news.collector.ts
│   │   │   │   └── financial.collector.ts
│   │   │   ├── transformers/
│   │   │   │   ├── stock.transformer.ts
│   │   │   │   └── news.transformer.ts
│   │   │   ├── loaders/
│   │   │   │   ├── database.loader.ts
│   │   │   │   └── cache.loader.ts
│   │   │   ├── validators/
│   │   │   │   └── data.validator.ts
│   │   │   └── scheduler.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── streaming/
│       ├── src/
│       │   ├── consumers/
│       │   │   ├── price.consumer.ts
│       │   │   └── news.consumer.ts
│       │   ├── processors/
│       │   │   └── stream.processor.ts
│       │   └── app.ts
│       ├── Dockerfile
│       └── package.json
│
├── ml-pipeline/
│   ├── feature-engineering/
│   │   ├── src/
│   │   │   ├── extractors/
│   │   │   │   ├── technical.extractor.py
│   │   │   │   ├── fundamental.extractor.py
│   │   │   │   └── sentiment.extractor.py
│   │   │   ├── transformers/
│   │   │   │   └── feature.transformer.py
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── training/
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── lstm.py
│   │   │   │   ├── transformer.py
│   │   │   │   └── ensemble.py
│   │   │   ├── trainers/
│   │   │   │   └── model.trainer.py
│   │   │   ├── evaluators/
│   │   │   │   └── model.evaluator.py
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── serving/
│       ├── src/
│       │   ├── inference/
│       │   │   └── predictor.py
│       │   ├── monitoring/
│       │   │   └── drift.detector.py
│       │   └── api.py
│       ├── Dockerfile
│       └── requirements.txt
│
├── shared/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── connection.ts
│   ├── cache/
│   │   └── redis.client.ts
│   ├── messaging/
│   │   ├── kafka.client.ts
│   │   └── rabbitmq.client.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── validators.ts
│   └── types/
│       ├── stock.types.ts
│       ├── user.types.ts
│       └── api.types.ts
│
├── infrastructure/
│   ├── kubernetes/
│   │   ├── deployments/
│   │   ├── services/
│   │   ├── configmaps/
│   │   └── secrets/
│   ├── terraform/
│   │   ├── modules/
│   │   ├── environments/
│   │   └── main.tf
│   └── docker-compose/
│       ├── docker-compose.dev.yml
│       └── docker-compose.prod.yml
│
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml
│   ├── grafana/
│   │   └── dashboards/
│   └── elk/
│       └── logstash.conf
│
├── scripts/
│   ├── setup.sh
│   ├── deploy.sh
│   └── backup.sh
│
├── docs/
│   ├── api/
│   ├── architecture/
│   └── deployment/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
├── docker-compose.yml
├── package.json
└── README.md
```

## Technology Stack Recommendations

### Backend Services
- **Runtime**: Node.js 20+ with TypeScript for microservices
- **Framework**: Express.js or Fastify for REST APIs
- **GraphQL**: Apollo Server for GraphQL implementation
- **WebSocket**: Socket.io or ws library for real-time communication

### Databases
- **Primary Database**: PostgreSQL 15+ for relational data
- **Time-Series Database**: TimescaleDB extension for PostgreSQL
- **Cache**: Redis 7+ with Redis Cluster for distributed caching
- **Search**: Elasticsearch for full-text search capabilities

### Message Queue
- **Event Streaming**: Apache Kafka for high-throughput event streaming
- **Task Queue**: RabbitMQ for task queue management
- **Pub/Sub**: Redis Pub/Sub for real-time cache invalidation

### Machine Learning
- **ML Framework**: TensorFlow or PyTorch for model training
- **Feature Store**: Feast or custom implementation
- **Model Registry**: MLflow for model versioning and tracking
- **Serving**: TensorFlow Serving or custom FastAPI service

### Infrastructure
- **Container Orchestration**: Kubernetes (EKS, GKE, or AKS)
- **Container Runtime**: Docker
- **Infrastructure as Code**: Terraform
- **CI/CD**: GitHub Actions or GitLab CI
- **Load Balancer**: NGINX or AWS ALB

### Monitoring & Logging
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: OpenTelemetry with Jaeger
- **APM**: New Relic or Datadog
- **Uptime Monitoring**: Pingdom or UptimeRobot

### Security
- **Secrets Management**: HashiCorp Vault or AWS Secrets Manager
- **API Security**: OAuth 2.0, JWT tokens
- **SSL/TLS**: Let's Encrypt certificates
- **WAF**: Cloudflare or AWS WAF

### Cloud Provider
- **Recommended**: AWS, Google Cloud, or Azure
- **Services**: Managed Kubernetes, Managed Databases, Object Storage, CDN

## API Endpoint Specifications

### Stock Service Endpoints

```
GET    /api/v1/stocks                    - List all stocks with pagination
GET    /api/v1/stocks/:symbol            - Get stock details
GET    /api/v1/stocks/:symbol/prices     - Get current and historical prices
GET    /api/v1/stocks/:symbol/intraday   - Get intraday prices
GET    /api/v1/stocks/:symbol/technical  - Get technical indicators
GET    /api/v1/stocks/:symbol/company    - Get company profile
GET    /api/v1/stocks/:symbol/financials - Get financial statements
GET    /api/v1/stocks/search             - Search stocks
GET    /api/v1/stocks/screener           - Stock screener with filters
GET    /api/v1/stocks/gainers            - Top gainers
GET    /api/v1/stocks/losers             - Top losers
GET    /api/v1/stocks/active             - Most active stocks
```

### IPO Service Endpoints

```
GET    /api/v1/ipos                      - List all IPOs
GET    /api/v1/ipos/:id                  - Get IPO details
GET    /api/v1/ipos/upcoming             - Upcoming IPOs
GET    /api/v1/ipos/current              - Current IPOs
GET    /api/v1/ipos/past                 - Past IPOs
GET    /api/v1/ipos/:id/subscription     - Get subscription status
```

### News Service Endpoints

```
GET    /api/v1/news                      - List all news
GET    /api/v1/news/:id                  - Get news article
GET    /api/v1/news/categories/:category - News by category
GET    /api/v1/news/trending             - Trending news
GET    /api/v1/news/stock/:symbol        - News for specific stock
GET    /api/v1/news/search               - Search news
```

### Portfolio Service Endpoints

```
GET    /api/v1/portfolios                - List user portfolios
POST   /api/v1/portfolios                - Create portfolio
GET    /api/v1/portfolios/:id            - Get portfolio details
PUT    /api/v1/portfolios/:id            - Update portfolio
DELETE /api/v1/portfolios/:id            - Delete portfolio
GET    /api/v1/portfolios/:id/holdings   - Get holdings
POST   /api/v1/portfolios/:id/holdings   - Add holding
PUT    /api/v1/portfolios/:id/holdings/:holdingId - Update holding
DELETE /api/v1/portfolios/:id/holdings/:holdingId - Remove holding
GET    /api/v1/portfolios/:id/performance - Get performance metrics
GET    /api/v1/watchlists                - Get watchlist
POST   /api/v1/watchlists                - Add to watchlist
DELETE /api/v1/watchlists/:stockId       - Remove from watchlist
GET    /api/v1/alerts                    - Get alerts
POST   /api/v1/alerts                    - Create alert
DELETE /api/v1/alerts/:id                - Delete alert
```

### Market Service Endpoints

```
GET    /api/v1/indices                   - List market indices
GET    /api/v1/indices/:symbol           - Get index details
GET    /api/v1/sectors                   - List sectors
GET    /api/v1/sectors/:id/performance   - Sector performance
GET    /api/v1/commodities               - List commodities
GET    /api/v1/commodities/:symbol       - Get commodity details
```

### Prediction Service Endpoints

```
GET    /api/v1/predictions/:symbol       - Get stock prediction
POST   /api/v1/predictions/batch         - Batch predictions
GET    /api/v1/predictions/:symbol/history - Prediction history
```

### Auth Service Endpoints

```
POST   /api/v1/auth/register             - User registration
POST   /api/v1/auth/login                - User login
POST   /api/v1/auth/logout               - User logout
POST   /api/v1/auth/refresh              - Refresh access token
POST   /api/v1/auth/verify-email         - Verify email
POST   /api/v1/auth/forgot-password      - Forgot password
POST   /api/v1/auth/reset-password       - Reset password
GET    /api/v1/auth/me                   - Get current user
PUT    /api/v1/auth/me                   - Update user profile
```

## Performance Targets

### Response Time Targets
- API endpoints: < 200ms (p95)
- Database queries: < 100ms (p95)
- Cache hits: < 10ms (p95)
- WebSocket message delivery: < 100ms
- ML predictions: < 200ms

### Throughput Targets
- Phase 1: 1,000 requests/second
- Phase 2: 10,000 requests/second
- Phase 3: 50,000 requests/second
- Phase 4: 200,000 requests/second

### Availability Targets
- System uptime: 99.9% (8.76 hours downtime/year)
- Database availability: 99.95%
- Cache availability: 99.9%

### Scalability Targets
- Phase 1: 10,000 concurrent users
- Phase 2: 100,000 concurrent users
- Phase 3: 500,000 concurrent users
- Phase 4: 2,000,000 concurrent users


## 2-Year Implementation Roadmap

### Phase 1: Foundation (Months 1-6)

**Objective**: Build core backend infrastructure and basic functionality

#### Month 1: Architecture Design and Setup
- Finalize microservices architecture design
- Set up development environment and tooling
- Initialize Git repositories and CI/CD pipelines
- Set up cloud infrastructure (Kubernetes cluster, databases)
- Configure monitoring and logging infrastructure
- Team onboarding and training

**Deliverables**: Architecture documentation, development environment, CI/CD pipeline

#### Month 2: Database Implementation
- Design and implement PostgreSQL schema
- Set up TimescaleDB for time-series data
- Implement database migrations framework
- Set up Redis cluster for caching
- Create database seed data for testing
- Implement backup and recovery procedures

**Deliverables**: Complete database schema, migration scripts, backup system

#### Month 3: Authentication and User Management
- Implement Auth Service with JWT authentication
- Implement user registration and login
- Implement OAuth 2.0 integration (Google, Facebook)
- Implement role-based access control
- Implement session management with Redis
- Implement password reset and email verification

**Deliverables**: Fully functional authentication system, user management APIs

#### Month 4: Stock Data APIs
- Implement Stock Service microservice
- Integrate with NSE/BSE APIs for stock data
- Implement stock listing and details endpoints
- Implement stock price endpoints (current, historical)
- Implement stock search functionality
- Set up data ingestion pipeline for stock prices
- Implement caching for stock data

**Deliverables**: Stock Service with complete API endpoints, data ingestion pipeline

#### Month 5: Market Indices and IPO APIs
- Implement Market Service for indices and sectors
- Implement IPO Service for IPO tracking
- Integrate with market data providers
- Implement real-time index updates
- Implement IPO listing and subscription tracking
- Set up data ingestion for IPO data

**Deliverables**: Market Service and IPO Service with complete APIs

#### Month 6: Testing and Staging Deployment
- Comprehensive unit and integration testing
- Load testing with 1,000 concurrent users
- Security testing and vulnerability scanning
- Performance optimization
- Deploy to staging environment
- User acceptance testing
- Documentation completion

**Deliverables**: Tested and deployed staging environment, complete API documentation

**Success Metrics**: 10,000 registered users, 1,000 req/sec throughput, 99% uptime

---

### Phase 2: Core Features (Months 7-12)

**Objective**: Implement user-facing features and real-time capabilities

#### Month 7: Portfolio Management
- Implement Portfolio Service microservice
- Implement portfolio CRUD operations
- Implement holdings management
- Implement portfolio performance calculations
- Implement real-time portfolio value updates
- Implement portfolio snapshots for historical tracking

**Deliverables**: Complete portfolio management system

#### Month 8: News Service and Sentiment Analysis
- Implement News Service microservice
- Integrate with multiple news sources (APIs, RSS feeds)
- Implement news aggregation and deduplication
- Implement sentiment analysis using NLP
- Implement news categorization and entity extraction
- Implement news search with Elasticsearch
- Implement trending news detection

**Deliverables**: News aggregation system with sentiment analysis

#### Month 9: WebSocket Real-Time Data
- Implement WebSocket Service
- Implement real-time stock price streaming
- Implement real-time index updates
- Implement subscription management
- Integrate with Kafka for event streaming
- Implement connection management and scaling
- Load testing with 10,000 concurrent WebSocket connections

**Deliverables**: Real-time data streaming via WebSocket

#### Month 10: Technical Analysis Features
- Implement technical indicator calculations (SMA, EMA, RSI, MACD)
- Implement candlestick pattern detection
- Implement support/resistance level detection
- Implement charting data endpoints
- Optimize indicator calculations with caching
- Pre-calculate indicators for popular stocks

**Deliverables**: Complete technical analysis capabilities

#### Month 11: Admin Dashboard
- Implement admin authentication and authorization
- Implement user management interface
- Implement system health monitoring dashboard
- Implement content moderation tools
- Implement configuration management
- Implement audit log viewer
- Implement analytics dashboard

**Deliverables**: Fully functional admin dashboard

#### Month 12: Performance Optimization and Production Launch
- Database query optimization and indexing
- Implement advanced caching strategies
- Horizontal scaling implementation
- Load testing with 10,000 concurrent users
- Security hardening and penetration testing
- Production deployment
- Marketing and user acquisition campaign
- 24/7 monitoring and on-call setup

**Deliverables**: Production-ready platform with 100,000 users

**Success Metrics**: 100,000 registered users, 10,000 req/sec throughput, 99.9% uptime

---

### Phase 3: ML & Predictions (Months 13-18)

**Objective**: Implement machine learning pipeline and stock predictions

#### Month 13: ML Infrastructure Setup
- Set up ML training infrastructure (GPU instances)
- Implement Feature Store for ML features
- Implement Model Registry with MLflow
- Set up data pipeline for ML training data
- Implement feature versioning and tracking
- Set up experiment tracking

**Deliverables**: Complete ML infrastructure

#### Month 14: Feature Engineering
- Implement technical feature extraction (indicators, patterns)
- Implement fundamental feature extraction (financial ratios)
- Implement sentiment feature extraction from news
- Implement feature transformation and normalization
- Implement feature selection and importance analysis
- Create training datasets with 5 years of historical data

**Deliverables**: Comprehensive feature engineering pipeline

#### Month 15: Model Training and Evaluation
- Implement LSTM model for time-series prediction
- Implement Transformer model for sequence modeling
- Implement XGBoost for ensemble predictions
- Implement model training pipeline with hyperparameter tuning
- Implement model evaluation with multiple metrics
- Implement backtesting framework
- Train models on historical data

**Deliverables**: Trained ML models with performance metrics

#### Month 16: Prediction Service Deployment
- Implement Prediction Service microservice
- Implement model loading and inference
- Implement prediction caching
- Implement batch prediction endpoints
- Integrate predictions with frontend
- Implement prediction confidence scores
- Deploy models to production

**Deliverables**: Production prediction service

#### Month 17: A/B Testing and Optimization
- Implement A/B testing framework
- Deploy multiple model versions
- Implement traffic splitting for A/B tests
- Collect user feedback on predictions
- Implement model monitoring and drift detection
- Optimize model inference latency
- Retrain models with latest data

**Deliverables**: Optimized prediction system with A/B testing

#### Month 18: Notification System
- Implement Notification Service
- Implement email notifications
- Implement push notifications
- Implement SMS notifications
- Implement price alerts
- Implement news alerts
- Implement portfolio alerts
- Implement notification preferences

**Deliverables**: Complete notification system

**Success Metrics**: 500,000 registered users, 50,000 req/sec throughput, 65% prediction accuracy

---

### Phase 4: Scale & Optimize (Months 19-24)

**Objective**: Scale to millions of users and optimize for performance

#### Month 19: Horizontal Scaling Implementation
- Implement auto-scaling for all microservices
- Implement database read replicas
- Implement database sharding for large tables
- Implement multi-region deployment
- Implement global load balancing
- Optimize Kubernetes resource allocation
- Load testing with 100,000 concurrent users

**Deliverables**: Horizontally scalable infrastructure

#### Month 20: Advanced Caching Optimization
- Implement CDN for static assets
- Implement edge caching for API responses
- Implement cache warming strategies
- Implement intelligent cache invalidation
- Optimize Redis cluster configuration
- Implement cache compression
- Achieve 90%+ cache hit rate

**Deliverables**: Optimized caching layer

#### Month 21: Mobile App Backend APIs
- Design mobile-optimized API endpoints
- Implement GraphQL for flexible queries
- Implement mobile push notification infrastructure
- Implement mobile-specific authentication (biometric)
- Implement offline sync capabilities
- Optimize payload sizes for mobile
- Implement mobile analytics

**Deliverables**: Mobile-optimized backend APIs

#### Month 22: Premium Features and Monetization
- Implement subscription management
- Implement payment gateway integration
- Implement premium feature access control
- Implement advanced analytics for premium users
- Implement custom alerts and notifications
- Implement portfolio analytics and reports
- Implement API access for developers

**Deliverables**: Premium features and monetization system

#### Month 23: Analytics and Reporting Platform
- Implement data warehouse for analytics
- Implement ETL pipeline for analytics data
- Implement business intelligence dashboards
- Implement user behavior analytics
- Implement revenue analytics
- Implement prediction performance analytics
- Implement custom report generation

**Deliverables**: Complete analytics platform

#### Month 24: International Expansion Preparation
- Implement multi-currency support
- Implement internationalization (i18n)
- Integrate with international stock exchanges
- Implement regional compliance requirements
- Implement multi-language support
- Optimize for global latency
- Set up international payment gateways

**Deliverables**: Platform ready for international markets

**Success Metrics**: 2,000,000 registered users, 200,000 req/sec throughput, 99.95% uptime, $10M+ ARR

---

## Risk Mitigation Strategies

### Technical Risks

**Risk**: Third-party API failures or rate limiting
- **Mitigation**: Implement multiple data providers with automatic failover, cache data aggressively, implement circuit breakers

**Risk**: Database performance degradation at scale
- **Mitigation**: Implement read replicas, database sharding, query optimization, caching layers, TimescaleDB for time-series data

**Risk**: ML model accuracy degradation
- **Mitigation**: Continuous model monitoring, automated retraining, A/B testing, ensemble models, confidence scores

**Risk**: Security vulnerabilities and data breaches
- **Mitigation**: Regular security audits, penetration testing, encryption at rest and in transit, RBAC, audit logging

**Risk**: System downtime and service disruptions
- **Mitigation**: Multi-region deployment, auto-scaling, health checks, automated failover, comprehensive monitoring

### Business Risks

**Risk**: Slow user adoption
- **Mitigation**: Aggressive marketing, referral programs, free tier with premium upsell, partnerships with brokers

**Risk**: Regulatory compliance issues
- **Mitigation**: Legal consultation, compliance team, audit trails, data retention policies, GDPR compliance

**Risk**: Competition from established players
- **Mitigation**: Focus on AI predictions as differentiator, superior UX, faster data updates, community features

**Risk**: High infrastructure costs
- **Mitigation**: Cost optimization, reserved instances, auto-scaling to match demand, efficient caching

### Operational Risks

**Risk**: Team scaling and talent acquisition
- **Mitigation**: Competitive compensation, remote work options, clear career paths, training programs

**Risk**: Technical debt accumulation
- **Mitigation**: Code reviews, refactoring sprints, technical debt tracking, automated testing

**Risk**: Inadequate monitoring and alerting
- **Mitigation**: Comprehensive observability stack, on-call rotations, runbooks, incident response procedures

---

## Success Criteria and KPIs

### User Metrics
- Registered users: 2M+ by Month 24
- Daily active users (DAU): 500K+ by Month 24
- Monthly active users (MAU): 1.5M+ by Month 24
- User retention rate: 60%+ after 30 days
- Average session duration: 10+ minutes

### Technical Metrics
- API response time: < 200ms (p95)
- System uptime: 99.95%
- Error rate: < 0.1%
- Cache hit rate: 90%+
- Database query time: < 100ms (p95)

### Business Metrics
- Annual recurring revenue (ARR): $10M+ by Month 24
- Premium conversion rate: 5%+
- Customer acquisition cost (CAC): < $10
- Lifetime value (LTV): > $100
- Monthly revenue growth: 20%+

### ML Metrics
- Prediction accuracy: 65%+ directional accuracy
- Model inference latency: < 200ms
- Feature freshness: < 5 minutes lag
- Model retraining frequency: Weekly
- A/B test win rate: 60%+

---

## Conclusion

This requirements document provides a comprehensive blueprint for building a scalable, production-ready stock market prediction platform. The phased 2-year implementation plan balances rapid feature delivery with technical excellence, ensuring the platform can scale to millions of users while maintaining high performance and reliability.

The architecture leverages modern microservices patterns, distributed systems best practices, and cutting-edge machine learning techniques to deliver accurate predictions and real-time market insights. With proper execution of this plan, the platform is positioned to become a leading player in the financial technology space and achieve multi-billion dollar valuation.

Key success factors include:
- Robust technical architecture with horizontal scalability
- High-quality data from multiple sources with real-time updates
- Accurate ML predictions with continuous improvement
- Excellent user experience with low latency and high availability
- Strong security and compliance posture
- Effective monetization strategy with premium features
- Aggressive user acquisition and retention strategies

The team should remain agile and adapt the plan based on user feedback, market conditions, and technical learnings throughout the implementation journey.

