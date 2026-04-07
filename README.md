# Indian Stock API

A robust API for accessing Indian stock market data, company information, and financial analysis.

## Features

- **Real-time Stock Data**: Access current stock prices, market indices, and trading data
- **Company Information**: Detailed company profiles, financial statements, and key ratios
- **Market Analysis**: Get market movers, sector performance, and trending stocks
- **IPO Data**: Information about upcoming, active, and recently listed IPOs
- **Historical Data**: Access historical price data with various time ranges
- **Caching System**: Efficient caching to reduce API calls and improve performance
- **API Key Rotation**: Automatic rotation of API keys to prevent rate limiting
- **Neon Postgres + TimescaleDB (v1)**: Versioned data layer for durable time-series stock storage

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=10000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
PG_POOL_MAX=15
PG_IDLE_TIMEOUT_MS=30000
PG_CONNECTION_TIMEOUT_MS=10000
PG_QUERY_TIMEOUT_MS=15000
PG_STATEMENT_TIMEOUT_MS=15000
PG_APP_NAME=stock-sense-backend
NEXT_PUBLIC_INDIAN_API_URL=https://stock.indianapi.in
NEXT_PUBLIC_INDIAN_API_KEYS=your-api-key-1,your-api-key-2,your-api-key-3
JWT_SECRET=your-jwt-secret
CACHE_ENABLED=true
CACHE_MAX_SIZE=10000
CACHE_REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379
CACHE_REDIS_NAMESPACE=stock_sense_backend
REDIS_CONNECT_TIMEOUT_MS=3000
ALERT_EVALUATOR_ENABLED=true
ALERT_EVALUATOR_INTERVAL_MS=30000
ALERT_EVALUATOR_RUN_ON_START=true
ALERT_EVALUATOR_MARKET_HOURS_ONLY=true
ALERT_EVALUATOR_FORCE_RUN=false
ALERT_EVALUATOR_COOLDOWN_SECONDS=300
ALERT_MARKET_TIMEZONE=Asia/Kolkata
ALERT_MARKET_OPEN_HHMM=0915
ALERT_MARKET_CLOSE_HHMM=1530
ALERT_MARKET_WEEKDAYS=1,2,3,4,5
NOTIFICATION_DELIVERY_ENABLED=true
NOTIFICATION_DELIVERY_INTERVAL_MS=30000
NOTIFICATION_DELIVERY_RUN_ON_START=true
NOTIFICATION_DELIVERY_BATCH_SIZE=50
NOTIFICATION_EMAIL_MODE=mock
NOTIFICATION_EMAIL_WEBHOOK_URL=
NOTIFICATION_PUSH_MODE=mock
NOTIFICATION_PUSH_WEBHOOK_URL=
IPO_SUBSCRIPTION_SYNC_INTERVAL_MS=3600000
IPO_GMP_SYNC_INTERVAL_MS=3600000
FII_DII_SYNC_INTERVAL_MS=86400000
BLOCK_DEALS_SYNC_INTERVAL_MS=21600000
MUTUAL_FUND_HOLDINGS_SYNC_INTERVAL_MS=86400000
INSIDER_TRADES_SYNC_INTERVAL_MS=86400000
SHAREHOLDING_SYNC_INTERVAL_MS=86400000
CORPORATE_ACTIONS_SYNC_INTERVAL_MS=86400000
EARNINGS_CALENDAR_SYNC_INTERVAL_MS=86400000
WEBSOCKET_ENABLED=true
WEBSOCKET_PATH=/socket.io
WEBSOCKET_CORS_ORIGIN=*
WEBSOCKET_PING_INTERVAL_MS=25000
WEBSOCKET_PING_TIMEOUT_MS=20000
WEBSOCKET_REDIS_ADAPTER_ENABLED=true
WEBSOCKET_REDIS_URL=redis://localhost:6379
LIVE_TICK_STREAM_ENABLED=true
LIVE_TICK_STREAM_INTERVAL_MS=15000
LIVE_TICK_STREAM_RUN_ON_START=true
LIVE_TICK_STREAM_PERSIST_TICKS=true
LIVE_TICK_STREAM_INCLUDE_DEFAULT_SYMBOLS=true
LIVE_TICK_STREAM_DEFAULT_SYMBOLS=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK
LIVE_TICK_STREAM_MAX_SYMBOLS=30
```

## Running the API

```bash
# Apply DB migrations first (Timescale + tables)
npm run db:migrate

# Optional readiness check for DB/Timescale
npm run db:check

# Optional one-time alert evaluation run
npm run alerts:evaluate

# Optional continuous alert evaluation (30s cadence)
npm run alerts:evaluate:watch

# Optional one-time notification delivery processing
npm run notifications:process

# Optional continuous notification delivery processing
npm run notifications:process:watch

# Optional IPO calendar seed (upsert)
npm run ipo:seed

# Optional one-time IPO subscription scraper sync
npm run ipo:subscriptions:sync

# Optional continuous IPO subscription scraper sync
npm run ipo:subscriptions:watch

# Optional one-time IPO GMP scraper sync
npm run ipo:gmp:sync

# Optional continuous IPO GMP scraper sync
npm run ipo:gmp:watch

# Optional one-time FII/DII scraper sync
npm run institutional:fii-dii:sync

# Optional continuous FII/DII scraper sync
npm run institutional:fii-dii:watch

# Optional one-time block deals scraper sync
npm run institutional:block-deals:sync

# Optional continuous block deals scraper sync
npm run institutional:block-deals:watch

# Optional one-time mutual-fund holdings scraper sync
npm run institutional:mutual-funds:sync

# Optional continuous mutual-fund holdings scraper sync
npm run institutional:mutual-funds:watch

# Optional one-time insider-trades scraper sync
npm run institutional:insider-trades:sync

# Optional continuous insider-trades scraper sync
npm run institutional:insider-trades:watch

# Optional one-time shareholding scraper sync
npm run institutional:shareholding:sync

# Optional continuous shareholding scraper sync
npm run institutional:shareholding:watch

# Optional one-time corporate-actions scraper sync
npm run institutional:corporate-actions:sync

# Optional continuous corporate-actions scraper sync
npm run institutional:corporate-actions:watch

# Optional one-time earnings-calendar seeding run
npm run institutional:earnings-calendar:sync

# Optional continuous earnings-calendar seeding run
npm run institutional:earnings-calendar:watch

# Optional one-time live-tick stream run
npm run market:ticks:sync

# Optional continuous live-tick stream watch run
npm run market:ticks:watch

# Optional websocket runtime smoke test (requires running server)
npm run websocket:smoke

# Optional live-tick stream smoke test (requires running server)
npm run market:ticks:smoke

# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:10000`.

## API Endpoints

### V1 Postgres/Timescale Endpoints
- `GET /api/v1/health` - V1 service health
- `GET /api/v1/health/db` - DB + Timescale readiness
- `POST /api/v1/stocks/:symbol/ticks` - Upsert OHLCV ticks/candles into Timescale
- `GET /api/v1/stocks/:symbol/ticks?from=<iso>&to=<iso>&limit=<n>` - Query recent ticks
- `GET /api/v1/institutional/fii-dii?segment=<equity|debt|hybrid>&limit=<n>` - Latest FII/DII daily flow summary
- `GET /api/v1/institutional/fii-dii/history?from=<yyyy-mm-dd>&to=<yyyy-mm-dd>&segment=<equity|debt|hybrid>&limit=<n>` - Historical FII/DII rows
- `GET /api/v1/institutional/fii-dii/cumulative?range=<monthly|yearly>&segment=<equity|debt|hybrid>&limit=<n>` - Cumulative net flows
- `POST /api/v1/institutional/fii-dii/sync` - Trigger FII/DII scraper sync run
- `GET /api/v1/institutional/block-deals?date=<yyyy-mm-dd>&exchange=<NSE|BSE>&symbol=<symbol>&dealType=<block|bulk>&limit=<n>` - Latest available block/bulk deals
- `GET /api/v1/institutional/block-deals/history?from=<yyyy-mm-dd>&to=<yyyy-mm-dd>&exchange=<NSE|BSE>&symbol=<symbol>&dealType=<block|bulk>&limit=<n>` - Historical block/bulk deals
- `POST /api/v1/institutional/block-deals/sync` - Trigger block deals scraper sync run
- `GET /api/v1/institutional/mutual-funds?month=<yyyy-mm-dd>&symbol=<symbol>&amc=<name>&scheme=<name>&limit=<n>` - Latest monthly mutual-fund holdings
- `GET /api/v1/institutional/mutual-funds/history?from=<yyyy-mm-dd>&to=<yyyy-mm-dd>&symbol=<symbol>&amc=<name>&scheme=<name>&limit=<n>` - Historical mutual-fund holdings
- `GET /api/v1/institutional/mutual-funds/top-holders?month=<yyyy-mm-dd>&symbol=<symbol>&limit=<n>` - Top mutual-fund holders by market value
- `POST /api/v1/institutional/mutual-funds/sync` - Trigger mutual-fund holdings scraper sync run
- `GET /api/v1/institutional/insider-trades?date=<yyyy-mm-dd>&symbol=<symbol>&transactionType=<buy|sell>&insider=<name>&role=<role>&limit=<n>` - Latest-day insider trades
- `GET /api/v1/institutional/insider-trades/history?from=<yyyy-mm-dd>&to=<yyyy-mm-dd>&symbol=<symbol>&transactionType=<buy|sell>&insider=<name>&role=<role>&limit=<n>` - Historical insider trades
- `GET /api/v1/institutional/insider-trades/summary?range=<monthly|yearly>&symbol=<symbol>&transactionType=<buy|sell>&limit=<n>` - Insider-trade summary aggregates
- `POST /api/v1/institutional/insider-trades/sync` - Trigger insider-trades scraper sync run
- `GET /api/v1/institutional/shareholding?period=<yyyy-mm-dd>&symbol=<symbol>&limit=<n>` - Latest-quarter shareholding pattern rows
- `GET /api/v1/institutional/shareholding/history?from=<yyyy-mm-dd>&to=<yyyy-mm-dd>&symbol=<symbol>&limit=<n>` - Historical shareholding pattern rows
- `GET /api/v1/institutional/shareholding/trends?range=<quarterly|yearly>&symbol=<symbol>&limit=<n>` - Quarterly/yearly shareholding trend aggregates
- `POST /api/v1/institutional/shareholding/sync` - Trigger shareholding scraper sync run
- `GET /api/v1/institutional/corporate-actions?date=<yyyy-mm-dd>&symbol=<symbol>&actionType=<dividend|split|bonus|rights|buyback>&limit=<n>` - Latest-day corporate actions
- `GET /api/v1/institutional/corporate-actions/history?from=<yyyy-mm-dd>&to=<yyyy-mm-dd>&symbol=<symbol>&actionType=<dividend|split|bonus|rights|buyback>&limit=<n>` - Historical corporate actions
- `GET /api/v1/institutional/corporate-actions/summary?range=<monthly|yearly>&symbol=<symbol>&actionType=<dividend|split|bonus|rights|buyback>&limit=<n>` - Corporate-action summary aggregates
- `POST /api/v1/institutional/corporate-actions/sync` - Trigger corporate-actions scraper sync run
- `GET /api/v1/institutional/earnings-calendar?date=<yyyy-mm-dd>&symbol=<symbol>&fiscalQuarter=<Q1|Q2|Q3|Q4>&limit=<n>` - Latest-day earnings calendar events
- `GET /api/v1/institutional/earnings-calendar/history?from=<yyyy-mm-dd>&to=<yyyy-mm-dd>&symbol=<symbol>&fiscalQuarter=<Q1|Q2|Q3|Q4>&limit=<n>` - Historical earnings calendar events
- `GET /api/v1/institutional/earnings-calendar/summary?range=<monthly|yearly>&symbol=<symbol>&fiscalQuarter=<Q1|Q2|Q3|Q4>&limit=<n>` - Earnings calendar summary aggregates
- `POST /api/v1/institutional/earnings-calendar/sync` - Trigger earnings-calendar seeding run
- `GET /api/v1/market/socket/status` - WebSocket server runtime and adapter status
- `GET /api/v1/market/ticks/status` - Live tick stream scheduler/subscription status
- `POST /api/v1/market/ticks/sync?symbols=<csv>&persist=<true|false>&includeDefaultSymbols=<true|false>` - Trigger one live tick stream cycle

### Health Check
- `GET /api/health` - Check server status

### Market Data
- `GET /api/stocks/featured` - Get trending/featured stocks
- `GET /api/stocks/market-overview` - Get market indices and overview
- `GET /api/stocks/news/latest` - Get latest market news
- `GET /api/stocks/ipo/upcoming` - Get upcoming IPO data
- `GET /api/stocks/market/52-week` - Get 52-week high/low data
- `GET /api/stocks/search?query=<search_term>` - Search for stocks
- `GET /api/stocks/market/gainers` - Get top gainers
- `GET /api/stocks/market/losers` - Get top losers
- `GET /api/stocks/market/indices` - Get market indices
- `GET /api/stocks/market/sectors` - Get sector performance
- `GET /api/stocks/market/most-active` - Get most active stocks

### Stock-specific Data
- `GET /api/stocks/:symbol` - Get detailed stock information
- `GET /api/stocks/:symbol/prices?range=<time_range>` - Get historical price data
  - Supported ranges: 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, MAX
- `GET /api/stocks/:symbol/ratios` - Get key financial ratios
- `GET /api/stocks/:symbol/corporate-actions` - Get corporate actions
- `GET /api/stocks/:symbol/announcements` - Get company announcements
- `GET /api/stocks/:symbol/financials/:statementType` - Get financial statements
  - Supported statement types: cashflow, yoy_results, quarter_results, balancesheet
- `GET /api/stocks/:symbol/company` - Get company profile
- `GET /api/stocks/:symbol/peers` - Get peer comparison

### IPO Data
- `GET /api/stocks/ipo/calendar` - Get IPO calendar
- `GET /api/stocks/ipo/:ipoId` - Get specific IPO details

### Cache Management (Admin Only)
- `POST /api/admin/cache/clear` - Clear cache
- `GET /api/admin/cache/stats` - Get cache statistics

## Authentication

All API endpoints (except `/api/health`) require authentication using an API key.

Include your API key in the request:
- As a header: `X-API-Key: your-api-key`
- Or as a query parameter: `?apiKey=your-api-key`

## Response Format

All API responses follow a standard format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": null,
    "timestamp": "2023-05-20T12:34:56.789Z"
  }
}
```

## Error Codes

- `ERR_MISSING_API_KEY` - API key is required
- `ERR_INVALID_API_KEY` - Invalid API key
- `ERR_ROUTE_NOT_FOUND` - Route not found
- `ERR_MISSING_QUERY` - Search query is required
- `ERR_429` - Rate limit exceeded
- `ERR_500` - Server error

## Caching

The API implements an in-memory caching system to improve performance and reduce the number of requests to the external API. Cache duration is configurable in the `.env` file.

## API Key Rotation

To prevent rate limiting, the API automatically rotates through multiple API keys. If a key hits a rate limit, the system will automatically switch to the next available key.

## Development

### Project Structure

```
api/
├── src/
│   ├── server.js           # Express server setup (mounts /api and /api/v1)
│   ├── config/            # Environment and DB config
│   ├── db/                # PG pool, migration runner, SQL migrations
│   ├── middleware/        # Request auth/validation/rate-limit middleware
│   ├── modules/           # Feature modules (health, stocks/ticks)
│   ├── routes/v1/         # Versioned API routes
│   ├── shared/            # Shared middleware/helpers
│   └── utils/             # Logging, cache, error, mock utilities
├── index.js               # Existing API routes
└── README.md              # This documentation
```

## License

MIT
