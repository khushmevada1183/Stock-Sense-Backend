/* eslint-disable no-console */

const legacyApi = require('../src/services/legacy/api');
const { upsertTicks } = require('../src/modules/stocks/ticks/ticks.repository');
const { query, closePool } = require('../src/db/client');

let NseIndia = null;
try {
  ({ NseIndia } = require('stock-nse-india'));
} catch (_) {
  NseIndia = null;
}

const VALID_RANGES = new Set(['1m', '6m', '1yr', '3yr', '5yr']);
const DEFAULT_LIMIT = 25;
const DEFAULT_RANGE = '1m';
const DEFAULT_DELAY_MS = 300;

const INDEX_ALIASES = Object.freeze({
  'nifty50': 'NIFTY 50',
  'nifty 50': 'NIFTY 50',
  'nifty100': 'NIFTY 100',
  'nifty 100': 'NIFTY 100',
  'nifty bank': 'NIFTY BANK',
  'niftybank': 'NIFTY BANK',
  'bank nifty': 'NIFTY BANK',
  'banknifty': 'NIFTY BANK',
  'sensex': 'SENSEX',
  'bse sensex': 'SENSEX',
  's&p bse sensex': 'SENSEX',
});

const MONTH_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const parsePositiveInt = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const normalizeSymbol = (value) => {
  const symbol = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9.&_-]{1,20}$/.test(symbol) ? symbol : null;
};

const normalizeSymbolList = (values = []) => {
  return Array.from(new Set(values.map((value) => normalizeSymbol(value)).filter(Boolean)));
};

const normalizeIndexName = (value) => {
  const compact = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!compact) {
    return null;
  }

  return INDEX_ALIASES[compact] || String(value).trim().toUpperCase();
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNonNegativeInt = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const parseDateOnlyToCloseTimestamp = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const compactDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (compactDate) {
    const year = Number(compactDate[1]);
    const month = Number(compactDate[2]);
    const day = Number(compactDate[3]);

    return new Date(Date.UTC(year, month - 1, day, 10, 0, 0)).toISOString();
  }

  const nseDate = raw.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{4})$/);
  if (nseDate) {
    const day = Number(nseDate[1]);
    const month = MONTH_INDEX[String(nseDate[2]).toLowerCase()];
    const year = Number(nseDate[3]);

    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day, 10, 0, 0)).toISOString();
    }
  }

  return null;
};

const normalizeTimestamp = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const raw = String(value).trim();

  if (raw.includes('T')) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const dateOnly = parseDateOnlyToCloseTimestamp(raw);
  if (dateOnly) {
    return dateOnly;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
};

const extractHistoricalRows = (payload) => {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return [];
    }

    const directRows = payload.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (
      directRows.length > 0 &&
      directRows.every((row) =>
        Object.prototype.hasOwnProperty.call(row, 'mtimestamp') ||
        Object.prototype.hasOwnProperty.call(row, 'timestamp') ||
        Object.prototype.hasOwnProperty.call(row, 'chClosingPrice') ||
        Object.prototype.hasOwnProperty.call(row, 'close')
      )
    ) {
      return directRows;
    }

    const nested = payload.flatMap((item) => {
      if (item && Array.isArray(item.data)) {
        return item.data;
      }

      return [];
    });

    if (nested.length > 0) {
      return nested;
    }

    return [];
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.historical)) {
      return payload.historical;
    }
  }

  return [];
};

const toTick = (symbol, row) => {
  const timestamp = normalizeTimestamp(
    row.timestamp || row.ts || row.date || row.mtimestamp || row.chTradeDate
  );

  const close = toFiniteNumber(
    row.chClosingPrice ?? row.close ?? row.chLastTradedPrice ?? row.lastPrice
  );

  if (!timestamp || close === null) {
    return null;
  }

  const openCandidate = toFiniteNumber(row.chOpeningPrice ?? row.open);
  const highCandidate = toFiniteNumber(row.chTradeHighPrice ?? row.high);
  const lowCandidate = toFiniteNumber(row.chTradeLowPrice ?? row.low);

  const open = openCandidate ?? close;
  const high = Math.max(
    ...[highCandidate, open, close].filter((value) => value !== null)
  );
  const low = Math.min(
    ...[lowCandidate, open, close].filter((value) => value !== null)
  );

  const volume = toNonNegativeInt(row.chTotTradedQty ?? row.volume ?? row.totalVolume);

  return {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    source: 'nse_historical_daily',
    datasetType: 'prod',
    timeframe: '1d',
    sourceFamily: 'historical',
    metadata: {
      provider: 'stock-nse-india',
      symbol: row.chSymbol || symbol,
      previousClose: toFiniteNumber(row.chPreviousClsPrice),
      vwap: toFiniteNumber(row.vwap),
      trades: toNonNegativeInt(row.chTotalTrades),
      range52WeekHigh: toFiniteNumber(row.ch52WeekHighPrice),
      range52WeekLow: toFiniteNumber(row.ch52WeekLowPrice),
      rawDate: row.mtimestamp || row.date || row.timestamp || null,
    },
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const listExistingSymbolsBySource = async (source = 'nse_historical_daily') => {
  const sql = `
    SELECT DISTINCT symbol
    FROM stock_price_ticks
    WHERE source = $1;
  `;

  const result = await query(sql, [source]);
  return new Set(normalizeSymbolList(result.rows.map((row) => row.symbol)));
};

const resolveSymbolsFromIndexes = async (indexes = []) => {
  const normalizedIndexes = Array.from(
    new Set(
      indexes
        .map((value) => normalizeIndexName(value))
        .filter(Boolean)
    )
  );

  const report = {
    requested: normalizedIndexes,
    resolved: [],
    unresolved: [],
  };

  if (normalizedIndexes.length === 0) {
    return {
      symbols: [],
      report,
    };
  }

  if (!NseIndia) {
    report.unresolved = normalizedIndexes.map((name) => ({
      index: name,
      reason: 'stock-nse-india package unavailable',
    }));

    return {
      symbols: [],
      report,
    };
  }

  const nse = new NseIndia();
  const symbolSet = new Set();

  for (const indexName of normalizedIndexes) {
    try {
      const payload = await nse.getEquityStockIndices(indexName);
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      const symbols = normalizeSymbolList(rows.map((row) => row?.symbol));

      if (symbols.length === 0) {
        report.unresolved.push({
          index: indexName,
          reason: 'No symbols returned',
        });
        continue;
      }

      symbols.forEach((symbol) => symbolSet.add(symbol));

      report.resolved.push({
        index: indexName,
        symbolCount: symbols.length,
      });
    } catch (error) {
      report.unresolved.push({
        index: indexName,
        reason: error.message,
      });
    }
  }

  return {
    symbols: Array.from(symbolSet),
    report,
  };
};

const resolveSymbols = async ({
  symbolsArg,
  indexesArg,
  limit,
  includeAll,
  excludeExisting,
  existingSource,
}) => {
  const applySelectionLimit = (values = []) => {
    if (limit) {
      return values.slice(0, limit);
    }

    if (includeAll) {
      return values;
    }

    return values.slice(0, DEFAULT_LIMIT);
  };

  const withSelectionMeta = (symbols, indexReport = null, selection = {}) => ({
    symbols: applySelectionLimit(symbols),
    indexReport,
    selection,
  });

  const maybeExcludeExisting = async (symbols = [], indexReport = null) => {
    const normalized = normalizeSymbolList(symbols);

    if (!excludeExisting || normalized.length === 0) {
      return withSelectionMeta(normalized, indexReport, {
        universeCount: normalized.length,
        existingCount: 0,
        filteredOut: 0,
        excludeExisting,
        existingSource,
        includeAll,
      });
    }

    const existingSymbols = await listExistingSymbolsBySource(existingSource);
    const filtered = normalized.filter((symbol) => !existingSymbols.has(symbol));

    return withSelectionMeta(filtered, indexReport, {
      universeCount: normalized.length,
      existingCount: existingSymbols.size,
      filteredOut: normalized.length - filtered.length,
      excludeExisting,
      existingSource,
      includeAll,
    });
  };

  const fromArg = symbolsArg
    ? normalizeSymbolList(
        String(symbolsArg)
          .split(',')
          .map((item) => item.trim())
      )
    : [];

  if (fromArg.length > 0) {
    return maybeExcludeExisting(fromArg, null);
  }

  const fromIndexes = indexesArg
    ? String(indexesArg)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (fromIndexes.length > 0) {
    const { symbols, report } = await resolveSymbolsFromIndexes(fromIndexes);
    return maybeExcludeExisting(symbols, report);
  }

  const allSymbols = normalizeSymbolList(await legacyApi.getAllStockSymbols());
  return maybeExcludeExisting(allSymbols, null);
};

const run = async () => {
  const args = process.argv.slice(2);

  const limit = parsePositiveInt(readArgValue(args, '--limit'));
  const symbolsArg = readArgValue(args, '--symbols');
  const indexesArg = readArgValue(args, '--indexes') || readArgValue(args, '--indices');
  const includeAll = parseBoolean(readArgValue(args, '--all'), false);
  const excludeExisting = parseBoolean(readArgValue(args, '--excludeExisting'), false);
  const existingSource = String(
    readArgValue(args, '--existingSource') || 'nse_historical_daily'
  ).trim();
  const rangeInput = String(readArgValue(args, '--range') || DEFAULT_RANGE).trim();
  const range = VALID_RANGES.has(rangeInput) ? rangeInput : DEFAULT_RANGE;
  const delayMs = parsePositiveInt(readArgValue(args, '--delayMs'), DEFAULT_DELAY_MS);
  const dryRun = parseBoolean(readArgValue(args, '--dryRun'), false);

  const { symbols, indexReport, selection } = await resolveSymbols({
    symbolsArg,
    indexesArg,
    limit,
    includeAll,
    excludeExisting,
    existingSource,
  });

  if (symbols.length === 0) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          message: 'No symbols available. Provide --symbols=RELIANCE,TCS or seed stocks master first.',
        },
        null,
        2
      )
    );
    return;
  }

  const summary = {
    ok: true,
    source: 'NSE (stock-nse-india)',
    mode: dryRun ? 'dry-run' : 'upsert',
    range,
    delayMs,
    includeAll,
    excludeExisting,
    existingSource,
    symbolsRequested: symbols.length,
    symbolsSucceeded: 0,
    symbolsFailed: 0,
    rowsFetched: 0,
    rowsMapped: 0,
    rowsUpserted: 0,
    failures: [],
  };

  if (indexReport) {
    summary.indexes = indexReport;
  }

  if (selection) {
    summary.selection = selection;
  }

  for (let index = 0; index < symbols.length; index += 1) {
    const symbol = symbols[index];
    console.log(`[BOOTSTRAP] [${index + 1}/${symbols.length}] fetching ${symbol} range=${range}`);

    try {
      const payload = await legacyApi.getHistoricalPrices(symbol, range, 'default');
      const rows = extractHistoricalRows(payload);
      summary.rowsFetched += rows.length;

      const ticks = rows.map((row) => toTick(symbol, row)).filter(Boolean);
      summary.rowsMapped += ticks.length;

      if (ticks.length === 0) {
        summary.symbolsFailed += 1;
        summary.failures.push({ symbol, reason: 'No valid OHLC rows returned' });
      } else if (dryRun) {
        summary.symbolsSucceeded += 1;
      } else {
        const upsertedCount = await upsertTicks(symbol, ticks);
        summary.rowsUpserted += upsertedCount;
        summary.symbolsSucceeded += 1;
      }
    } catch (error) {
      summary.symbolsFailed += 1;
      summary.failures.push({ symbol, reason: error.message });
      console.error(`[BOOTSTRAP] ${symbol} failed: ${error.message}`);
    }

    if (delayMs > 0 && index < symbols.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
};

run()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
