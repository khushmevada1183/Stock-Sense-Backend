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

module.exports = {
  upsertFiiDiiActivityRows,
  listFiiDiiLatestSummary,
  listFiiDiiHistoryRows,
  listFiiDiiCumulative,
};
