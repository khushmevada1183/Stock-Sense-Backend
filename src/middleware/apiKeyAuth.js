/**
 * API Key Authentication Middleware
 * 
 * This middleware validates API keys for incoming requests.
 */

const { ApiError } = require('../utils/errorHandler');
const { API_CONFIG } = require('../config');
const { logger } = require('../utils/liveLogger');

/**
 * Middleware to validate API key in request headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const apiKeyAuth = (req, res, next) => {
  // Skip authentication for health check endpoint
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // Get API key from request headers
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  // Check if API key is provided
  if (!apiKey) {
    return next(new ApiError('API key is required', 401, 'ERR_MISSING_API_KEY'));
  }

  // Check if API key is valid
  const validApiKeys = API_CONFIG.API_KEYS;
  
  if (validApiKeys.length === 0) {
    logger.warn('No API keys configured. Allowing request without validation.');
    return next();
  }

  if (!validApiKeys.includes(apiKey)) {
    return next(new ApiError('Invalid API key', 403, 'ERR_INVALID_API_KEY'));
  }

  // API key is valid, proceed
  req.apiKey = apiKey;
  next();
};

module.exports = apiKeyAuth; 