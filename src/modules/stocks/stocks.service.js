const legacyApi = require('../../services/legacy/api');
const { buildPaginationMetadata } = require('../../shared/utils/pagination');
const {
  upsertStocksMasterRows,
  countStocksMasterRows,
  searchStocksMasterRows,
  upsertSectorTaxonomyRows,
  getSectorTaxonomyBySymbol,
  listSectorPeersBySector,
  getStockProfileDetailsBySymbol,
  getLatestStockMetricsSnapshotBySymbol,
} = require('./stocks.repository');
const {
  assertSymbol,
  normalizeSearchQuery,
  normalizePeersQuery,
} = require('./stocks.validation');

const SEARCH_LIST_KEYS = [
  'data',
  'items',
  'results',
  'stocks',
  'searchResults',
  'matches',
  'rows',
];

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[,\s₹%]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const unwrapPayload = (payload) => {
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    return payload[0] || null;
  }

  if (typeof payload === 'object') {
    for (const key of ['data', 'result', 'stock', 'profile', 'details']) {
      const nested = payload[key];
      if (Array.isArray(nested)) {
        return nested[0] || null;
      }

      if (nested && typeof nested === 'object') {
        return nested;
      }
    }

    return payload;
  }

  return null;
};

const listFromPayload = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === 'object') {
    for (const key of SEARCH_LIST_KEYS) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }

    return [payload];
  }

  return [];
};

const toSearchText = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item.toUpperCase();
  }

  if (typeof item !== 'object') {
    return String(item).toUpperCase();
  }

  const values = [
    item.symbol,
    item.ticker,
    item.code,
    item.name,
    item.companyName,
    item.company_name,
    item.stockName,
    item.stock_name,
    item.isin,
  ];

  return values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value))
    .join(' ')
    .toUpperCase();
};

const findByKeys = (payload, keys, depth = 0) => {
  if (!payload || typeof payload !== 'object' || depth > 4) {
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

    const nestedValue = findByKeys(value, keys, depth + 1);
    if (nestedValue !== undefined) {
      return nestedValue;
    }
  }

  return undefined;
};

const SYMBOL_PATTERN = /^[A-Z0-9.&_-]{1,20}$/;

const normalizeLabel = (value, fallback = 'UNKNOWN') => {
  const normalized = String(value || '').trim();
  return normalized ? normalized : fallback;
};

const coalesceValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
};

const toIsoDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const extractStringByKeys = (payload, keys) => {
  const value = findByKeys(payload, keys);
  return value === undefined || value === null ? null : String(value).trim();
};

const normalizeSymbolCandidate = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return SYMBOL_PATTERN.test(normalized) ? normalized : null;
};

const extractSymbol = (payload, fallbackSymbol = null) => {
  const candidates = [
    extractStringByKeys(payload, ['symbol', 'ticker', 'code', 'stockCode', 'stock_code']),
    fallbackSymbol,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeSymbolCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const toTaxonomyRow = (payload, options = {}) => {
  const symbol = extractSymbol(payload, options.fallbackSymbol || null);
  if (!symbol) {
    return null;
  }

  const marketCap = toFiniteNumber(
    findByKeys(payload, [
      'marketCap',
      'market_cap',
      'mcap',
      'marketCapitalization',
      'market_capitalization',
    ])
  );

  const companyName = extractStringByKeys(payload, [
    'companyName',
    'company_name',
    'name',
    'stockName',
    'stock_name',
  ]);

  const sector = normalizeLabel(
    extractStringByKeys(payload, ['sector', 'sectorName', 'sector_name']) || options.fallbackSector,
    'UNKNOWN'
  );

  const industry = normalizeLabel(
    extractStringByKeys(payload, ['industry', 'industryName', 'industry_name']) || options.fallbackIndustry,
    'UNKNOWN'
  );

  return {
    symbol,
    companyName,
    sector,
    industry,
    marketCap,
    source: 'stock-nse-india',
    metadata: {
      pipeline: 'stocks-peers',
      seededAt: new Date().toISOString(),
    },
  };
};

const dedupeTaxonomyRows = (rows = []) => {
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

const normalizeSeedSymbols = (symbols = []) => {
  return Array.from(
    new Set(
      (Array.isArray(symbols) ? symbols : [])
        .map((symbol) => normalizeSymbolCandidate(symbol))
        .filter(Boolean)
    )
  );
};

const seedStocksMaster = async (options = {}) => {
  const source = String(options.source || 'stock-nse-india').trim() || 'stock-nse-india';

  const rawSymbols = Array.isArray(options.symbols) && options.symbols.length > 0
    ? options.symbols
    : await legacyApi.getAllStockSymbols();

  const normalizedSymbols = normalizeSeedSymbols(rawSymbols);

  if (normalizedSymbols.length === 0) {
    return {
      source,
      requestedCount: Array.isArray(rawSymbols) ? rawSymbols.length : 0,
      uniqueCount: 0,
      processedCount: 0,
      upsertedCount: 0,
      skippedCount: Array.isArray(rawSymbols) ? rawSymbols.length : 0,
    };
  }

  const maxSymbolsInput = Number.parseInt(options.maxSymbols, 10);
  const maxSymbols = Number.isFinite(maxSymbolsInput) && maxSymbolsInput > 0
    ? maxSymbolsInput
    : normalizedSymbols.length;

  const symbolsToSeed = normalizedSymbols.slice(0, maxSymbols);
  const rows = symbolsToSeed.map((symbol) => ({
    symbol,
    companyName: symbol,
    exchange: 'NSE',
    nseSymbol: symbol,
    source,
    metadata: {
      pipeline: 'stocks-master-seed',
      seededAt: new Date().toISOString(),
      strategy: 'symbol-list',
    },
  }));

  const upsertedCount = await upsertStocksMasterRows(rows);

  return {
    source,
    requestedCount: Array.isArray(rawSymbols) ? rawSymbols.length : 0,
    uniqueCount: normalizedSymbols.length,
    processedCount: rows.length,
    upsertedCount,
    skippedCount: Math.max(0, (Array.isArray(rawSymbols) ? rawSymbols.length : 0) - normalizedSymbols.length),
  };
};

const seedSectorTaxonomyForSymbol = async (symbol) => {
  const [rawProfile, rawPeers] = await Promise.all([
    legacyApi.getCompanyProfile(symbol),
    legacyApi.getPeerComparison(symbol),
  ]);

  const profile = unwrapPayload(rawProfile) || {};
  const peers = listFromPayload(rawPeers);

  const fallbackSector = normalizeLabel(
    extractStringByKeys(profile, ['sector', 'sectorName', 'sector_name']),
    'UNKNOWN'
  );
  const fallbackIndustry = normalizeLabel(
    extractStringByKeys(profile, ['industry', 'industryName', 'industry_name']),
    'UNKNOWN'
  );

  const taxonomyRows = [
    toTaxonomyRow(profile, {
      fallbackSymbol: symbol,
      fallbackSector,
      fallbackIndustry,
    }),
    ...peers.map((peer) =>
      toTaxonomyRow(peer, {
        fallbackSector,
        fallbackIndustry,
      })
    ),
  ].filter(Boolean);

  const dedupedRows = dedupeTaxonomyRows(taxonomyRows);
  const seeded = await upsertSectorTaxonomyRows(dedupedRows);

  return {
    seeded,
    fallbackSector,
    fallbackIndustry,
    rows: dedupedRows,
  };
};

const searchStocks = async (queryParams) => {
  const query = normalizeSearchQuery(queryParams);

  try {
    const totalCount = await countStocksMasterRows(query.q);

    if (totalCount > 0) {
      const dbRows = await searchStocksMasterRows({
        searchText: query.q,
        limit: query.limit,
        offset: query.offset,
      });

      return {
        query: query.q,
        source: 'stocks_master',
        results: dbRows,
        pagination: buildPaginationMetadata({
          page: query.page,
          limit: query.limit,
          itemCount: dbRows.length,
          totalCount,
        }),
      };
    }
  } catch (_) {
    // Fall back to legacy search when stocks_master is unavailable or not yet migrated.
  }

  const rawResult = await legacyApi.searchStocks(query.q);
  const records = listFromPayload(rawResult);

  const filtered = records.filter((item) => toSearchText(item).includes(query.q.toUpperCase()));
  const effectiveRecords = filtered.length > 0 ? filtered : records;

  const paginated = effectiveRecords.slice(query.offset, query.offset + query.limit);

  return {
    query: query.q,
    source: 'legacy_api',
    results: paginated,
    pagination: buildPaginationMetadata({
      page: query.page,
      limit: query.limit,
      itemCount: paginated.length,
      totalCount: effectiveRecords.length,
    }),
  };
};

const getStockProfile = async (rawSymbol) => {
  const symbol = assertSymbol(rawSymbol);
  const [rawProfile, dbProfile, dbMetrics] = await Promise.all([
    legacyApi.getCompanyProfile(symbol),
    getStockProfileDetailsBySymbol(symbol),
    getLatestStockMetricsSnapshotBySymbol(symbol),
  ]);

  const legacyProfile = unwrapPayload(rawProfile) || {};

  const profile = {
    ...(legacyProfile && typeof legacyProfile === 'object' ? legacyProfile : {}),
    symbol,
    companyName: coalesceValue(dbProfile?.companyName, legacyProfile.companyName, legacyProfile.name),
    exchange: coalesceValue(dbProfile?.exchange, legacyProfile.exchange),
    isin: coalesceValue(dbProfile?.isin, legacyProfile.isin),
    nseSymbol: coalesceValue(dbProfile?.nseSymbol, legacyProfile.nseSymbol, symbol),
    bseCode: coalesceValue(dbProfile?.bseCode, legacyProfile.bseCode),
    series: coalesceValue(dbProfile?.series, legacyProfile.series),
    sector: coalesceValue(dbProfile?.sector, legacyProfile.sector),
    industry: coalesceValue(dbProfile?.industry, legacyProfile.industry),
    logoUrl: coalesceValue(dbProfile?.logoUrl, legacyProfile.logoUrl, legacyProfile.logo),
    website: coalesceValue(
      dbProfile?.profileWebsite,
      dbProfile?.stocksMasterWebsite,
      legacyProfile.website,
      legacyProfile.companyWebsite
    ),
    headquarters: coalesceValue(
      dbProfile?.profileHeadquarters,
      dbProfile?.stocksMasterHeadquarters,
      legacyProfile.headquarters
    ),
    foundedYear: coalesceValue(
      dbProfile?.profileFoundedYear,
      dbProfile?.stocksMasterFoundedYear,
      legacyProfile.foundedYear
    ),
    employees: coalesceValue(
      dbProfile?.profileEmployees,
      dbProfile?.stocksMasterEmployees,
      legacyProfile.employees
    ),
    businessSummary: coalesceValue(
      dbProfile?.businessSummary,
      dbProfile?.stocksMasterDescription,
      legacyProfile.businessSummary,
      legacyProfile.description
    ),
    companyHistory: coalesceValue(dbProfile?.companyHistory, legacyProfile.companyHistory),
    management: coalesceValue(dbProfile?.managementPayload, legacyProfile.management, null),
    metadata: {
      profileSource: dbProfile?.profileSource || null,
      stocksMasterSource: dbProfile?.stocksMasterSource || null,
      profileUpdatedAt: dbProfile?.profileUpdatedAt || null,
    },
  };

  const metrics = dbMetrics
    ? {
        symbol: dbMetrics.symbol,
        asOfDate: toIsoDateOrNull(dbMetrics.asOfDate),
        week52High: toFiniteNumber(dbMetrics.week52High),
        week52Low: toFiniteNumber(dbMetrics.week52Low),
        week52HighDate: toIsoDateOrNull(dbMetrics.week52HighDate),
        week52LowDate: toIsoDateOrNull(dbMetrics.week52LowDate),
        high3m: toFiniteNumber(dbMetrics.high3m),
        low3m: toFiniteNumber(dbMetrics.low3m),
        high12m: toFiniteNumber(dbMetrics.high12m),
        low12m: toFiniteNumber(dbMetrics.low12m),
        return3mPercent: toFiniteNumber(dbMetrics.return3mPercent),
        return12mPercent: toFiniteNumber(dbMetrics.return12mPercent),
        avgVolume20d: toFiniteNumber(dbMetrics.avgVolume20d),
        source: dbMetrics.source,
        metadata: dbMetrics.metadata || {},
      }
    : null;

  return {
    symbol,
    source: dbProfile ? 'stocks_master+stock_profile_details' : 'stock-nse-india',
    profile,
    metrics,
  };
};

const getStockQuote = async (rawSymbol) => {
  const symbol = assertSymbol(rawSymbol);
  const rawProfile = await legacyApi.getCompanyProfile(symbol);
  const profile = unwrapPayload(rawProfile) || {};

  const quote = {
    symbol,
    lastPrice: toFiniteNumber(findByKeys(profile, ['lastPrice', 'last_price', 'ltp', 'price', 'close'])),
    change: toFiniteNumber(findByKeys(profile, ['change', 'netChange', 'priceChange'])),
    changePercent: toFiniteNumber(findByKeys(profile, ['pChange', 'changePercent', 'percentChange'])),
    open: toFiniteNumber(findByKeys(profile, ['open', 'dayOpen'])),
    high: toFiniteNumber(findByKeys(profile, ['high', 'dayHigh'])),
    low: toFiniteNumber(findByKeys(profile, ['low', 'dayLow'])),
    previousClose: toFiniteNumber(findByKeys(profile, ['previousClose', 'prevClose'])),
    volume: toFiniteNumber(findByKeys(profile, ['totalTradedVolume', 'volume', 'tradedVolume'])),
    asOf: new Date().toISOString(),
    source: 'stock-nse-india',
  };

  return {
    symbol,
    quote,
  };
};

const getStockPeers = async (rawSymbol, queryParams = {}) => {
  const symbol = assertSymbol(rawSymbol);
  const query = normalizePeersQuery(queryParams);

  let taxonomy = await getSectorTaxonomyBySymbol(symbol);
  let seedSummary = null;

  if (!taxonomy || query.forceRefresh) {
    seedSummary = await seedSectorTaxonomyForSymbol(symbol);
    taxonomy = await getSectorTaxonomyBySymbol(symbol);
  }

  const sector = taxonomy?.sector || seedSummary?.fallbackSector || 'UNKNOWN';
  const industry = taxonomy?.industry || seedSummary?.fallbackIndustry || 'UNKNOWN';

  let peers = sector !== 'UNKNOWN'
    ? await listSectorPeersBySector({
        sector,
        excludeSymbol: symbol,
        limit: query.limit,
      })
    : [];

  if (peers.length === 0 && !query.forceRefresh) {
    seedSummary = await seedSectorTaxonomyForSymbol(symbol);
    const refreshedTaxonomy = await getSectorTaxonomyBySymbol(symbol);
    const refreshedSector = refreshedTaxonomy?.sector || sector;

    peers = refreshedSector !== 'UNKNOWN'
      ? await listSectorPeersBySector({
          sector: refreshedSector,
          excludeSymbol: symbol,
          limit: query.limit,
        })
      : [];
  }

  const fallbackPeers = (seedSummary?.rows || [])
    .filter((row) => row.symbol !== symbol)
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, query.limit)
    .map((row) => ({
      symbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      industry: row.industry,
      marketCap: row.marketCap,
      source: row.source,
    }));

  const outputPeers = peers.length > 0
    ? peers.map((peer) => ({
        symbol: peer.symbol,
        companyName: peer.companyName,
        sector: peer.sector,
        industry: peer.industry,
        marketCap: peer.marketCap,
        source: peer.source,
      }))
    : fallbackPeers;

  return {
    symbol,
    sector,
    industry,
    source: 'stock-sector-taxonomy',
    count: outputPeers.length,
    peers: outputPeers,
    taxonomySeededRows: seedSummary?.seeded || 0,
  };
};

module.exports = {
  seedStocksMaster,
  searchStocks,
  getStockProfile,
  getStockQuote,
  getStockPeers,
  seedSectorTaxonomyForSymbol,
};
