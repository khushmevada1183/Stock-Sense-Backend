/**
 * API Routes Index
 * 
 * This file serves as the entry point for all API routes.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('./utils/errorHandler');
const api = require('./api'); // Make sure this file exists
const cacheManager = require('./utils/cacheManager');

// Health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    cache: cacheManager.getStats()
  });
}));

// Market Data Endpoints - Updated to use documented API endpoints
router.get('/trending', asyncHandler(async (req, res) => {
  try {
    const data = await api.getFeaturedStocks();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in trending stocks route:', error.message);
    throw error;
  }
}));

// News endpoint - matches documented API
router.get('/news', asyncHandler(async (req, res) => {
  const data = await api.getLatestNews(req.query);
  res.json({ success: true, data });
}));

// IPO endpoint - matches documented API
router.get('/ipo', asyncHandler(async (req, res) => {
  const data = await api.getUpcomingIPOs();
  res.json({ success: true, data });
}));

// Stock search endpoint - matches documented API
router.get('/stock', asyncHandler(async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Stock name is required',
        code: 'ERR_MISSING_NAME',
        statusCode: 400
      }
    });
  }
  
  const data = await api.searchStocks(name);
  res.json({ success: true, data });
}));

// Historical data endpoint - matches documented API
router.get('/historical_data', asyncHandler(async (req, res) => {
  const { stock_name, period, filter } = req.query;
  
  if (!stock_name || !period || !filter) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'stock_name, period, and filter are required',
        code: 'ERR_MISSING_PARAMS',
        statusCode: 400
      }
    });
  }
  
  const data = await api.getHistoricalPrices(stock_name, period, filter);
  res.json({ success: true, data });
}));

// Statement endpoint - matches documented API
router.get('/statement', asyncHandler(async (req, res) => {
  const { stock_name, stats } = req.query;
  
  if (!stock_name || !stats) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'stock_name and stats are required',
        code: 'ERR_MISSING_PARAMS',
        statusCode: 400
      }
    });
  }
  
  const data = await api.getFinancialStatements(stock_name, stats);
  res.json({ success: true, data });
}));

// Stock forecasts endpoint - matches documented API
router.get('/stock_forecasts', asyncHandler(async (req, res) => {
  const { stock_id, measure_code, period_type, data_type, age } = req.query;
  
  if (!stock_id || !measure_code || !period_type || !data_type || !age) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'All parameters are required',
        code: 'ERR_MISSING_PARAMS',
        statusCode: 400
      }
    });
  }
  
  const data = await api.getStockForecasts(stock_id);
  res.json({ success: true, data });
}));

// Commodities endpoint - matches documented API
router.get('/commodities', asyncHandler(async (req, res) => {
  const data = await api.getCommodities();
  res.json({ success: true, data });
}));

// Mutual funds endpoint - matches documented API
router.get('/mutual_funds', asyncHandler(async (req, res) => {
  const data = await api.getMutualFunds();
  res.json({ success: true, data });
}));

// BSE most active endpoint - matches documented API
router.get('/BSE_most_active', asyncHandler(async (req, res) => {
  const data = await api.getBSEMostActive();
  res.json({ success: true, data });
}));

// NSE most active endpoint - matches documented API
router.get('/NSE_most_active', asyncHandler(async (req, res) => {
  const data = await api.getNSEMostActive();
  res.json({ success: true, data });
}));

// Price shockers endpoint - matches documented API
router.get('/price_shockers', asyncHandler(async (req, res) => {
  const data = await api.getPriceShockers();
  res.json({ success: true, data });
}));

// 52-week high/low data endpoint - matches documented API
router.get('/fetch_52_week_high_low_data', asyncHandler(async (req, res) => {
  const data = await api.get52WeekHighLow();
  res.json({ success: true, data });
}));

// We already have the /ipo endpoint that matches the documented API
// The /commodities endpoint has already been added above

// Portfolio endpoints
// These are not defined in the API documentation, but we'll keep a simplified mock version
// that returns empty data to avoid breaking the UI
router.get('/portfolio', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { portfolios: [] } });
}));

router.get('/portfolio/holdings', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { holdings: [] } });
}));

router.get('/portfolio/summary', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { summary: {} } });
})); 

router.get('/portfolio/delete', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { success: false, message: "API not available" } });
}));

router.get('/portfolio/create', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { success: false, message: "API not available" } });
}));

router.get('/portfolio/update', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { success: false, message: "API not available" } });
}));

// Cache management endpoints (admin only)
router.post('/admin/cache/clear', asyncHandler(async (req, res) => {
  // This should have additional authentication
  cacheManager.clear();
  res.json({ 
    success: true, 
    message: 'Cache cleared successfully',
    stats: cacheManager.getStats()
  });
}));

router.get('/admin/cache/stats', asyncHandler(async (req, res) => {
  // This should have additional authentication
  res.json({ 
    success: true, 
    data: cacheManager.getStats()
  });
}));

// API key status endpoint for debugging
router.get('/admin/api-keys/status', asyncHandler(async (req, res) => {
  // This should have additional authentication in production
  const api = require('./api');
  res.json({ 
    success: true, 
    data: api.getKeyManager().getKeyStatuses(),
    currentKey: api.getKeyManager().currentKeyIndex
  });
}));

// Rate limiter status endpoint for debugging  
router.get('/admin/rate-limit/stats', asyncHandler(async (req, res) => {
  // This should have additional authentication in production
  const { getRateLimiterStats } = require('./middleware/rateLimitMiddleware');
  res.json({ 
    success: true, 
    data: getRateLimiterStats()
  });
}));

module.exports = router;