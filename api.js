// Load environment variables
// For backend use
if (typeof require !== 'undefined') {
  require('dotenv').config();
}

// Use conditional imports for frontend/backend compatibility
const axios = (typeof require !== 'undefined') ? require('axios') : window.axios;

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_INDIAN_API_URL || process.env.API_URL || 'https://stock.indianapi.in';
console.log('API URL:', API_URL);
console.log('API KEYS env var:', process.env.NEXT_PUBLIC_INDIAN_API_KEYS);
const API_KEYS = process.env.NEXT_PUBLIC_INDIAN_API_KEYS?.split(',') || [];
console.log('API KEYS array length:', API_KEYS.length);

if (!API_KEYS.length) {
  console.warn('No API keys found in environment variables. Using mock data for development.');
}

// API Key Manager
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
      console.warn('No API keys found in environment variables.');
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

// Create API key manager instance
const keyManager = new ApiKeyManager();

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Generic GET request function with automatic key rotation on rate limit
 * @param {string} endpoint - API endpoint to call
 * @param {Object} params - Query parameters
 * @param {Object} options - Additional options
 * @returns {Promise<any>} - Response data
 */
async function getData(endpoint, params = {}, options = {}) {
  // Use mock data when no API URL is available (for development)
  if (!API_URL && process.env.NODE_ENV === 'production') {
    throw new Error('API_URL is not defined in environment variables.');
  }
  
  // Use mock data in development mode if API_URL is not available
  if (!API_URL) {
    console.log(`Using mock data for endpoint: ${endpoint}`);
    return getMockData(endpoint, params);
  }

  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Allow retrying with all available keys if needed
  const maxRetries = options.maxRetries || keyManager.keys.length; 
  let attempts = 0;
  
  while (attempts < maxRetries) {
    const apiKey = keyManager.getCurrentKey();
    
    if (!apiKey) {
      throw new Error('No valid API key available.');
    }
    
    // Wait for rate limiting before making request
    await keyManager.waitForRateLimit(apiKey);
    
    try {
      console.log(`API Request (${attempts + 1}/${maxRetries}): ${url} with key ${keyManager.currentKeyIndex}`);
      
      // Following exact format from API examples
      const requestOptions = {
        method: 'GET',
        url: `${API_URL}${url}`,
        params,
        headers: {
          'X-Api-Key': apiKey,
          ...options.headers
        }
      };
      
      const response = await axios.request(requestOptions);
      
      // Record successful use
      keyManager.recordSuccessfulUse();
      
      return response.data;
    } catch (error) {
      attempts++;
      console.error(`API Error (attempt ${attempts}/${maxRetries}):`, error.message);
      
      // Handle rate limit errors
      if (error.response && error.response.status === 429) {
        console.warn('API rate limit hit');
        
        // Get retry-after header or default to 5 minutes
        const retryAfter = error.response.headers['retry-after'] 
          ? parseInt(error.response.headers['retry-after'], 10) 
          : 300; // 5 minutes default
          
        // Mark current key as rate limited
        keyManager.markCurrentKeyRateLimited(retryAfter);
        
        if (attempts < maxRetries) {
          // If we have more keys, try the next one immediately with a small delay
          // Only use exponential backoff if we've cycled through many keys
          const backoffDelay = attempts > keyManager.keys.length ? Math.min(1000 * Math.pow(2, attempts - keyManager.keys.length), 10000) : 100; 
          console.log(`Switching to next key (attempt ${attempts+1}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, backoffDelay));
          continue; // Retry with new key
        }
      } else {
        // For non-rate-limit errors, increment failure counter
        keyManager.consecutiveFailures++;
        
        // If we've had multiple consecutive failures, try rotating the key
        if (keyManager.consecutiveFailures >= 2) {
          keyManager.rotateToNextAvailableKey();
          
          if (attempts < maxRetries) {
            // Small delay before retry
            await new Promise(r => setTimeout(r, 2000));
            continue; // Retry with new key
          }
        }
      }
      
      // Detailed error handling
      if (error.response) {
        // Server responded with an error status
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        if (status === 429) {
          // Check if all keys are rate limited
          const keyStatuses = keyManager.getKeyStatuses();
          const availableKeys = Object.values(keyStatuses).filter(s => s.isAvailable).length;
          
          if (availableKeys === 0) {
            const earliestReset = Math.min(...Object.values(keyStatuses).map(s => s.rateLimitResetIn));
            throw new Error(`All API keys are rate limited. Please try again in ${Math.ceil(earliestReset/60000)} minutes. (${message})`);
          } else {
            throw new Error(`API rate limit exceeded. Please try again later. (${message})`);
          }
        } else if (status === 401 || status === 403) {
          throw new Error(`API authentication failed. Check your API key. (${message})`);
        } else if (status === 404) {
          throw new Error(`API endpoint not found: ${url} (${message})`);
        } else if (status >= 500) {
          throw new Error(`API server error (${status}): ${message}`);
        } else {
          throw new Error(`API error (${status}): ${message}`);
        }
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED') {
          throw new Error('API request timed out. The server took too long to respond.');
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error('API connection refused. The server may be down or the URL is incorrect.');
        } else {
          throw new Error(`Network error: ${error.message}`);
        }
      } else {
        // Something happened in setting up the request
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }
  
  throw new Error(`Failed to fetch data after ${maxRetries} attempts`);
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
  console.warn('getUpcomingIPOs is deprecated. Use getIPOData() instead.');
  return getIPOData();
}

async function getIPOCalendar() {
  console.warn('getIPOCalendar is deprecated. Use getIPOData() instead.');
  return getIPOData();
}

/**
 * Get specific IPO details (Note: API doesn't support IPO by ID, returns all IPOs)
 * @param {string} ipoId - IPO identifier (currently ignored by API)
 * @returns {Promise<Object>} - IPO information
 */
async function getIPODetails(ipoId) {
  console.warn('API does not support specific IPO details by ID. Returning all IPO data.');
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
  console.warn("Portfolio API not available in the current API version");
  return { portfolios: [] };
}
async function deletePortfolio() {
  console.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}
async function createPortfolio() {
  console.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}
async function updatePortfolio() {
  console.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}
// Add to portfolio functions
async function getPortfolioHoldings() {
  console.warn("Portfolio API not available in the current API version");
  return { holdings: [] };
}
async function getPortfolioSummary() {
  console.warn("Portfolio API not available in the current API version");
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

// Create a common object for exports
const apiExports = {
  // Generic function
  getData,
  
  // Key manager access for debugging
  getKeyManager: () => keyManager,
  
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
  
  // Portfolio functions
  getUserPortfolios,
  deletePortfolio,
  createPortfolio,
  updatePortfolio,
  getPortfolioHoldings,
  getPortfolioSummary
};

// Mock data function for development when API is not available
function getMockData(endpoint, params) {
  console.log(`Getting mock data for ${endpoint} with params:`, params);
  
  // Mock data based on endpoint
  const mockData = {
    '/trending': {
      stocks: [
        { id: '1', symbol: 'RELIANCE', company_name: 'Reliance Industries', sector_name: 'Oil & Gas', price_change_percentage: 2.45, current_price: 2495.50 },
        { id: '2', symbol: 'TCS', company_name: 'Tata Consultancy Services', sector_name: 'IT', price_change_percentage: 1.75, current_price: 3452.20 },
        { id: '3', symbol: 'HDFCBANK', company_name: 'HDFC Bank', sector_name: 'Banking', price_change_percentage: 0.95, current_price: 1657.85 },
        { id: '4', symbol: 'INFY', company_name: 'Infosys', sector_name: 'IT', price_change_percentage: -0.65, current_price: 1342.30 },
        { id: '5', symbol: 'ITC', company_name: 'ITC Limited', sector_name: 'FMCG', price_change_percentage: 1.25, current_price: 413.90 }
      ]
    },
    '/news': {
      news: [
        { id: '1', title: 'RBI Announces New Monetary Policy', source: 'Economic Times', date: '2025-07-25T10:30:00Z', url: '#', imageUrl: 'https://via.placeholder.com/300x200' },
        { id: '2', title: 'Reliance Announces Major Expansion Plan', source: 'Business Standard', date: '2025-07-24T14:15:00Z', url: '#', imageUrl: 'https://via.placeholder.com/300x200' },
        { id: '3', title: 'IT Sector Shows Strong Growth in Q1', source: 'Mint', date: '2025-07-23T09:45:00Z', url: '#', imageUrl: 'https://via.placeholder.com/300x200' },
        { id: '4', title: 'Market Reaches All-Time High', source: 'CNBC-TV18', date: '2025-07-22T16:20:00Z', url: '#', imageUrl: 'https://via.placeholder.com/300x200' }
      ]
    },
    '/ipo': {
      ipos: [
        { name: 'ABC Technologies', symbol: 'ABCTECH', date: '2025-08-10', priceRange: '₹900-950' },
        { name: 'XYZ Pharmaceuticals', symbol: 'XYZPHARMA', date: '2025-08-15', priceRange: '₹550-600' },
        { name: 'PQR Industries', symbol: 'PQRIND', date: '2025-08-22', priceRange: '₹1200-1250' }
      ]
    },
    '/price_shockers': {
      gainers: [
        { symbol: 'COMPANY1', change_percent: 9.5, last_price: 450.75 },
        { symbol: 'COMPANY2', change_percent: 8.2, last_price: 1240.30 },
        { symbol: 'COMPANY3', change_percent: 7.6, last_price: 567.90 }
      ],
      losers: [
        { symbol: 'COMPANY4', change_percent: -6.8, last_price: 890.20 },
        { symbol: 'COMPANY5', change_percent: -5.9, last_price: 345.60 },
        { symbol: 'COMPANY6', change_percent: -5.2, last_price: 1120.45 }
      ]
    }
  };
  
  // Return mock data for the requested endpoint
  if (endpoint in mockData) {
    return mockData[endpoint];
  }
  
  // For any other endpoint, return a generic success response
  return {
    success: true,
    message: 'Mock data response',
    data: {}
  };
}

// Export as CommonJS module
module.exports = apiExports;

