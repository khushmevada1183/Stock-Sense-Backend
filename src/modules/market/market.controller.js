const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  syncMarketSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
} = require('./market.service');
const { getMarketSyncSchedulerStatus } = require('../../jobs/marketSyncScheduler');

const syncSnapshot = asyncHandler(async (req, res) => {
  const snapshot = await syncMarketSnapshot();

  res.status(200).json({
    success: true,
    data: snapshot,
  });
});

const getLatest = asyncHandler(async (req, res) => {
  const snapshot = await getLatestSnapshot();

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

  res.status(200).json({
    success: true,
    data: {
      count: snapshots.length,
      snapshots,
    },
  });
});

module.exports = {
  syncSnapshot,
  getLatest,
  getStatus,
  getHistory,
};