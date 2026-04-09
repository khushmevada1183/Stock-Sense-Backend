/* eslint-disable no-console */

const {
  listRecentSymbolsFromTicks,
  buildStockMetricsSnapshotFromTicks,
  upsertStockMetricsSnapshots,
  upsertStockProfileDetailsRows,
} = require('../src/modules/stocks/stocks.repository');
const { query, closePool } = require('../src/db/client');

const DEFAULT_METRICS_BATCH_SIZE = 100;

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

const parsePositiveInt = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

const toIsoDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveSymbols = async ({ symbolsArg, limit }) => {
  const fromArg = symbolsArg
    ? normalizeSymbolList(
        String(symbolsArg)
          .split(',')
          .map((item) => item.trim())
      )
    : [];

  if (fromArg.length > 0) {
    return {
      symbols: fromArg,
      source: 'cli-symbols',
    };
  }

  const result = await query(
    `
      SELECT symbol
      FROM stocks_master
      WHERE is_active = TRUE
      ORDER BY symbol ASC
      LIMIT COALESCE($1::int, 5000);
    `,
    [limit]
  );

  const fromStocksMaster = normalizeSymbolList(result.rows.map((row) => row.symbol));
  if (fromStocksMaster.length > 0) {
    return {
      symbols: fromStocksMaster,
      source: 'stocks_master',
    };
  }

  const fallback = await listRecentSymbolsFromTicks(limit || 1000);
  return {
    symbols: normalizeSymbolList(fallback),
    source: 'stock_price_ticks',
  };
};

const buildProfileRowsFromStocksMaster = async (symbols = []) => {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return [];
  }

  const result = await query(
    `
      SELECT
        symbol,
        company_name AS "companyName",
        exchange,
        isin,
        sector,
        industry,
        description,
        website,
        headquarters,
        founded_year AS "foundedYear",
        employees,
        source,
        metadata
      FROM stocks_master
      WHERE symbol = ANY($1::text[])
        AND is_active = TRUE;
    `,
    [symbols]
  );

  return result.rows.map((row) => ({
    symbol: row.symbol,
    businessSummary: row.description || null,
    companyHistory: null,
    managementPayload: {
      companyName: row.companyName || null,
      exchange: row.exchange || null,
      isin: row.isin || null,
      sector: row.sector || null,
      industry: row.industry || null,
    },
    website: row.website || null,
    headquarters: row.headquarters || null,
    foundedYear: row.foundedYear || null,
    employees: row.employees || null,
    source: 'stocks_master_backfill',
    metadata: {
      pipeline: 'stock-profile-details-backfill',
      backfilledAt: new Date().toISOString(),
      stocksMasterSource: row.source || null,
      stocksMasterMetadata: row.metadata || {},
    },
  }));
};

const run = async () => {
  const args = process.argv.slice(2);

  const symbolsArg = readArgValue(args, '--symbols');
  const limit = parsePositiveInt(readArgValue(args, '--limit'));
  const asOfDate = toIsoDate(readArgValue(args, '--asOfDate')) || toIsoDate(new Date());
  const delayMs = parsePositiveInt(readArgValue(args, '--delayMs'), 0);
  const metricsBatchSize = parsePositiveInt(readArgValue(args, '--metricsBatchSize'), DEFAULT_METRICS_BATCH_SIZE);
  const dryRun = parseBoolean(readArgValue(args, '--dryRun'), false);
  const skipMetrics = parseBoolean(readArgValue(args, '--skipMetrics'), false);
  const skipProfiles = parseBoolean(readArgValue(args, '--skipProfiles'), false);

  const selection = await resolveSymbols({ symbolsArg, limit });

  if (selection.symbols.length === 0) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          message: 'No symbols resolved for backfill.',
        },
        null,
        2
      )
    );
    return;
  }

  const summary = {
    ok: true,
    mode: dryRun ? 'dry-run' : 'upsert',
    asOfDate,
    symbolsResolved: selection.symbols.length,
    symbolSource: selection.source,
    skipMetrics,
    skipProfiles,
    profileRowsPrepared: 0,
    profileRowsUpserted: 0,
    metricRowsPrepared: 0,
    metricRowsUpserted: 0,
    symbolsWithMetrics: 0,
    symbolsWithoutMetrics: 0,
    metricFailures: [],
  };

  if (!skipProfiles) {
    const profileRows = await buildProfileRowsFromStocksMaster(selection.symbols);
    summary.profileRowsPrepared = profileRows.length;

    if (!dryRun && profileRows.length > 0) {
      summary.profileRowsUpserted = await upsertStockProfileDetailsRows(profileRows);
    }
  }

  if (!skipMetrics) {
    const pendingMetricRows = [];

    for (let index = 0; index < selection.symbols.length; index += 1) {
      const symbol = selection.symbols[index];

      try {
        const metricRow = await buildStockMetricsSnapshotFromTicks(symbol, asOfDate);
        if (metricRow) {
          pendingMetricRows.push(metricRow);
          summary.metricRowsPrepared += 1;
          summary.symbolsWithMetrics += 1;

          if (!dryRun && pendingMetricRows.length >= metricsBatchSize) {
            summary.metricRowsUpserted += await upsertStockMetricsSnapshots(pendingMetricRows.splice(0));
          }
        } else {
          summary.symbolsWithoutMetrics += 1;
        }
      } catch (error) {
        summary.symbolsWithoutMetrics += 1;
        summary.metricFailures.push({ symbol, reason: error.message });
      }

      if (delayMs > 0 && index < selection.symbols.length - 1) {
        await sleep(delayMs);
      }
    }

    if (!dryRun && pendingMetricRows.length > 0) {
      summary.metricRowsUpserted += await upsertStockMetricsSnapshots(pendingMetricRows);
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
