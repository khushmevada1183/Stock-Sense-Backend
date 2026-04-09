const { query } = require('../../db/client');
const { getDatasetFilterClause, isProdOnlyDatasetScope } = require('./datasetPolicy');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const chunkArray = (items = [], chunkSize = 250) => {
  const output = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    output.push(items.slice(index, index + chunkSize));
  }

  return output;
};

const normalizeSymbol = (value) => String(value || '').trim().toUpperCase();

const normalizeExchange = (value) => {
  const normalized = String(value || 'NSE').trim().toUpperCase();
  return ['NSE', 'BSE', 'BOTH'].includes(normalized) ? normalized : 'NSE';
};

const normalizeLabel = (value, fallback = 'UNKNOWN') => {
  const normalized = String(value || '').trim();
  return normalized ? normalized : fallback;
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

const toNullableNonNegativeInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

async function upsertSectorTaxonomyRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const sanitizedRows = rows
    .map((row) => ({
      symbol: normalizeSymbol(row.symbol),
      companyName: row.companyName || null,
      sector: normalizeLabel(row.sector, 'UNKNOWN'),
      industry: normalizeLabel(row.industry, 'UNKNOWN'),
      marketCap: row.marketCap ?? null,
      source: row.source || 'stock-nse-india',
      metadata: row.metadata || {},
    }))
    .filter((row) => Boolean(row.symbol));

  if (sanitizedRows.length === 0) {
    return 0;
  }

  const values = [];

  const placeholders = sanitizedRows.map((row, index) => {
    const offset = index * 7;
    values.push(
      row.symbol,
      row.companyName,
      row.sector,
      row.industry,
      row.marketCap,
      row.source,
      JSON.stringify(row.metadata)
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}::jsonb)`;
  });

  const result = await query(
    `
      INSERT INTO stock_sector_taxonomy (
        symbol,
        company_name,
        sector,
        industry,
        market_cap,
        source,
        metadata
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (symbol)
      DO UPDATE SET
        company_name = COALESCE(EXCLUDED.company_name, stock_sector_taxonomy.company_name),
        sector = EXCLUDED.sector,
        industry = EXCLUDED.industry,
        market_cap = EXCLUDED.market_cap,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `,
    values
  );

  return result.rowCount;
}

async function getSectorTaxonomyBySymbol(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  const result = await query(
    `
      SELECT
        symbol,
        company_name AS "companyName",
        sector,
        industry,
        market_cap AS "marketCap",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM stock_sector_taxonomy
      WHERE symbol = $1
      LIMIT 1;
    `,
    [normalizedSymbol]
  );

  return result.rows[0] || null;
}

async function listSectorTaxonomyBySymbols(symbols = []) {
  const normalizedSymbols = Array.from(
    new Set((Array.isArray(symbols) ? symbols : []).map((symbol) => normalizeSymbol(symbol)).filter(Boolean))
  );

  if (normalizedSymbols.length === 0) {
    return [];
  }

  const result = await query(
    `
      SELECT
        symbol,
        company_name AS "companyName",
        sector,
        industry,
        market_cap AS "marketCap",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM stock_sector_taxonomy
      WHERE symbol = ANY($1::text[]);
    `,
    [normalizedSymbols]
  );

  return result.rows;
}

async function listSectorPeersBySector({ sector, excludeSymbol = null, limit = 12 }) {
  const normalizedSector = normalizeLabel(sector, 'UNKNOWN');
  const normalizedExcludeSymbol = normalizeSymbol(excludeSymbol);
  const normalizedLimit = Math.min(toPositiveInt(limit, 12), 100);

  const result = await query(
    `
      SELECT
        symbol,
        company_name AS "companyName",
        sector,
        industry,
        market_cap AS "marketCap",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM stock_sector_taxonomy
      WHERE sector = $1
        AND ($2::text IS NULL OR symbol <> $2)
      ORDER BY market_cap DESC NULLS LAST, symbol ASC
      LIMIT $3;
    `,
    [normalizedSector, normalizedExcludeSymbol || null, normalizedLimit]
  );

  return result.rows;
}

async function upsertSectorHeatmapRows(capturedAt, rows = [], source = 'aggregated') {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const captureTime = capturedAt || new Date().toISOString();
  const values = [];

  const placeholders = rows.map((row, index) => {
    const offset = index * 10;

    values.push(
      normalizeLabel(row.sector, 'UNKNOWN'),
      captureTime,
      row.totalStocks || 0,
      row.advancing || 0,
      row.declining || 0,
      row.unchanged || 0,
      row.avgChangePercent ?? null,
      row.totalMarketCap ?? null,
      row.source || source,
      JSON.stringify(row.metadata || {})
    );

    return `($${offset + 1}, $${offset + 2}::timestamptz, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::jsonb)`;
  });

  const result = await query(
    `
      INSERT INTO sector_heatmap_snapshots (
        sector,
        captured_at,
        total_stocks,
        advancing,
        declining,
        unchanged,
        avg_change_percent,
        total_market_cap,
        source,
        metadata
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (sector, captured_at)
      DO UPDATE SET
        total_stocks = EXCLUDED.total_stocks,
        advancing = EXCLUDED.advancing,
        declining = EXCLUDED.declining,
        unchanged = EXCLUDED.unchanged,
        avg_change_percent = EXCLUDED.avg_change_percent,
        total_market_cap = EXCLUDED.total_market_cap,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `,
    values
  );

  return result.rowCount;
}

async function listLatestSectorHeatmap(limit = 25) {
  const normalizedLimit = Math.min(toPositiveInt(limit, 25), 200);

  const result = await query(
    `
      SELECT
        sector,
        captured_at AS "capturedAt",
        total_stocks AS "totalStocks",
        advancing,
        declining,
        unchanged,
        avg_change_percent AS "avgChangePercent",
        total_market_cap AS "totalMarketCap",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM (
        SELECT DISTINCT ON (sector)
          sector,
          captured_at,
          total_stocks,
          advancing,
          declining,
          unchanged,
          avg_change_percent,
          total_market_cap,
          source,
          metadata,
          created_at,
          updated_at
        FROM sector_heatmap_snapshots
        ORDER BY sector, captured_at DESC
      ) latest
      ORDER BY avg_change_percent DESC NULLS LAST, total_market_cap DESC NULLS LAST, sector ASC
      LIMIT $1;
    `,
    [normalizedLimit]
  );

  return result.rows;
}

async function upsert52WeekLevelsRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const sanitizedRows = rows
    .map((row) => ({
      symbol: normalizeSymbol(row.symbol),
      week52High: row.week52High ?? null,
      week52Low: row.week52Low ?? null,
      highDate: toIsoDate(row.highDate),
      lowDate: toIsoDate(row.lowDate),
      currentPrice: row.currentPrice ?? null,
      distanceFromHighPercent: row.distanceFromHighPercent ?? null,
      distanceFromLowPercent: row.distanceFromLowPercent ?? null,
      source: row.source || 'stock-nse-india',
      metadata: row.metadata || {},
    }))
    .filter((row) => Boolean(row.symbol));

  if (sanitizedRows.length === 0) {
    return 0;
  }

  const values = [];
  const placeholders = sanitizedRows.map((row, index) => {
    const offset = index * 10;
    values.push(
      row.symbol,
      row.week52High,
      row.week52Low,
      row.highDate,
      row.lowDate,
      row.currentPrice,
      row.distanceFromHighPercent,
      row.distanceFromLowPercent,
      row.source,
      JSON.stringify(row.metadata)
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::date, $${offset + 5}::date, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::jsonb)`;
  });

  const result = await query(
    `
      INSERT INTO stock_52_week_levels (
        symbol,
        week_52_high,
        week_52_low,
        high_date,
        low_date,
        current_price,
        distance_from_high_percent,
        distance_from_low_percent,
        source,
        metadata
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (symbol)
      DO UPDATE SET
        week_52_high = EXCLUDED.week_52_high,
        week_52_low = EXCLUDED.week_52_low,
        high_date = EXCLUDED.high_date,
        low_date = EXCLUDED.low_date,
        current_price = EXCLUDED.current_price,
        distance_from_high_percent = EXCLUDED.distance_from_high_percent,
        distance_from_low_percent = EXCLUDED.distance_from_low_percent,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `,
    values
  );

  return result.rowCount;
}

async function list52WeekLevels({ type = 'high', sector = null, limit = 25 }) {
  const normalizedType = String(type || 'high').trim().toLowerCase() === 'low' ? 'low' : 'high';
  const normalizedSector = sector ? normalizeLabel(sector) : null;
  const normalizedLimit = Math.min(toPositiveInt(limit, 25), 200);

  const orderBy = normalizedType === 'low'
    ? 'l.distance_from_low_percent ASC NULLS LAST, l.week_52_low ASC NULLS LAST, l.current_price ASC NULLS LAST'
    : 'l.distance_from_high_percent ASC NULLS LAST, l.week_52_high DESC NULLS LAST, l.current_price DESC NULLS LAST';

  const result = await query(
    `
      SELECT
        l.symbol,
        t.company_name AS "companyName",
        t.sector,
        t.industry,
        t.market_cap AS "marketCap",
        l.week_52_high AS "week52High",
        l.week_52_low AS "week52Low",
        l.high_date AS "highDate",
        l.low_date AS "lowDate",
        l.current_price AS "currentPrice",
        l.distance_from_high_percent AS "distanceFromHighPercent",
        l.distance_from_low_percent AS "distanceFromLowPercent",
        l.source,
        l.metadata,
        l.created_at AS "createdAt",
        l.updated_at AS "updatedAt"
      FROM stock_52_week_levels l
      LEFT JOIN stock_sector_taxonomy t ON t.symbol = l.symbol
      WHERE ($1::text IS NULL OR LOWER(t.sector) = LOWER($1))
      ORDER BY ${orderBy}
      LIMIT $2;
    `,
    [normalizedSector, normalizedLimit]
  );

  return result.rows;
}

async function upsertStockMetricsSnapshots(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const sanitizedRows = rows
    .map((row) => ({
      symbol: normalizeSymbol(row.symbol),
      asOfDate: toIsoDate(row.asOfDate) || toIsoDate(new Date()),
      week52High: row.week52High ?? null,
      week52Low: row.week52Low ?? null,
      week52HighDate: toIsoDate(row.week52HighDate),
      week52LowDate: toIsoDate(row.week52LowDate),
      high3m: row.high3m ?? null,
      low3m: row.low3m ?? null,
      high12m: row.high12m ?? null,
      low12m: row.low12m ?? null,
      return3mPercent: row.return3mPercent ?? null,
      return12mPercent: row.return12mPercent ?? null,
      avgVolume20d: toNullableNonNegativeInt(row.avgVolume20d),
      source: row.source || 'computed',
      metadata: row.metadata || {},
    }))
    .filter((row) => Boolean(row.symbol));

  if (sanitizedRows.length === 0) {
    return 0;
  }

  let totalUpserted = 0;
  const batches = chunkArray(sanitizedRows, 200);

  for (const batch of batches) {
    const values = [];

    const placeholders = batch.map((row, index) => {
      const offset = index * 15;

      values.push(
        row.symbol,
        row.asOfDate,
        row.week52High,
        row.week52Low,
        row.week52HighDate,
        row.week52LowDate,
        row.high3m,
        row.low3m,
        row.high12m,
        row.low12m,
        row.return3mPercent,
        row.return12mPercent,
        row.avgVolume20d,
        row.source,
        JSON.stringify(row.metadata)
      );

      return `($${offset + 1}, $${offset + 2}::date, $${offset + 3}, $${offset + 4}, $${offset + 5}::date, $${offset + 6}::date, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}::jsonb)`;
    });

    const result = await query(
      `
        INSERT INTO stock_metrics_snapshots (
          symbol,
          as_of_date,
          week_52_high,
          week_52_low,
          week_52_high_date,
          week_52_low_date,
          high_3m,
          low_3m,
          high_12m,
          low_12m,
          return_3m_percent,
          return_12m_percent,
          avg_volume_20d,
          source,
          metadata
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (symbol, as_of_date)
        DO UPDATE SET
          week_52_high = EXCLUDED.week_52_high,
          week_52_low = EXCLUDED.week_52_low,
          week_52_high_date = EXCLUDED.week_52_high_date,
          week_52_low_date = EXCLUDED.week_52_low_date,
          high_3m = EXCLUDED.high_3m,
          low_3m = EXCLUDED.low_3m,
          high_12m = EXCLUDED.high_12m,
          low_12m = EXCLUDED.low_12m,
          return_3m_percent = EXCLUDED.return_3m_percent,
          return_12m_percent = EXCLUDED.return_12m_percent,
          avg_volume_20d = EXCLUDED.avg_volume_20d,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW();
      `,
      values
    );

    totalUpserted += result.rowCount;
  }

  return totalUpserted;
}

async function getLatestStockMetricsSnapshotBySymbol(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  const result = await query(
    `
      SELECT
        symbol,
        as_of_date AS "asOfDate",
        week_52_high AS "week52High",
        week_52_low AS "week52Low",
        week_52_high_date AS "week52HighDate",
        week_52_low_date AS "week52LowDate",
        high_3m AS "high3m",
        low_3m AS "low3m",
        high_12m AS "high12m",
        low_12m AS "low12m",
        return_3m_percent AS "return3mPercent",
        return_12m_percent AS "return12mPercent",
        avg_volume_20d AS "avgVolume20d",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM stock_metrics_snapshots
      WHERE symbol = $1
      ORDER BY as_of_date DESC
      LIMIT 1;
    `,
    [normalizedSymbol]
  );

  return result.rows[0] || null;
}

async function buildStockMetricsSnapshotFromTicks(symbol, asOfDate = null) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  const normalizedAsOfDate = toIsoDate(asOfDate) || toIsoDate(new Date());

  const result = await query(
    `
      WITH params AS (
        SELECT
          $1::text AS symbol,
          $2::date AS as_of_date
      ),
      latest_tick AS (
        SELECT t.close::DOUBLE PRECISION AS latest_close
        FROM stock_price_ticks t
        JOIN params p ON p.symbol = t.symbol
        WHERE ${getDatasetFilterClause('t.dataset_type')}
          AND t.ts < (p.as_of_date + INTERVAL '1 day')
        ORDER BY t.ts DESC
        LIMIT 1
      ),
      close_3m AS (
        SELECT t.close::DOUBLE PRECISION AS close_3m
        FROM stock_price_ticks t
        JOIN params p ON p.symbol = t.symbol
        WHERE ${getDatasetFilterClause('t.dataset_type')}
          AND t.ts < (p.as_of_date - INTERVAL '90 days' + INTERVAL '1 day')
        ORDER BY t.ts DESC
        LIMIT 1
      ),
      close_12m AS (
        SELECT t.close::DOUBLE PRECISION AS close_12m
        FROM stock_price_ticks t
        JOIN params p ON p.symbol = t.symbol
        WHERE ${getDatasetFilterClause('t.dataset_type')}
          AND t.ts < (p.as_of_date - INTERVAL '365 days' + INTERVAL '1 day')
        ORDER BY t.ts DESC
        LIMIT 1
      ),
      window_3m AS (
        SELECT
          MAX(COALESCE(t.high, t.close))::DOUBLE PRECISION AS high_3m,
          MIN(COALESCE(t.low, t.close))::DOUBLE PRECISION AS low_3m
        FROM stock_price_ticks t
        JOIN params p ON p.symbol = t.symbol
        WHERE ${getDatasetFilterClause('t.dataset_type')}
          AND t.ts >= (p.as_of_date - INTERVAL '90 days')
          AND t.ts < (p.as_of_date + INTERVAL '1 day')
      ),
      window_12m AS (
        SELECT
          MAX(COALESCE(t.high, t.close))::DOUBLE PRECISION AS week_52_high,
          MIN(COALESCE(t.low, t.close))::DOUBLE PRECISION AS week_52_low
        FROM stock_price_ticks t
        JOIN params p ON p.symbol = t.symbol
        WHERE ${getDatasetFilterClause('t.dataset_type')}
          AND t.ts >= (p.as_of_date - INTERVAL '365 days')
          AND t.ts < (p.as_of_date + INTERVAL '1 day')
      ),
      high_12m_date AS (
        SELECT t.ts::date AS week_52_high_date
        FROM stock_price_ticks t
        JOIN params p ON p.symbol = t.symbol
        WHERE ${getDatasetFilterClause('t.dataset_type')}
          AND t.ts >= (p.as_of_date - INTERVAL '365 days')
          AND t.ts < (p.as_of_date + INTERVAL '1 day')
        ORDER BY COALESCE(t.high, t.close) DESC NULLS LAST, t.ts DESC
        LIMIT 1
      ),
      low_12m_date AS (
        SELECT t.ts::date AS week_52_low_date
        FROM stock_price_ticks t
        JOIN params p ON p.symbol = t.symbol
        WHERE ${getDatasetFilterClause('t.dataset_type')}
          AND t.ts >= (p.as_of_date - INTERVAL '365 days')
          AND t.ts < (p.as_of_date + INTERVAL '1 day')
        ORDER BY COALESCE(t.low, t.close) ASC NULLS LAST, t.ts DESC
        LIMIT 1
      ),
      avg_volume_20d AS (
        SELECT ROUND(AVG(sample.volume))::BIGINT AS avg_volume_20d
        FROM (
          SELECT COALESCE(t.volume, 0)::DOUBLE PRECISION AS volume
          FROM stock_price_ticks t
          JOIN params p ON p.symbol = t.symbol
          WHERE ${getDatasetFilterClause('t.dataset_type')}
            AND t.ts < (p.as_of_date + INTERVAL '1 day')
          ORDER BY t.ts DESC
          LIMIT 20
        ) sample
      )
      SELECT
        p.symbol,
        p.as_of_date AS "asOfDate",
        latest.latest_close AS "latestClose",
        w12.week_52_high AS "week52High",
        w12.week_52_low AS "week52Low",
        high_date.week_52_high_date AS "week52HighDate",
        low_date.week_52_low_date AS "week52LowDate",
        w3.high_3m AS "high3m",
        w3.low_3m AS "low3m",
        w12.week_52_high AS "high12m",
        w12.week_52_low AS "low12m",
        CASE
          WHEN c3.close_3m IS NULL OR c3.close_3m = 0 OR latest.latest_close IS NULL THEN NULL
          ELSE ((latest.latest_close - c3.close_3m) / c3.close_3m) * 100
        END AS "return3mPercent",
        CASE
          WHEN c12.close_12m IS NULL OR c12.close_12m = 0 OR latest.latest_close IS NULL THEN NULL
          ELSE ((latest.latest_close - c12.close_12m) / c12.close_12m) * 100
        END AS "return12mPercent",
        volume.avg_volume_20d AS "avgVolume20d"
      FROM params p
      LEFT JOIN latest_tick latest ON TRUE
      LEFT JOIN close_3m c3 ON TRUE
      LEFT JOIN close_12m c12 ON TRUE
      LEFT JOIN window_3m w3 ON TRUE
      LEFT JOIN window_12m w12 ON TRUE
      LEFT JOIN high_12m_date high_date ON TRUE
      LEFT JOIN low_12m_date low_date ON TRUE
      LEFT JOIN avg_volume_20d volume ON TRUE;
    `,
    [normalizedSymbol, normalizedAsOfDate]
  );

  const row = result.rows[0] || null;
  if (!row || row.latestClose === null) {
    return null;
  }

  return {
    symbol: row.symbol,
    asOfDate: row.asOfDate,
    week52High: row.week52High,
    week52Low: row.week52Low,
    week52HighDate: row.week52HighDate,
    week52LowDate: row.week52LowDate,
    high3m: row.high3m,
    low3m: row.low3m,
    high12m: row.high12m,
    low12m: row.low12m,
    return3mPercent: row.return3mPercent,
    return12mPercent: row.return12mPercent,
    avgVolume20d: row.avgVolume20d,
    source: isProdOnlyDatasetScope() ? 'computed_from_prod_ticks' : 'computed_from_all_ticks',
    metadata: {
      pipeline: 'stock-metrics-backfill',
      computedAt: new Date().toISOString(),
    },
  };
}

async function upsertStockProfileDetailsRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const sanitizedRows = rows
    .map((row) => ({
      symbol: normalizeSymbol(row.symbol),
      businessSummary: row.businessSummary ? String(row.businessSummary).trim() : null,
      companyHistory: row.companyHistory ? String(row.companyHistory).trim() : null,
      managementPayload: row.managementPayload && typeof row.managementPayload === 'object'
        ? row.managementPayload
        : {},
      website: row.website ? String(row.website).trim() : null,
      headquarters: row.headquarters ? String(row.headquarters).trim() : null,
      foundedYear: toNullableNonNegativeInt(row.foundedYear),
      employees: toNullableNonNegativeInt(row.employees),
      source: row.source || 'manual',
      metadata: row.metadata || {},
    }))
    .filter((row) => Boolean(row.symbol));

  if (sanitizedRows.length === 0) {
    return 0;
  }

  let totalUpserted = 0;
  const batches = chunkArray(sanitizedRows, 200);

  for (const batch of batches) {
    const values = [];

    const placeholders = batch.map((row, index) => {
      const offset = index * 10;

      values.push(
        row.symbol,
        row.businessSummary,
        row.companyHistory,
        JSON.stringify(row.managementPayload),
        row.website,
        row.headquarters,
        row.foundedYear,
        row.employees,
        row.source,
        JSON.stringify(row.metadata)
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::jsonb)`;
    });

    const result = await query(
      `
        INSERT INTO stock_profile_details (
          symbol,
          business_summary,
          company_history,
          management_payload,
          website,
          headquarters,
          founded_year,
          employees,
          source,
          metadata
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (symbol)
        DO UPDATE SET
          business_summary = COALESCE(EXCLUDED.business_summary, stock_profile_details.business_summary),
          company_history = COALESCE(EXCLUDED.company_history, stock_profile_details.company_history),
          management_payload = EXCLUDED.management_payload,
          website = COALESCE(EXCLUDED.website, stock_profile_details.website),
          headquarters = COALESCE(EXCLUDED.headquarters, stock_profile_details.headquarters),
          founded_year = COALESCE(EXCLUDED.founded_year, stock_profile_details.founded_year),
          employees = COALESCE(EXCLUDED.employees, stock_profile_details.employees),
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW();
      `,
      values
    );

    totalUpserted += result.rowCount;
  }

  return totalUpserted;
}

async function getStockProfileDetailsBySymbol(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return null;
  }

  const result = await query(
    `
      SELECT
        sm.symbol,
        sm.company_name AS "companyName",
        sm.exchange,
        sm.isin,
        sm.nse_symbol AS "nseSymbol",
        sm.bse_code AS "bseCode",
        sm.series,
        sm.sector,
        sm.industry,
        sm.logo_url AS "logoUrl",
        sm.website AS "stocksMasterWebsite",
        sm.description AS "stocksMasterDescription",
        sm.headquarters AS "stocksMasterHeadquarters",
        sm.founded_year AS "stocksMasterFoundedYear",
        sm.employees AS "stocksMasterEmployees",
        sm.source AS "stocksMasterSource",
        sm.metadata AS "stocksMasterMetadata",
        sp.business_summary AS "businessSummary",
        sp.company_history AS "companyHistory",
        sp.management_payload AS "managementPayload",
        sp.website AS "profileWebsite",
        sp.headquarters AS "profileHeadquarters",
        sp.founded_year AS "profileFoundedYear",
        sp.employees AS "profileEmployees",
        sp.source AS "profileSource",
        sp.metadata AS "profileMetadata",
        sp.created_at AS "profileCreatedAt",
        sp.updated_at AS "profileUpdatedAt"
      FROM stocks_master sm
      LEFT JOIN stock_profile_details sp
        ON sp.symbol = sm.symbol
      WHERE sm.symbol = $1
        AND sm.is_active = TRUE
      LIMIT 1;
    `,
    [normalizedSymbol]
  );

  return result.rows[0] || null;
}

async function listRecentSymbolsFromTicks(limit = 40) {
  const normalizedLimit = Math.min(toPositiveInt(limit, 40), 500);

  const result = await query(
    `
      SELECT symbol
      FROM stock_price_ticks
      WHERE ${getDatasetFilterClause('dataset_type')}
      GROUP BY symbol
      ORDER BY MAX(ts) DESC
      LIMIT $1;
    `,
    [normalizedLimit]
  );

  return result.rows.map((row) => normalizeSymbol(row.symbol)).filter(Boolean);
}

async function upsertStocksMasterRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const sanitizedRows = rows
    .map((row) => {
      const symbol = normalizeSymbol(row.symbol);
      if (!symbol) {
        return null;
      }

      return {
        symbol,
        isin: row.isin ? String(row.isin).trim().toUpperCase() : null,
        companyName: row.companyName ? String(row.companyName).trim() : symbol,
        exchange: normalizeExchange(row.exchange),
        nseSymbol: row.nseSymbol ? String(row.nseSymbol).trim().toUpperCase() : symbol,
        bseCode: row.bseCode ? String(row.bseCode).trim().toUpperCase() : null,
        series: row.series ? String(row.series).trim().toUpperCase() : 'EQ',
        sector: row.sector ? String(row.sector).trim() : null,
        industry: row.industry ? String(row.industry).trim() : null,
        indexMembership: Array.isArray(row.indexMembership) ? row.indexMembership : [],
        listingDate: toIsoDate(row.listingDate),
        lotSize: Number.isFinite(Number(row.lotSize)) && Number(row.lotSize) > 0
          ? Number.parseInt(String(row.lotSize), 10)
          : 1,
        isActive: row.isActive !== false,
        source: row.source ? String(row.source).trim() : 'stock-nse-india',
        metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
      };
    })
    .filter(Boolean);

  if (sanitizedRows.length === 0) {
    return 0;
  }

  let totalUpserted = 0;
  const batches = chunkArray(sanitizedRows, 200);

  for (const batch of batches) {
    const values = [];

    const placeholders = batch.map((row, index) => {
      const offset = index * 15;

      values.push(
        row.symbol,
        row.isin,
        row.companyName,
        row.exchange,
        row.nseSymbol,
        row.bseCode,
        row.series,
        row.sector,
        row.industry,
        JSON.stringify(row.indexMembership),
        row.listingDate,
        row.lotSize,
        row.isActive,
        row.source,
        JSON.stringify(row.metadata)
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::jsonb, $${offset + 11}::date, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}::jsonb)`;
    });

    const result = await query(
      `
        INSERT INTO stocks_master (
          symbol,
          isin,
          company_name,
          exchange,
          nse_symbol,
          bse_code,
          series,
          sector,
          industry,
          index_membership,
          listing_date,
          lot_size,
          is_active,
          source,
          metadata
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (symbol)
        DO UPDATE SET
          isin = COALESCE(EXCLUDED.isin, stocks_master.isin),
          company_name = EXCLUDED.company_name,
          exchange = EXCLUDED.exchange,
          nse_symbol = COALESCE(EXCLUDED.nse_symbol, stocks_master.nse_symbol),
          bse_code = COALESCE(EXCLUDED.bse_code, stocks_master.bse_code),
          series = COALESCE(EXCLUDED.series, stocks_master.series),
          sector = COALESCE(EXCLUDED.sector, stocks_master.sector),
          industry = COALESCE(EXCLUDED.industry, stocks_master.industry),
          index_membership = EXCLUDED.index_membership,
          listing_date = COALESCE(EXCLUDED.listing_date, stocks_master.listing_date),
          lot_size = COALESCE(EXCLUDED.lot_size, stocks_master.lot_size),
          is_active = EXCLUDED.is_active,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW();
      `,
      values
    );

    totalUpserted += result.rowCount;
  }

  return totalUpserted;
}

async function countStocksMasterRows(searchText = '') {
  const normalizedSearch = String(searchText || '').trim();
  const pattern = `%${normalizedSearch}%`;

  const result = await query(
    `
      SELECT COUNT(*)::INTEGER AS count
      FROM stocks_master
      WHERE is_active = TRUE
        AND (
          $1::text = ''
          OR symbol ILIKE $2
          OR company_name ILIKE $2
          OR COALESCE(isin, '') ILIKE $2
        );
    `,
    [normalizedSearch, pattern]
  );

  return Number(result.rows[0]?.count || 0);
}

async function searchStocksMasterRows({ searchText = '', limit = 20, offset = 0 } = {}) {
  const normalizedSearch = String(searchText || '').trim();
  const normalizedLimit = Math.min(toPositiveInt(limit, 20), 100);
  const normalizedOffset = Math.max(0, Number.parseInt(offset, 10) || 0);
  const pattern = `%${normalizedSearch}%`;
  const prefixPattern = `${normalizedSearch}%`;

  const result = await query(
    `
      SELECT
        symbol,
        company_name AS "companyName",
        exchange,
        isin,
        nse_symbol AS "nseSymbol",
        bse_code AS "bseCode",
        series,
        sector,
        industry
      FROM stocks_master
      WHERE is_active = TRUE
        AND (
          $1::text = ''
          OR symbol ILIKE $2
          OR company_name ILIKE $2
          OR COALESCE(isin, '') ILIKE $2
        )
      ORDER BY
        CASE
          WHEN $1::text <> '' AND symbol ILIKE $3 THEN 0
          WHEN $1::text <> '' AND company_name ILIKE $3 THEN 1
          ELSE 2
        END,
        symbol ASC
      LIMIT $4
      OFFSET $5;
    `,
    [normalizedSearch, pattern, prefixPattern, normalizedLimit, normalizedOffset]
  );

  return result.rows;
}

module.exports = {
  upsertStocksMasterRows,
  countStocksMasterRows,
  searchStocksMasterRows,
  upsertSectorTaxonomyRows,
  getSectorTaxonomyBySymbol,
  listSectorTaxonomyBySymbols,
  listSectorPeersBySector,
  upsertSectorHeatmapRows,
  listLatestSectorHeatmap,
  upsert52WeekLevelsRows,
  list52WeekLevels,
  upsertStockMetricsSnapshots,
  getLatestStockMetricsSnapshotBySymbol,
  buildStockMetricsSnapshotFromTicks,
  upsertStockProfileDetailsRows,
  getStockProfileDetailsBySymbol,
  listRecentSymbolsFromTicks,
};
