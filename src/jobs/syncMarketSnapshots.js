const {
  runMarketSyncNow,
  startMarketSyncScheduler,
  stopMarketSyncScheduler,
} = require('./marketSyncScheduler');
const { closePool } = require('../db/client');

const INTERVAL_MS = Number.parseInt(process.env.MARKET_SYNC_INTERVAL_MS || '60000', 10);

const runOnce = async () => {
  const result = await runMarketSyncNow('cli-once');

  if (!result.success) {
    throw new Error(result.error || 'Market sync failed');
  }

  const snapshot = result.snapshot;
  const status = snapshot?.metadata?.syncStatus || {};

  console.log(
    `[MARKET_SYNC] captured=${snapshot?.capturedMinute || 'n/a'} ` +
      `trending=${status.trending} priceShockers=${status.priceShockers} ` +
      `nseMostActive=${status.nseMostActive} bseMostActive=${status.bseMostActive}`
  );

  return snapshot;
};

const shutdown = async (signal) => {
  console.log(`[MARKET_SYNC] Received ${signal}, closing DB pool...`);
  stopMarketSyncScheduler();
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[MARKET_SYNC] Shutdown error: ${error.message}`);
        process.exit(1);
      });
    });
  });

  if (!watchMode) {
    try {
      await runOnce();
      await closePool();
      process.exit(0);
    } catch (error) {
      console.error(`[MARKET_SYNC] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[MARKET_SYNC] Watch mode started. Interval: ${INTERVAL_MS}ms`);

  startMarketSyncScheduler({
    enabled: true,
    intervalMs: INTERVAL_MS,
    runOnStart: true,
  });
};

if (require.main === module) {
  main();
}

module.exports = {
  runOnce,
};