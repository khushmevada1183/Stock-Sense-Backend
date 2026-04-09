/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { query, closePool } = require('../src/db/client');

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.resolve(__dirname, '../src/db/migrations');

const checksum = (content) => crypto.createHash('sha256').update(content).digest('hex');

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
};

const normalizeFilename = (value) => String(value || '').trim();

const listMigrationFiles = async () => {
  const names = await fs.promises.readdir(MIGRATIONS_DIR);
  return names.filter((name) => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
};

const loadCurrentChecksums = async () => {
  const files = await listMigrationFiles();
  const map = new Map();

  for (const filename of files) {
    const sql = await fs.promises.readFile(path.join(MIGRATIONS_DIR, filename), 'utf8');
    map.set(filename, checksum(sql));
  }

  return map;
};

const run = async () => {
  const args = process.argv.slice(2);
  const apply = parseBoolean(readArgValue(args, '--apply'), false);
  const onlyRaw = readArgValue(args, '--filenames');
  const only = new Set(
    (onlyRaw ? onlyRaw.split(',') : [])
      .map((part) => normalizeFilename(part))
      .filter(Boolean)
  );

  const currentChecksums = await loadCurrentChecksums();

  const applied = await query(`
    SELECT filename, checksum
    FROM ${MIGRATIONS_TABLE}
    ORDER BY filename ASC;
  `);

  const mismatches = [];

  for (const row of applied.rows) {
    const filename = row.filename;
    if (!currentChecksums.has(filename)) {
      continue;
    }

    if (only.size > 0 && !only.has(filename)) {
      continue;
    }

    const desiredChecksum = currentChecksums.get(filename);
    if (desiredChecksum !== row.checksum) {
      mismatches.push({
        filename,
        currentChecksum: row.checksum,
        desiredChecksum,
      });
    }
  }

  let repairedCount = 0;

  if (apply && mismatches.length > 0) {
    for (const mismatch of mismatches) {
      await query(
        `
          UPDATE ${MIGRATIONS_TABLE}
          SET checksum = $2
          WHERE filename = $1;
        `,
        [mismatch.filename, mismatch.desiredChecksum]
      );
      repairedCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? 'apply' : 'dry-run',
        repairedCount,
        mismatchCount: mismatches.length,
        mismatches,
      },
      null,
      2
    )
  );
};

run()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
