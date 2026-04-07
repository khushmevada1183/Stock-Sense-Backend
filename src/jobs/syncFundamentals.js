const {
  runFundamentalsSyncNow,
  startFundamentalsSyncScheduler,
  stopFundamentalsSyncScheduler,
} = require('./fundamentalsSyncScheduler');
const { closePool } = require('../db/client');

const INTERVAL_MS = Number.parseInt(
  process.env.FUNDAMENTALS_SYNC_INTERVAL_MS || String(6 * 60 * 60 * 1000),
  10
);

const runOnce = async () => {
  const result = await runFundamentalsSyncNow('cli-once');

  if (result.skipped) {
    console.log(`[FUNDAMENTALS] Skipped: ${result.reason}`);
    return result;
  }

  if (!result.success) {
    throw new Error(result.error || 'Fundamentals sync failed');
  }

  const summary = result.summary;
  console.log(
    `[FUNDAMENTALS] processed=${summary.processed} success=${summary.succeeded} failed=${summary.failed}`
  );

  return result;
};

const shutdown = async (signal) => {
  console.log(`[FUNDAMENTALS] Received ${signal}, closing DB pool...`);
  stopFundamentalsSyncScheduler();
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[FUNDAMENTALS] Shutdown error: ${error.message}`);
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
      console.error(`[FUNDAMENTALS] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[FUNDAMENTALS] Watch mode started. interval=${INTERVAL_MS}ms`);

  startFundamentalsSyncScheduler({
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
