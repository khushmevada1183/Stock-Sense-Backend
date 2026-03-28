/**
 * Stock Sense Backend API
 * 
 * ============================================================================
 * 🔄 ARCHITECTURE CHANGE: Data Source Migration (v2.0)
 * ============================================================================
 * 
 * PREVIOUS ARCHITECTURE:
 *   External APIs (indianapi.in) ←→ API Key Management ←→ Rate Limiting
 * 
 * NEW ARCHITECTURE:
 *   stock-nse-india Package ←→ NSE Direct Access ←→ No API Keys Required
 * 
 * BENEFITS:
 *   ✅ No external API dependencies
 *   ✅ No API rate limiting issues
 *   ✅ No API key management overhead
 *   ✅ Direct NSE data access via stock-nse-india microservice
 *   ✅ Frontend endpoints remain unchanged
 * 
 * DATA SOURCE:
 *   Primary:   stock-nse-india package (npm install stock-nse-india)
 *   Fallback:  Mock data for unavailable endpoints
 * 
 * ENDPOINT MAPPING:
 *   /stock                 ↔ getEquityDetails()
 *   /historical_data       ↔ getEquityHistoricalData()
 *   /intraday_data         ↔ getEquityIntradayData()
 *   /option_chain          ↔ getEquityOptionChain()
 *   /corporate_info        ↔ getEquityCorporateInfo()
 *   /trade_info            ↔ getEquityTradeInfo()
 *   /trending              ↔ getEquityStockIndices()
 *   /price_shockers        ↔ getGainersAndLosersByIndex()
 *   /NSE_most_active       ↔ getMostActiveEquities()
 *   /ipo, /commodities     ↔ Falls back to mock data
 * ============================================================================
 */

// Load environment variables
// For backend use
if (typeof require !== 'undefined') {
  require('dotenv').config();
}

// Use conditional imports for frontend/backend compatibility
const axios = (typeof require !== 'undefined') ? require('axios') : window.axios;
const { getMockData } = require('./utils/mockData');
const cacheManager = require('./utils/cacheManager');
const { logger } = require('./utils/liveLogger');

// Import the stock-nse-india package for data extraction
let NseIndia;
try {
  const { NseIndia: NseIndiaClass } = require('stock-nse-india');
  NseIndia = NseIndiaClass;
} catch (err) {
  logger.warn('stock-nse-india package not available:', err.message);
  NseIndia = null;
}

// Initialize NseIndia instance (only if available)
let nseIndiaInstance = null;
if (NseIndia) {
  try {
    nseIndiaInstance = new NseIndia();
    console.log('✅ stock-nse-india initialized successfully');
  } catch (err) {
    logger.warn('❌ Failed to initialize stock-nse-india:', err.message);
    nseIndiaInstance = null;
  }
}

// ============================================================================
// Data Source Helper Functions (stock-nse-india wrapper)
// ============================================================================

/**
 * CACHE STRATEGY CONFIGURATION
 * 
 * Defines caching behavior for each endpoint:
 * - Live Price Endpoints: NO CACHE (prices must be real-time)
 * - Historical Data: SHORT CACHE (5-10 min) - safe, doesn't change intraday
 * - Static Data: LONG CACHE (1+ hour) - company info, etc.
 * 
 * Cache TTL values: 1 minute = 60000ms, 1 hour = 3600000ms
 */
const CACHE_STRATEGY = {
  // ❌ DO NOT CACHE - LIVE PRICE DATA
  '/stock': {
    cacheable: false,
    ttl: 0,
    reason: 'Real-time price data must never be cached'
  },
  '/trending': {
    cacheable: false,
    ttl: 0,
    reason: 'Real-time trending indices must always be fresh'
  },
  '/intraday_data': {
    cacheable: false,
    ttl: 0,
    reason: 'Real-time intraday prices must not be cached'
  },
  '/price_shockers': {
    cacheable: false,
    ttl: 0,
    reason: 'Real-time gainers/losers must be current'
  },
  '/NSE_most_active': {
    cacheable: false,
    ttl: 0,
    reason: 'Real-time active stocks must always be fresh'
  },
  '/BSE_most_active': {
    cacheable: false,
    ttl: 0,
    reason: 'Real-time BSE active stocks must always be fresh'
  },
  '/commodities': {
    cacheable: false,
    ttl: 0,
    reason: 'Real-time commodity prices must not be cached'
  },
  
  // ✅ CACHE WITH SHORT TTL - FREQUENTLY CHANGING DATA
  '/trade_info': {
    cacheable: true,
    ttl: 5 * 60 * 1000,  // 5 minutes
    reason: 'Trade info updates frequently but doesn\'t need to be real-time'
  },
  '/option_chain': {
    cacheable: true,
    ttl: 5 * 60 * 1000,  // 5 minutes
    reason: 'Options data updates frequently, cache reduces NSE hits'
  },
  '/intraday_chart': {
    cacheable: true,
    ttl: 5 * 60 * 1000,  // 5 minutes
    reason: 'Intraday charts don\'t need extreme real-time updates'
  },
  
  // ✅ CACHE WITH MEDIUM TTL - HISTORICAL DATA
  '/historical_data': {
    cacheable: true,
    ttl: 10 * 60 * 1000,  // 10 minutes
    reason: 'Historical data doesn\'t change, safe to cache'
  },
  '/historical_stats': {
    cacheable: true,
    ttl: 10 * 60 * 1000,  // 10 minutes
    reason: 'Historical statistics are stable throughout the day'
  },
  
  // ✅ CACHE WITH LONG TTL - STATIC DATA
  '/corporate_info': {
    cacheable: true,
    ttl: 60 * 60 * 1000,  // 1 hour
    reason: 'Corporate info rarely changes, safe for 1 hour cache'
  },
  '/ipo': {
    cacheable: true,
    ttl: 24 * 60 * 60 * 1000,  // 24 hours
    reason: 'IPO calendar changes daily, safe to cache overnight'
  },
  '/news': {
    cacheable: true,
    ttl: 15 * 60 * 1000,  // 15 minutes
    reason: 'News updates multiple times per hour'
  },
  '/industry_search': {
    cacheable: true,
    ttl: 60 * 60 * 1000,  // 1 hour
    reason: 'Industry data is relatively static'
  },
  '/stock_forecasts': {
    cacheable: true,
    ttl: 60 * 60 * 1000,  // 1 hour
    reason: 'Forecasts update daily, safe for 1 hour'
  },
  '/fetch_52_week_high_low_data': {
    cacheable: true,
    ttl: 60 * 60 * 1000,  // 1 hour
    reason: 'Weekly data changes once per day'
  }
};

/**
 * Wrapper for safe NseIndia calls with fallback to mock data
 */
async function callNSEIndia(methodName, ...args) {
  if (!nseIndiaInstance) {
    logger.warn(`⚠️  NseIndia not available, falling back to mock data for ${methodName}`);
    return null;
  }

  try {
    if (typeof nseIndiaInstance[methodName] === 'function') {
      const result = await nseIndiaInstance[methodName](...args);
      return result;
    } else {
      logger.warn(`Method ${methodName} not found on NseIndia instance`);
      return null;
    }
  } catch (err) {
    console.error(`NseIndia ${methodName} error:`, err.message);
    return null;
  }
}

// API Key Manager (DEPRECATED - kept for backward compatibility)
class ApiKeyManager {
  constructor() {
    this.keys = API_KEYS;
    this.currentKeyIndex = 0;
    this.keyStatus = new Map();
    this.consecutiveFailures = 0;
    this.lastKeyRotation = Date.now();
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessing = false;
    
    // Initialize key status tracking
    this.keys.forEach((key, index) => {
      this.keyStatus.set(key, {
        isAvailable: true,
        rateLimitResetTimestamp: 0,
        usageCount: 0,
        lastErrorTimestamp: 0,
        lastUsedTimestamp: 0,
        requestsPerMinute: 0,
        requestTimestamps: []
      });
    });
    
    if (this.keys.length === 0) {
      logger.warn('No API keys found in environment variables.');
    } else {
      console.log(`Loaded ${this.keys.length} API keys`);
    }
  }

  getCurrentKey() {
    this._refreshKeyAvailability();
    return this.keys[this.currentKeyIndex] || '';
  }

  // Add request rate limiting (max 10 requests per minute per key)
  async waitForRateLimit(key) {
    const now = Date.now();
    const status = this.keyStatus.get(key);
    
    if (!status) return;
    
    // Clean old timestamps (older than 1 minute)
    status.requestTimestamps = status.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );
    
    // If we've made too many requests in the last minute, wait
    if (status.requestTimestamps.length >= 10) {
      const oldestRequest = Math.min(...status.requestTimestamps);
      const waitTime = 60000 - (now - oldestRequest) + 1000; // Extra 1 second buffer
      
      if (waitTime > 0) {
        console.log(`Rate limiting: waiting ${Math.ceil(waitTime/1000)}s for key ${this.currentKeyIndex}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add current request timestamp
    status.requestTimestamps.push(now);
    status.lastUsedTimestamp = now;
    this.keyStatus.set(key, status);
  }

  markCurrentKeyRateLimited(resetTimeInSeconds = 300) { // Increased to 5 minutes
    const currentKey = this.getCurrentKey();
    if (!currentKey) return;
    
    const resetTimestamp = Date.now() + (resetTimeInSeconds * 1000);
    const status = this.keyStatus.get(currentKey);
    
    if (status) {
      status.isAvailable = false;
      status.rateLimitResetTimestamp = resetTimestamp;
      status.lastErrorTimestamp = Date.now();
      // Clear request timestamps to reset rate limiting
      status.requestTimestamps = [];
      this.keyStatus.set(currentKey, status);
      console.log(`Key ${this.currentKeyIndex} marked as rate limited for ${resetTimeInSeconds} seconds`);
    }
    
    this.rotateToNextAvailableKey();
  }

  recordSuccessfulUse() {
    const currentKey = this.getCurrentKey();
    if (!currentKey) return;
    
    const status = this.keyStatus.get(currentKey);
    if (status) {
      status.usageCount++;
      status.lastUsedTimestamp = Date.now();
      this.keyStatus.set(currentKey, status);
    }
    
    // Reset consecutive failures on success
    this.consecutiveFailures = 0;
  }

  rotateToNextAvailableKey() {
    if (this.keys.length <= 1) return false;
    
    this._refreshKeyAvailability();
    
    const oldIndex = this.currentKeyIndex;
    let attempts = 0;
    
    // Try to find an available key
    while (attempts < this.keys.length) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      const key = this.keys[this.currentKeyIndex];
      const status = this.keyStatus.get(key);
      
      if (status && status.isAvailable) {
        this.lastKeyRotation = Date.now();
        console.log(`API key rotated from index ${oldIndex} to ${this.currentKeyIndex}`);
        return true;
      }
      
      attempts++;
    }
    
    // If no available keys, find the one with the earliest reset time
    let earliestResetKey = 0;
    let earliestResetTime = Infinity;
    
    this.keys.forEach((key, index) => {
      const status = this.keyStatus.get(key);
      if (status && status.rateLimitResetTimestamp < earliestResetTime) {
        earliestResetTime = status.rateLimitResetTimestamp;
        earliestResetKey = index;
      }
    });
    
    this.currentKeyIndex = earliestResetKey;
    this.lastKeyRotation = Date.now();
    
    const waitTime = Math.max(0, earliestResetTime - Date.now());
    console.log(`All keys rate limited. Using key ${this.currentKeyIndex} (available in ${Math.ceil(waitTime/1000)}s)`);
    return false;
  }

  // Get status of all keys for debugging
  getKeyStatuses() {
    const statuses = {};
    this.keys.forEach((key, index) => {
      const status = this.keyStatus.get(key);
      const maskedKey = key.substring(0, 8) + '...';
      statuses[index] = {
        key: maskedKey,
        isAvailable: status?.isAvailable || false,
        rateLimitResetIn: Math.max(0, (status?.rateLimitResetTimestamp || 0) - Date.now()),
        usageCount: status?.usageCount || 0,
        recentRequests: status?.requestTimestamps?.length || 0
      };
    });
    return statuses;
  }

  _refreshKeyAvailability() {
    const now = Date.now();
    
    this.keys.forEach(key => {
      const status = this.keyStatus.get(key);
      if (status && !status.isAvailable && status.rateLimitResetTimestamp <= now) {
        status.isAvailable = true;
        this.keyStatus.set(key, status);
      }
    });
  }
}

/**
 * Generic GET request function with SELECTIVE CACHING
 * 
 * CACHING STRATEGY:
 * - Live price endpoints (/stock, /trending, etc): NO CACHE
 * - Historical data: Cache for 10 minutes
 * - Static data (corporate info, IPO, etc): Cache for 1+ hours
 * 
 * @param {string} endpoint - API endpoint to call
 * @param {Object} params - Query parameters
 * @param {Object} options - Additional options (skipCache, forceFresh)
 * @returns {Promise<any>} - Response data
 */
async function getData(endpoint, params = {}, options = {}) {
  // =============================
  // STEP 1: CHECK CACHE STRATEGY
  // =============================
  const strategy = CACHE_STRATEGY[endpoint] || { cacheable: false, ttl: 0 };
  const shouldAttemptCache = strategy.cacheable && !options.skipCache && !options.forceFresh;
  
  // =============================
  // STEP 2: GENERATE CACHE KEY
  // =============================
  let cacheKey = null;
  if (shouldAttemptCache) {
    cacheKey = cacheManager.generateKey(endpoint, params);
    
    // Try to get from cache
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache HIT for ${endpoint}`);
      return cachedData;
    }
    console.log(`⚠️  Cache MISS for ${endpoint} (TTL: ${strategy.ttl / 1000}s)`);
  }
  
  // =============================
  // STEP 3: FETCH FRESH DATA
  // =============================
  const endpointMap = {
    '/stock': async () => {
      const symbol = params.name || params.symbol;
      if (!symbol) return null;
      return await callNSEIndia('getEquityDetails', symbol);
    },
    '/historical_data': async () => {
      const symbol = params.stock_name || params.symbol;
      if (!symbol) return null;
      const range = params.period || '1m';
      // Parse date range
      const endDate = new Date();
      const startDate = new Date();
      
      // Map range to days
      const rangeMap = { '1m': 30, '6m': 180, '1yr': 365, '3yr': 1095, '5yr': 1825 };
      const days = rangeMap[range] || 30;
      startDate.setDate(startDate.getDate() - days);
      
      return await callNSEIndia('getEquityHistoricalData', symbol, { start: startDate, end: endDate });
    },
    '/intraday_data': async () => {
      const symbol = params.stock_name || params.symbol;
      if (!symbol) return null;
      return await callNSEIndia('getEquityIntradayData', symbol);
    },
    '/option_chain': async () => {
      const symbol = params.stock_name || params.symbol;
      if (!symbol) return null;
      return await callNSEIndia('getEquityOptionChain', symbol);
    },
    '/corporate_info': async () => {
      const symbol = params.stock_name || params.symbol;
      if (!symbol) return null;
      return await callNSEIndia('getEquityCorporateInfo', symbol);
    },
    '/trade_info': async () => {
      const symbol = params.stock_name || params.symbol;
      if (!symbol) return null;
      return await callNSEIndia('getEquityTradeInfo', symbol);
    },
    '/trending': async () => {
      return await callNSEIndia('getEquityStockIndices');
    },
    '/price_shockers': async () => {
      return await callNSEIndia('getGainersAndLosersByIndex', params.index || 'NIFTY 50');
    },
    '/NSE_most_active': async () => {
      return await callNSEIndia('getMostActiveEquities');
    },
    '/BSE_most_active': async () => {
      // BSE data not directly available in stock-nse-india, fall back to mock
      return null;
    },
    '/ipo': async () => {
      // IPO data not available in stock-nse-india, fall back to mock
      return null;
    },
    '/commodities': async () => {
      const symbol = params.symbol;
      if (!symbol) return null;
      return await callNSEIndia('getCommodityOptionChain', symbol);
    }
  };

  // Try to get data from NseIndia first
  const handler = endpointMap[endpoint];
  let result = null;
  
  if (handler) {
    try {
      result = await handler();
      if (result) {
        // =============================
        // STEP 4: STORE IN CACHE
        // =============================
        if (shouldAttemptCache && cacheKey && strategy.ttl > 0) {
          cacheManager.set(cacheKey, result, strategy.ttl, { 
            tags: ['nse-data', endpoint.replace('/', '')],
            priority: 'normal'
          });
          console.log(`📦 Cached data for ${endpoint} (TTL: ${strategy.ttl / 60000} minutes)`);
        }
        return result;
      }
    } catch (err) {
      logger.warn(`Error calling NseIndia for ${endpoint}:`, err.message);
    }
  }

  // Fallback to mock data
  console.log(`⏸️  Using mock data for endpoint: ${endpoint}`);
  const mockResult = getMockData(endpoint, params);
  
  // Store mock data in cache too (but with shorter TTL for safety)
  if (shouldAttemptCache && cacheKey && strategy.cacheable) {
    const mockCacheTtl = 2 * 60 * 1000; // 2-minute cache for mock data
    cacheManager.set(cacheKey, mockResult, mockCacheTtl, { 
      tags: ['mock-data', endpoint.replace('/', '')],
      priority: 'low'
    });
  }
  
  return mockResult;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check server health status
 * @returns {Promise<Object>} - Health status
 */
async function getHealthStatus() {
  return getData('/health');
}

// ============================================================================
// Market Data Endpoints
// ============================================================================

/**
 * Get trending/featured stocks
 * @returns {Promise<Array>} - Featured stocks data
 */
async function getFeaturedStocks() {
  return getData('/trending');
}

/**
 * Get market indices and overview
 * @returns {Promise<Object>} - Market overview data
 */
async function getMarketOverview() {
  return getData('/trending'); // Using trending as market overview
}

/**
 * Get news
 * @param {Object} params - Query parameters (limit, offset)
 * @returns {Promise<Array>} - News articles
 */
async function getLatestNews(params = {}) {
  return getData('/news', params);
}

/**
 * Get IPO data from the /ipo endpoint
 * @returns {Promise<Object>} - IPO information including upcoming, active, and recent IPOs
 */
async function getIPOData() {
  return getData('/ipo');
}

// Legacy aliases for backward compatibility
async function getUpcomingIPOs() {
  logger.warn('getUpcomingIPOs is deprecated. Use getIPOData() instead.');
  return getIPOData();
}

async function getIPOCalendar() {
  logger.warn('getIPOCalendar is deprecated. Use getIPOData() instead.');
  return getIPOData();
}

/**
 * Get specific IPO details (Note: API doesn't support IPO by ID, returns all IPOs)
 * @param {string} ipoId - IPO identifier (currently ignored by API)
 * @returns {Promise<Object>} - IPO information
 */
async function getIPODetails(ipoId) {
  logger.warn('API does not support specific IPO details by ID. Returning all IPO data.');
  return getIPOData();
}

// ============================================================================
// Stock-specific Data Endpoints
// ============================================================================

/**
 * Get detailed stock information
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} - Stock details
 */
async function getStockDetails(symbol) {
  // Matches the exact API example format
  return getData('/stock', { name: symbol });
}

/**
 * Get historical price data for a stock
 * @param {string} symbol - Stock symbol
 * @param {string} range - Time range (1m, 6m, 1yr, 3yr, 5yr, 10yr, max)
 * @param {string} filter - Filter type (default, price, pe, sm, evebitda, ptb, mcs)
 * @returns {Promise<Array>} - Historical price data
 */
async function getHistoricalPrices(symbol, range = '1m', filter = 'default') {
  // Matches the exact API example format
  return getData('/historical_data', { 
    stock_name: symbol, 
    period: range,
    filter: filter
  });
}

/**
 * Get key financial ratios for a stock

/**
 * Search for stocks
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Search results
 */
async function searchStocks(query) {
  return getData('/stock', { name: query });
}

// ============================================================================
// Stock-specific Data Endpoints
// ============================================================================

/**
 * Get detailed stock information
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} - Stock details
 */
async function getStockDetails(symbol) {
  // Matches the exact API example format
  return getData('/stock', { name: symbol });
}

/**
 * Get historical price data for a stock
 * @param {string} symbol - Stock symbol
 * @param {string} range - Time range (1m, 6m, 1yr, 3yr, 5yr, 10yr, max)
 * @param {string} filter - Filter type (default, price, pe, sm, evebitda, ptb, mcs)
 * @returns {Promise<Array>} - Historical price data
 */
async function getHistoricalPrices(symbol, range = '1m', filter = 'default') {
  // Matches the exact API example format
  return getData('/historical_data', { 
    stock_name: symbol, 
    period: range,
    filter: filter
  });
}

/**
 * Get key financial ratios for a stock
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} - Financial ratios
 */
async function getFinancialRatios(symbol) {
  return getData('/historical_stats', { 
    stock_name: symbol, 
    stats: 'ratios' 
  });
}

/**
 * Get corporate actions for a stock
 * @param {string} symbol - Stock symbol
 * @param {Object} params - Query parameters (limit, offset)
 * @returns {Promise<Array>} - Corporate actions
 */
async function getCorporateActions(symbol, params = {}) {
  return getData('/corporate_actions', { stock_name: symbol, ...params });
}

/**
 * Get company announcements
 * @param {string} symbol - Stock symbol
 * @param {Object} params - Query parameters (limit, offset)
 * @returns {Promise<Array>} - Company announcements
 */
async function getCompanyAnnouncements(symbol, params = {}) {
  return getData('/recent_announcements', { stock_name: symbol, ...params });
}

/**
 * Get financial statements for a stock
 * @param {string} symbol - Stock symbol
 * @param {string} statementType - Statement type (cashflow, yoy_results, quarter_results, balancesheet)
 * @returns {Promise<Object>} - Financial statements
 */
async function getFinancialStatements(symbol, statementType = 'yoy_results') {
  return getData('/statement', { 
    stock_name: symbol, 
    stats: statementType 
  });
}

/**
 * Get company profile
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} - Company profile
 */
async function getCompanyProfile(symbol) {
  return getData('/stock', { name: symbol });
}

/**
 * Get top gainers in the market
 * @param {Object} params - Query parameters (limit)
 * @returns {Promise<Array>} - Top gainers
 */
async function getTopGainers(params = {}) {
  return getData('/price_shockers', params); // Using price_shockers for gainers
}

/**
 * Get top losers in the market
 * @param {Object} params - Query parameters (limit)
 * @returns {Promise<Array>} - Top losers
 */
async function getTopLosers(params = {}) {
  return getData('/price_shockers', params); // Using price_shockers for losers
}

/**
 * Get market indices
 * @returns {Promise<Array>} - Market indices
 */
async function getMarketIndices() {
  return getData('/trending'); // Using trending for market indices
}

/**
 * Get sector performance
 * @returns {Promise<Array>} - Sector performance data
 */
async function getSectorPerformance() {
  return getData('/trending'); // Using trending for sector performance
}

/**
 * Get IPO calendar
 * @returns {Promise<Object>} - IPO calendar with upcoming, ongoing, and completed IPOs
 */
async function getIPOCalendar() {
  return getData('/ipo');
}

/**
 * Get specific IPO details
 * @param {string} ipoId - IPO identifier
 * @returns {Promise<Object>} - Detailed IPO information
 */
async function getIPODetails(ipoId) {
  return getData('/ipo'); // API doesn't have specific IPO by ID
}

/**
 * Get market movers (most active stocks by volume)
 * @param {Object} params - Query parameters (limit)
 * @returns {Promise<Object>} - Most active stocks from BSE and NSE
 */
async function getMarketMovers(params = {}) {
  const bse = await getData('/BSE_most_active', params);
  const nse = await getData('/NSE_most_active', params);
  return { bse, nse };
}

/**
 * Get peer comparison for a stock
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} - Peer comparison data
 */
async function getPeerComparison(symbol) {
  return getData('/industry_search', { query: symbol }); // Using industry search for peers
}

// Portfolio functions - these are not in the API documentation
// Returning mock data for UI compatibility
async function getUserPortfolios() {
  logger.warn("Portfolio API not available in the current API version");
  return { portfolios: [] };
}
async function deletePortfolio() {
  logger.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}
async function createPortfolio() {
  logger.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}
async function updatePortfolio() {
  logger.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}
// Add to portfolio functions
async function getPortfolioHoldings() {
  logger.warn("Portfolio API not available in the current API version");
  return { holdings: [] };
}
async function getPortfolioSummary() {
  logger.warn("Portfolio API not available in the current API version");
  return { summary: {} };
}
// Stock functions that use documented endpoints
async function getStockTargetPrice(stockId) {
  // Use stock forecasts as a proxy for target price
  return getStockForecasts(stockId);
}
async function getCommodities() {
  return getData('/commodities');
}

// New functions based on available API endpoints
async function getMutualFunds() {
  return getData('/mutual_funds');
}
async function getNSEMostActive() {
  return getData('/NSE_most_active');
}
async function getBSEMostActive() {
  return getData('/BSE_most_active');
}
async function getPriceShockers() {
  return getData('/price_shockers');
}

async function get52WeekHighLow() {
  return getData('/fetch_52_week_high_low_data');
}

async function getStockForecasts(stockId, measureCode = 'EPS', periodType = 'Annual', dataType = 'Actuals', age = 'Current') {
  return getData('/stock_forecasts', {
    stock_id: stockId,
    measure_code: measureCode,
    period_type: periodType,
    data_type: dataType,
    age: age
  });
}
// Add other functions as needed

// ============================================================================
// CACHE MANAGEMENT UTILITIES (for monitoring and debugging)
// ============================================================================

/**
 * Get current cache statistics and status
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  return {
    strategy: CACHE_STRATEGY,
    stats: cacheManager.getStats ? cacheManager.getStats() : { message: 'Stats not available' }
  };
}

/**
 * Clear cache for a specific endpoint or all
 * @param {string} endpoint - Optional endpoint to clear (e.g., '/stock', '/trending')
 * @param {string} symbol - Optional symbol to clear for specific stocks
 */
function clearCache(endpoint = null, symbol = null) {
  if (!endpoint) {
    // Clear all cache
    cacheManager.clear();
    console.log('✅ Entire cache cleared');
    return { success: true, message: 'Entire cache cleared' };
  }
  
  if (symbol) {
    // Clear specific stock data
    const pattern = `${endpoint}:.*"${symbol.toUpperCase()}".*`;
    cacheManager.clear(pattern);
    console.log(`✅ Cache cleared for ${symbol} on endpoint ${endpoint}`);
    return { success: true, message: `Cache cleared for ${symbol} on ${endpoint}` };
  }
  
  // Clear endpoint cache
  const pattern = `^${endpoint}:`;
  cacheManager.clear(pattern);
  console.log(`✅ Cache cleared for endpoint: ${endpoint}`);
  return { success: true, message: `Cache cleared for endpoint: ${endpoint}` };
}

/**
 * Force refresh data (bypass cache and fetch fresh)
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<any>} - Fresh data
 */
async function getDataFresh(endpoint, params = {}) {
  console.log(`🔄 Force refreshing data for ${endpoint}`);
  return getData(endpoint, params, { forceFresh: true });
}

/**
 * Get cache strategy information
 * @returns {Object} - Cache strategy details
 */
function getCacheStrategy() {
  return CACHE_STRATEGY;
}

// Create a common object for exports
const apiExports = {
  // Generic function
  getData,
  
  // NseIndia instance access for debugging
  getNseIndiaInstance: () => nseIndiaInstance,
  
  // Health check
  getHealthStatus,
  
  // Market data - Updated to match documented endpoints
  getFeaturedStocks,
  getMarketOverview,
  getLatestNews,
  getIPOData, // Main IPO function
  getUpcomingIPOs, // Legacy alias
  searchStocks,
  getMarketMovers,
  
  // Stock-specific data - Updated to match documented endpoints
  getHistoricalPrices,
  getCorporateActions,
  getCompanyAnnouncements,
  getFinancialStatements,
  getCompanyProfile,
  getPeerComparison,
  
  // IPO data
  getIPOCalendar, // Legacy alias
  getIPODetails,
  
  // Additional functions from documented API
  getCommodities,
  getMutualFunds,
  getNSEMostActive,
  getBSEMostActive,
  getPriceShockers,
  get52WeekHighLow,
  getStockForecasts,
  getStockTargetPrice,
  
  // Cache management utilities
  getCacheStats,
  clearCache,
  getDataFresh,
  getCacheStrategy,
  
  // Portfolio functions
  getUserPortfolios,
  deletePortfolio,
  createPortfolio,
  updatePortfolio,
  getPortfolioHoldings,
  getPortfolioSummary
};



// Export as CommonJS module
module.exports = apiExports;

