// Frontend API client for documented Indian Stock API endpoints
// This file uses ES modules for Next.js compatibility

// Call our Express backend server directly
const BASE_URL = 'http://localhost:10000/api';

// Generic function for API calls
async function fetchApi(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  
  // Add query parameters if any
  if (params && Object.keys(params).length > 0) {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
  }
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data; // Return the full response from Express backend
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
}

// ✅ DOCUMENTED API ENDPOINTS - Stock Market Data

// 1. /stock - Get basic details of a specific stock
export async function getStockDetails(stockName) {
  return fetchApi('/stock', { name: stockName });
}

// 2. /trending - Get trending stocks
export async function getTrendingStocks() {
  return fetchApi('/trending');
}

// 3. /BSE_most_active - Most active stocks on BSE
export async function getBSEMostActive() {
  return fetchApi('/BSE_most_active');
}

// 4. /NSE_most_active - Most active stocks on NSE
export async function getNSEMostActive() {
  return fetchApi('/NSE_most_active');
}

// 5. /fetch_52_week_high_low_data - Get 52-week high/low info
export async function get52WeekHighLow() {
  return fetchApi('/fetch_52_week_high_low_data');
}

// 6. /historical_data - Get historical stock price data
export async function getHistoricalData(stockName, period = '6m', filter = 'price') {
  return fetchApi('/historical_data', { 
    stock_name: stockName, 
    period: period, 
    filter: filter 
  });
}

// 7. /historical_stats - Get historical financial stats
export async function getHistoricalStats(stockName, stats) {
  return fetchApi('/historical_stats', { 
    stock_name: stockName, 
    stats: stats 
  });
}

// 8. /stock_forecasts - Forecasts using financial ratios
export async function getStockForecasts(stockId, measureCode = 'EPS', periodType = 'Annual', dataType = 'Actuals', age = 'Current') {
  return fetchApi('/stock_forecasts', {
    stock_id: stockId,
    measure_code: measureCode,
    period_type: periodType,
    data_type: dataType,
    age: age
  });
}

// 9. /stock_target_price - Get target price for a stock
export async function getStockTargetPrice(stockId) {
  return fetchApi('/stock_target_price', { stock_id: stockId });
}

// 10. /statement - Get financial statements
export async function getFinancialStatement(stockName, stats) {
  return fetchApi('/statement', { 
    stock_name: stockName, 
    stats: stats 
  });
}

// 11. /corporate_actions - Get corporate action data
export async function getCorporateActions(stockName) {
  return fetchApi('/corporate_actions', { stock_name: stockName });
}

// 12. /recent_announcements - Recent news/updates for a stock
export async function getRecentAnnouncements(stockName) {
  return fetchApi('/recent_announcements', { stock_name: stockName });
}

// ✅ OTHER DOCUMENTED ENDPOINTS

// /ipo - IPO data (consolidated single function)
export async function getIPOData() {
  const response = await fetchApi('/ipo');
  
  // Return the full response to maintain the success/data structure
  // The component expects {success: true, data: {...}}
  if (response && response.success) {
    return response; // Return full response including success flag
  } else if (response && typeof response === 'object' && response.data) {
    // Handle cases where data might be directly in response
    return {
      success: true,
      data: response.data
    };
  } else if (response && response.upcoming) {
    // Handle direct data without wrapper
    return {
      success: true,
      data: response
    };
  }
  
  // Return empty structure if no data
  return {
    success: false,
    data: {
      upcoming: [],
      active: [],
      listed: [],
      closed: []
    }
  };
}

// Legacy alias for backward compatibility
export async function getUpcomingIPOs() {
  console.warn('getUpcomingIPOs is deprecated. Use getIPOData() instead.');
  return getIPOData();
}

// Legacy alias for backward compatibility  
export async function getIPOCalendar() {
  console.warn('getIPOCalendar is deprecated. Use getIPOData() instead.');
  return getIPOData();
}

// /news - News data
export async function getLatestNews() {
  return fetchApi('/news');
}

// /commodities - Commodities data
export async function getCommodities() {
  return fetchApi('/commodities');
}

// /mutual_funds - Mutual funds data
export async function getMutualFunds() {
  return fetchApi('/mutual_funds');
}

// /price_shockers - Price shockers data
export async function getPriceShockers() {
  return fetchApi('/price_shockers');
}

// /top_gainers - Top gaining stocks
export async function getTopGainers() {
  return fetchApi('/trending'); // Using trending as proxy for gainers
}

// /top_losers - Top losing stocks  
export async function getTopLosers() {
  return fetchApi('/price_shockers'); // Using price shockers as proxy for losers
}

// Financial statements using existing endpoint
export async function getFinancialStatements(stockName) {
  return getFinancialStatement(stockName, 'basic');
}

// Company profile using stock details
export async function getCompanyProfile(stockName) {
  return getStockDetails(stockName);
}

// /industry_search - Industry search
export async function searchIndustry(query) {
  return fetchApi('/industry_search', { query: query });
}

// /mutual_fund_search - Mutual fund search
export async function searchMutualFunds(query) {
  return fetchApi('/mutual_fund_search', { query: query });
}

// /mutual_funds_details - Get mutual fund details
export async function getMutualFundDetails(stockName) {
  return fetchApi('/mutual_funds_details', { stock_name: stockName });
}

// ✅ LEGACY FUNCTIONS FOR COMPATIBILITY (using documented endpoints)

// Use trending stocks as featured stocks
export async function getFeaturedStocks() {
  return fetchApi('/trending');
}

// Use stock search via stock details endpoint
export async function searchStocks(query) {
  return fetchApi('/stock', { name: query });
}

// Market overview using trending data
export async function getMarketOverview() {
  const trending = await fetchApi('/trending');
  return { trending };
}

// Market movers using BSE and NSE active stocks
export async function getMarketMovers() {
  const bse = await fetchApi('/BSE_most_active');
  const nse = await fetchApi('/NSE_most_active');
  return { bse, nse };
}

// Portfolio functions - Not available in current API, return empty data
export async function getUserPortfolios() {
  console.warn("Portfolio API not available in the current API version");
  return { portfolios: [] };
}

export async function getPortfolioDetails() {
  console.warn("Portfolio API not available in the current API version");
  return { details: {} };
}

export async function createPortfolio() {
  console.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}

export async function updatePortfolio() {
  console.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}

export async function deletePortfolio() {
  console.warn("Portfolio API not available in the current API version");
  return { success: false, message: "API not available" };
}

export async function getPortfolioHoldings() {
  console.warn("Portfolio API not available in the current API version");
  return { holdings: [] };
}

export async function getPortfolioSummary() {
  console.warn("Portfolio API not available in the current API version");
  return { summary: {} };
}
