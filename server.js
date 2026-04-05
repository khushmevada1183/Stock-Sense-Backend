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
const swaggerUi = require('swagger-ui-express');
const { morganStream, patchConsole, liveLogsPage, sseHandler } = require('./src/utils/liveLogger');
const { errorMiddleware } = require('./src/utils/errorHandler');
const { rateLimitMiddleware } = require('./src/middleware/rateLimitMiddleware');
const { API_CONFIG } = require('./src/config');
const { openApiSpec } = require('./src/docs/openapi');
const v1Routes = require('./src/routes/v1');
const { checkConnection, closePool } = require('./src/db/client');
const {
  startMarketSyncScheduler,
  stopMarketSyncScheduler,
} = require('./src/jobs/marketSyncScheduler');
const {
  startAlertEvaluatorScheduler,
  stopAlertEvaluatorScheduler,
} = require('./src/jobs/alertEvaluatorScheduler');
const {
  startNotificationDeliveryScheduler,
  stopNotificationDeliveryScheduler,
} = require('./src/jobs/notificationDeliveryScheduler');

// Import legacy API routes from src
const apiRoutes = require('./src/routes/legacy');

// Create Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Apply middleware
app.use(helmet()); // Security headers
// Configure CORS to allow all origins (*) as requested
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};
app.use(cors(corsOptions)); // Enable CORS with * origin
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

// API documentation
app.get('/openapi.json', (req, res) => {
  res.status(200).json(openApiSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

// API routes - ensure apiRoutes is a router
// API routes
app.use('/api/v1', v1Routes);
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
// Free tiers spin down after 14-15 min of inactivity.
// This pings both backend (self) and frontend every 10 min to stay awake.
const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const BACKEND_SELF_URL  = process.env.EXTERNAL_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
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

async function shutdown(signal) {
  console.log(`[Shutdown] Received ${signal}. Closing database connections...`);
  try {
    stopMarketSyncScheduler();
    stopAlertEvaluatorScheduler();
    stopNotificationDeliveryScheduler();
    await closePool();
    console.log('[Shutdown] Database pool closed.');
  } catch (error) {
    console.error(`[Shutdown] Failed to close database pool: ${error.message}`);
  } finally {
    process.exit(0);
  }
}

// Start server
if (require.main === module) {
  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal);
    });
  });

  app.listen(PORT, () => {
    console.log(`Indian Stock API Server running on port ${PORT}`);
    console.log(`API Base URL: ${API_CONFIG.BASE_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    checkConnection()
      .then((result) => {
        console.log(`[DB] Postgres connection ready (${result.latencyMs}ms)`);
      })
      .catch((error) => {
        console.error(`[DB] Connection check failed: ${error.message}`);
      });

    const marketSyncStatus = startMarketSyncScheduler();
    if (marketSyncStatus.enabled) {
      console.log(
        `[MARKET_SYNC] Enabled with interval=${marketSyncStatus.intervalMs}ms ` +
        `runOnStart=${marketSyncStatus.runOnStart}`
      );
    } else {
      console.log('[MARKET_SYNC] Disabled (set MARKET_SYNC_ENABLED=true to enable).');
    }

    const alertEvaluatorStatus = startAlertEvaluatorScheduler();
    if (alertEvaluatorStatus.enabled) {
      console.log(
        `[ALERT_EVALUATOR] Enabled with interval=${alertEvaluatorStatus.intervalMs}ms ` +
          `runOnStart=${alertEvaluatorStatus.runOnStart} marketHoursOnly=${alertEvaluatorStatus.marketHoursOnly}`
      );
    } else {
      console.log('[ALERT_EVALUATOR] Disabled (set ALERT_EVALUATOR_ENABLED=true to enable).');
    }

    const notificationDeliveryStatus = startNotificationDeliveryScheduler();
    if (notificationDeliveryStatus.enabled) {
      console.log(
        `[NOTIFICATION_DELIVERY] Enabled with interval=${notificationDeliveryStatus.intervalMs}ms ` +
          `runOnStart=${notificationDeliveryStatus.runOnStart}`
      );
    } else {
      console.log('[NOTIFICATION_DELIVERY] Disabled (set NOTIFICATION_DELIVERY_ENABLED=true to enable).');
    }

    // Start keep-alive pinger (only in production)
    if (process.env.RENDER || process.env.EXTERNAL_URL || process.env.NODE_ENV === 'production') {
      console.log(`[Keep-Alive] Pinging every 10 min → self: ${BACKEND_SELF_URL}/health`);
      if (FRONTEND_URL) console.log(`[Keep-Alive] Pinging frontend → ${FRONTEND_URL}/api/health`);
      setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
      // First ping after 30 seconds to let server fully start
      setTimeout(keepAlive, 30000);
    }
  });
}

// Export for testing
module.exports = app; 