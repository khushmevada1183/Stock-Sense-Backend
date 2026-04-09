/* eslint-disable no-console */

const path = require('path');
const { spawnSync } = require('child_process');
const { query, closePool } = require('../src/db/client');

const parsePositiveInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readArgValue = (args, key) => {
  const prefix = `${key}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const chunkArray = (items, chunkSize) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

const runBackfillChunk = ({ symbols, chunkNo, totalChunks }) => {
  const nodeCommand = process.execPath;
  const backfillScriptPath = path.resolve(__dirname, 'backfill-stock-v1-snapshots.js');

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'metrics-batch-backfill-chunk',
        chunkNo,
        totalChunks,
        chunkSymbols: symbols.length,
      },
      null,
      2
    )
  );

  const proc = spawnSync(
    nodeCommand,
    [backfillScriptPath, `--symbols=${symbols.join(',')}`, '--skipProfiles=true'],
    { stdio: 'inherit' }
  );

  if (proc.error) {
    throw new Error(
      `stocks:v1:backfill failed for chunk ${chunkNo}/${totalChunks}: ${proc.error.message}`
    );
  }

  if (proc.status !== 0) {
    throw new Error(
      `stocks:v1:backfill failed for chunk ${chunkNo}/${totalChunks} with exit code ${proc.status}`
    );
  }
};

const run = async () => {
  const args = process.argv.slice(2);
  const chunkSize = parsePositiveInt(readArgValue(args, '--chunkSize'), 100);

  const result = await query(
    `
      SELECT DISTINCT symbol
      FROM stock_price_ticks
      WHERE dataset_type = 'prod'
      ORDER BY symbol ASC;
    `
  );

  const symbols = result.rows
    .map((row) => String(row.symbol || '').trim().toUpperCase())
    .filter(Boolean);

  const chunks = chunkArray(symbols, chunkSize);

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'metrics-batch-backfill-start',
        symbolCount: symbols.length,
        chunkSize,
        totalChunks: chunks.length,
      },
      null,
      2
    )
  );

  for (let index = 0; index < chunks.length; index += 1) {
    runBackfillChunk({
      symbols: chunks[index],
      chunkNo: index + 1,
      totalChunks: chunks.length,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'metrics-batch-backfill-complete',
        symbolCount: symbols.length,
        chunkSize,
        totalChunks: chunks.length,
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
