const { checkConnection, query } = require('../../db/client');

const getDatabaseHealth = async () => {
  const connection = await checkConnection();

  const extensionQuery = await query(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_extension
      WHERE extname = 'timescaledb'
    ) AS installed;
  `);

  const timescaleInstalled = extensionQuery.rows[0].installed;
  let hypertableReady = false;

  if (timescaleInstalled) {
    const hypertableQuery = await query(`
      SELECT EXISTS (
        SELECT 1
        FROM timescaledb_information.hypertables
        WHERE hypertable_schema = 'public'
          AND hypertable_name = 'stock_price_ticks'
      ) AS exists;
    `);
    hypertableReady = hypertableQuery.rows[0].exists;
  }

  return {
    status: 'UP',
    connection,
    timescaleInstalled,
    hypertableReady,
  };
};

module.exports = {
  getDatabaseHealth,
};
