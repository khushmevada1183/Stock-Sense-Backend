const { query } = require('../../db/client');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ipoSelectSql = `
  SELECT
    id::text AS id,
    external_key AS "externalKey",
    company_name AS "companyName",
    symbol,
    status,
    price_min AS "priceMin",
    price_max AS "priceMax",
    issue_price AS "issuePrice",
    listing_price AS "listingPrice",
    listing_gains_percent AS "listingGainsPercent",
    bidding_start_date AS "biddingStartDate",
    bidding_end_date AS "biddingEndDate",
    listing_date AS "listingDate",
    lot_size AS "lotSize",
    issue_size_text AS "issueSizeText",
    is_sme AS "isSme",
    source,
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM ipo_calendar
`;

const ipoSubscriptionSelectSql = `
  SELECT
    id::text AS id,
    ipo_id::text AS "ipoId",
    snapshot_date AS "snapshotDate",
    source,
    retail_subscribed AS "retailSubscribed",
    nii_subscribed AS "niiSubscribed",
    qib_subscribed AS "qibSubscribed",
    employee_subscribed AS "employeeSubscribed",
    total_subscribed AS "totalSubscribed",
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM ipo_subscription_snapshots
`;

const ipoGmpSelectSql = `
  SELECT
    id::text AS id,
    ipo_id::text AS "ipoId",
    snapshot_date AS "snapshotDate",
    source,
    gmp_price AS "gmpPrice",
    gmp_percent AS "gmpPercent",
    expected_listing_price AS "expectedListingPrice",
    sentiment,
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM ipo_gmp_snapshots
`;

const upsertIpoCalendarEntries = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const rows = [];

  for (const entry of entries) {
    const result = await query(
      `
        INSERT INTO ipo_calendar (
          external_key,
          company_name,
          symbol,
          status,
          price_min,
          price_max,
          issue_price,
          listing_price,
          listing_gains_percent,
          bidding_start_date,
          bidding_end_date,
          listing_date,
          lot_size,
          issue_size_text,
          is_sme,
          source,
          metadata
        )
        VALUES (
          $1,
          $2,
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
          $14,
          $15,
          $16,
          $17::jsonb
        )
        ON CONFLICT (external_key)
        DO UPDATE SET
          company_name = EXCLUDED.company_name,
          symbol = EXCLUDED.symbol,
          status = EXCLUDED.status,
          price_min = EXCLUDED.price_min,
          price_max = EXCLUDED.price_max,
          issue_price = EXCLUDED.issue_price,
          listing_price = EXCLUDED.listing_price,
          listing_gains_percent = EXCLUDED.listing_gains_percent,
          bidding_start_date = EXCLUDED.bidding_start_date,
          bidding_end_date = EXCLUDED.bidding_end_date,
          listing_date = EXCLUDED.listing_date,
          lot_size = EXCLUDED.lot_size,
          issue_size_text = EXCLUDED.issue_size_text,
          is_sme = EXCLUDED.is_sme,
          source = EXCLUDED.source,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        entry.externalKey,
        entry.companyName,
        entry.symbol,
        entry.status,
        entry.priceMin,
        entry.priceMax,
        entry.issuePrice,
        entry.listingPrice,
        entry.listingGainsPercent,
        entry.biddingStartDate,
        entry.biddingEndDate,
        entry.listingDate,
        entry.lotSize,
        entry.issueSizeText,
        entry.isSme,
        entry.source,
        JSON.stringify(entry.metadata || {}),
      ]
    );

    rows.push(result.rows[0]);
  }

  return rows;
};

const listIpoCalendarEntries = async ({ status = null, fromDate = null, toDate = null, limit = 50 }) => {
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (fromDate) {
    values.push(fromDate);
    conditions.push(`COALESCE(bidding_start_date, listing_date) >= $${values.length}::date`);
  }

  if (toDate) {
    values.push(toDate);
    conditions.push(`COALESCE(bidding_start_date, listing_date) <= $${values.length}::date`);
  }

  values.push(toPositiveInt(limit, 50));

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `${ipoSelectSql}
     ${whereClause}
     ORDER BY
       COALESCE(bidding_start_date, listing_date) ASC NULLS LAST,
       created_at DESC
     LIMIT $${values.length};`,
    values
  );

  return result.rows;
};

const getIpoCalendarEntryById = async (ipoId) => {
  const result = await query(
    `${ipoSelectSql}
     WHERE id = $1::uuid
     LIMIT 1;`,
    [ipoId]
  );

  return result.rows[0] || null;
};

const upsertIpoSubscriptionSnapshots = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const rows = [];

  for (const entry of entries) {
    const result = await query(
      `
        INSERT INTO ipo_subscription_snapshots (
          ipo_id,
          snapshot_date,
          source,
          retail_subscribed,
          nii_subscribed,
          qib_subscribed,
          employee_subscribed,
          total_subscribed,
          metadata
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::jsonb
        )
        ON CONFLICT (ipo_id, snapshot_date, source)
        DO UPDATE SET
          retail_subscribed = EXCLUDED.retail_subscribed,
          nii_subscribed = EXCLUDED.nii_subscribed,
          qib_subscribed = EXCLUDED.qib_subscribed,
          employee_subscribed = EXCLUDED.employee_subscribed,
          total_subscribed = EXCLUDED.total_subscribed,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        entry.ipoId,
        entry.snapshotDate,
        entry.source,
        entry.retailSubscribed,
        entry.niiSubscribed,
        entry.qibSubscribed,
        entry.employeeSubscribed,
        entry.totalSubscribed,
        JSON.stringify(entry.metadata || {}),
      ]
    );

    rows.push(result.rows[0]);
  }

  return rows;
};

const listLatestIpoSubscriptionSnapshots = async ({ status = null, limit = 100 }) => {
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`ipo.status = $${values.length}`);
  }

  values.push(toPositiveInt(limit, 100));

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `
      WITH latest AS (
        SELECT DISTINCT ON (iss.ipo_id)
          iss.id::text AS id,
          iss.ipo_id,
          iss.snapshot_date,
          iss.source,
          iss.retail_subscribed,
          iss.nii_subscribed,
          iss.qib_subscribed,
          iss.employee_subscribed,
          iss.total_subscribed,
          iss.metadata,
          iss.created_at,
          iss.updated_at
        FROM ipo_subscription_snapshots iss
        ORDER BY iss.ipo_id, iss.snapshot_date DESC, iss.created_at DESC
      )
      SELECT
        latest.id,
        latest.ipo_id::text AS "ipoId",
        latest.snapshot_date AS "snapshotDate",
        latest.source,
        latest.retail_subscribed AS "retailSubscribed",
        latest.nii_subscribed AS "niiSubscribed",
        latest.qib_subscribed AS "qibSubscribed",
        latest.employee_subscribed AS "employeeSubscribed",
        latest.total_subscribed AS "totalSubscribed",
        latest.metadata,
        latest.created_at AS "createdAt",
        latest.updated_at AS "updatedAt",
        ipo.company_name AS "companyName",
        ipo.symbol,
        ipo.status AS "ipoStatus",
        ipo.bidding_start_date AS "biddingStartDate",
        ipo.bidding_end_date AS "biddingEndDate",
        ipo.listing_date AS "listingDate",
        ipo.is_sme AS "isSme"
      FROM latest
      JOIN ipo_calendar ipo ON ipo.id = latest.ipo_id
      ${whereClause}
      ORDER BY latest.snapshot_date DESC, ipo.company_name ASC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const getLatestIpoSubscriptionByIpoId = async (ipoId) => {
  const result = await query(
    `${ipoSubscriptionSelectSql}
     WHERE ipo_id = $1::uuid
     ORDER BY snapshot_date DESC, created_at DESC
     LIMIT 1;`,
    [ipoId]
  );

  return result.rows[0] || null;
};

const listIpoSubscriptionHistoryByIpoId = async ({ ipoId, limit = 30 }) => {
  const result = await query(
    `${ipoSubscriptionSelectSql}
     WHERE ipo_id = $1::uuid
     ORDER BY snapshot_date DESC, created_at DESC
     LIMIT $2;`,
    [ipoId, toPositiveInt(limit, 30)]
  );

  return result.rows;
};

const upsertIpoGmpSnapshots = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const rows = [];

  for (const entry of entries) {
    const result = await query(
      `
        INSERT INTO ipo_gmp_snapshots (
          ipo_id,
          snapshot_date,
          source,
          gmp_price,
          gmp_percent,
          expected_listing_price,
          sentiment,
          metadata
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb
        )
        ON CONFLICT (ipo_id, snapshot_date, source)
        DO UPDATE SET
          gmp_price = EXCLUDED.gmp_price,
          gmp_percent = EXCLUDED.gmp_percent,
          expected_listing_price = EXCLUDED.expected_listing_price,
          sentiment = EXCLUDED.sentiment,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        entry.ipoId,
        entry.snapshotDate,
        entry.source,
        entry.gmpPrice,
        entry.gmpPercent,
        entry.expectedListingPrice,
        entry.sentiment,
        JSON.stringify(entry.metadata || {}),
      ]
    );

    rows.push(result.rows[0]);
  }

  return rows;
};

const listLatestIpoGmpSnapshots = async ({ status = null, limit = 100 }) => {
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`ipo.status = $${values.length}`);
  }

  values.push(toPositiveInt(limit, 100));

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `
      WITH latest AS (
        SELECT DISTINCT ON (igs.ipo_id)
          igs.id::text AS id,
          igs.ipo_id,
          igs.snapshot_date,
          igs.source,
          igs.gmp_price,
          igs.gmp_percent,
          igs.expected_listing_price,
          igs.sentiment,
          igs.metadata,
          igs.created_at,
          igs.updated_at
        FROM ipo_gmp_snapshots igs
        ORDER BY igs.ipo_id, igs.snapshot_date DESC, igs.created_at DESC
      )
      SELECT
        latest.id,
        latest.ipo_id::text AS "ipoId",
        latest.snapshot_date AS "snapshotDate",
        latest.source,
        latest.gmp_price AS "gmpPrice",
        latest.gmp_percent AS "gmpPercent",
        latest.expected_listing_price AS "expectedListingPrice",
        latest.sentiment,
        latest.metadata,
        latest.created_at AS "createdAt",
        latest.updated_at AS "updatedAt",
        ipo.company_name AS "companyName",
        ipo.symbol,
        ipo.status AS "ipoStatus",
        ipo.price_min AS "priceMin",
        ipo.price_max AS "priceMax",
        ipo.issue_price AS "issuePrice",
        ipo.bidding_start_date AS "biddingStartDate",
        ipo.bidding_end_date AS "biddingEndDate",
        ipo.listing_date AS "listingDate",
        ipo.is_sme AS "isSme"
      FROM latest
      JOIN ipo_calendar ipo ON ipo.id = latest.ipo_id
      ${whereClause}
      ORDER BY latest.snapshot_date DESC, ipo.company_name ASC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const getLatestIpoGmpByIpoId = async (ipoId) => {
  const result = await query(
    `${ipoGmpSelectSql}
     WHERE ipo_id = $1::uuid
     ORDER BY snapshot_date DESC, created_at DESC
     LIMIT 1;`,
    [ipoId]
  );

  return result.rows[0] || null;
};

const listIpoGmpHistoryByIpoId = async ({ ipoId, limit = 30 }) => {
  const result = await query(
    `${ipoGmpSelectSql}
     WHERE ipo_id = $1::uuid
     ORDER BY snapshot_date DESC, created_at DESC
     LIMIT $2;`,
    [ipoId, toPositiveInt(limit, 30)]
  );

  return result.rows;
};

module.exports = {
  upsertIpoCalendarEntries,
  listIpoCalendarEntries,
  getIpoCalendarEntryById,
  upsertIpoSubscriptionSnapshots,
  listLatestIpoSubscriptionSnapshots,
  getLatestIpoSubscriptionByIpoId,
  listIpoSubscriptionHistoryByIpoId,
  upsertIpoGmpSnapshots,
  listLatestIpoGmpSnapshots,
  getLatestIpoGmpByIpoId,
  listIpoGmpHistoryByIpoId,
};
