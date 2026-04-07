/* eslint-disable no-console */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_MIGRATIONS_DIR = path.join(ROOT, 'src', 'db', 'migrations');
const GENERATED_MIGRATIONS_DIR = path.join(ROOT, '.flyway', 'sql');
const DEFAULT_DOCKER_IMAGE = process.env.FLYWAY_DOCKER_IMAGE || 'flyway/flyway:10';

const ALLOWED_COMMANDS = new Set(['migrate', 'validate', 'info', 'baseline']);

const command = String(process.argv[2] || 'migrate').trim().toLowerCase();
if (!ALLOWED_COMMANDS.has(command)) {
  console.error(
    `[FLYWAY] Unsupported command: ${command}. Allowed: ${Array.from(ALLOWED_COMMANDS).join(', ')}`
  );
  process.exit(1);
}

const parseDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Flyway operations');
  }

  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://');
  }

  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const database = parsed.pathname || '';
  const user = decodeURIComponent(parsed.username || '');
  const password = decodeURIComponent(parsed.password || '');

  if (!host || !database || database === '/') {
    throw new Error('DATABASE_URL must include host and database name');
  }

  const query = parsed.searchParams.toString();
  const jdbcUrl = `jdbc:postgresql://${host}:${port}${database}${query ? `?${query}` : ''}`;

  return {
    jdbcUrl,
    user,
    password,
  };
};

const parseMigrationFile = (filename) => {
  const match = filename.match(/^(\d+)_([A-Za-z0-9_]+)\.sql$/);
  if (!match) {
    return null;
  }

  const rawVersion = match[1];
  const parsedVersion = Number.parseInt(rawVersion, 10);
  if (!Number.isFinite(parsedVersion) || parsedVersion < 1) {
    return null;
  }

  const description = match[2].replace(/__+/g, '_');

  return {
    filename,
    version: String(parsedVersion),
    versionNumber: parsedVersion,
    description,
  };
};

const listSourceMigrations = () => {
  const files = fs
    .readdirSync(SOURCE_MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const parsed = files
    .map(parseMigrationFile)
    .filter(Boolean)
    .sort((a, b) => a.versionNumber - b.versionNumber);

  if (parsed.length === 0) {
    throw new Error('No compatible SQL migrations found in src/db/migrations');
  }

  return parsed;
};

const prepareFlywayMigrations = (migrations) => {
  fs.rmSync(path.join(ROOT, '.flyway'), { recursive: true, force: true });
  fs.mkdirSync(GENERATED_MIGRATIONS_DIR, { recursive: true });

  migrations.forEach((migration) => {
    const sourcePath = path.join(SOURCE_MIGRATIONS_DIR, migration.filename);
    const targetName = `V${migration.version}__${migration.description}.sql`;
    const targetPath = path.join(GENERATED_MIGRATIONS_DIR, targetName);
    fs.copyFileSync(sourcePath, targetPath);
  });
};

const canRun = (bin, args) => {
  const result = spawnSync(bin, args, {
    stdio: 'ignore',
  });

  return result.status === 0;
};

const runLocalFlyway = (args) => {
  const binary = process.env.FLYWAY_BINARY || 'flyway';

  if (!canRun(binary, ['-v'])) {
    return null;
  }

  const result = spawnSync(binary, args, {
    stdio: 'inherit',
  });

  return result.status;
};

const runDockerFlyway = (args) => {
  if (!canRun('docker', ['--version'])) {
    return null;
  }

  const dockerArgs = [
    'run',
    '--rm',
    '-v',
    `${GENERATED_MIGRATIONS_DIR}:/flyway/sql`,
    DEFAULT_DOCKER_IMAGE,
    ...args,
  ];

  const result = spawnSync('docker', dockerArgs, {
    stdio: 'inherit',
  });

  return result.status;
};

const main = () => {
  const db = parseDatabaseConfig();
  const migrations = listSourceMigrations();
  prepareFlywayMigrations(migrations);

  const latestVersion = migrations[migrations.length - 1].version;
  const sharedArgs = [
    `-url=${db.jdbcUrl}`,
    `-user=${db.user}`,
    `-password=${db.password}`,
    '-baselineOnMigrate=true',
    `-baselineVersion=${latestVersion}`,
    '-validateMigrationNaming=true',
    '-connectRetries=5',
  ];

  console.log(
    `[FLYWAY] Prepared ${migrations.length} migration file(s) from src/db/migrations for command=${command}`
  );

  const localStatus = runLocalFlyway([
    ...sharedArgs,
    `-locations=filesystem:${GENERATED_MIGRATIONS_DIR}`,
    command,
  ]);

  if (localStatus !== null) {
    process.exit(localStatus);
  }

  const dockerStatus = runDockerFlyway([
    ...sharedArgs,
    '-locations=filesystem:/flyway/sql',
    command,
  ]);

  if (dockerStatus !== null) {
    process.exit(dockerStatus);
  }

  throw new Error(
    'Flyway binary not found and Docker is unavailable. Install Flyway CLI or Docker to continue.'
  );
};

try {
  main();
} catch (error) {
  console.error(`[FLYWAY] Error: ${error.message}`);
  process.exit(1);
}
