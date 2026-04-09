const legacyApi = require('../../services/legacy/api');
const cacheManager = require('../../utils/cacheManager');
const { ApiError } = require('../../utils/errorHandler');
const {
  upsertSectorTaxonomyRows,
  listSectorTaxonomyBySymbols,
  upsertSectorHeatmapRows,
  listLatestSectorHeatmap,
  upsert52WeekLevelsRows,
  list52WeekLevels,
} = require('../stocks/stocks.repository');
const { seedSectorTaxonomyForSymbol } = require('../stocks/stocks.service');
const {
  upsertMarketSnapshot,
  getLatestMarketSnapshot,
  listMarketSnapshots,
  countMarketSnapshots,
} = require('./market.repository');
const {
  normalizePaginationQuery,
  buildPaginationMetadata,
} = require('../../shared/utils/pagination');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[\s,%₹]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const CACHE_ENABLED = String(process.env.CACHE_ENABLED || 'true').toLowerCase() !== 'false';
const CACHE_MARKET_LATEST_TTL_MS = toPositiveInt(process.env.CACHE_MARKET_LATEST_TTL_MS, 30 * 1000);
const CACHE_MARKET_HISTORY_TTL_MS = toPositiveInt(process.env.CACHE_MARKET_HISTORY_TTL_MS, 30 * 1000);
const MARKET_CACHE_TAG = 'market_snapshot';
const MARKET_LATEST_CACHE_KEY = 'v1:market:snapshot:latest';
const MARKET_OVERVIEW_CACHE_KEY = 'v1:market:overview:latest';
const CACHE_MARKET_OVERVIEW_TTL_MS = toPositiveInt(process.env.CACHE_MARKET_OVERVIEW_TTL_MS, 30 * 1000);
const CACHE_MARKET_SECTOR_HEATMAP_TTL_MS = toPositiveInt(
  process.env.CACHE_MARKET_SECTOR_HEATMAP_TTL_MS,
  60 * 1000
);
const CACHE_MARKET_52_WEEK_TTL_MS = toPositiveInt(
  process.env.CACHE_MARKET_52_WEEK_TTL_MS,
  60 * 1000
);
const MARKET_SECTOR_HEATMAP_CACHE_KEY = 'v1:market:sector-heatmap:latest';
const MARKET_52_WEEK_CACHE_KEY_PREFIX = 'v1:market:52-week';

const ALLOWED_INDEX_PERIODS = new Set(['1m', '6m', '1yr', '3yr', '5yr', '10yr', 'max']);
const ALLOWED_INDEX_FILTERS = new Set(['default', 'price', 'pe', 'sm', 'evebitda', 'ptb', 'mcs']);

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

const buildMarketHistoryCacheKey = ({ from, to, page, limit }) => {
  return cacheManager.generateKey('v1:market:snapshot:history', {
    from: from || '',
    to: to || '',
    page,
    limit,
  });
};

const buildIndexHistoryCacheKey = ({ name, period, filter, page, limit }) => {
  return cacheManager.generateKey('v1:market:index:history', {
    name,
    period,
    filter,
    page,
    limit,
  });
};

const listFromPayload = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === 'object') {
    for (const key of ['data', 'items', 'results', 'rows', 'candles', 'history']) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }

    return [payload];
  }

  return [];
};

const normalizePeriod = (value) => {
  const period = String(value || '1m').trim();
  return ALLOWED_INDEX_PERIODS.has(period) ? period : '1m';
};

const normalizeFilter = (value) => {
  const filter = String(value || 'default').trim().toLowerCase();
  return ALLOWED_INDEX_FILTERS.has(filter) ? filter : 'default';
};

const summarizeBreadth = (priceShockers) => {
  const gainers = listFromPayload(
    priceShockers?.gainers ||
      priceShockers?.topGainers ||
      priceShockers?.advances
  );

  const losers = listFromPayload(
    priceShockers?.losers ||
      priceShockers?.topLosers ||
      priceShockers?.declines
  );

  const fallbackTotal = listFromPayload(priceShockers).length;
  const computedTotal = gainers.length + losers.length;

  return {
    gainers: gainers.length,
    losers: losers.length,
    total: computedTotal > 0 ? computedTotal : fallbackTotal,
  };
};

const parseBoolean = (value, fallback = false) => {
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

const normalizeLabel = (value, fallback = 'UNKNOWN') => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const normalizeSymbolCandidate = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9.&_-]{1,20}$/.test(normalized) ? normalized : null;
};

const findByKeys = (payload, keys, depth = 0) => {
  if (!payload || typeof payload !== 'object' || depth > 5) {
    return undefined;
  }

  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      return payload[key];
    }
  }

  for (const value of Object.values(payload)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    const nested = findByKeys(value, keys, depth + 1);
    if (nested !== undefined) {
      return nested;
    }
  }

  return undefined;
};

const extractSymbol = (payload) => {
  const candidate = findByKeys(payload, [
    'symbol',
    'ticker',
    'code',
    'stockCode',
    'stock_code',
  ]);

  return normalizeSymbolCandidate(candidate);
};

const extractString = (payload, keys) => {
  const value = findByKeys(payload, keys);
  return value === undefined || value === null ? null : String(value).trim() || null;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const extractMarketCap = (payload) => {
  return toFiniteNumber(
    findByKeys(payload, [
      'marketCap',
      'market_cap',
      'mcap',
      'marketCapitalization',
      'market_capitalization',
    ])
  );
};

const extractChangePercent = (payload) => {
  return toFiniteNumber(
    findByKeys(payload, ['pChange', 'changePercent', 'percentChange', 'change_perc', 'change'])
  );
};

const dedupeBySymbol = (rows = []) => {
  const map = new Map();

  rows.forEach((row) => {
    if (!row || !row.symbol) {
      return;
    }

    const existing = map.get(row.symbol);
    if (!existing) {
      map.set(row.symbol, row);
      return;
    }

    const existingCap = existing.marketCap ?? Number.NEGATIVE_INFINITY;
    const incomingCap = row.marketCap ?? Number.NEGATIVE_INFINITY;
    map.set(row.symbol, incomingCap > existingCap ? row : existing);
  });

  return Array.from(map.values());
};

const toTaxonomyRow = (payload) => {
  const symbol = extractSymbol(payload);
  if (!symbol) {
    return null;
  }

  return {
    symbol,
    companyName: extractString(payload, ['companyName', 'company_name', 'name', 'stockName']),
    sector: normalizeLabel(extractString(payload, ['sector', 'sectorName', 'sector_name']), 'UNKNOWN'),
    industry: normalizeLabel(extractString(payload, ['industry', 'industryName', 'industry_name']), 'UNKNOWN'),
    marketCap: extractMarketCap(payload),
    source: 'stock-nse-india',
    metadata: {
      pipeline: 'market-aggregation',
      seededAt: new Date().toISOString(),
    },
  };
};

const flattenObjectArrayValues = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.filter((item) => item && typeof item === 'object');
  }

  if (typeof payload !== 'object') {
    return [];
  }

  const arrays = Object.values(payload)
    .filter(Array.isArray)
    .flatMap((items) => items)
    .filter((item) => item && typeof item === 'object');

  return arrays.length > 0 ? arrays : [payload];
};

const build52WeekRows = (payload) => {
  const records = flattenObjectArrayValues(payload);

  return records
    .map((record) => {
      const symbol = extractSymbol(record);
      if (!symbol) {
        return null;
      }

      const week52High = toFiniteNumber(
        findByKeys(record, ['week52High', '52WeekHigh', 'yearHigh', 'high52Week', 'high_52_week'])
      );
      const week52Low = toFiniteNumber(
        findByKeys(record, ['week52Low', '52WeekLow', 'yearLow', 'low52Week', 'low_52_week'])
      );
      const currentPrice = toFiniteNumber(
        findByKeys(record, ['ltp', 'lastPrice', 'currentPrice', 'price', 'close'])
      );

      const distanceFromHighPercent =
        week52High && currentPrice !== null ? ((week52High - currentPrice) / week52High) * 100 : null;
      const distanceFromLowPercent =
        week52Low && currentPrice !== null ? ((currentPrice - week52Low) / week52Low) * 100 : null;

      return {
        symbol,
        week52High,
        week52Low,
        highDate: parseDate(findByKeys(record, ['highDate', 'week52HighDate', 'yearHighDate'])),
        lowDate: parseDate(findByKeys(record, ['lowDate', 'week52LowDate', 'yearLowDate'])),
        currentPrice,
        distanceFromHighPercent,
        distanceFromLowPercent,
        source: 'stock-nse-india',
        metadata: record,
      };
    })
    .filter(Boolean);
};

const buildPriceShockerRows = (payload) => {
  const gainers = listFromPayload(payload?.gainers || payload?.topGainers || payload?.advances);
  const losers = listFromPayload(payload?.losers || payload?.topLosers || payload?.declines);

  const rows = [
    ...gainers.map((item) => ({ item, defaultSign: 1 })),
    ...losers.map((item) => ({ item, defaultSign: -1 })),
  ];

  if (rows.length === 0) {
    rows.push(...listFromPayload(payload).map((item) => ({ item, defaultSign: 0 })));
  }

  const bySymbol = new Map();

  rows.forEach(({ item, defaultSign }) => {
    const symbol = extractSymbol(item);
    if (!symbol) {
      return;
    }

    const changePercent = extractChangePercent(item);

    bySymbol.set(symbol, {
      symbol,
      changePercent: changePercent !== null ? changePercent : defaultSign,
      sector: normalizeLabel(extractString(item, ['sector', 'sectorName', 'sector_name']), 'UNKNOWN'),
      industry: normalizeLabel(extractString(item, ['industry', 'industryName', 'industry_name']), 'UNKNOWN'),
      companyName: extractString(item, ['companyName', 'company_name', 'name', 'stockName']),
      marketCap: extractMarketCap(item),
      raw: item,
    });
  });

  return Array.from(bySymbol.values());
};

const build52WeekCacheKey = (type, options) => {
  return cacheManager.generateKey(`${MARKET_52_WEEK_CACHE_KEY_PREFIX}:${type}`, {
    limit: options.limit,
    sector: options.sector || '',
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

const getOrCreateLatestSnapshot = async () => {
  const latest = await getLatestSnapshot();
  if (latest) {
    return latest;
  }

  return syncMarketSnapshot();
};

const getMarketOverview = async () => {
  if (CACHE_ENABLED) {
    const cached = await cacheManager.getAsync(MARKET_OVERVIEW_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const snapshot = await getOrCreateLatestSnapshot();

  const payload = {
    capturedAt: snapshot?.capturedAt || null,
    source: snapshot?.source || 'stock-nse-india',
    indices: snapshot?.trending || {},
    breadth: summarizeBreadth(snapshot?.priceShockers || {}),
    gainersLosers: snapshot?.priceShockers || {},
    mostActive: {
      nse: snapshot?.nseMostActive || {},
      bse: snapshot?.bseMostActive || {},
    },
    metadata: snapshot?.metadata || {},
  };

  if (CACHE_ENABLED) {
    await cacheManager.setAsync(MARKET_OVERVIEW_CACHE_KEY, payload, CACHE_MARKET_OVERVIEW_TTL_MS, {
      tags: [MARKET_CACHE_TAG],
      priority: 'normal',
    });
  }

  return payload;
};

const getMarketIndexHistory = async (indexName, query = {}) => {
  const normalizedName = String(indexName || '').trim().toUpperCase();
  if (!normalizedName) {
    throw new ApiError('index name is required', 400, 'ERR_INVALID_INDEX_NAME');
  }

  const period = normalizePeriod(query.period || query.range);
  const filter = normalizeFilter(query.filter);
  const paginationInput = normalizePaginationQuery(query, {
    defaultPage: 1,
    defaultLimit: 120,
    maxLimit: 1000,
  });

  const buildHistoryResult = async () => {
    const rawHistory = await legacyApi.getHistoricalPrices(normalizedName, period, filter);
    const rows = listFromPayload(rawHistory);
    const paginatedRows = rows.slice(
      paginationInput.offset,
      paginationInput.offset + paginationInput.limit
    );

    return {
      index: normalizedName,
      period,
      filter,
      source: 'stock-nse-india',
      candles: paginatedRows,
      pagination: buildPaginationMetadata({
        page: paginationInput.page,
        limit: paginationInput.limit,
        itemCount: paginatedRows.length,
        totalCount: rows.length,
      }),
    };
  };

  if (CACHE_ENABLED) {
    const cacheKey = buildIndexHistoryCacheKey({
      name: normalizedName,
      period,
      filter,
      page: paginationInput.page,
      limit: paginationInput.limit,
    });

    const cached = await cacheManager.getAsync(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await buildHistoryResult();

    await cacheManager.setAsync(cacheKey, result, CACHE_MARKET_HISTORY_TTL_MS, {
      tags: [MARKET_CACHE_TAG, `market_index:${normalizedName}`],
      priority: 'normal',
    });

    return result;
  }

  return buildHistoryResult();
};

const getSectorTaxonomyMapForSymbols = async (symbols = []) => {
  const normalizedSymbols = Array.from(
    new Set((Array.isArray(symbols) ? symbols : []).map((item) => normalizeSymbolCandidate(item)).filter(Boolean))
  );

  if (normalizedSymbols.length === 0) {
    return new Map();
  }

  const initialRows = await listSectorTaxonomyBySymbols(normalizedSymbols);
  const taxonomyMap = new Map(initialRows.map((row) => [row.symbol, row]));

  const missingSymbols = normalizedSymbols.filter((symbol) => !taxonomyMap.has(symbol));
  const symbolsToSeed = missingSymbols.slice(0, 8);

  if (symbolsToSeed.length > 0) {
    await Promise.all(
      symbolsToSeed.map(async (symbol) => {
        try {
          await seedSectorTaxonomyForSymbol(symbol);
        } catch (_) {
          // Ignore upstream failures; heatmap still works with UNKNOWN sector fallback.
        }
      })
    );

    const refreshedRows = await listSectorTaxonomyBySymbols(normalizedSymbols);
    refreshedRows.forEach((row) => {
      taxonomyMap.set(row.symbol, row);
    });
  }

  return taxonomyMap;
};

const buildSectorHeatmapRows = (priceRows, taxonomyMap) => {
  const aggregates = new Map();

  priceRows.forEach((row) => {
    const taxonomy = taxonomyMap.get(row.symbol);
    const sector = normalizeLabel(taxonomy?.sector || row.sector, 'UNKNOWN');
    const marketCap = taxonomy?.marketCap ?? row.marketCap ?? 0;
    const changePercent = Number.isFinite(row.changePercent) ? row.changePercent : 0;

    const entry = aggregates.get(sector) || {
      sector,
      totalStocks: 0,
      advancing: 0,
      declining: 0,
      unchanged: 0,
      changeSum: 0,
      totalMarketCap: 0,
    };

    entry.totalStocks += 1;
    if (changePercent > 0) {
      entry.advancing += 1;
    } else if (changePercent < 0) {
      entry.declining += 1;
    } else {
      entry.unchanged += 1;
    }

    entry.changeSum += changePercent;
    entry.totalMarketCap += Number.isFinite(marketCap) ? marketCap : 0;

    aggregates.set(sector, entry);
  });

  return Array.from(aggregates.values())
    .map((entry) => ({
      sector: entry.sector,
      totalStocks: entry.totalStocks,
      advancing: entry.advancing,
      declining: entry.declining,
      unchanged: entry.unchanged,
      avgChangePercent: entry.totalStocks > 0 ? entry.changeSum / entry.totalStocks : null,
      totalMarketCap: entry.totalMarketCap,
      source: 'stock-nse-india',
      metadata: {
        pipeline: 'market-sector-heatmap',
      },
    }))
    .sort((a, b) => {
      const aChange = a.avgChangePercent ?? Number.NEGATIVE_INFINITY;
      const bChange = b.avgChangePercent ?? Number.NEGATIVE_INFINITY;
      return bChange - aChange;
    });
};

const refreshSectorHeatmap = async (limit) => {
  const payload = await legacyApi.getPriceShockers();
  const priceRows = buildPriceShockerRows(payload);

  if (priceRows.length === 0) {
    const existing = await listLatestSectorHeatmap(limit);
    return {
      source: 'stock-sector-heatmap',
      capturedAt: existing[0]?.capturedAt || null,
      count: existing.length,
      sectors: existing,
      refreshed: false,
    };
  }

  const taxonomySeedRows = dedupeBySymbol(
    priceRows
      .map((row) => ({
        symbol: row.symbol,
        companyName: row.companyName,
        sector: row.sector,
        industry: row.industry,
        marketCap: row.marketCap,
        source: 'stock-nse-india',
        metadata: {
          pipeline: 'market-price-shockers',
        },
      }))
      .filter((row) => row.sector !== 'UNKNOWN' || row.industry !== 'UNKNOWN' || row.marketCap !== null)
  );

  if (taxonomySeedRows.length > 0) {
    await upsertSectorTaxonomyRows(taxonomySeedRows);
  }

  const taxonomyMap = await getSectorTaxonomyMapForSymbols(priceRows.map((row) => row.symbol));
  const heatmapRows = buildSectorHeatmapRows(priceRows, taxonomyMap);
  const capturedAt = new Date().toISOString();

  if (heatmapRows.length > 0) {
    await upsertSectorHeatmapRows(capturedAt, heatmapRows, 'stock-nse-india');
  }

  const latestRows = await listLatestSectorHeatmap(limit);

  return {
    source: 'stock-sector-heatmap',
    capturedAt: latestRows[0]?.capturedAt || capturedAt,
    count: latestRows.length,
    sectors: latestRows,
    refreshed: true,
  };
};

const getMarketSectorHeatmap = async (query = {}) => {
  const limit = Math.min(toPositiveInt(query.limit, 25), 200);
  const forceRefresh = parseBoolean(query.forceRefresh, false);
  const cacheKey = cacheManager.generateKey(MARKET_SECTOR_HEATMAP_CACHE_KEY, { limit });

  if (CACHE_ENABLED && !forceRefresh) {
    const cached = await cacheManager.getAsync(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let result;

  if (!forceRefresh) {
    const existing = await listLatestSectorHeatmap(limit);
    if (existing.length > 0) {
      result = {
        source: 'stock-sector-heatmap',
        capturedAt: existing[0]?.capturedAt || null,
        count: existing.length,
        sectors: existing,
        refreshed: false,
      };
    }
  }

  if (!result) {
    result = await refreshSectorHeatmap(limit);
  }

  if (CACHE_ENABLED) {
    await cacheManager.setAsync(cacheKey, result, CACHE_MARKET_SECTOR_HEATMAP_TTL_MS, {
      tags: [MARKET_CACHE_TAG, 'market_sector_heatmap'],
      priority: 'normal',
    });
  }

  return result;
};

const sync52WeekTracking = async () => {
  const payload = await legacyApi.get52WeekHighLow();
  const rawRecords = flattenObjectArrayValues(payload);

  const taxonomyRows = dedupeBySymbol(rawRecords.map((record) => toTaxonomyRow(record)).filter(Boolean));
  if (taxonomyRows.length > 0) {
    await upsertSectorTaxonomyRows(taxonomyRows);
  }

  const rows = build52WeekRows(payload);
  const upserted = await upsert52WeekLevelsRows(rows);

  return {
    source: 'stock-nse-india',
    capturedAt: new Date().toISOString(),
    recordsFetched: rows.length,
    recordsUpserted: upserted,
    taxonomyRowsUpserted: taxonomyRows.length,
  };
};

const get52WeekLeaderboard = async (type = 'high', query = {}) => {
  const normalizedType = String(type || 'high').trim().toLowerCase() === 'low' ? 'low' : 'high';
  const limit = Math.min(toPositiveInt(query.limit, 25), 200);
  const sector = query.sector ? String(query.sector).trim() : null;
  const forceRefresh = parseBoolean(query.forceRefresh, false);
  const cacheKey = build52WeekCacheKey(normalizedType, { limit, sector });

  if (CACHE_ENABLED && !forceRefresh) {
    const cached = await cacheManager.getAsync(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let refreshed = false;

  if (forceRefresh) {
    await sync52WeekTracking();
    refreshed = true;
  }

  let rows = await list52WeekLevels({
    type: normalizedType,
    sector,
    limit,
  });

  if (rows.length === 0 && !refreshed) {
    await sync52WeekTracking();
    refreshed = true;
    rows = await list52WeekLevels({
      type: normalizedType,
      sector,
      limit,
    });
  }

  const result = {
    source: 'stock-52-week-tracking',
    type: normalizedType,
    sector: sector || null,
    count: rows.length,
    refreshed,
    items: rows,
  };

  if (CACHE_ENABLED) {
    await cacheManager.setAsync(cacheKey, result, CACHE_MARKET_52_WEEK_TTL_MS, {
      tags: [MARKET_CACHE_TAG, 'market_52_week'],
      priority: 'normal',
    });
  }

  return result;
};

const getSnapshotHistory = async (query) => {
  const from = query?.from || null;
  const to = query?.to || null;
  const normalizedPagination = normalizePaginationQuery(query, {
    defaultPage: 1,
    defaultLimit: 120,
    maxLimit: 1440,
  });

  const page = normalizedPagination.page;
  const limit = parseLimit(normalizedPagination.limit, 120);
  const offset = normalizedPagination.offset;

  const buildHistoryResult = async () => {
    const [snapshots, totalCount] = await Promise.all([
      listMarketSnapshots({ from, to, limit, offset }),
      countMarketSnapshots({ from, to }),
    ]);

    return {
      snapshots,
      pagination: buildPaginationMetadata({
        page,
        limit,
        itemCount: snapshots.length,
        totalCount,
      }),
    };
  };

  if (CACHE_ENABLED) {
    const cacheKey = buildMarketHistoryCacheKey({ from, to, page, limit });
    const cached = await cacheManager.getAsync(cacheKey);
    if (cached) {
      return cached;
    }

    const historyResult = await buildHistoryResult();

    await cacheManager.setAsync(cacheKey, historyResult, CACHE_MARKET_HISTORY_TTL_MS, {
      tags: [MARKET_CACHE_TAG],
      priority: 'normal',
    });

    return historyResult;
  }

  return buildHistoryResult();
};

module.exports = {
  syncMarketSnapshot,
  getLatestSnapshot,
  getMarketOverview,
  getMarketIndexHistory,
  getMarketSectorHeatmap,
  get52WeekLeaderboard,
  getSnapshotHistory,
};