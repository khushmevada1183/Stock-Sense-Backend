/* eslint-disable no-console */

const { seedStocksMaster } = require('../src/modules/stocks/stocks.service');
const { closePool } = require('../src/db/client');

const parsePositiveInt = (value, fallback = null) => {
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

const run = async () => {
  const args = process.argv.slice(2);

  const limit = parsePositiveInt(readArgValue(args, '--limit'));
  const symbolsArg = readArgValue(args, '--symbols');
  const symbols = symbolsArg
    ? symbolsArg
        .split(',')
        .map((symbol) => String(symbol).trim())
        .filter(Boolean)
    : null;

  const summary = await seedStocksMaster({
    source: 'script_seed_stocks_master',
    maxSymbols: limit,
    symbols,
  });

  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
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
