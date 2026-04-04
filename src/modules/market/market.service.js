const legacyApi = require('../../services/legacy/api');
const {
  upsertMarketSnapshot,
  getLatestMarketSnapshot,
  listMarketSnapshots,
} = require('./market.repository');

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

  return upsertMarketSnapshot({
    capturedAt: new Date().toISOString(),
    source: 'stock-nse-india',
    trending: trending.data,
    priceShockers: priceShockers.data,
    nseMostActive: nseMostActive.data,
    bseMostActive: bseMostActive.data,
    metadata,
  });
};

const getLatestSnapshot = async () => {
  return getLatestMarketSnapshot();
};

const getSnapshotHistory = async (query) => {
  const from = query?.from || null;
  const to = query?.to || null;
  const limit = parseLimit(query?.limit, 120);

  return listMarketSnapshots({ from, to, limit });
};

module.exports = {
  syncMarketSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
};