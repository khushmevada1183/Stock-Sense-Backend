const legacyApi = require('../../services/legacy/api');
const cacheManager = require('../../utils/cacheManager');
const {
  upsertMarketSnapshot,
  getLatestMarketSnapshot,
  listMarketSnapshots,
} = require('./market.repository');
const { emitMarketSnapshotEvent } = require('../../realtime/socketServer');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CACHE_ENABLED = String(process.env.CACHE_ENABLED || 'true').toLowerCase() !== 'false';
const CACHE_MARKET_LATEST_TTL_MS = toPositiveInt(process.env.CACHE_MARKET_LATEST_TTL_MS, 30 * 1000);
const CACHE_MARKET_HISTORY_TTL_MS = toPositiveInt(process.env.CACHE_MARKET_HISTORY_TTL_MS, 30 * 1000);
const MARKET_CACHE_TAG = 'market_snapshot';
const MARKET_LATEST_CACHE_KEY = 'v1:market:snapshot:latest';

const parseLimit = (value, fallback = 60) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 1) {
    return 1;
  }

  if (parsed > 1440) {
    return 1440;
  }

  return parsed;
};

const buildMarketHistoryCacheKey = ({ from, to, limit }) => {
  return cacheManager.generateKey('v1:market:snapshot:history', {
    from: from || '',
    to: to || '',
    limit,
  });
};

const safeCall = async (label, fn) => {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      data: {},
      label,
    };
  }
};

const syncMarketSnapshot = async () => {
  const [trending, priceShockers, nseMostActive, bseMostActive] = await Promise.all([
    safeCall('trending', () => legacyApi.getFeaturedStocks()),
    safeCall('price_shockers', () => legacyApi.getPriceShockers()),
    safeCall('nse_most_active', () => legacyApi.getNSEMostActive()),
    safeCall('bse_most_active', () => legacyApi.getBSEMostActive()),
  ]);

  const metadata = {
    syncStatus: {
      trending: trending.ok,
      priceShockers: priceShockers.ok,
      nseMostActive: nseMostActive.ok,
      bseMostActive: bseMostActive.ok,
    },
    errors: [trending, priceShockers, nseMostActive, bseMostActive]
      .filter((entry) => !entry.ok)
      .map((entry) => ({ source: entry.label, message: entry.error })),
  };

  const snapshot = await upsertMarketSnapshot({
    capturedAt: new Date().toISOString(),
    source: 'stock-nse-india',
    trending: trending.data,
    priceShockers: priceShockers.data,
    nseMostActive: nseMostActive.data,
    bseMostActive: bseMostActive.data,
    metadata,
  });

  if (CACHE_ENABLED) {
    await cacheManager.clearByTagsAsync(MARKET_CACHE_TAG);
  }

  emitMarketSnapshotEvent(snapshot);

  return snapshot;
};

const getLatestSnapshot = async () => {
  if (CACHE_ENABLED) {
    const cached = await cacheManager.getAsync(MARKET_LATEST_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const snapshot = await getLatestMarketSnapshot();

  if (CACHE_ENABLED && snapshot) {
    await cacheManager.setAsync(MARKET_LATEST_CACHE_KEY, snapshot, CACHE_MARKET_LATEST_TTL_MS, {
      tags: [MARKET_CACHE_TAG],
      priority: 'high',
    });
  }

  return snapshot;
};

const getSnapshotHistory = async (query) => {
  const from = query?.from || null;
  const to = query?.to || null;
  const limit = parseLimit(query?.limit, 120);

  if (CACHE_ENABLED) {
    const cacheKey = buildMarketHistoryCacheKey({ from, to, limit });
    const cached = await cacheManager.getAsync(cacheKey);
    if (cached) {
      return cached;
    }

    const snapshots = await listMarketSnapshots({ from, to, limit });

    await cacheManager.setAsync(cacheKey, snapshots, CACHE_MARKET_HISTORY_TTL_MS, {
      tags: [MARKET_CACHE_TAG],
      priority: 'normal',
    });

    return snapshots;
  }

  return listMarketSnapshots({ from, to, limit });
};

module.exports = {
  syncMarketSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
};