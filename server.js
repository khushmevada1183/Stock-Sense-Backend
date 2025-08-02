/**
 * Indian Stock API Server
 * 
 * This is the main server file that sets up Express and configures middleware.
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorMiddleware } = require('./utils/errorHandler');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const { rateLimitMiddleware } = require('./middleware/rateLimitMiddleware');
const { API_CONFIG } = require('./config');

// Import API routes - ensure this is a router
const apiRoutes = require('./index');

// Create Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('dev')); // HTTP request logging

// Add global rate limiting
app.use(rateLimitMiddleware);

// Try to use compression if available
try {
  const compression = require('compression');
  app.use(compression()); // Compress responses
  console.log('Compression middleware enabled');
} catch (err) {
  console.log('Compression middleware not available, continuing without it');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes - ensure apiRoutes is a router
// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'ERR_ROUTE_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString()
    }
  });
});

// Error middleware
app.use(errorMiddleware);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Indian Stock API Server running on port ${PORT}`);
    console.log(`API Base URL: ${API_CONFIG.BASE_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for testing
module.exports = app; 