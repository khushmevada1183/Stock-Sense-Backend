/**
 * API Error Handler Utility
 * 
 * This utility provides standardized error handling for API requests.
 */

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
const formatErrorResponse = (error) => {
  // If it's already an ApiError, use its properties
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        statusCode: error.statusCode,
        details: error.details,
        timestamp: error.timestamp
      }
    };
  }

  // Handle Axios errors
  if (error.isAxiosError) {
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'API request failed';
    
    return {
      success: false,
      error: {
        message,
        code: `ERR_${statusCode}`,
        statusCode,
        // SECURITY: Never expose error details or stack traces in production
        details: process.env.NODE_ENV === 'development' ? error.response?.data : null,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Handle generic errors
  // SECURITY: Never expose stack traces or sensitive details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      code: 'ERR_UNKNOWN',
      statusCode: 500,
      details: isDevelopment ? { stack: error.stack, source: error.source } : null,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Express middleware for handling errors
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('API Error:', err);
  
  const errorResponse = formatErrorResponse(err);
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