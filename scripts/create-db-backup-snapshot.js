/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { query, closePool } = require('../src/db/client');

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const normalizeLabel = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase();

  if (!raw) {
    return 'p0-db-snapshot';
  }

  return raw.replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'p0-db-snapshot';
};

const nowTag = () => {
  const iso = new Date().toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}z$/i, 'Z');
};

const parseDatabaseName = (databaseUrl) => {
  try {
    const parsed = new URL(databaseUrl);
    const pathname = parsed.pathname || '';
    const dbName = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    return dbName || 'database';
  } catch (_) {
    return 'database';
  }
};

const runPgDump = (databaseUrl, outputPath) => {
  return spawnSync(
    'pg_dump',
    [
      '--no-owner',
      '--no-privileges',
      '--format=plain',
      '--encoding=UTF8',
      '--file',
      outputPath,
      databaseUrl,
    ],
    {
      env: process.env,
      encoding: 'utf8',
    }
  );
};

const TARGET_TABLES = [
  'schema_migrations',
  'stock_price_ticks',
  'stock_metrics_snapshots',
  'stock_profile_details',
  'news_articles',
  'news_article_symbols',
  'price_alerts',
  'notifications',
];

const getTableStats = async () => {
  const stats = [];

  for (const tableName of TARGET_TABLES) {
    const regclassResult = await query('SELECT to_regclass($1) AS regclass;', [`public.${tableName}`]);
    const exists = Boolean(regclassResult.rows[0] && regclassResult.rows[0].regclass);

    if (!exists) {
      stats.push({
        tableName,
        exists: false,
        rowCount: 0,
        sizeBytes: 0,
        sizePretty: '0 bytes',
      });
      continue;
    }

    const countResult = await query(`SELECT COUNT(*)::bigint AS row_count FROM ${tableName};`);
    const sizeResult = await query(
      `
        SELECT
          COALESCE(pg_total_relation_size(to_regclass($1)), 0)::bigint AS size_bytes,
          COALESCE(pg_size_pretty(pg_total_relation_size(to_regclass($1))), '0 bytes') AS size_pretty;
      `,
      [`public.${tableName}`]
    );

    stats.push({
      tableName,
      exists: true,
      rowCount: Number(countResult.rows[0]?.row_count || 0),
      sizeBytes: Number(sizeResult.rows[0]?.size_bytes || 0),
      sizePretty: sizeResult.rows[0]?.size_pretty || '0 bytes',
    });
  }

  return stats;
};

const buildLogicalSnapshot = async () => {
  const metaResult = await query(
    `
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        NOW() AS captured_at;
    `
  );

  const migrationsResult = await query(
    `
      SELECT
        filename,
        checksum,
        applied_at
      FROM schema_migrations
      ORDER BY applied_at ASC, filename ASC;
    `
  );

  const tableStats = await getTableStats();

  return {
    database: {
      name: metaResult.rows[0]?.database_name || null,
      user: metaResult.rows[0]?.database_user || null,
      capturedAt: metaResult.rows[0]?.captured_at || null,
    },
    schemaMigrations: migrationsResult.rows,
    tableStats,
  };
};

const run = async () => {
  const args = process.argv.slice(2);
  const outputDirArg = readArgValue(args, '--outputDir') || 'docs/refactor/backups';
  const labelArg = readArgValue(args, '--label');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to create backup/snapshot');
  }

  const outputDir = path.resolve(process.cwd(), outputDirArg);
  const label = normalizeLabel(labelArg);
  const timestamp = nowTag();
  const dbName = normalizeLabel(parseDatabaseName(databaseUrl));
  const baseName = `${label}-${dbName}-${timestamp}`;

  fs.mkdirSync(outputDir, { recursive: true });

  const sqlPath = path.join(outputDir, `${baseName}.sql`);
  const pgDumpResult = runPgDump(databaseUrl, sqlPath);

  if (pgDumpResult.status === 0) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'pg_dump',
          outputPath: sqlPath,
          label,
          database: dbName,
        },
        null,
        2
      )
    );
    return;
  }

  if (fs.existsSync(sqlPath)) {
    fs.unlinkSync(sqlPath);
  }

  const snapshotPath = path.join(outputDir, `${baseName}.json`);
  const logicalSnapshot = await buildLogicalSnapshot();

  fs.writeFileSync(snapshotPath, `${JSON.stringify(logicalSnapshot, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'logical_snapshot',
        outputPath: snapshotPath,
        label,
        database: dbName,
        pgDumpError: pgDumpResult.error ? pgDumpResult.error.message : (pgDumpResult.stderr || '').trim() || null,
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
