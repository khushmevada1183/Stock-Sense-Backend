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
NEXT_PUBLIC_INDIAN_API_URL=https://stock.indianapi.in
NEXT_PUBLIC_INDIAN_API_KEYS=your-api-key-1,your-api-key-2,your-api-key-3
JWT_SECRET=your-jwt-secret
```

## Running the API

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3001`.

## API Endpoints

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
├── config/
│   └── index.js           # Configuration settings
├── middleware/
│   └── apiKeyAuth.js      # API key authentication
├── utils/
│   ├── errorHandler.js    # Error handling utilities
│   └── cacheManager.js    # Cache management
├── api.js                 # API client for external API
├── index.js               # API routes
├── server.js              # Express server setup
└── README.md              # This documentation
```

## License

MIT
