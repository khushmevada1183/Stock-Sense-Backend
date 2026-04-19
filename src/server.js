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
const { morganStream, patchConsole, liveLogsPage, sseHandler } = require('./utils/liveLogger');
const { logger, morganLoggerStream } = require('./utils/logger');
const { errorMiddleware } = require('./utils/errorHandler');
const { rateLimitMiddleware } = require('./middleware/rateLimitMiddleware');
const { requestContext } = require('./shared/middleware/requestContext');
const { attachResponseHelpers } = require('./shared/middleware/responseHelpers');
const { attachResponseMessage } = require('./shared/middleware/responseMessage');
const { API_CONFIG } = require('./config');
const { openApiSpec } = require('./docs/openapi');
const v1Routes = require('./routes/v1');
const { checkConnection, closePool } = require('./db/client');
const {
  startMarketSyncScheduler,
  stopMarketSyncScheduler,
} = require('./jobs/marketSyncScheduler');
const {
  startAlertEvaluatorScheduler,
  stopAlertEvaluatorScheduler,
} = require('./jobs/alertEvaluatorScheduler');
const {
  startNotificationDeliveryScheduler,
  stopNotificationDeliveryScheduler,
} = require('./jobs/notificationDeliveryScheduler');
const {
  startTechnicalIndicatorScheduler,
  stopTechnicalIndicatorScheduler,
} = require('./jobs/technicalIndicatorsScheduler');
const {
  startFundamentalsSyncScheduler,
  stopFundamentalsSyncScheduler,
} = require('./jobs/fundamentalsSyncScheduler');
const {
  startWebSocketServer,
  stopWebSocketServer,
  emitEvent,
  emitMarketSnapshotEvent,
} = require('./realtime/socketServer');
const {
  startLiveTickStreamScheduler,
  stopLiveTickStreamScheduler,
} = require('./realtime/liveTickStreamer');
const {
  setPortfolioRealtimeEmitter,
  publishPortfolioUpdatesForTick,
} = require('./realtime/portfolioRealtime');
const {
  setAlertsRealtimeEmitter,
  publishTriggeredAlertsRealtime,
} = require('./realtime/alertsRealtime');

// Import legacy API routes from src
const apiRoutes = require('./routes/legacy');

// Create Express app
const app = express();
const PORT = process.env.PORT || 10000;

const createCombinedStream = (...streams) => {
  return {
    write: (line) => {
      streams.forEach((stream) => {
        if (!stream || typeof stream.write !== 'function') {
          return;
        }

        try {
          stream.write(line);
        } catch (_) {
          // Ignore stream write errors to avoid breaking request lifecycle.
        }
      });
    },
  };
};

const requestLogStream = createCombinedStream(morganStream, morganLoggerStream);

// Apply middleware
app.use(helmet()); // Security headers
// Configure CORS to allow all origins (*) as requested
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};
app.use(cors(corsOptions)); // Enable CORS with * origin
app.use(express.json()); // Parse JSON request bodies
app.use(requestContext);
// HTTP request logging (also forwards to live log stream)
app.use(morgan('dev', { stream: requestLogStream }));
// Mirror console logs to live stream as well
patchConsole();

// Add global rate limiting
app.use(rateLimitMiddleware);
app.use(attachResponseHelpers);
app.use(attachResponseMessage);

// Try to use compression if available
try {
  const compression = require('compression');
  app.use(compression()); // Compress responses
  logger.info('Compression middleware enabled');
} catch (err) {
  logger.warn('Compression middleware not available, continuing without it', {
    message: err.message,
  });
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
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    message,
    error: {
      message,
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
      logger.info('[Keep-Alive] Success', { url, status: res.status });
    } catch (err) {
      logger.warn('[Keep-Alive] Failed', { url, message: err.message });
    }
  });
}

async function shutdown(signal) {
  logger.info('[Shutdown] Signal received. Closing database connections...', { signal });
  try {
    stopLiveTickStreamScheduler();
    await stopWebSocketServer();
    stopMarketSyncScheduler();
    stopAlertEvaluatorScheduler();
    stopNotificationDeliveryScheduler();
    stopTechnicalIndicatorScheduler();
    stopFundamentalsSyncScheduler();
    await closePool();
    logger.info('[Shutdown] Database pool closed.');
  } catch (error) {
    logger.error('[Shutdown] Failed to close database pool', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    process.exit(0);
  }
}

let httpServer = null;

function startServer() {
  if (httpServer) {
    return httpServer;
  }

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal);
    });
  });

  httpServer = app.listen(PORT, () => {
    logger.info('Indian Stock API Server started', {
      port: PORT,
      apiBaseUrl: API_CONFIG.BASE_URL,
      environment: process.env.NODE_ENV || 'development',
    });

    startWebSocketServer(httpServer)
      .then((status) => {
        setPortfolioRealtimeEmitter(emitEvent);
        setAlertsRealtimeEmitter(emitEvent);

        const liveTickStreamStatus = startLiveTickStreamScheduler({
          emitEvent,
          onTick: (tick) =>
            publishPortfolioUpdatesForTick(tick, {
              trigger: 'live-tick-stream',
            }),
        });

        if (status.enabled) {
          logger.info('[WEBSOCKET] Enabled', {
            path: status.path,
            adapterEnabled: status.adapterEnabled,
            redisConnected: status.redisConnected,
          });
        } else {
          logger.info('[WEBSOCKET] Disabled (set WEBSOCKET_ENABLED=true to enable).');
        }

        if (liveTickStreamStatus.enabled) {
          logger.info('[LIVE_TICK_STREAM] Enabled', {
            intervalMs: liveTickStreamStatus.intervalMs,
            runOnStart: liveTickStreamStatus.runOnStart,
            persistTicks: liveTickStreamStatus.persistTicks,
          });
        } else {
          logger.info('[LIVE_TICK_STREAM] Disabled (set LIVE_TICK_STREAM_ENABLED=true to enable).');
        }
      })
      .catch((error) => {
        logger.error('[WEBSOCKET] Startup failed', {
          message: error.message,
          stack: error.stack,
        });
      });

    checkConnection()
      .then((result) => {
        logger.info('[DB] Postgres connection ready', {
          latencyMs: result.latencyMs,
        });
      })
      .catch((error) => {
        logger.error('[DB] Connection check failed', {
          message: error.message,
          stack: error.stack,
        });
      });

    const marketSyncStatus = startMarketSyncScheduler({
      emitSnapshotEvent: emitMarketSnapshotEvent,
    });
    if (marketSyncStatus.enabled) {
      logger.info('[MARKET_SYNC] Enabled', {
        intervalMs: marketSyncStatus.intervalMs,
        runOnStart: marketSyncStatus.runOnStart,
      });
    } else {
      logger.info('[MARKET_SYNC] Disabled (set MARKET_SYNC_ENABLED=true to enable).');
    }

    const alertEvaluatorStatus = startAlertEvaluatorScheduler({
      onTriggeredAlerts: (triggeredAlerts, context) =>
        publishTriggeredAlertsRealtime(triggeredAlerts, {
          trigger: 'alert-evaluator',
          ...(context || {}),
        }),
    });
    if (alertEvaluatorStatus.enabled) {
      logger.info('[ALERT_EVALUATOR] Enabled', {
        intervalMs: alertEvaluatorStatus.intervalMs,
        runOnStart: alertEvaluatorStatus.runOnStart,
        marketHoursOnly: alertEvaluatorStatus.marketHoursOnly,
      });
    } else {
      logger.info('[ALERT_EVALUATOR] Disabled (set ALERT_EVALUATOR_ENABLED=true to enable).');
    }

    const notificationDeliveryStatus = startNotificationDeliveryScheduler();
    if (notificationDeliveryStatus.enabled) {
      logger.info('[NOTIFICATION_DELIVERY] Enabled', {
        intervalMs: notificationDeliveryStatus.intervalMs,
        runOnStart: notificationDeliveryStatus.runOnStart,
      });
    } else {
      logger.info('[NOTIFICATION_DELIVERY] Disabled (set NOTIFICATION_DELIVERY_ENABLED=true to enable).');
    }

    const technicalIndicatorsStatus = startTechnicalIndicatorScheduler();
    if (technicalIndicatorsStatus.enabled) {
      logger.info('[TECHNICAL_INDICATORS] Enabled', {
        intervalMs: technicalIndicatorsStatus.intervalMs,
        runOnStart: technicalIndicatorsStatus.runOnStart,
        marketHoursOnly: technicalIndicatorsStatus.marketHoursOnly,
      });
    } else {
      logger.info('[TECHNICAL_INDICATORS] Disabled (set TECHNICAL_INDICATOR_SCHEDULER_ENABLED=true to enable).');
    }

    const fundamentalsSyncStatus = startFundamentalsSyncScheduler();
    if (fundamentalsSyncStatus.enabled) {
      logger.info('[FUNDAMENTALS] Enabled', {
        intervalMs: fundamentalsSyncStatus.intervalMs,
        runOnStart: fundamentalsSyncStatus.runOnStart,
        statementTypes: fundamentalsSyncStatus.statementTypes,
        includeFundamentals: fundamentalsSyncStatus.includeFundamentals,
      });
    } else {
      logger.info('[FUNDAMENTALS] Disabled (set FUNDAMENTALS_SYNC_SCHEDULER_ENABLED=true to enable).');
    }

    // Start keep-alive pinger (only in production)
    if (process.env.RENDER || process.env.EXTERNAL_URL || process.env.NODE_ENV === 'production') {
      logger.info('[Keep-Alive] Enabled', {
        selfUrl: `${BACKEND_SELF_URL}/health`,
        frontendUrl: FRONTEND_URL ? `${FRONTEND_URL}/api/health` : null,
      });
      setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
      // First ping after 30 seconds to let server fully start
      setTimeout(keepAlive, 30000);
    }
  });

  return httpServer;
}

// Start server
if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = app; 
module.exports.startServer = startServer;
