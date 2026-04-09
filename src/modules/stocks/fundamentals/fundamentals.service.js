const legacyApi = require('../../../services/legacy/api');
const cacheManager = require('../../../utils/cacheManager');
const { logger } = require('../../../utils/logger');
const {
  upsertFundamentalSnapshot,
  listFundamentalSnapshots,
  upsertFinancialStatementSnapshot,
  listFinancialStatementSnapshots,
  listRecentSymbolsFromTicks,
} = require('./fundamentals.repository');
const {
  normalizeSymbol,
  normalizeFundamentalQuery,
  normalizeFinancialsQuery,
  normalizeSyncPayload,
} = require('./fundamentals.validation');

const FUNDAMENTALS_CACHE_TAG = 'stock-fundamentals';
const CACHE_ENABLED = String(process.env.CACHE_ENABLED || 'true').toLowerCase() !== 'false';
const FUNDAMENTALS_CACHE_TTL_MS = 60 * 1000;

const CACHE_KEYS = {
  fundamentals: (symbol, query) =>
    `stocks:fundamental:${symbol}:${query.from || 'na'}:${query.to || 'na'}:${query.limit}:${query.includeHistory}`,
  financials: (symbol, statementType, query) =>
    `stocks:financials:${symbol}:${statementType}:${query.from || 'na'}:${query.to || 'na'}:${query.limit}:${query.includeHistory}`,
};

const RATIO_KEY_CANDIDATES = {
  peRatio: ['pe', 'p/e', 'peratio', 'pe_ratio', 'priceearningratio'],
  pbRatio: ['pb', 'p/b', 'pbratio', 'pb_ratio', 'pricetobookratio'],
  roe: ['roe', 'returnonequity'],
  roce: ['roce', 'returnoncapitalemployed'],
  eps: ['eps', 'earningpershare'],
  bookValue: ['bookvalue', 'bv'],
  debtToEquity: ['debttoequity', 'd/e', 'de_ratio'],
  dividendYield: ['dividendyield', 'dy'],
  currentRatio: ['currentratio'],
  quickRatio: ['quickratio'],
  netProfitMargin: ['netprofitmargin', 'npm'],
  operatingMargin: ['operatingmargin', 'opm'],
  marketCap: ['marketcap', 'marketcapitalization', 'mcap'],
  evEbitda: ['evebitda', 'ev/ebitda'],
};

const normalizeKey = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

const toNumeric = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const unwrapPayload = (payload) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if ('data' in payload) {
      return payload.data;
    }
    if ('result' in payload) {
      return payload.result;
    }
  }

  return payload;
};

const findNumericByCandidates = (payload, candidates, depth = 0) => {
  if (!payload || depth > 6) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findNumericByCandidates(item, candidates, depth + 1);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  if (typeof payload !== 'object') {
    return null;
  }

  for (const [key, value] of Object.entries(payload)) {
    const keyMatch = candidates.has(normalizeKey(key));
    if (keyMatch) {
      const numeric = toNumeric(value);
      if (numeric !== null) {
        return numeric;
      }
    }

    if (value && typeof value === 'object') {
      const nested = findNumericByCandidates(value, candidates, depth + 1);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
};

const buildComputedRatios = (rawProfile, rawRatios) => {
  const profile = unwrapPayload(rawProfile);
  const ratioPayload = unwrapPayload(rawRatios);
  const merged = {
    profile,
    ratioPayload,
  };

  const ratioEntries = Object.entries(RATIO_KEY_CANDIDATES).map(([ratioName, keys]) => {
    const candidateSet = new Set(keys.map(normalizeKey));
    return [ratioName, findNumericByCandidates(merged, candidateSet)];
  });

  const ratios = Object.fromEntries(
    ratioEntries.filter(([, value]) => value !== null)
  );

  return ratios;
};

const cacheSet = async (key, data, tags = []) => {
  if (!CACHE_ENABLED) {
    return;
  }

  try {
    await cacheManager.setAsync(key, data, FUNDAMENTALS_CACHE_TTL_MS, {
      tags,
      priority: 'normal',
    });
  } catch (error) {
    logger.warn('Failed to cache fundamentals payload', {
      key,
      error: error.message,
    });
  }
};

const cacheGet = async (key) => {
  if (!CACHE_ENABLED) {
    return null;
  }

  try {
    const cached = await cacheManager.getAsync(key);
    return cached || null;
  } catch (error) {
    logger.warn('Failed to read fundamentals cache', {
      key,
      error: error.message,
    });
    return null;
  }
};

const clearSymbolCache = async (symbol) => {
  if (!CACHE_ENABLED) {
    return;
  }

  try {
    await cacheManager.clearByTagsAsync([
      FUNDAMENTALS_CACHE_TAG,
      `${FUNDAMENTALS_CACHE_TAG}:${symbol}`,
    ]);
  } catch (error) {
    logger.warn('Failed to invalidate fundamentals cache', {
      symbol,
      error: error.message,
    });
  }
};

async function fetchAndStoreFundamentals(symbol, options = {}) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const fetchedAt = new Date();

  const [profile, ratioPayload] = await Promise.all([
    legacyApi.getCompanyProfile(normalizedSymbol),
    typeof legacyApi.getFinancialRatios === 'function'
      ? legacyApi.getFinancialRatios(normalizedSymbol)
      : null,
  ]);

  const ratios = buildComputedRatios(profile, ratioPayload);

  const snapshot = await upsertFundamentalSnapshot({
    symbol: normalizedSymbol,
    asOfDate: options.asOfDate || fetchedAt,
    ratios,
    source: options.source || 'stock-nse-india',
    metadata: {
      fetchedAt: fetchedAt.toISOString(),
      profileAvailable: Boolean(profile),
      ratioPayloadAvailable: Boolean(ratioPayload),
      pipeline: 'fundamentals-service',
    },
  });

  await clearSymbolCache(normalizedSymbol);
  return snapshot;
}

async function fetchAndStoreFinancials(symbol, statementType, options = {}) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedStatementType = String(statementType || '').trim().toLowerCase();
  const fetchedAt = new Date();

  const payload = await legacyApi.getFinancialStatements(
    normalizedSymbol,
    normalizedStatementType
  );

  const snapshot = await upsertFinancialStatementSnapshot({
    symbol: normalizedSymbol,
    statementType: normalizedStatementType,
    asOfDate: options.asOfDate || fetchedAt,
    payload: unwrapPayload(payload),
    source: options.source || 'stock-nse-india',
    metadata: {
      fetchedAt: fetchedAt.toISOString(),
      pipeline: 'fundamentals-service',
    },
  });

  await clearSymbolCache(normalizedSymbol);
  return snapshot;
}

async function getFundamentalData(symbol, query = {}) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedQuery = normalizeFundamentalQuery(query);
  const cacheKey = CACHE_KEYS.fundamentals(normalizedSymbol, normalizedQuery);

  if (!normalizedQuery.forceRefresh) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let snapshots = [];

  if (!normalizedQuery.forceRefresh) {
    snapshots = await listFundamentalSnapshots(normalizedSymbol, normalizedQuery);
  }

  if (snapshots.length === 0 || normalizedQuery.forceRefresh) {
    await fetchAndStoreFundamentals(normalizedSymbol);
    snapshots = await listFundamentalSnapshots(normalizedSymbol, normalizedQuery);
  }

  const latest = snapshots[0] || null;

  const result = {
    symbol: normalizedSymbol,
    asOfDate: latest ? latest.asOfDate : null,
    source: latest ? latest.source : 'stock-nse-india',
    ratios: latest ? latest.ratios : {},
    metadata: latest ? latest.metadata : {},
  };

  if (normalizedQuery.includeHistory) {
    result.history = snapshots;
  }

  await cacheSet(cacheKey, result, [
    FUNDAMENTALS_CACHE_TAG,
    `${FUNDAMENTALS_CACHE_TAG}:${normalizedSymbol}`,
  ]);

  return result;
}

async function getFinancialsData(symbol, query = {}) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedQuery = normalizeFinancialsQuery(query);
  const cacheKey = CACHE_KEYS.financials(
    normalizedSymbol,
    normalizedQuery.statementType,
    normalizedQuery
  );

  if (!normalizedQuery.forceRefresh) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let snapshots = [];

  if (!normalizedQuery.forceRefresh) {
    snapshots = await listFinancialStatementSnapshots(
      normalizedSymbol,
      normalizedQuery.statementType,
      normalizedQuery
    );
  }

  if (snapshots.length === 0 || normalizedQuery.forceRefresh) {
    await fetchAndStoreFinancials(normalizedSymbol, normalizedQuery.statementType);
    snapshots = await listFinancialStatementSnapshots(
      normalizedSymbol,
      normalizedQuery.statementType,
      normalizedQuery
    );
  }

  const latest = snapshots[0] || null;

  const result = {
    symbol: normalizedSymbol,
    statementType: normalizedQuery.statementType,
    asOfDate: latest ? latest.asOfDate : null,
    source: latest ? latest.source : 'stock-nse-india',
    data: latest ? latest.payload : null,
    metadata: latest ? latest.metadata : {},
  };

  if (normalizedQuery.includeHistory) {
    result.history = snapshots;
  }

  await cacheSet(cacheKey, result, [
    FUNDAMENTALS_CACHE_TAG,
    `${FUNDAMENTALS_CACHE_TAG}:${normalizedSymbol}`,
  ]);

  return result;
}

async function syncFundamentalsBatch(payload = {}) {
  const config = normalizeSyncPayload(payload);
  const symbols = config.symbols.length
    ? config.symbols
    : await listRecentSymbolsFromTicks(config.maxSymbols);

  const startedAt = new Date();
  const summary = {
    startedAt: startedAt.toISOString(),
    symbolsRequested: symbols.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    failures: [],
    statementTypes: config.statementTypes,
  };

  for (const symbol of symbols) {
    summary.processed += 1;

    try {
      if (config.includeFundamentals) {
        await fetchAndStoreFundamentals(symbol);
      }

      for (const statementType of config.statementTypes) {
        await fetchAndStoreFinancials(symbol, statementType);
      }

      summary.succeeded += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({
        symbol,
        message: error.message,
      });
      logger.warn('Fundamental batch sync failed for symbol', {
        symbol,
        error: error.message,
      });
    }
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}

module.exports = {
  getFundamentalData,
  getFinancialsData,
  fetchAndStoreFundamentals,
  fetchAndStoreFinancials,
  syncFundamentalsBatch,
};
