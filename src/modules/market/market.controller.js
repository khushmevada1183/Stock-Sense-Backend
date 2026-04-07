const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  syncMarketSnapshot,
  getLatestSnapshot,
  getMarketOverview,
  getMarketIndexHistory,
  getMarketSectorHeatmap,
  get52WeekLeaderboard,
  getSnapshotHistory,
} = require('./market.service');
const { getMarketSyncSchedulerStatus } = require('../../jobs/marketSyncScheduler');
const {
  getWebSocketServerStatus,
  emitMarketSnapshotEvent,
} = require('../../realtime/socketServer');
const {
  getLiveTickStreamStatus,
  runLiveTickStreamNow,
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
  emitMarketSnapshotEvent(snapshot);

  return res.success(snapshot);
});

const getLatest = asyncHandler(async (req, res) => {
  const snapshot = await getLatestSnapshot();
  res.setHeader('Cache-Control', 'public, max-age=30');

  return res.success(snapshot);
});

const getOverview = asyncHandler(async (req, res) => {
  const overview = await getMarketOverview();
  res.setHeader('Cache-Control', 'public, max-age=30');

  return res.success(overview);
});

const getIndexHistory = asyncHandler(async (req, res) => {
  const history = await getMarketIndexHistory(req.params.name, req.query);
  res.setHeader('Cache-Control', 'public, max-age=30');

  return res.success(
    {
      index: history.index,
      period: history.period,
      filter: history.filter,
      source: history.source,
      count: history.candles.length,
      candles: history.candles,
    },
    {
      pagination: history.pagination,
    }
  );
});

const getSectorHeatmap = asyncHandler(async (req, res) => {
  const heatmap = await getMarketSectorHeatmap(req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.success(heatmap);
});

const get52WeekHigh = asyncHandler(async (req, res) => {
  const data = await get52WeekLeaderboard('high', req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.success(data);
});

const get52WeekLow = asyncHandler(async (req, res) => {
  const data = await get52WeekLeaderboard('low', req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.success(data);
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

  return res.success({
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
  });
});

const getHistory = asyncHandler(async (req, res) => {
  const history = await getSnapshotHistory(req.query);
  res.setHeader('Cache-Control', 'public, max-age=30');

  return res.success(
    {
      count: history.snapshots.length,
      snapshots: history.snapshots,
    },
    {
      pagination: history.pagination,
    }
  );
});

const getSocketStatus = asyncHandler(async (req, res) => {
  const status = getWebSocketServerStatus();

  return res.success(status);
});

const getLiveTickStatus = asyncHandler(async (req, res) => {
  const status = getLiveTickStreamStatus();

  return res.success(status);
});

const syncLiveTicks = asyncHandler(async (req, res) => {
  const result = await runLiveTickStreamNow('api-manual', {
    symbols: parseSymbols(req.query.symbols),
    persistTicks: parseBoolean(req.query.persist, undefined),
    includeDefaultSymbols: parseBoolean(req.query.includeDefaultSymbols, undefined),
  });

  if (result.success || result.skipped) {
    return res.success(result);
  }

  return res.status(500).json({
    success: false,
    error: {
      message: 'Live tick sync failed',
      code: 'ERR_LIVE_TICK_SYNC_FAILED',
      statusCode: 500,
      details: result,
      requestId: req.requestId || req.context?.requestId || null,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = {
  syncSnapshot,
  getLatest,
  getOverview,
  getIndexHistory,
  getSectorHeatmap,
  get52WeekHigh,
  get52WeekLow,
  getStatus,
  getHistory,
  getSocketStatus,
  getLiveTickStatus,
  syncLiveTicks,
};