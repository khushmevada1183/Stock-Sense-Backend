const { upsertTicks, getTicks, getHistoryCandles } = require('./ticks.repository');
const cacheManager = require('../../../utils/cacheManager');
const {
  normalizeIngestPayload,
  normalizeTicksQuery,
  normalizeHistoryQuery,
} = require('./ticks.validation');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CACHE_ENABLED = String(process.env.CACHE_ENABLED || 'true').toLowerCase() !== 'false';
const CACHE_STOCK_TICKS_TTL_MS = toPositiveInt(process.env.CACHE_STOCK_TICKS_TTL_MS, 60 * 1000);
const CACHE_STOCK_HISTORY_TTL_MS = toPositiveInt(process.env.CACHE_STOCK_HISTORY_TTL_MS, 5 * 60 * 1000);

const stockTag = (symbol) => `stock:${symbol}`;

const buildTicksCacheKey = (symbol, options) => {
  return cacheManager.generateKey(`v1:stocks:${symbol}:ticks`, {
    from: options.from || '',
    to: options.to || '',
    limit: options.limit,
  });
};

const buildHistoryCacheKey = (symbol, options) => {
  return cacheManager.generateKey(`v1:stocks:${symbol}:history`, {
    bucket: options.bucket,
    from: options.from || '',
    to: options.to || '',
    limit: options.limit,
  });
};

const ingestTicks = async (symbol, body) => {
  const payload = normalizeIngestPayload(symbol, body);
  const upsertedCount = await upsertTicks(payload.symbol, payload.ticks);

  if (CACHE_ENABLED) {
    await cacheManager.clearByTagsAsync(stockTag(payload.symbol));
  }

  return {
    symbol: payload.symbol,
    receivedCount: payload.ticks.length,
    upsertedCount,
  };
};

const listTicks = async (symbol, queryParams) => {
  const options = normalizeTicksQuery(symbol, queryParams);

  if (CACHE_ENABLED) {
    const cacheKey = buildTicksCacheKey(options.symbol, options);
    const cached = await cacheManager.getAsync(cacheKey);

    if (cached) {
      return cached;
    }

    const items = await getTicks(options.symbol, options);
    const payload = {
      symbol: options.symbol,
      from: options.from,
      to: options.to,
      limit: options.limit,
      count: items.length,
      items,
    };

    await cacheManager.setAsync(cacheKey, payload, CACHE_STOCK_TICKS_TTL_MS, {
      tags: ['stock_ticks', stockTag(options.symbol)],
      priority: 'normal',
    });

    return payload;
  }

  const items = await getTicks(options.symbol, options);

  return {
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    limit: options.limit,
    count: items.length,
    items,
  };
};

const listHistory = async (symbol, queryParams) => {
  const options = normalizeHistoryQuery(symbol, queryParams);

  if (CACHE_ENABLED) {
    const cacheKey = buildHistoryCacheKey(options.symbol, options);
    const cached = await cacheManager.getAsync(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await getHistoryCandles(options.symbol, options);
    const payload = {
      symbol: options.symbol,
      bucket: options.bucket,
      from: options.from,
      to: options.to,
      limit: options.limit,
      source: result.source,
      count: result.items.length,
      items: result.items,
    };

    await cacheManager.setAsync(cacheKey, payload, CACHE_STOCK_HISTORY_TTL_MS, {
      tags: ['stock_history', stockTag(options.symbol)],
      priority: 'normal',
    });

    return payload;
  }

  const result = await getHistoryCandles(options.symbol, options);

  return {
    symbol: options.symbol,
    bucket: options.bucket,
    from: options.from,
    to: options.to,
    limit: options.limit,
    source: result.source,
    count: result.items.length,
    items: result.items,
  };
};

module.exports = {
  ingestTicks,
  listTicks,
  listHistory,
};
