const db = require('../../../db/client');

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

async function upsertFundamentalSnapshot({
  symbol,
  asOfDate,
  ratios,
  source = 'stock-nse-india',
  metadata = {},
}) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();

  const query = `
    INSERT INTO company_fundamentals (symbol, as_of_date, ratios, source, metadata)
    VALUES ($1, $2::date, $3::jsonb, $4, $5::jsonb)
    ON CONFLICT (symbol, as_of_date)
    DO UPDATE SET
      ratios = EXCLUDED.ratios,
      source = EXCLUDED.source,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING
      symbol,
      as_of_date AS "asOfDate",
      ratios,
      source,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const params = [
    normalizedSymbol,
    toIsoDate(asOfDate) || toIsoDate(new Date()),
    JSON.stringify(ratios || {}),
    source,
    JSON.stringify(metadata || {}),
  ];

  const { rows } = await db.query(query, params);
  const row = rows[0];

  return {
    ...row,
    asOfDate: toIsoDate(row.asOfDate),
  };
}

async function listFundamentalSnapshots(symbol, options = {}) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  const {
    from = null,
    to = null,
    limit = 5,
  } = options;

  const query = `
    SELECT
      symbol,
      as_of_date AS "asOfDate",
      ratios,
      source,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM company_fundamentals
    WHERE symbol = $1
      AND ($2::date IS NULL OR as_of_date >= $2::date)
      AND ($3::date IS NULL OR as_of_date <= $3::date)
    ORDER BY as_of_date DESC
    LIMIT $4
  `;

  const params = [normalizedSymbol, from, to, Math.max(1, Number(limit) || 5)];
  const { rows } = await db.query(query, params);

  return rows.map((row) => ({
    ...row,
    asOfDate: toIsoDate(row.asOfDate),
  }));
}

async function upsertFinancialStatementSnapshot({
  symbol,
  statementType,
  asOfDate,
  payload,
  source = 'stock-nse-india',
  metadata = {},
}) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  const normalizedType = String(statementType || '').trim().toLowerCase();

  const query = `
    INSERT INTO company_financial_statements (
      symbol,
      statement_type,
      as_of_date,
      payload,
      source,
      metadata
    )
    VALUES ($1, $2, $3::date, $4::jsonb, $5, $6::jsonb)
    ON CONFLICT (symbol, statement_type, as_of_date)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      source = EXCLUDED.source,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING
      symbol,
      statement_type AS "statementType",
      as_of_date AS "asOfDate",
      payload,
      source,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const params = [
    normalizedSymbol,
    normalizedType,
    toIsoDate(asOfDate) || toIsoDate(new Date()),
    JSON.stringify(payload || {}),
    source,
    JSON.stringify(metadata || {}),
  ];

  const { rows } = await db.query(query, params);
  const row = rows[0];

  return {
    ...row,
    asOfDate: toIsoDate(row.asOfDate),
  };
}

async function listFinancialStatementSnapshots(symbol, statementType, options = {}) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  const normalizedType = String(statementType || '').trim().toLowerCase();
  const {
    from = null,
    to = null,
    limit = 5,
  } = options;

  const query = `
    SELECT
      symbol,
      statement_type AS "statementType",
      as_of_date AS "asOfDate",
      payload,
      source,
      metadata,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM company_financial_statements
    WHERE symbol = $1
      AND statement_type = $2
      AND ($3::date IS NULL OR as_of_date >= $3::date)
      AND ($4::date IS NULL OR as_of_date <= $4::date)
    ORDER BY as_of_date DESC
    LIMIT $5
  `;

  const params = [
    normalizedSymbol,
    normalizedType,
    from,
    to,
    Math.max(1, Number(limit) || 5),
  ];

  const { rows } = await db.query(query, params);

  return rows.map((row) => ({
    ...row,
    asOfDate: toIsoDate(row.asOfDate),
  }));
}

async function listRecentSymbolsFromTicks(limit = 40) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 40, 500));

  const query = `
    SELECT symbol
    FROM (
      SELECT
        symbol,
        MAX(ts) AS latest_ts
      FROM stock_price_ticks
      GROUP BY symbol
    ) latest
    ORDER BY latest_ts DESC
    LIMIT $1
  `;

  const { rows } = await db.query(query, [safeLimit]);

  return rows
    .map((row) => String(row.symbol || '').trim().toUpperCase())
    .filter(Boolean);
}

module.exports = {
  upsertFundamentalSnapshot,
  listFundamentalSnapshots,
  upsertFinancialStatementSnapshot,
  listFinancialStatementSnapshots,
  listRecentSymbolsFromTicks,
};
