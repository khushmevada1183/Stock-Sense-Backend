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
const { morganStream, patchConsole, liveLogsPage, sseHandler } = require('./utils/liveLogger');
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
// HTTP request logging (also forwards to live log stream)
app.use(morgan('dev', { stream: morganStream }));
// Mirror console logs to live stream as well
patchConsole();

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

// Live logs UI and SSE stream
app.get('/live-logs', liveLogsPage);
app.get('/live-logs/stream', sseHandler);

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

// ── KEEP-ALIVE PINGER ──────────────────────────────────────────────────────
// Render free tier spins down after 15 min of inactivity.
// This pings both backend (self) and frontend every 14 min to stay awake.
const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes
const BACKEND_SELF_URL  = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const FRONTEND_URL      = process.env.FRONTEND_URL || 'https://stock-sense-iota.vercel.app';

function keepAlive() {
  const targets = [
    `${BACKEND_SELF_URL}/health`,
    FRONTEND_URL ? `${FRONTEND_URL}/api/health` : null,
  ].filter(Boolean);

  targets.forEach(async (url) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      console.log(`[Keep-Alive] ✓ ${url} → ${res.status}`);
    } catch (err) {
      console.log(`[Keep-Alive] ✗ ${url} → ${err.message}`);
    }
  });
}

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Indian Stock API Server running on port ${PORT}`);
    console.log(`API Base URL: ${API_CONFIG.BASE_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start keep-alive pinger (only in production on Render)
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
      console.log(`[Keep-Alive] Pinging every 14 min → self: ${BACKEND_SELF_URL}/health`);
      if (FRONTEND_URL) console.log(`[Keep-Alive] Pinging frontend → ${FRONTEND_URL}/api/health`);
      setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
      // First ping after 30 seconds to let server fully start
      setTimeout(keepAlive, 30000);
    }
  });
}

// Export for testing
module.exports = app; 