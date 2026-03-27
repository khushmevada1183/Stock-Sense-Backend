/**
 * Input Validation Middleware
 * 
 * Validates query parameters to prevent injection attacks and invalid requests
 */

const { logger } = require('../utils/liveLogger');

/**
 * Sanitize input string - remove potentially malicious characters
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove SQL injection patterns
  input = input.replace(/[;'\"\\-]/g, '');
  // Remove script tags and HTML
  input = input.replace(/<[^>]*>/g, '');
  // Trim whitespace
  input = input.trim();
  return input;
}

/**
 * Validate stock symbol/name
 * @param {string} name - Stock name or symbol
 * @returns {boolean} True if valid
 */
function validateStockName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  // Stock symbols are typically 1-10 characters, alphanumeric and dash
  return /^[A-Z0-9\-&]{1,10}$/i.test(name.trim());
}

/**
 * Validate period format (e.g., 1d, 1w, 1m, 3m, 6m, 1y)
 * @param {string} period - Period string
 * @returns {boolean} True if valid
 */
function validatePeriod(period) {
  if (!period || typeof period !== 'string') {
    return false;
  }
  return /^(1d|1w|1m|3m|6m|1y)$/.test(period.trim());
}

/**
 * Validate filter format (date, etc.)
 * @param {string} filter - Filter string
 * @returns {boolean} True if valid
 */
function validateFilter(filter) {
  if (!filter || typeof filter !== 'string') {
    return false;
  }
  // Allow date formats and common filter types
  return /^[0-9\-:T.Z\w]+$/.test(filter.trim());
}

/**
 * Middleware to validate stock query parameters
 */
function validateStockQuery(req, res, next) {
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
  
  if (!validateStockName(name)) {
    logger.warn(`Invalid stock name format: ${name}`);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid stock name format. Expected alphanumeric symbol (1-10 characters)',
        code: 'ERR_INVALID_NAME',
        statusCode: 400
      }
    });
  }
  
  // Sanitize and update req.query with sanitized values
  req.query.name = sanitizeInput(name);
  next();
}

/**
 * Middleware to validate historical data query parameters
 */
function validateHistoricalQuery(req, res, next) {
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
  
  if (!validateStockName(stock_name)) {
    logger.warn(`Invalid stock_name format: ${stock_name}`);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid stock_name format',
        code: 'ERR_INVALID_STOCK_NAME',
        statusCode: 400
      }
    });
  }
  
  if (!validatePeriod(period)) {
    logger.warn(`Invalid period format: ${period}`);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid period format. Allowed: 1d, 1w, 1m, 3m, 6m, 1y',
        code: 'ERR_INVALID_PERIOD',
        statusCode: 400
      }
    });
  }
  
  if (!validateFilter(filter)) {
    logger.warn(`Invalid filter format: ${filter}`);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid filter format',
        code: 'ERR_INVALID_FILTER',
        statusCode: 400
      }
    });
  }
  
  // Sanitize values
  req.query.stock_name = sanitizeInput(stock_name);
  req.query.period = sanitizeInput(period);
  req.query.filter = sanitizeInput(filter);
  next();
}

module.exports = {
  sanitizeInput,
  validateStockName,
  validatePeriod,
  validateFilter,
  validateStockQuery,
  validateHistoricalQuery
};
