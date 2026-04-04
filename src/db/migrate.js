const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getPool, closePool } = require('./client');

const MIGRATIONS_TABLE = 'schema_migrations';
const migrationsDirectory = path.resolve(__dirname, 'migrations');

const checksum = (content) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      checksum TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query(`SELECT filename, checksum FROM ${MIGRATIONS_TABLE};`);
  return new Map(result.rows.map((row) => [row.filename, row.checksum]));
};

const getMigrationFiles = async () => {
  const files = await fs.promises.readdir(migrationsDirectory);
  return files
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
};

const runMigrations = async () => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const appliedMigrations = await getAppliedMigrations(client);
    const migrationFiles = await getMigrationFiles();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDirectory, file);
      const sql = await fs.promises.readFile(filePath, 'utf8');
      const fileChecksum = checksum(sql);

      if (appliedMigrations.has(file)) {
        if (appliedMigrations.get(file) !== fileChecksum) {
          throw new Error(
            `Checksum mismatch for already-applied migration: ${file}. ` +
            'Create a new migration instead of editing old ones.'
          );
        }

        console.log(`[MIGRATE] Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`[MIGRATE] Applying ${file}`);
      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (filename, checksum) VALUES ($1, $2);`,
          [file, fileChecksum]
        );
        await client.query('COMMIT');
        console.log(`[MIGRATE] Applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed (${file}): ${error.message}`);
      }
    }

    console.log('[MIGRATE] All migrations are up to date.');
  } finally {
    client.release();
    await closePool();
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[MIGRATE] Error:', error.message);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
};
