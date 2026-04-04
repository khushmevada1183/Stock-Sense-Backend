const { env, validateEnv } = require('./env');

const isLocalDatabase = (databaseUrl) => {
  return /localhost|127\.0\.0\.1/i.test(databaseUrl);
};

const getDatabaseConfig = () => {
  validateEnv();

  const config = {
    connectionString: env.DATABASE_URL,
    max: env.PG_POOL_MAX,
    idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.PG_CONNECTION_TIMEOUT_MS,
    statement_timeout: env.PG_STATEMENT_TIMEOUT_MS,
    query_timeout: env.PG_QUERY_TIMEOUT_MS,
    application_name: env.PG_APP_NAME,
    keepAlive: true,
  };

  if (!isLocalDatabase(env.DATABASE_URL)) {
    config.ssl = { rejectUnauthorized: true };
  }

  return config;
};

module.exports = {
  getDatabaseConfig,
};
