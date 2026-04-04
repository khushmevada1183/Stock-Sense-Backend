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
- [ ] Block deals scraper (NSE/BSE data)
- [ ] Mutual fund holdings data pipeline (SEBI monthly data)
- [ ] Insider trading data ingestion
- [ ] Shareholding pattern quarterly data
- [ ] Corporate actions scraper
- [ ] Earnings calendar seeding
- [ ] GET /institutional/* APIs

---

#### PHASE 4: Real-Time Infrastructure (Month 7)

- [ ] WebSocket server with Socket.io + Redis adapter
- [ ] Live tick streaming from NSE WebSocket feed
- [ ] Market overview real-time updates room
- [ ] Per-stock live price rooms
- [ ] Portfolio real-time P&L updates
- [ ] Alert triggers via WebSocket
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
