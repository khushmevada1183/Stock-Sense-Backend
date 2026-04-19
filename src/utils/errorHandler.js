/**
 * API Error Handler Utility
 * 
 * This utility provides standardized error handling for API requests.
 */

const { logger } = require('./logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode || `ERR_${statusCode}`;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Creates a standard error response object
 * @param {Error} error - The error object
 * @returns {Object} Standardized error response
 */
const formatErrorResponse = (error, context = {}) => {
  const requestId = context.requestId || null;

  // If it's already an ApiError, use its properties
  if (error instanceof ApiError) {
    return {
      success: false,
      message: error.message,
      error: {
        message: error.message,
        code: error.errorCode,
        statusCode: error.statusCode,
        details: error.details,
        timestamp: error.timestamp,
        requestId,
      }
    };
  }

  // Handle Axios errors
  if (error.isAxiosError) {
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'API request failed';
    
    return {
      success: false,
      message,
      error: {
        message,
        code: `ERR_${statusCode}`,
        statusCode,
        // SECURITY: Never expose error details or stack traces in production
        details: process.env.NODE_ENV === 'development' ? error.response?.data : null,
        timestamp: new Date().toISOString(),
        requestId,
      }
    };
  }

  // Handle generic errors
  // SECURITY: Never expose stack traces or sensitive details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = error.message || 'An unexpected error occurred';
  return {
    success: false,
    message,
    error: {
      message,
      code: 'ERR_UNKNOWN',
      statusCode: 500,
      details: isDevelopment ? { stack: error.stack, source: error.source } : null,
      timestamp: new Date().toISOString(),
      requestId,
    }
  };
};

/**
 * Express middleware for handling errors
 */
const errorMiddleware = (err, req, res, next) => {
  const requestId = req?.requestId || req?.context?.requestId || null;
  const errorResponse = formatErrorResponse(err, { requestId });

  logger.error('API Error', {
    requestId,
    method: req?.method,
    path: req?.originalUrl,
    statusCode: errorResponse.error.statusCode,
    code: errorResponse.error.code,
    message: err?.message,
    stack: err?.stack,
  });

  res.status(errorResponse.error.statusCode).json(errorResponse);
};

/**
 * Async handler to wrap route handlers and catch errors
 * @param {Function} fn - Route handler function
 * @returns {Function} Wrapped route handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  formatErrorResponse,
  errorMiddleware,
  asyncHandler
}; 