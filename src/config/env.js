const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toInt(process.env.PORT, 10000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || '',
  CACHE_REDIS_ENABLED: process.env.CACHE_REDIS_ENABLED || 'false',
  CACHE_REDIS_NAMESPACE: process.env.CACHE_REDIS_NAMESPACE || 'stock_sense_backend',
  REDIS_CONNECT_TIMEOUT_MS: toInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 3000),
  PG_POOL_MAX: toInt(process.env.PG_POOL_MAX, 15),
  PG_IDLE_TIMEOUT_MS: toInt(process.env.PG_IDLE_TIMEOUT_MS, 30000),
  PG_CONNECTION_TIMEOUT_MS: toInt(process.env.PG_CONNECTION_TIMEOUT_MS, 10000),
  PG_QUERY_TIMEOUT_MS: toInt(process.env.PG_QUERY_TIMEOUT_MS, 15000),
  PG_STATEMENT_TIMEOUT_MS: toInt(process.env.PG_STATEMENT_TIMEOUT_MS, 15000),
  PG_APP_NAME: process.env.PG_APP_NAME || 'stock-sense-backend',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: toInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES, 30),
  EMAIL_VERIFICATION_OTP_EXPIRES_MINUTES: toInt(process.env.EMAIL_VERIFICATION_OTP_EXPIRES_MINUTES, 10),
  BCRYPT_SALT_ROUNDS: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),
  AUTH_LOGIN_MAX_ATTEMPTS: toInt(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 5),
  AUTH_LOGIN_WINDOW_MINUTES: toInt(process.env.AUTH_LOGIN_WINDOW_MINUTES, 15),
  AUTH_LOGIN_BLOCK_MINUTES: toInt(process.env.AUTH_LOGIN_BLOCK_MINUTES, 60),
  AUTH_MAX_ACTIVE_SESSIONS: toInt(process.env.AUTH_MAX_ACTIVE_SESSIONS, 5),
  AUTH_EXPOSE_RESET_TOKEN: process.env.AUTH_EXPOSE_RESET_TOKEN || 'false',
  AUTH_EXPOSE_EMAIL_VERIFICATION_OTP:
    process.env.AUTH_EXPOSE_EMAIL_VERIFICATION_OTP || 'false',
  AUTH_REQUIRE_EMAIL_VERIFIED_FOR_LOGIN:
    process.env.AUTH_REQUIRE_EMAIL_VERIFIED_FOR_LOGIN || 'false',
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',
  STOCKS_V1_DEFAULT_DATASET_SCOPE: process.env.STOCKS_V1_DEFAULT_DATASET_SCOPE || 'prod',
};

const REQUIRED_ENV_VARS = ['DATABASE_URL'];

const getMissingEnvVars = () => {
  return REQUIRED_ENV_VARS.filter((key) => !env[key]);
};

const validateEnv = () => {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = {
  env,
  validateEnv,
};
