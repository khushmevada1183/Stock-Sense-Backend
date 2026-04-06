const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  syncMarketSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
} = require('./market.service');
const { getMarketSyncSchedulerStatus } = require('../../jobs/marketSyncScheduler');
const { getWebSocketServerStatus } = require('../../realtime/socketServer');
const {
  runLiveTickStreamNow,
  getLiveTickStreamStatus,
} = require('../../realtime/liveTickStreamer');

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseSymbols = (value) => {
  const raw = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return raw.length > 0 ? raw : null;
};

const syncSnapshot = asyncHandler(async (req, res) => {
  const snapshot = await syncMarketSnapshot();

  res.status(200).json({
    success: true,
    data: snapshot,
  });
});

const getLatest = asyncHandler(async (req, res) => {
  const snapshot = await getLatestSnapshot();
  res.setHeader('Cache-Control', 'public, max-age=30');

  res.status(200).json({
    success: true,
    data: snapshot,
  });
});

const getStatus = asyncHandler(async (req, res) => {
  const latestSnapshot = await getLatestSnapshot();
  const scheduler = getMarketSyncSchedulerStatus();

  const staleAfterFromEnv = Number.parseInt(process.env.MARKET_SYNC_STALE_AFTER_MS || '', 10);
  const staleAfterMs = Number.isFinite(staleAfterFromEnv) && staleAfterFromEnv > 0
    ? staleAfterFromEnv
    : Math.max(scheduler.intervalMs * 3, 180000);

  const latestCapturedAt = latestSnapshot?.capturedAt
    ? new Date(latestSnapshot.capturedAt).getTime()
    : null;

  const ageMs = latestCapturedAt ? Math.max(0, Date.now() - latestCapturedAt) : null;
  const isStale = ageMs === null ? true : ageMs > staleAfterMs;

  res.status(200).json({
    success: true,
    data: {
      scheduler,
      latestSnapshot: latestSnapshot
        ? {
            capturedMinute: latestSnapshot.capturedMinute,
            capturedAt: latestSnapshot.capturedAt,
            source: latestSnapshot.source,
            syncStatus: latestSnapshot.metadata?.syncStatus || null,
            errorCount: Array.isArray(latestSnapshot.metadata?.errors)
              ? latestSnapshot.metadata.errors.length
              : 0,
          }
        : null,
      freshness: {
        ageMs,
        staleAfterMs,
        isStale,
      },
    },
  });
});

const getHistory = asyncHandler(async (req, res) => {
  const snapshots = await getSnapshotHistory(req.query);
  res.setHeader('Cache-Control', 'public, max-age=30');

  res.status(200).json({
    success: true,
    data: {
      count: snapshots.length,
      snapshots,
    },
  });
});

const getSocketStatus = asyncHandler(async (req, res) => {
  const status = getWebSocketServerStatus();
  const liveTickStream = getLiveTickStreamStatus();

  res.status(200).json({
    success: true,
    data: {
      websocket: status,
      liveTickStream,
    },
  });
});

const getLiveTickStatus = asyncHandler(async (req, res) => {
  const status = getLiveTickStreamStatus();

  res.status(200).json({
    success: true,
    data: status,
  });
});

const syncLiveTicks = asyncHandler(async (req, res) => {
  const result = await runLiveTickStreamNow('api-manual', {
    symbols: parseSymbols(req.query.symbols),
    persistTicks: parseBoolean(req.query.persist, undefined),
    includeDefaultSymbols: parseBoolean(req.query.includeDefaultSymbols, undefined),
  });

  const statusCode = result.success || result.skipped ? 200 : 500;

  res.status(statusCode).json({
    success: Boolean(result.success || result.skipped),
    data: result,
  });
});

module.exports = {
  syncSnapshot,
  getLatest,
  getStatus,
  getHistory,
  getSocketStatus,
  getLiveTickStatus,
  syncLiveTicks,
};