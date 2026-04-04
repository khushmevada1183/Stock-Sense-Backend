const { query, withTransaction } = require('../../db/client');

const normalizeNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const listPortfoliosByUser = async (userId) => {
  const sql = `
    SELECT
      p.id::text AS id,
      p.user_id AS "userId",
      p.portfolio_name AS "portfolioName",
      p.description,
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'symbol', h.symbol,
            'quantity', h.quantity,
            'buyPrice', h.avg_buy_price,
            'buyDate', h.first_buy_date
          )
          ORDER BY h.symbol
        )
        FROM (
          SELECT
            pt.symbol,
            ROUND(
              SUM(
                CASE WHEN pt.transaction_type = 'buy'
                  THEN pt.quantity
                  ELSE -pt.quantity
                END
              )::numeric,
              6
            ) AS quantity,
            ROUND(
              (
                SUM(
                  CASE WHEN pt.transaction_type = 'buy'
                    THEN (pt.quantity * pt.price) + pt.fees
                    ELSE 0
                  END
                )
                /
                NULLIF(
                  SUM(
                    CASE WHEN pt.transaction_type = 'buy'
                      THEN pt.quantity
                      ELSE 0
                    END
                  ),
                  0
                )
              )::numeric,
              4
            ) AS avg_buy_price,
            MIN(pt.transaction_date) AS first_buy_date
          FROM portfolio_transactions pt
          WHERE pt.portfolio_id = p.id
          GROUP BY pt.symbol
          HAVING SUM(
            CASE WHEN pt.transaction_type = 'buy'
              THEN pt.quantity
              ELSE -pt.quantity
            END
          ) > 0
        ) h
      ), '[]'::json) AS stocks
    FROM portfolios p
    WHERE p.user_id = $1
    ORDER BY p.created_at DESC;
  `;

  const result = await query(sql, [userId]);
  return result.rows;
};

const createPortfolio = async ({ userId, portfolioName, description, stocks }) => {
  return withTransaction(async (client) => {
    const created = await client.query(
      `
        INSERT INTO portfolios (user_id, portfolio_name, description)
        VALUES ($1, $2, $3)
        RETURNING
          id::text AS id,
          user_id AS "userId",
          portfolio_name AS "portfolioName",
          description,
          created_at AS "createdAt",
          updated_at AS "updatedAt";
      `,
      [userId, portfolioName, description]
    );

    const portfolio = created.rows[0];

    if (Array.isArray(stocks) && stocks.length > 0) {
      await insertBuyTransactions(client, portfolio.id, stocks);
    }

    return portfolio;
  });
};

const getPortfolioById = async ({ userId, portfolioId }) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        user_id AS "userId",
        portfolio_name AS "portfolioName",
        description,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM portfolios
      WHERE id = $1
        AND user_id = $2
      LIMIT 1;
    `,
    [portfolioId, userId]
  );

  return result.rows[0] || null;
};

const updatePortfolio = async ({ userId, portfolioId, portfolioName, description, stocks }) => {
  return withTransaction(async (client) => {
    const updateFields = [];
    const updateValues = [];

    if (portfolioName !== undefined) {
      updateFields.push(`portfolio_name = $${updateValues.length + 1}`);
      updateValues.push(portfolioName);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${updateValues.length + 1}`);
      updateValues.push(description);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');

      updateValues.push(portfolioId, userId);

      const updated = await client.query(
        `
          UPDATE portfolios
          SET ${updateFields.join(', ')}
          WHERE id = $${updateValues.length - 1}
            AND user_id = $${updateValues.length}
          RETURNING
            id::text AS id,
            user_id AS "userId",
            portfolio_name AS "portfolioName",
            description,
            created_at AS "createdAt",
            updated_at AS "updatedAt";
        `,
        updateValues
      );

      if (updated.rowCount === 0) {
        return null;
      }
    } else {
      const existing = await client.query(
        `
          SELECT id::text AS id
          FROM portfolios
          WHERE id = $1
            AND user_id = $2
          LIMIT 1;
        `,
        [portfolioId, userId]
      );

      if (existing.rowCount === 0) {
        return null;
      }
    }

    if (stocks !== undefined) {
      await client.query('DELETE FROM portfolio_transactions WHERE portfolio_id = $1;', [portfolioId]);

      if (Array.isArray(stocks) && stocks.length > 0) {
        await insertBuyTransactions(client, portfolioId, stocks);
      }
    }

    const refreshed = await client.query(
      `
        SELECT
          id::text AS id,
          user_id AS "userId",
          portfolio_name AS "portfolioName",
          description,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM portfolios
        WHERE id = $1
          AND user_id = $2
        LIMIT 1;
      `,
      [portfolioId, userId]
    );

    return refreshed.rows[0] || null;
  });
};

const deletePortfolio = async ({ userId, portfolioId }) => {
  const result = await query(
    `
      DELETE FROM portfolios
      WHERE id = $1
        AND user_id = $2
      RETURNING id::text AS id;
    `,
    [portfolioId, userId]
  );

  return result.rows[0] || null;
};

const insertBuyTransactions = async (client, portfolioId, stocks) => {
  if (!stocks.length) {
    return;
  }

  const values = [];
  const placeholders = stocks.map((stock, index) => {
    const offset = index * 8;

    values.push(
      portfolioId,
      stock.symbol,
      'buy',
      stock.quantity,
      stock.buyPrice,
      stock.buyDate,
      0,
      JSON.stringify({ source: 'portfolio_form' })
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}::jsonb)`;
  });

  await client.query(
    `
      INSERT INTO portfolio_transactions (
        portfolio_id,
        symbol,
        transaction_type,
        quantity,
        price,
        transaction_date,
        fees,
        metadata
      )
      VALUES ${placeholders.join(', ')};
    `,
    values
  );
};

const addPortfolioTransaction = async ({ portfolioId, transaction }) => {
  const result = await query(
    `
      INSERT INTO portfolio_transactions (
        portfolio_id,
        symbol,
        transaction_type,
        quantity,
        price,
        transaction_date,
        fees,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING
        id::text AS id,
        portfolio_id::text AS "portfolioId",
        symbol,
        transaction_type AS "transactionType",
        quantity::DOUBLE PRECISION AS quantity,
        price::DOUBLE PRECISION AS price,
        transaction_date AS "transactionDate",
        fees::DOUBLE PRECISION AS fees,
        metadata,
        created_at AS "createdAt";
    `,
    [
      portfolioId,
      transaction.symbol,
      transaction.transactionType,
      transaction.quantity,
      transaction.price,
      transaction.transactionDate,
      transaction.fees,
      JSON.stringify(transaction.metadata || {}),
    ]
  );

  return result.rows[0];
};

const listPortfolioTransactions = async ({ userId, portfolioId }) => {
  const result = await query(
    `
      SELECT
        pt.id::text AS id,
        pt.portfolio_id::text AS "portfolioId",
        pt.symbol,
        pt.transaction_type AS "transactionType",
        pt.quantity::DOUBLE PRECISION AS quantity,
        pt.price::DOUBLE PRECISION AS price,
        pt.transaction_date AS "transactionDate",
        pt.fees::DOUBLE PRECISION AS fees,
        pt.metadata,
        pt.created_at AS "createdAt"
      FROM portfolio_transactions pt
      JOIN portfolios p ON p.id = pt.portfolio_id
      WHERE p.user_id = $1
        AND p.id = $2
      ORDER BY pt.transaction_date DESC, pt.created_at DESC;
    `,
    [userId, portfolioId]
  );

  return result.rows;
};

const listHoldings = async ({ userId, portfolioId = null }) => {
  const result = await query(
    `
      WITH scoped_transactions AS (
        SELECT
          pt.symbol,
          pt.transaction_type,
          pt.quantity::DOUBLE PRECISION AS quantity,
          pt.price::DOUBLE PRECISION AS price,
          pt.fees::DOUBLE PRECISION AS fees,
          pt.transaction_date
        FROM portfolio_transactions pt
        JOIN portfolios p ON p.id = pt.portfolio_id
        WHERE p.user_id = $1
          AND ($2::uuid IS NULL OR pt.portfolio_id = $2::uuid)
      ),
      aggregated AS (
        SELECT
          symbol,
          SUM(CASE WHEN transaction_type = 'buy' THEN quantity ELSE -quantity END) AS quantity,
          SUM(CASE WHEN transaction_type = 'buy' THEN (quantity * price) + fees ELSE 0 END) AS total_buy_cost,
          SUM(CASE WHEN transaction_type = 'buy' THEN quantity ELSE 0 END) AS total_buy_qty,
          SUM(CASE WHEN transaction_type = 'sell' THEN (quantity * price) - fees ELSE 0 END) AS total_sell_value,
          SUM(CASE WHEN transaction_type = 'sell' THEN quantity ELSE 0 END) AS total_sell_qty,
          MIN(transaction_date) AS first_buy_date
        FROM scoped_transactions
        GROUP BY symbol
      ),
      latest_prices AS (
        SELECT DISTINCT ON (t.symbol)
          t.symbol,
          t.close::DOUBLE PRECISION AS last_price,
          t.ts
        FROM stock_price_ticks t
        JOIN aggregated a ON a.symbol = t.symbol
        ORDER BY t.symbol, t.ts DESC
      ),
      previous_prices AS (
        SELECT DISTINCT ON (t.symbol)
          t.symbol,
          t.close::DOUBLE PRECISION AS prev_close
        FROM stock_price_ticks t
        JOIN latest_prices lp ON lp.symbol = t.symbol
        WHERE t.ts < lp.ts
        ORDER BY t.symbol, t.ts DESC
      )
      SELECT
        a.symbol,
        a.quantity,
        CASE WHEN a.total_buy_qty > 0 THEN (a.total_buy_cost / a.total_buy_qty) ELSE 0 END AS avg_buy_price,
        COALESCE(lp.last_price, CASE WHEN a.total_buy_qty > 0 THEN (a.total_buy_cost / a.total_buy_qty) ELSE 0 END) AS current_price,
        COALESCE(pp.prev_close, lp.last_price, CASE WHEN a.total_buy_qty > 0 THEN (a.total_buy_cost / a.total_buy_qty) ELSE 0 END) AS prev_close,
        a.first_buy_date,
        CASE WHEN a.total_sell_qty > 0
          THEN a.total_sell_value - ((CASE WHEN a.total_buy_qty > 0 THEN (a.total_buy_cost / a.total_buy_qty) ELSE 0 END) * a.total_sell_qty)
          ELSE 0
        END AS realized_pnl
      FROM aggregated a
      LEFT JOIN latest_prices lp ON lp.symbol = a.symbol
      LEFT JOIN previous_prices pp ON pp.symbol = a.symbol
      WHERE a.quantity > 0
      ORDER BY (COALESCE(lp.last_price, 0) * a.quantity) DESC;
    `,
    [userId, portfolioId]
  );

  return result.rows.map((row) => {
    const quantity = normalizeNumeric(row.quantity);
    const avgBuyPrice = normalizeNumeric(row.avg_buy_price);
    const currentPrice = normalizeNumeric(row.current_price);
    const prevClose = normalizeNumeric(row.prev_close || row.current_price);
    const change = currentPrice - prevClose;
    const marketValue = currentPrice * quantity;
    const profitLoss = (currentPrice - avgBuyPrice) * quantity;

    return {
      symbol: row.symbol,
      quantity,
      buyPrice: avgBuyPrice,
      buyDate: row.first_buy_date,
      lastPrice: currentPrice,
      change,
      changePercent: prevClose > 0 ? (change / prevClose) * 100 : 0,
      marketValue,
      profitLoss,
      profitLossPercent: avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0,
      pe: null,
      realizedPnl: normalizeNumeric(row.realized_pnl),
    };
  });
};

module.exports = {
  listPortfoliosByUser,
  createPortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  addPortfolioTransaction,
  listPortfolioTransactions,
  listHoldings,
};
