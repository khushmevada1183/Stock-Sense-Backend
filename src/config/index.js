const { env, validateEnv } = require('./env');
const { getDatabaseConfig } = require('./database');
const { API_CONFIG } = require('./api');

module.exports = {
  env,
  validateEnv,
  getDatabaseConfig,
  API_CONFIG,
};
