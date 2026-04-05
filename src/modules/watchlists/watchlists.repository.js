const { query, withTransaction } = require('../../db/client');

const watchlistSelectSql = `
  SELECT
    w.id::text AS id,
    w.user_id::text AS "userId",
    w.name,
    w.description,
    w.created_at AS "createdAt",
    w.updated_at AS "updatedAt",
    COALESCE(item_counts.item_count, 0)::INTEGER AS "itemCount"
  FROM watchlists w
  LEFT JOIN (
    SELECT watchlist_id, COUNT(*) AS item_count
    FROM watchlist_items
    GROUP BY watchlist_id
  ) item_counts
    ON item_counts.watchlist_id = w.id
`;

const listWatchlistsByUser = async (userId) => {
  const result = await query(
    `${watchlistSelectSql}
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC;`,
    [userId]
  );

  return result.rows;
};

const createWatchlist = async ({ userId, name, description }) => {
  const result = await query(
    `
      INSERT INTO watchlists (user_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING
        id::text AS id,
        user_id::text AS "userId",
        name,
        description,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `,
    [userId, name, description]
  );

  return {
    ...result.rows[0],
    itemCount: 0,
    items: [],
  };
};

const getWatchlistById = async ({ userId, watchlistId }) => {
  const watchlistResult = await query(
    `${watchlistSelectSql}
     WHERE w.user_id = $1
       AND w.id = $2
     LIMIT 1;`,
    [userId, watchlistId]
  );

  if (watchlistResult.rowCount === 0) {
    return null;
  }

  const watchlist = watchlistResult.rows[0];

  const itemResult = await query(
    `
      SELECT
        id::text AS id,
        watchlist_id::text AS "watchlistId",
        symbol,
        position,
        created_at AS "createdAt"
      FROM watchlist_items
      WHERE watchlist_id = $1
      ORDER BY position ASC, created_at ASC;
    `,
    [watchlistId]
  );

  return {
    ...watchlist,
    items: itemResult.rows,
  };
};

const updateWatchlist = async ({ userId, watchlistId, name, description }) => {
  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push(`name = $${values.length + 1}`);
    values.push(name);
  }

  if (description !== undefined) {
    fields.push(`description = $${values.length + 1}`);
    values.push(description);
  }

  fields.push('updated_at = NOW()');

  values.push(userId, watchlistId);

  const result = await query(
    `
      UPDATE watchlists
      SET ${fields.join(', ')}
      WHERE user_id = $${values.length - 1}
        AND id = $${values.length}
      RETURNING id::text AS id;
    `,
    values
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getWatchlistById({ userId, watchlistId });
};

const deleteWatchlist = async ({ userId, watchlistId }) => {
  const result = await query(
    `
      DELETE FROM watchlists
      WHERE user_id = $1
        AND id = $2
      RETURNING id::text AS id;
    `,
    [userId, watchlistId]
  );

  return result.rowCount > 0;
};

const addWatchlistItem = async ({ userId, watchlistId, symbol }) => {
  return withTransaction(async (client) => {
    const watchlistResult = await client.query(
      `
        SELECT id::text AS id
        FROM watchlists
        WHERE id = $1
          AND user_id = $2
        LIMIT 1;
      `,
      [watchlistId, userId]
    );

    if (watchlistResult.rowCount === 0) {
      return null;
    }

    const positionResult = await client.query(
      `
        SELECT COALESCE(MAX(position), 0) + 1 AS next_position
        FROM watchlist_items
        WHERE watchlist_id = $1;
      `,
      [watchlistId]
    );

    const nextPosition = Number(positionResult.rows[0].next_position || 1);

    const insertResult = await client.query(
      `
        INSERT INTO watchlist_items (watchlist_id, symbol, position)
        VALUES ($1, $2, $3)
        RETURNING
          id::text AS id,
          watchlist_id::text AS "watchlistId",
          symbol,
          position,
          created_at AS "createdAt";
      `,
      [watchlistId, symbol, nextPosition]
    );

    return insertResult.rows[0];
  });
};

const removeWatchlistItem = async ({ userId, watchlistId, itemId }) => {
  return withTransaction(async (client) => {
    const watchlistResult = await client.query(
      `
        SELECT id::text AS id
        FROM watchlists
        WHERE id = $1
          AND user_id = $2
        LIMIT 1;
      `,
      [watchlistId, userId]
    );

    if (watchlistResult.rowCount === 0) {
      return { watchlistFound: false, itemDeleted: false };
    }

    const deleteResult = await client.query(
      `
        DELETE FROM watchlist_items
        WHERE id = $1
          AND watchlist_id = $2
        RETURNING id::text AS id;
      `,
      [itemId, watchlistId]
    );

    if (deleteResult.rowCount === 0) {
      return { watchlistFound: true, itemDeleted: false };
    }

    await client.query(
      `
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) AS new_position
          FROM watchlist_items
          WHERE watchlist_id = $1
        )
        UPDATE watchlist_items wi
        SET position = ranked.new_position
        FROM ranked
        WHERE wi.id = ranked.id;
      `,
      [watchlistId]
    );

    return { watchlistFound: true, itemDeleted: true };
  });
};

const reorderWatchlistItems = async ({ userId, watchlistId, itemIds }) => {
  return withTransaction(async (client) => {
    const watchlistResult = await client.query(
      `
        SELECT id::text AS id
        FROM watchlists
        WHERE id = $1
          AND user_id = $2
        LIMIT 1;
      `,
      [watchlistId, userId]
    );

    if (watchlistResult.rowCount === 0) {
      return { watchlistFound: false, reordered: false };
    }

    const existingResult = await client.query(
      `
        SELECT id::text AS id
        FROM watchlist_items
        WHERE watchlist_id = $1
        ORDER BY position ASC, created_at ASC;
      `,
      [watchlistId]
    );

    const existingIds = existingResult.rows.map((row) => row.id);

    if (existingIds.length !== itemIds.length) {
      return { watchlistFound: true, reordered: false, reason: 'count_mismatch' };
    }

    const existingSet = new Set(existingIds);
    const hasUnknown = itemIds.some((id) => !existingSet.has(id));

    if (hasUnknown) {
      return { watchlistFound: true, reordered: false, reason: 'id_mismatch' };
    }

    for (let index = 0; index < itemIds.length; index += 1) {
      await client.query(
        `
          UPDATE watchlist_items
          SET position = $1
          WHERE watchlist_id = $2
            AND id = $3;
        `,
        [index + 1, watchlistId, itemIds[index]]
      );
    }

    return { watchlistFound: true, reordered: true };
  });
};

module.exports = {
  listWatchlistsByUser,
  createWatchlist,
  getWatchlistById,
  updateWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  reorderWatchlistItems,
};
