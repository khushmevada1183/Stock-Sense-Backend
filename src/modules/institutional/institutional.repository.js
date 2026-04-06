const { query } = require('../../db/client');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildWhereClause = ({ fromDate, toDate, segment }) => {
  const clauses = [];
  const values = [];

  if (fromDate) {
    values.push(fromDate);
    clauses.push(`flow_date >= $${values.length}::date`);
  }

  if (toDate) {
    values.push(toDate);
    clauses.push(`flow_date <= $${values.length}::date`);
  }

  if (segment) {
    values.push(segment);
    clauses.push(`segment = $${values.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return {
    values,
    whereClause,
  };
};

const buildBlockDealsWhereClause = ({
  fromDate = null,
  toDate = null,
  tradeDate = null,
  exchange = null,
  symbol = null,
  dealType = null,
} = {}) => {
  const clauses = [];
  const values = [];

  if (tradeDate) {
    values.push(tradeDate);
    clauses.push(`trade_date = $${values.length}::date`);
  } else {
    if (fromDate) {
      values.push(fromDate);
      clauses.push(`trade_date >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      clauses.push(`trade_date <= $${values.length}::date`);
    }
  }

  if (exchange) {
    values.push(exchange);
    clauses.push(`exchange = $${values.length}`);
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`symbol = $${values.length}`);
  }

  if (dealType) {
    values.push(dealType);
    clauses.push(`deal_type = $${values.length}`);
  }

  return {
    clauses,
    values,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
  };
};

const buildMutualFundWhereClause = ({
  fromDate = null,
  toDate = null,
  monthDate = null,
  symbol = null,
  amcName = null,
  schemeName = null,
} = {}) => {
  const clauses = [];
  const values = [];

  if (monthDate) {
    values.push(monthDate);
    clauses.push(`holding_month = date_trunc('month', $${values.length}::date)::date`);
  } else {
    if (fromDate) {
      values.push(fromDate);
      clauses.push(`holding_month >= date_trunc('month', $${values.length}::date)::date`);
    }

    if (toDate) {
      values.push(toDate);
      clauses.push(`holding_month <= date_trunc('month', $${values.length}::date)::date`);
    }
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`symbol = $${values.length}`);
  }

  if (amcName) {
    values.push(`%${amcName}%`);
    clauses.push(`amc_name ILIKE $${values.length}`);
  }

  if (schemeName) {
    values.push(`%${schemeName}%`);
    clauses.push(`scheme_name ILIKE $${values.length}`);
  }

  return {
    clauses,
    values,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
  };
};

const buildInsiderWhereClause = ({
  fromDate = null,
  toDate = null,
  tradeDate = null,
  symbol = null,
  transactionType = null,
  insiderName = null,
  insiderRole = null,
} = {}) => {
  const clauses = [];
  const values = [];

  if (tradeDate) {
    values.push(tradeDate);
    clauses.push(`trade_date = $${values.length}::date`);
  } else {
    if (fromDate) {
      values.push(fromDate);
      clauses.push(`trade_date >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      clauses.push(`trade_date <= $${values.length}::date`);
    }
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`symbol = $${values.length}`);
  }

  if (transactionType) {
    values.push(transactionType);
    clauses.push(`transaction_type = $${values.length}`);
  }

  if (insiderName) {
    values.push(`%${insiderName}%`);
    clauses.push(`insider_name ILIKE $${values.length}`);
  }

  if (insiderRole) {
    values.push(`%${insiderRole}%`);
    clauses.push(`insider_role ILIKE $${values.length}`);
  }

  return {
    clauses,
    values,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
  };
};

const buildShareholdingWhereClause = ({
  fromDate = null,
  toDate = null,
  periodDate = null,
  symbol = null,
} = {}) => {
  const clauses = [];
  const values = [];

  if (periodDate) {
    values.push(periodDate);
    clauses.push(
      `period_end = (date_trunc('quarter', $${values.length}::date)::date + INTERVAL '3 months - 1 day')::date`
    );
  } else {
    if (fromDate) {
      values.push(fromDate);
      clauses.push(
        `period_end >= (date_trunc('quarter', $${values.length}::date)::date + INTERVAL '3 months - 1 day')::date`
      );
    }

    if (toDate) {
      values.push(toDate);
      clauses.push(
        `period_end <= (date_trunc('quarter', $${values.length}::date)::date + INTERVAL '3 months - 1 day')::date`
      );
    }
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`symbol = $${values.length}`);
  }

  return {
    clauses,
    values,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
  };
};

const buildCorporateActionsWhereClause = ({
  fromDate = null,
  toDate = null,
  actionDate = null,
  symbol = null,
  actionType = null,
} = {}) => {
  const clauses = [];
  const values = [];

  if (actionDate) {
    values.push(actionDate);
    clauses.push(`action_date = $${values.length}::date`);
  } else {
    if (fromDate) {
      values.push(fromDate);
      clauses.push(`action_date >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      clauses.push(`action_date <= $${values.length}::date`);
    }
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`symbol = $${values.length}`);
  }

  if (actionType) {
    values.push(actionType);
    clauses.push(`action_type = $${values.length}`);
  }

  return {
    clauses,
    values,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
  };
};

const buildEarningsWhereClause = ({
  fromDate = null,
  toDate = null,
  eventDate = null,
  symbol = null,
  fiscalQuarter = null,
} = {}) => {
  const clauses = [];
  const values = [];

  if (eventDate) {
    values.push(eventDate);
    clauses.push(`event_date = $${values.length}::date`);
  } else {
    if (fromDate) {
      values.push(fromDate);
      clauses.push(`event_date >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      clauses.push(`event_date <= $${values.length}::date`);
    }
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`symbol = $${values.length}`);
  }

  if (fiscalQuarter) {
    values.push(fiscalQuarter);
    clauses.push(`fiscal_quarter = $${values.length}`);
  }

  return {
    clauses,
    values,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
  };
};

const upsertFiiDiiActivityRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO fii_dii_activity (
          flow_date,
          category,
          segment,
          source,
          gross_buy,
          gross_sell,
          net_value,
          metadata
        )
        VALUES (
          $1::date,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb
        )
        ON CONFLICT (flow_date, category, segment, source)
        DO UPDATE SET
          gross_buy = EXCLUDED.gross_buy,
          gross_sell = EXCLUDED.gross_sell,
          net_value = EXCLUDED.net_value,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.flowDate,
        row.category,
        row.segment,
        row.source,
        row.grossBuy,
        row.grossSell,
        row.netValue,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const listFiiDiiLatestSummary = async ({ limit = 30, segment = null }) => {
  const values = [];
  const segmentClause = segment ? 'AND activity.segment = $1' : '';

  if (segment) {
    values.push(segment);
  }

  values.push(toPositiveInt(limit, 30));

  const result = await query(
    `
      WITH ranked AS (
        SELECT DISTINCT ON (flow_date, category, segment)
          flow_date,
          category,
          segment,
          gross_buy,
          gross_sell,
          net_value,
          source,
          metadata,
          created_at
        FROM fii_dii_activity
        ORDER BY flow_date DESC, category ASC, segment ASC, created_at DESC
      )
      SELECT
        to_char(activity.flow_date, 'YYYY-MM-DD') AS "flowDate",
        SUM(CASE WHEN activity.category = 'FII' THEN activity.gross_buy ELSE 0 END) AS "fiiBuy",
        SUM(CASE WHEN activity.category = 'FII' THEN activity.gross_sell ELSE 0 END) AS "fiiSell",
        SUM(CASE WHEN activity.category = 'FII' THEN activity.net_value ELSE 0 END) AS "fiiNet",
        SUM(CASE WHEN activity.category = 'DII' THEN activity.gross_buy ELSE 0 END) AS "diiBuy",
        SUM(CASE WHEN activity.category = 'DII' THEN activity.gross_sell ELSE 0 END) AS "diiSell",
        SUM(CASE WHEN activity.category = 'DII' THEN activity.net_value ELSE 0 END) AS "diiNet",
        SUM(activity.net_value) AS "totalNet"
      FROM ranked activity
      WHERE 1 = 1
      ${segmentClause}
      GROUP BY activity.flow_date
      ORDER BY activity.flow_date DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listFiiDiiHistoryRows = async ({ fromDate = null, toDate = null, segment = null, limit = 120 }) => {
  const { values, whereClause } = buildWhereClause({ fromDate, toDate, segment });
  values.push(toPositiveInt(limit, 120));

  const result = await query(
    `
      SELECT
        id::text AS id,
        to_char(flow_date, 'YYYY-MM-DD') AS "flowDate",
        category,
        segment,
        source,
        gross_buy AS "grossBuy",
        gross_sell AS "grossSell",
        net_value AS "netValue",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM fii_dii_activity
      ${whereClause}
      ORDER BY flow_date DESC, category ASC, segment ASC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listFiiDiiCumulative = async ({ range = 'monthly', segment = null, limit = 12 }) => {
  const values = [];
  const segmentClause = segment ? `AND segment = $1` : '';
  if (segment) {
    values.push(segment);
  }

  values.push(toPositiveInt(limit, 12));

  const bucketExpr = range === 'yearly'
    ? `date_trunc('year', flow_date)::date`
    : `date_trunc('month', flow_date)::date`;

  const result = await query(
    `
      WITH latest_rows AS (
        SELECT DISTINCT ON (flow_date, category, segment)
          flow_date,
          category,
          segment,
          net_value,
          created_at
        FROM fii_dii_activity
        ORDER BY flow_date DESC, category ASC, segment ASC, created_at DESC
      )
      SELECT
        to_char(${bucketExpr}, 'YYYY-MM-DD') AS period,
        SUM(CASE WHEN category = 'FII' THEN net_value ELSE 0 END) AS "fiiNet",
        SUM(CASE WHEN category = 'DII' THEN net_value ELSE 0 END) AS "diiNet",
        SUM(net_value) AS "totalNet"
      FROM latest_rows
      WHERE 1 = 1
      ${segmentClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const upsertBlockDealRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO block_deals (
          deal_key,
          trade_date,
          exchange,
          symbol,
          company_name,
          deal_type,
          quantity,
          price_per_share,
          total_value_cr,
          buyer_name,
          seller_name,
          source,
          metadata
        )
        VALUES (
          $1,
          $2::date,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb
        )
        ON CONFLICT (deal_key)
        DO UPDATE SET
          exchange = EXCLUDED.exchange,
          symbol = EXCLUDED.symbol,
          company_name = EXCLUDED.company_name,
          deal_type = EXCLUDED.deal_type,
          quantity = EXCLUDED.quantity,
          price_per_share = EXCLUDED.price_per_share,
          total_value_cr = EXCLUDED.total_value_cr,
          buyer_name = EXCLUDED.buyer_name,
          seller_name = EXCLUDED.seller_name,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.dealKey,
        row.tradeDate,
        row.exchange,
        row.symbol,
        row.companyName,
        row.dealType,
        row.quantity,
        row.pricePerShare,
        row.totalValueCr,
        row.buyerName,
        row.sellerName,
        row.source,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const listBlockDealsLatest = async ({ tradeDate = null, exchange = null, symbol = null, dealType = null, limit = 100 }) => {
  const resolvedLimit = toPositiveInt(limit, 100);

  if (tradeDate) {
    const filtered = buildBlockDealsWhereClause({ tradeDate, exchange, symbol, dealType });
    const values = [...filtered.values, resolvedLimit];

    const result = await query(
      `
        SELECT
          id::text AS id,
          deal_key AS "dealKey",
          to_char(trade_date, 'YYYY-MM-DD') AS "tradeDate",
          exchange,
          symbol,
          company_name AS "companyName",
          deal_type AS "dealType",
          quantity,
          price_per_share AS "pricePerShare",
          total_value_cr AS "totalValueCr",
          buyer_name AS "buyerName",
          seller_name AS "sellerName",
          source,
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM block_deals
        ${filtered.whereClause}
        ORDER BY total_value_cr DESC, created_at DESC
        LIMIT $${values.length};
      `,
      values
    );

    return result.rows;
  }

  const filter = buildBlockDealsWhereClause({ exchange, symbol, dealType });
  const filterClause = filter.clauses.length > 0 ? `AND ${filter.clauses.join(' AND ')}` : '';
  const values = [...filter.values, resolvedLimit];

  const result = await query(
    `
      SELECT
        id::text AS id,
        deal_key AS "dealKey",
        to_char(trade_date, 'YYYY-MM-DD') AS "tradeDate",
        exchange,
        symbol,
        company_name AS "companyName",
        deal_type AS "dealType",
        quantity,
        price_per_share AS "pricePerShare",
        total_value_cr AS "totalValueCr",
        buyer_name AS "buyerName",
        seller_name AS "sellerName",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM block_deals
      WHERE trade_date = (
        SELECT MAX(trade_date)
        FROM block_deals
        WHERE 1 = 1
        ${filterClause}
      )
      ${filterClause}
      ORDER BY total_value_cr DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listBlockDealsHistory = async ({
  fromDate = null,
  toDate = null,
  exchange = null,
  symbol = null,
  dealType = null,
  limit = 250,
} = {}) => {
  const filtered = buildBlockDealsWhereClause({ fromDate, toDate, exchange, symbol, dealType });
  const values = [...filtered.values, toPositiveInt(limit, 250)];

  const result = await query(
    `
      SELECT
        id::text AS id,
        deal_key AS "dealKey",
        to_char(trade_date, 'YYYY-MM-DD') AS "tradeDate",
        exchange,
        symbol,
        company_name AS "companyName",
        deal_type AS "dealType",
        quantity,
        price_per_share AS "pricePerShare",
        total_value_cr AS "totalValueCr",
        buyer_name AS "buyerName",
        seller_name AS "sellerName",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM block_deals
      ${filtered.whereClause}
      ORDER BY trade_date DESC, total_value_cr DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const upsertMutualFundHoldingRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO mutual_fund_holdings (
          holding_key,
          holding_month,
          amc_name,
          scheme_name,
          symbol,
          company_name,
          quantity,
          market_value_cr,
          holding_percent,
          source,
          metadata
        )
        VALUES (
          $1,
          date_trunc('month', $2::date)::date,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb
        )
        ON CONFLICT (holding_key)
        DO UPDATE SET
          amc_name = EXCLUDED.amc_name,
          scheme_name = EXCLUDED.scheme_name,
          symbol = EXCLUDED.symbol,
          company_name = EXCLUDED.company_name,
          quantity = EXCLUDED.quantity,
          market_value_cr = EXCLUDED.market_value_cr,
          holding_percent = EXCLUDED.holding_percent,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.holdingKey,
        row.holdingMonth,
        row.amcName,
        row.schemeName,
        row.symbol,
        row.companyName,
        row.quantity,
        row.marketValueCr,
        row.holdingPercent,
        row.source,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const listMutualFundsLatest = async ({
  monthDate = null,
  symbol = null,
  amcName = null,
  schemeName = null,
  limit = 100,
} = {}) => {
  const resolvedLimit = toPositiveInt(limit, 100);

  if (monthDate) {
    const filtered = buildMutualFundWhereClause({ monthDate, symbol, amcName, schemeName });
    const values = [...filtered.values, resolvedLimit];

    const result = await query(
      `
        SELECT
          id::text AS id,
          holding_key AS "holdingKey",
          to_char(holding_month, 'YYYY-MM-DD') AS "holdingMonth",
          amc_name AS "amcName",
          scheme_name AS "schemeName",
          symbol,
          company_name AS "companyName",
          quantity,
          market_value_cr AS "marketValueCr",
          holding_percent AS "holdingPercent",
          source,
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM mutual_fund_holdings
        ${filtered.whereClause}
        ORDER BY market_value_cr DESC, holding_percent DESC, created_at DESC
        LIMIT $${values.length};
      `,
      values
    );

    return result.rows;
  }

  const filter = buildMutualFundWhereClause({ symbol, amcName, schemeName });
  const filterClause = filter.clauses.length > 0 ? `AND ${filter.clauses.join(' AND ')}` : '';
  const values = [...filter.values, resolvedLimit];

  const result = await query(
    `
      SELECT
        id::text AS id,
        holding_key AS "holdingKey",
        to_char(holding_month, 'YYYY-MM-DD') AS "holdingMonth",
        amc_name AS "amcName",
        scheme_name AS "schemeName",
        symbol,
        company_name AS "companyName",
        quantity,
        market_value_cr AS "marketValueCr",
        holding_percent AS "holdingPercent",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM mutual_fund_holdings
      WHERE holding_month = (
        SELECT MAX(holding_month)
        FROM mutual_fund_holdings
        WHERE 1 = 1
        ${filterClause}
      )
      ${filterClause}
      ORDER BY market_value_cr DESC, holding_percent DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listMutualFundsHistory = async ({
  fromDate = null,
  toDate = null,
  symbol = null,
  amcName = null,
  schemeName = null,
  limit = 300,
} = {}) => {
  const filtered = buildMutualFundWhereClause({ fromDate, toDate, symbol, amcName, schemeName });
  const values = [...filtered.values, toPositiveInt(limit, 300)];

  const result = await query(
    `
      SELECT
        id::text AS id,
        holding_key AS "holdingKey",
        to_char(holding_month, 'YYYY-MM-DD') AS "holdingMonth",
        amc_name AS "amcName",
        scheme_name AS "schemeName",
        symbol,
        company_name AS "companyName",
        quantity,
        market_value_cr AS "marketValueCr",
        holding_percent AS "holdingPercent",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM mutual_fund_holdings
      ${filtered.whereClause}
      ORDER BY holding_month DESC, market_value_cr DESC, holding_percent DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listMutualFundsTopHolders = async ({ monthDate = null, symbol = null, limit = 20 } = {}) => {
  const resolvedLimit = toPositiveInt(limit, 20);
  const filter = buildMutualFundWhereClause({ monthDate, symbol });

  if (monthDate) {
    const values = [...filter.values, resolvedLimit];
    const result = await query(
      `
        SELECT
          to_char(holding_month, 'YYYY-MM-DD') AS "holdingMonth",
          symbol,
          company_name AS "companyName",
          amc_name AS "amcName",
          scheme_name AS "schemeName",
          quantity,
          market_value_cr AS "marketValueCr",
          holding_percent AS "holdingPercent"
        FROM mutual_fund_holdings
        ${filter.whereClause}
        ORDER BY market_value_cr DESC, holding_percent DESC, created_at DESC
        LIMIT $${values.length};
      `,
      values
    );

    return result.rows;
  }

  const filterClause = filter.clauses.length > 0 ? `AND ${filter.clauses.join(' AND ')}` : '';
  const values = [...filter.values, resolvedLimit];

  const result = await query(
    `
      SELECT
        to_char(holding_month, 'YYYY-MM-DD') AS "holdingMonth",
        symbol,
        company_name AS "companyName",
        amc_name AS "amcName",
        scheme_name AS "schemeName",
        quantity,
        market_value_cr AS "marketValueCr",
        holding_percent AS "holdingPercent"
      FROM mutual_fund_holdings
      WHERE holding_month = (
        SELECT MAX(holding_month)
        FROM mutual_fund_holdings
        WHERE 1 = 1
        ${filterClause}
      )
      ${filterClause}
      ORDER BY market_value_cr DESC, holding_percent DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const upsertInsiderTradeRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO insider_trades (
          trade_key,
          trade_date,
          exchange,
          symbol,
          company_name,
          insider_name,
          insider_role,
          transaction_type,
          quantity,
          average_price,
          trade_value_cr,
          mode,
          source,
          metadata
        )
        VALUES (
          $1,
          $2::date,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::jsonb
        )
        ON CONFLICT (trade_key)
        DO UPDATE SET
          exchange = EXCLUDED.exchange,
          symbol = EXCLUDED.symbol,
          company_name = EXCLUDED.company_name,
          insider_name = EXCLUDED.insider_name,
          insider_role = EXCLUDED.insider_role,
          transaction_type = EXCLUDED.transaction_type,
          quantity = EXCLUDED.quantity,
          average_price = EXCLUDED.average_price,
          trade_value_cr = EXCLUDED.trade_value_cr,
          mode = EXCLUDED.mode,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.tradeKey,
        row.tradeDate,
        row.exchange,
        row.symbol,
        row.companyName,
        row.insiderName,
        row.insiderRole,
        row.transactionType,
        row.quantity,
        row.averagePrice,
        row.tradeValueCr,
        row.mode,
        row.source,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const listInsiderTradesLatest = async ({
  tradeDate = null,
  symbol = null,
  transactionType = null,
  insiderName = null,
  insiderRole = null,
  limit = 100,
} = {}) => {
  const resolvedLimit = toPositiveInt(limit, 100);

  if (tradeDate) {
    const filtered = buildInsiderWhereClause({
      tradeDate,
      symbol,
      transactionType,
      insiderName,
      insiderRole,
    });
    const values = [...filtered.values, resolvedLimit];

    const result = await query(
      `
        SELECT
          id::text AS id,
          trade_key AS "tradeKey",
          to_char(trade_date, 'YYYY-MM-DD') AS "tradeDate",
          exchange,
          symbol,
          company_name AS "companyName",
          insider_name AS "insiderName",
          insider_role AS "insiderRole",
          transaction_type AS "transactionType",
          quantity,
          average_price AS "averagePrice",
          trade_value_cr AS "tradeValueCr",
          mode,
          source,
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM insider_trades
        ${filtered.whereClause}
        ORDER BY trade_value_cr DESC, quantity DESC, created_at DESC
        LIMIT $${values.length};
      `,
      values
    );

    return result.rows;
  }

  const filter = buildInsiderWhereClause({ symbol, transactionType, insiderName, insiderRole });
  const filterClause = filter.clauses.length > 0 ? `AND ${filter.clauses.join(' AND ')}` : '';
  const values = [...filter.values, resolvedLimit];

  const result = await query(
    `
      SELECT
        id::text AS id,
        trade_key AS "tradeKey",
        to_char(trade_date, 'YYYY-MM-DD') AS "tradeDate",
        exchange,
        symbol,
        company_name AS "companyName",
        insider_name AS "insiderName",
        insider_role AS "insiderRole",
        transaction_type AS "transactionType",
        quantity,
        average_price AS "averagePrice",
        trade_value_cr AS "tradeValueCr",
        mode,
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM insider_trades
      WHERE trade_date = (
        SELECT MAX(trade_date)
        FROM insider_trades
        WHERE 1 = 1
        ${filterClause}
      )
      ${filterClause}
      ORDER BY trade_value_cr DESC, quantity DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listInsiderTradesHistory = async ({
  fromDate = null,
  toDate = null,
  symbol = null,
  transactionType = null,
  insiderName = null,
  insiderRole = null,
  limit = 300,
} = {}) => {
  const filtered = buildInsiderWhereClause({
    fromDate,
    toDate,
    symbol,
    transactionType,
    insiderName,
    insiderRole,
  });
  const values = [...filtered.values, toPositiveInt(limit, 300)];

  const result = await query(
    `
      SELECT
        id::text AS id,
        trade_key AS "tradeKey",
        to_char(trade_date, 'YYYY-MM-DD') AS "tradeDate",
        exchange,
        symbol,
        company_name AS "companyName",
        insider_name AS "insiderName",
        insider_role AS "insiderRole",
        transaction_type AS "transactionType",
        quantity,
        average_price AS "averagePrice",
        trade_value_cr AS "tradeValueCr",
        mode,
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM insider_trades
      ${filtered.whereClause}
      ORDER BY trade_date DESC, trade_value_cr DESC, quantity DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listInsiderTradeSummary = async ({
  range = 'monthly',
  symbol = null,
  transactionType = null,
  limit = 12,
} = {}) => {
  const filtered = buildInsiderWhereClause({ symbol, transactionType });
  const values = [...filtered.values, toPositiveInt(limit, 12)];

  const bucketExpr = range === 'yearly'
    ? `date_trunc('year', trade_date)::date`
    : `date_trunc('month', trade_date)::date`;

  const result = await query(
    `
      SELECT
        to_char(${bucketExpr}, 'YYYY-MM-DD') AS period,
        SUM(CASE WHEN transaction_type = 'buy' THEN trade_value_cr ELSE 0 END) AS "buyValueCr",
        SUM(CASE WHEN transaction_type = 'sell' THEN trade_value_cr ELSE 0 END) AS "sellValueCr",
        SUM(CASE WHEN transaction_type = 'buy' THEN trade_value_cr ELSE -trade_value_cr END) AS "netValueCr",
        SUM(CASE WHEN transaction_type = 'buy' THEN 1 ELSE 0 END)::integer AS "buyTrades",
        SUM(CASE WHEN transaction_type = 'sell' THEN 1 ELSE 0 END)::integer AS "sellTrades",
        COUNT(*)::integer AS "totalTrades"
      FROM insider_trades
      ${filtered.whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const upsertShareholdingPatternRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO shareholding_patterns (
          pattern_key,
          period_end,
          symbol,
          company_name,
          promoter_holding,
          institutional_holding,
          retail_holding,
          other_holding,
          mutual_fund_holding,
          source,
          metadata
        )
        VALUES (
          $1,
          $2::date,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb
        )
        ON CONFLICT (pattern_key)
        DO UPDATE SET
          symbol = EXCLUDED.symbol,
          company_name = EXCLUDED.company_name,
          promoter_holding = EXCLUDED.promoter_holding,
          institutional_holding = EXCLUDED.institutional_holding,
          retail_holding = EXCLUDED.retail_holding,
          other_holding = EXCLUDED.other_holding,
          mutual_fund_holding = EXCLUDED.mutual_fund_holding,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.patternKey,
        row.periodEnd,
        row.symbol,
        row.companyName,
        row.promoterHolding,
        row.institutionalHolding,
        row.retailHolding,
        row.otherHolding,
        row.mutualFundHolding,
        row.source,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const listShareholdingLatest = async ({ periodDate = null, symbol = null, limit = 100 } = {}) => {
  const resolvedLimit = toPositiveInt(limit, 100);

  if (periodDate) {
    const filtered = buildShareholdingWhereClause({ periodDate, symbol });
    const values = [...filtered.values, resolvedLimit];

    const result = await query(
      `
        SELECT
          id::text AS id,
          pattern_key AS "patternKey",
          to_char(period_end, 'YYYY-MM-DD') AS "periodEnd",
          symbol,
          company_name AS "companyName",
          promoter_holding AS "promoterHolding",
          institutional_holding AS "institutionalHolding",
          retail_holding AS "retailHolding",
          other_holding AS "otherHolding",
          mutual_fund_holding AS "mutualFundHolding",
          source,
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM shareholding_patterns
        ${filtered.whereClause}
        ORDER BY institutional_holding DESC, promoter_holding DESC, created_at DESC
        LIMIT $${values.length};
      `,
      values
    );

    return result.rows;
  }

  const filtered = buildShareholdingWhereClause({ symbol });
  const filterClause = filtered.clauses.length > 0 ? `AND ${filtered.clauses.join(' AND ')}` : '';
  const values = [...filtered.values, resolvedLimit];

  const result = await query(
    `
      SELECT
        id::text AS id,
        pattern_key AS "patternKey",
        to_char(period_end, 'YYYY-MM-DD') AS "periodEnd",
        symbol,
        company_name AS "companyName",
        promoter_holding AS "promoterHolding",
        institutional_holding AS "institutionalHolding",
        retail_holding AS "retailHolding",
        other_holding AS "otherHolding",
        mutual_fund_holding AS "mutualFundHolding",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM shareholding_patterns
      WHERE period_end = (
        SELECT MAX(period_end)
        FROM shareholding_patterns
        WHERE 1 = 1
        ${filterClause}
      )
      ${filterClause}
      ORDER BY institutional_holding DESC, promoter_holding DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listShareholdingHistory = async ({
  fromDate = null,
  toDate = null,
  symbol = null,
  limit = 300,
} = {}) => {
  const filtered = buildShareholdingWhereClause({
    fromDate,
    toDate,
    symbol,
  });
  const values = [...filtered.values, toPositiveInt(limit, 300)];

  const result = await query(
    `
      SELECT
        id::text AS id,
        pattern_key AS "patternKey",
        to_char(period_end, 'YYYY-MM-DD') AS "periodEnd",
        symbol,
        company_name AS "companyName",
        promoter_holding AS "promoterHolding",
        institutional_holding AS "institutionalHolding",
        retail_holding AS "retailHolding",
        other_holding AS "otherHolding",
        mutual_fund_holding AS "mutualFundHolding",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM shareholding_patterns
      ${filtered.whereClause}
      ORDER BY period_end DESC, institutional_holding DESC, promoter_holding DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listShareholdingTrends = async ({ range = 'quarterly', symbol = null, limit = 12 } = {}) => {
  const filtered = buildShareholdingWhereClause({ symbol });
  const values = [...filtered.values, toPositiveInt(limit, 12)];

  const bucketExpr = range === 'yearly'
    ? `date_trunc('year', period_end)::date`
    : `(date_trunc('quarter', period_end)::date + INTERVAL '3 months - 1 day')::date`;

  const result = await query(
    `
      SELECT
        to_char(${bucketExpr}, 'YYYY-MM-DD') AS period,
        AVG(promoter_holding)::numeric(8, 4) AS "avgPromoterHolding",
        AVG(institutional_holding)::numeric(8, 4) AS "avgInstitutionalHolding",
        AVG(retail_holding)::numeric(8, 4) AS "avgRetailHolding",
        AVG(other_holding)::numeric(8, 4) AS "avgOtherHolding",
        AVG(mutual_fund_holding)::numeric(8, 4) AS "avgMutualFundHolding",
        COUNT(DISTINCT symbol)::integer AS "companyCount"
      FROM shareholding_patterns
      ${filtered.whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const upsertCorporateActionRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO corporate_actions (
          action_key,
          action_date,
          announcement_date,
          record_date,
          symbol,
          company_name,
          action_type,
          title,
          details,
          ratio_numerator,
          ratio_denominator,
          cash_value,
          source,
          metadata
        )
        VALUES (
          $1,
          $2::date,
          $3::date,
          $4::date,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::jsonb
        )
        ON CONFLICT (action_key)
        DO UPDATE SET
          action_date = EXCLUDED.action_date,
          announcement_date = EXCLUDED.announcement_date,
          record_date = EXCLUDED.record_date,
          symbol = EXCLUDED.symbol,
          company_name = EXCLUDED.company_name,
          action_type = EXCLUDED.action_type,
          title = EXCLUDED.title,
          details = EXCLUDED.details,
          ratio_numerator = EXCLUDED.ratio_numerator,
          ratio_denominator = EXCLUDED.ratio_denominator,
          cash_value = EXCLUDED.cash_value,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.actionKey,
        row.actionDate,
        row.announcementDate,
        row.recordDate,
        row.symbol,
        row.companyName,
        row.actionType,
        row.title,
        row.details,
        row.ratioNumerator,
        row.ratioDenominator,
        row.cashValue,
        row.source,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const listCorporateActionsLatest = async ({
  actionDate = null,
  symbol = null,
  actionType = null,
  limit = 100,
} = {}) => {
  const resolvedLimit = toPositiveInt(limit, 100);

  if (actionDate) {
    const filtered = buildCorporateActionsWhereClause({ actionDate, symbol, actionType });
    const values = [...filtered.values, resolvedLimit];

    const result = await query(
      `
        SELECT
          id::text AS id,
          action_key AS "actionKey",
          to_char(action_date, 'YYYY-MM-DD') AS "actionDate",
          to_char(announcement_date, 'YYYY-MM-DD') AS "announcementDate",
          to_char(record_date, 'YYYY-MM-DD') AS "recordDate",
          symbol,
          company_name AS "companyName",
          action_type AS "actionType",
          title,
          details,
          ratio_numerator AS "ratioNumerator",
          ratio_denominator AS "ratioDenominator",
          cash_value AS "cashValue",
          source,
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM corporate_actions
        ${filtered.whereClause}
        ORDER BY cash_value DESC NULLS LAST, created_at DESC
        LIMIT $${values.length};
      `,
      values
    );

    return result.rows;
  }

  const filtered = buildCorporateActionsWhereClause({ symbol, actionType });
  const filterClause = filtered.clauses.length > 0 ? `AND ${filtered.clauses.join(' AND ')}` : '';
  const values = [...filtered.values, resolvedLimit];

  const result = await query(
    `
      SELECT
        id::text AS id,
        action_key AS "actionKey",
        to_char(action_date, 'YYYY-MM-DD') AS "actionDate",
        to_char(announcement_date, 'YYYY-MM-DD') AS "announcementDate",
        to_char(record_date, 'YYYY-MM-DD') AS "recordDate",
        symbol,
        company_name AS "companyName",
        action_type AS "actionType",
        title,
        details,
        ratio_numerator AS "ratioNumerator",
        ratio_denominator AS "ratioDenominator",
        cash_value AS "cashValue",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM corporate_actions
      WHERE action_date = (
        SELECT MAX(action_date)
        FROM corporate_actions
        WHERE 1 = 1
        ${filterClause}
      )
      ${filterClause}
      ORDER BY cash_value DESC NULLS LAST, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listCorporateActionsHistory = async ({
  fromDate = null,
  toDate = null,
  symbol = null,
  actionType = null,
  limit = 300,
} = {}) => {
  const filtered = buildCorporateActionsWhereClause({
    fromDate,
    toDate,
    symbol,
    actionType,
  });
  const values = [...filtered.values, toPositiveInt(limit, 300)];

  const result = await query(
    `
      SELECT
        id::text AS id,
        action_key AS "actionKey",
        to_char(action_date, 'YYYY-MM-DD') AS "actionDate",
        to_char(announcement_date, 'YYYY-MM-DD') AS "announcementDate",
        to_char(record_date, 'YYYY-MM-DD') AS "recordDate",
        symbol,
        company_name AS "companyName",
        action_type AS "actionType",
        title,
        details,
        ratio_numerator AS "ratioNumerator",
        ratio_denominator AS "ratioDenominator",
        cash_value AS "cashValue",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM corporate_actions
      ${filtered.whereClause}
      ORDER BY action_date DESC, cash_value DESC NULLS LAST, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listCorporateActionSummary = async ({
  range = 'monthly',
  symbol = null,
  actionType = null,
  limit = 12,
} = {}) => {
  const filtered = buildCorporateActionsWhereClause({ symbol, actionType });
  const values = [...filtered.values, toPositiveInt(limit, 12)];

  const bucketExpr = range === 'yearly'
    ? `date_trunc('year', action_date)::date`
    : `date_trunc('month', action_date)::date`;

  const result = await query(
    `
      SELECT
        to_char(${bucketExpr}, 'YYYY-MM-DD') AS period,
        COUNT(*)::integer AS "totalActions",
        SUM(CASE WHEN action_type = 'dividend' THEN 1 ELSE 0 END)::integer AS "dividendActions",
        SUM(CASE WHEN action_type = 'split' THEN 1 ELSE 0 END)::integer AS "splitActions",
        SUM(CASE WHEN action_type = 'bonus' THEN 1 ELSE 0 END)::integer AS "bonusActions",
        SUM(CASE WHEN action_type = 'rights' THEN 1 ELSE 0 END)::integer AS "rightsActions",
        SUM(CASE WHEN action_type = 'buyback' THEN 1 ELSE 0 END)::integer AS "buybackActions",
        SUM(COALESCE(cash_value, 0)) AS "totalCashValue"
      FROM corporate_actions
      ${filtered.whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const upsertEarningsCalendarRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO earnings_calendar (
          earnings_key,
          event_date,
          period_end,
          symbol,
          company_name,
          fiscal_year,
          fiscal_quarter,
          eps_actual,
          eps_estimate,
          revenue_actual_cr,
          revenue_estimate_cr,
          surprise_percent,
          call_time,
          source,
          metadata
        )
        VALUES (
          $1,
          $2::date,
          $3::date,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15::jsonb
        )
        ON CONFLICT (earnings_key)
        DO UPDATE SET
          event_date = EXCLUDED.event_date,
          period_end = EXCLUDED.period_end,
          symbol = EXCLUDED.symbol,
          company_name = EXCLUDED.company_name,
          fiscal_year = EXCLUDED.fiscal_year,
          fiscal_quarter = EXCLUDED.fiscal_quarter,
          eps_actual = EXCLUDED.eps_actual,
          eps_estimate = EXCLUDED.eps_estimate,
          revenue_actual_cr = EXCLUDED.revenue_actual_cr,
          revenue_estimate_cr = EXCLUDED.revenue_estimate_cr,
          surprise_percent = EXCLUDED.surprise_percent,
          call_time = EXCLUDED.call_time,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.earningsKey,
        row.eventDate,
        row.periodEnd,
        row.symbol,
        row.companyName,
        row.fiscalYear,
        row.fiscalQuarter,
        row.epsActual,
        row.epsEstimate,
        row.revenueActualCr,
        row.revenueEstimateCr,
        row.surprisePercent,
        row.callTime,
        row.source,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const listEarningsCalendarLatest = async ({
  eventDate = null,
  symbol = null,
  fiscalQuarter = null,
  limit = 100,
} = {}) => {
  const resolvedLimit = toPositiveInt(limit, 100);

  if (eventDate) {
    const filtered = buildEarningsWhereClause({ eventDate, symbol, fiscalQuarter });
    const values = [...filtered.values, resolvedLimit];

    const result = await query(
      `
        SELECT
          id::text AS id,
          earnings_key AS "earningsKey",
          to_char(event_date, 'YYYY-MM-DD') AS "eventDate",
          to_char(period_end, 'YYYY-MM-DD') AS "periodEnd",
          symbol,
          company_name AS "companyName",
          fiscal_year AS "fiscalYear",
          fiscal_quarter AS "fiscalQuarter",
          eps_actual AS "epsActual",
          eps_estimate AS "epsEstimate",
          revenue_actual_cr AS "revenueActualCr",
          revenue_estimate_cr AS "revenueEstimateCr",
          surprise_percent AS "surprisePercent",
          call_time AS "callTime",
          source,
          metadata,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM earnings_calendar
        ${filtered.whereClause}
        ORDER BY surprise_percent DESC, event_date DESC, created_at DESC
        LIMIT $${values.length};
      `,
      values
    );

    return result.rows;
  }

  const filtered = buildEarningsWhereClause({ symbol, fiscalQuarter });
  const filterClause = filtered.clauses.length > 0 ? `AND ${filtered.clauses.join(' AND ')}` : '';
  const values = [...filtered.values, resolvedLimit];

  const result = await query(
    `
      SELECT
        id::text AS id,
        earnings_key AS "earningsKey",
        to_char(event_date, 'YYYY-MM-DD') AS "eventDate",
        to_char(period_end, 'YYYY-MM-DD') AS "periodEnd",
        symbol,
        company_name AS "companyName",
        fiscal_year AS "fiscalYear",
        fiscal_quarter AS "fiscalQuarter",
        eps_actual AS "epsActual",
        eps_estimate AS "epsEstimate",
        revenue_actual_cr AS "revenueActualCr",
        revenue_estimate_cr AS "revenueEstimateCr",
        surprise_percent AS "surprisePercent",
        call_time AS "callTime",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM earnings_calendar
      WHERE event_date = (
        SELECT MAX(event_date)
        FROM earnings_calendar
        WHERE 1 = 1
        ${filterClause}
      )
      ${filterClause}
      ORDER BY surprise_percent DESC, event_date DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listEarningsCalendarHistory = async ({
  fromDate = null,
  toDate = null,
  symbol = null,
  fiscalQuarter = null,
  limit = 300,
} = {}) => {
  const filtered = buildEarningsWhereClause({
    fromDate,
    toDate,
    symbol,
    fiscalQuarter,
  });
  const values = [...filtered.values, toPositiveInt(limit, 300)];

  const result = await query(
    `
      SELECT
        id::text AS id,
        earnings_key AS "earningsKey",
        to_char(event_date, 'YYYY-MM-DD') AS "eventDate",
        to_char(period_end, 'YYYY-MM-DD') AS "periodEnd",
        symbol,
        company_name AS "companyName",
        fiscal_year AS "fiscalYear",
        fiscal_quarter AS "fiscalQuarter",
        eps_actual AS "epsActual",
        eps_estimate AS "epsEstimate",
        revenue_actual_cr AS "revenueActualCr",
        revenue_estimate_cr AS "revenueEstimateCr",
        surprise_percent AS "surprisePercent",
        call_time AS "callTime",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM earnings_calendar
      ${filtered.whereClause}
      ORDER BY event_date DESC, surprise_percent DESC, created_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listEarningsCalendarSummary = async ({
  range = 'monthly',
  symbol = null,
  fiscalQuarter = null,
  limit = 12,
} = {}) => {
  const filtered = buildEarningsWhereClause({ symbol, fiscalQuarter });
  const values = [...filtered.values, toPositiveInt(limit, 12)];

  const bucketExpr = range === 'yearly'
    ? `date_trunc('year', event_date)::date`
    : `date_trunc('month', event_date)::date`;

  const result = await query(
    `
      SELECT
        to_char(${bucketExpr}, 'YYYY-MM-DD') AS period,
        COUNT(*)::integer AS "totalEvents",
        AVG(surprise_percent)::numeric(8, 4) AS "avgSurprisePercent",
        SUM(CASE WHEN surprise_percent >= 0 THEN 1 ELSE 0 END)::integer AS "beatCount",
        SUM(CASE WHEN surprise_percent < 0 THEN 1 ELSE 0 END)::integer AS "missCount",
        AVG(eps_actual)::numeric(10, 4) AS "avgEpsActual",
        AVG(revenue_actual_cr)::numeric(16, 4) AS "avgRevenueActualCr"
      FROM earnings_calendar
      ${filtered.whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

module.exports = {
  upsertFiiDiiActivityRows,
  listFiiDiiLatestSummary,
  listFiiDiiHistoryRows,
  listFiiDiiCumulative,
  upsertBlockDealRows,
  listBlockDealsLatest,
  listBlockDealsHistory,
  upsertMutualFundHoldingRows,
  listMutualFundsLatest,
  listMutualFundsHistory,
  listMutualFundsTopHolders,
  upsertInsiderTradeRows,
  listInsiderTradesLatest,
  listInsiderTradesHistory,
  listInsiderTradeSummary,
  upsertShareholdingPatternRows,
  listShareholdingLatest,
  listShareholdingHistory,
  listShareholdingTrends,
  upsertCorporateActionRows,
  listCorporateActionsLatest,
  listCorporateActionsHistory,
  listCorporateActionSummary,
  upsertEarningsCalendarRows,
  listEarningsCalendarLatest,
  listEarningsCalendarHistory,
  listEarningsCalendarSummary,
};
