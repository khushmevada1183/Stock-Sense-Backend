const { Pool } = require('pg');
const { getDatabaseConfig } = require('../config');

let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool(getDatabaseConfig());
    pool.on('error', (error) => {
      console.error('[DB] Unexpected idle client error:', error.message);
    });
  }

  return pool;
};

const query = async (text, params = []) => {
  return getPool().query(text, params);
};

const withTransaction = async (work) => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const checkConnection = async () => {
  const startedAt = Date.now();
  const result = await query('SELECT NOW() AS now');

  return {
    ok: true,
    latencyMs: Date.now() - startedAt,
    databaseTime: result.rows[0].now,
  };
};

const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};

module.exports = {
  getPool,
  query,
  withTransaction,
  checkConnection,
  closePool,
};
