/**
 * API Configuration
 *
 * Centralized API settings consumed by legacy and v1 modules.
 */

const API_CONFIG = {
  // API Base URL
  BASE_URL: process.env.NEXT_PUBLIC_INDIAN_API_URL || 'https://stock.indianapi.in',

  // API Keys
  API_KEYS: process.env.NEXT_PUBLIC_INDIAN_API_KEYS
    ? process.env.NEXT_PUBLIC_INDIAN_API_KEYS.split(',')
    : [],

  // Default API Key (first one in the list)
  API_KEY: process.env.NEXT_PUBLIC_INDIAN_API_KEYS
    ? process.env.NEXT_PUBLIC_INDIAN_API_KEYS.split(',')[0]
    : '',

  // Request timeout in milliseconds
  TIMEOUT: 10000,

  // Cache duration in milliseconds
  CACHE_DURATION: 5 * 60 * 1000,

  // Number of retry attempts for failed requests
  RETRY_ATTEMPTS: 3,

  // API Key Rotation Configuration
  KEY_ROTATION: {
    ENABLED: true,
    AUTO_ROTATE_ON_429: true,
    MAX_CONSECUTIVE_FAILURES: 2,
    RETRY_DELAY: 1000,
    ROTATION_INTERVAL: 24 * 60 * 60 * 1000,
  },

  // Endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    FEATURED_STOCKS: '/stocks/featured',
    MARKET_OVERVIEW: '/stocks/market-overview',
    LATEST_NEWS: '/stocks/news/latest',
    UPCOMING_IPOS: '/stocks/ipo/upcoming',
    WEEK_52_HIGH_LOW: '/stocks/market/52-week',
    SEARCH: '/stocks/search',
    STOCK_DETAILS: '/stocks/:symbol',
    HISTORICAL_PRICES: '/stocks/:symbol/prices',
    FINANCIAL_RATIOS: '/stocks/:symbol/ratios',
    CORPORATE_ACTIONS: '/stocks/:symbol/corporate-actions',
    ANNOUNCEMENTS: '/stocks/:symbol/announcements',
    FINANCIALS: '/stocks/:symbol/financials/:statementType',
    COMPANY_PROFILE: '/stocks/:symbol/company',
    TOP_GAINERS: '/stocks/market/gainers',
    TOP_LOSERS: '/stocks/market/losers',
    MARKET_INDICES: '/stocks/market/indices',
    SECTOR_PERFORMANCE: '/stocks/market/sectors',
    IPO_CALENDAR: '/stocks/ipo/calendar',
    IPO_DETAILS: '/stocks/ipo/:ipoId',
    MARKET_MOVERS: '/stocks/market/most-active',
    PEER_COMPARISON: '/stocks/:symbol/peers',
  },
};

module.exports = {
  API_CONFIG,
};
