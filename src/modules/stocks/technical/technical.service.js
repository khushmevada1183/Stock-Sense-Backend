const {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  ADX,
  Stochastic,
  WilliamsR,
  ROC,
  OBV,
  MFI,
  CCI,
  WMA,
} = require('technicalindicators');

const cacheManager = require('../../../utils/cacheManager');
const { getHistoryCandles } = require('../ticks/ticks.repository');
const {
  upsertTechnicalIndicatorRows,
  getStoredTechnicalIndicators,
  listRecentSymbolsFromTicks,
} = require('./technical.repository');
const {
  normalizeTechnicalQuery,
  normalizeRecomputeQuery,
} = require('./technical.validation');

const CACHE_ENABLED = String(process.env.CACHE_ENABLED || 'true').toLowerCase() !== 'false';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CACHE_TECHNICAL_TTL_MS = toPositiveInt(process.env.CACHE_TECHNICAL_TTL_MS, 60 * 1000);

const buildTechnicalCacheKey = ({ symbol, bucket, from, to, limit, includeHistory }) => {
  return cacheManager.generateKey(`v1:stocks:${symbol}:technical`, {
    bucket,
    from: from || '',
    to: to || '',
    limit,
    includeHistory: includeHistory ? '1' : '0',
  });
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const prepareCandles = (rawCandles) => {
  const candles = (Array.isArray(rawCandles) ? rawCandles : [])
    .map((candle) => ({
      timestamp: new Date(candle.timestamp).toISOString(),
      open: toFiniteNumber(candle.open),
      high: toFiniteNumber(candle.high),
      low: toFiniteNumber(candle.low),
      close: toFiniteNumber(candle.close),
      volume: toFiniteNumber(candle.volume) || 0,
    }))
    .filter((candle) => {
      return (
        candle.timestamp &&
        candle.close !== null &&
        candle.high !== null &&
        candle.low !== null
      );
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return candles;
};

const alignSeries = (series, totalLength) => {
  const aligned = new Array(totalLength).fill(null);

  if (!Array.isArray(series) || series.length === 0 || totalLength === 0) {
    return aligned;
  }

  const start = Math.max(0, totalLength - series.length);

  for (let index = 0; index < series.length && start + index < totalLength; index += 1) {
    aligned[start + index] = series[index];
  }

  return aligned;
};

const safeCalculate = (calculator) => {
  try {
    const result = calculator();
    return Array.isArray(result) ? result : [];
  } catch (_) {
    return [];
  }
};

const toNumberObject = (input, keys) => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const output = {};
  let hasValue = false;

  keys.forEach((key) => {
    const value = toFiniteNumber(input[key]);
    output[key] = value;
    if (value !== null) {
      hasValue = true;
    }
  });

  return hasValue ? output : null;
};

const hasIndicators = (indicators) => {
  return Object.values(indicators).some((value) => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'object') {
      return Object.values(value).some((nestedValue) => nestedValue !== null && nestedValue !== undefined);
    }

    return true;
  });
};

const buildIndicatorRows = (candles) => {
  const total = candles.length;
  if (total === 0) {
    return [];
  }

  const closes = candles.map((candle) => candle.close);
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const volumes = candles.map((candle) => candle.volume);

  const sma20 = alignSeries(safeCalculate(() => SMA.calculate({ period: 20, values: closes })), total);
  const sma50 = alignSeries(safeCalculate(() => SMA.calculate({ period: 50, values: closes })), total);
  const sma200 = alignSeries(safeCalculate(() => SMA.calculate({ period: 200, values: closes })), total);
  const ema12 = alignSeries(safeCalculate(() => EMA.calculate({ period: 12, values: closes })), total);
  const ema26 = alignSeries(safeCalculate(() => EMA.calculate({ period: 26, values: closes })), total);
  const rsi14 = alignSeries(safeCalculate(() => RSI.calculate({ period: 14, values: closes })), total);

  const macd = alignSeries(
    safeCalculate(() => MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })),
    total
  );

  const bollingerBands = alignSeries(
    safeCalculate(() => BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 })),
    total
  );

  const atr14 = alignSeries(
    safeCalculate(() => ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })),
    total
  );

  const adx14 = alignSeries(
    safeCalculate(() => ADX.calculate({ high: highs, low: lows, close: closes, period: 14 })),
    total
  );

  const stochastic14 = alignSeries(
    safeCalculate(() => Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    })),
    total
  );

  const williamsR14 = alignSeries(
    safeCalculate(() => WilliamsR.calculate({ high: highs, low: lows, close: closes, period: 14 })),
    total
  );

  const roc12 = alignSeries(
    safeCalculate(() => ROC.calculate({ values: closes, period: 12 })),
    total
  );

  const obv = alignSeries(
    safeCalculate(() => OBV.calculate({ close: closes, volume: volumes })),
    total
  );

  const mfi14 = alignSeries(
    safeCalculate(() => MFI.calculate({ high: highs, low: lows, close: closes, volume: volumes, period: 14 })),
    total
  );

  const cci20 = alignSeries(
    safeCalculate(() => CCI.calculate({ high: highs, low: lows, close: closes, period: 20 })),
    total
  );

  const wma20 = alignSeries(
    safeCalculate(() => WMA.calculate({ period: 20, values: closes })),
    total
  );

  const rows = [];

  for (let index = 0; index < total; index += 1) {
    const indicators = {
      sma20: toFiniteNumber(sma20[index]),
      sma50: toFiniteNumber(sma50[index]),
      sma200: toFiniteNumber(sma200[index]),
      ema12: toFiniteNumber(ema12[index]),
      ema26: toFiniteNumber(ema26[index]),
      rsi14: toFiniteNumber(rsi14[index]),
      macd: toNumberObject(macd[index], ['MACD', 'signal', 'histogram']),
      bollingerBands: toNumberObject(bollingerBands[index], ['upper', 'middle', 'lower', 'pb']),
      atr14: toFiniteNumber(atr14[index]),
      adx14: toNumberObject(adx14[index], ['adx', 'pdi', 'mdi']),
      stochastic14: toNumberObject(stochastic14[index], ['k', 'd']),
      williamsR14: toFiniteNumber(williamsR14[index]),
      roc12: toFiniteNumber(roc12[index]),
      obv: toFiniteNumber(obv[index]),
      mfi14: toFiniteNumber(mfi14[index]),
      cci20: toFiniteNumber(cci20[index]),
      wma20: toFiniteNumber(wma20[index]),
    };

    if (!hasIndicators(indicators)) {
      continue;
    }

    rows.push({
      timestamp: candles[index].timestamp,
      indicators,
      metadata: {
        close: candles[index].close,
        volume: candles[index].volume,
      },
    });
  }

  return rows;
};

const computeAndStoreIndicatorsForSymbol = async (symbol, bucket, options = {}) => {
  const historyResult = await getHistoryCandles(symbol, {
    bucket,
    from: options.from || null,
    to: options.to || null,
    limit: options.limit || 320,
  });

  const candles = prepareCandles(historyResult.items);
  if (candles.length === 0) {
    return {
      skipped: true,
      reason: 'no_candles_available',
      symbol,
      bucket,
      candleSource: historyResult.source,
      candleCount: 0,
      computedCount: 0,
      persistedCount: 0,
    };
  }

  const computedRows = buildIndicatorRows(candles);
  if (computedRows.length === 0) {
    return {
      skipped: true,
      reason: 'insufficient_data_for_indicators',
      symbol,
      bucket,
      candleSource: historyResult.source,
      candleCount: candles.length,
      computedCount: 0,
      persistedCount: 0,
    };
  }

  const persistedCount = await upsertTechnicalIndicatorRows(symbol, bucket, computedRows, {
    source: options.source || 'technicalindicators',
    metadata: {
      candleSource: historyResult.source,
      computedAt: new Date().toISOString(),
    },
  });

  if (CACHE_ENABLED) {
    await cacheManager.clearByTagsAsync([
      'technical_indicators',
      `technical:${symbol}`,
      `technical:${symbol}:${bucket}`,
    ]);
  }

  return {
    skipped: false,
    symbol,
    bucket,
    candleSource: historyResult.source,
    candleCount: candles.length,
    computedCount: computedRows.length,
    persistedCount,
    latestTimestamp: computedRows[computedRows.length - 1]?.timestamp || null,
  };
};

const getTechnicalIndicators = async (rawSymbol, queryParams = {}) => {
  const query = normalizeTechnicalQuery(rawSymbol, queryParams);

  const cacheKey = buildTechnicalCacheKey(query);
  if (CACHE_ENABLED && !query.forceRefresh) {
    const cached = await cacheManager.getAsync(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let rows = [];
  let source = 'precomputed';
  let computeSummary = null;

  if (!query.forceRefresh) {
    rows = await getStoredTechnicalIndicators(query.symbol, query.bucket, query);
  }

  if (query.forceRefresh || rows.length === 0) {
    computeSummary = await computeAndStoreIndicatorsForSymbol(query.symbol, query.bucket, {
      from: query.from,
      to: query.to,
      limit: query.limit,
      source: 'technical_api',
    });

    source = 'computed_on_demand';
    rows = await getStoredTechnicalIndicators(query.symbol, query.bucket, query);
  }

  const latest = rows[0] || null;

  const response = {
    symbol: query.symbol,
    bucket: query.bucket,
    source,
    asOf: latest?.timestamp || null,
    latest: latest?.indicators || null,
    count: rows.length,
    items: query.includeHistory ? rows : undefined,
    recompute: computeSummary,
  };

  if (CACHE_ENABLED && !query.forceRefresh) {
    await cacheManager.setAsync(cacheKey, response, CACHE_TECHNICAL_TTL_MS, {
      tags: ['technical_indicators', `technical:${query.symbol}`, `technical:${query.symbol}:${query.bucket}`],
      priority: 'normal',
    });
  }

  return response;
};

const recomputeTechnicalIndicatorsBatch = async (queryParams = {}) => {
  const options = normalizeRecomputeQuery(queryParams);
  const symbols = options.symbols || (await listRecentSymbolsFromTicks(options.maxSymbols));

  const summary = {
    requestedSymbols: options.symbols,
    symbols,
    buckets: options.buckets,
    totalSymbols: symbols.length,
    totalBuckets: options.buckets.length,
    totalTasks: symbols.length * options.buckets.length,
    successes: 0,
    skipped: 0,
    failures: 0,
    results: [],
  };

  if (symbols.length === 0) {
    return {
      ...summary,
      skipped: summary.totalTasks,
      reason: 'no_symbols_available',
    };
  }

  for (const symbol of symbols) {
    for (const bucket of options.buckets) {
      try {
        const result = await computeAndStoreIndicatorsForSymbol(symbol, bucket, {
          limit: options.lookbackLimit,
          source: 'technical_scheduler',
        });

        summary.results.push(result);

        if (result.skipped) {
          summary.skipped += 1;
        } else {
          summary.successes += 1;
        }
      } catch (error) {
        summary.failures += 1;
        summary.results.push({
          symbol,
          bucket,
          skipped: false,
          error: error.message,
        });
      }
    }
  }

  return summary;
};

module.exports = {
  getTechnicalIndicators,
  recomputeTechnicalIndicatorsBatch,
  computeAndStoreIndicatorsForSymbol,
};
