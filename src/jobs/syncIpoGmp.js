const { scrapeAndStoreIpoGmp } = require('../modules/ipo/ipo.service');
const { closePool } = require('../db/client');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_INTERVAL_MS = parsePositiveInt(process.env.IPO_GMP_SYNC_INTERVAL_MS, 60 * 60 * 1000);

const runOnce = async (trigger = 'cli-once') => {
  const summary = await scrapeAndStoreIpoGmp({
    source: 'job_sync_ipo_gmp',
  });

  console.log(
    `[IPO_GMP_SYNC] trigger=${trigger} snapshotDate=${summary.snapshotDate} ` +
      `ipos=${summary.ipoCount} saved=${summary.savedCount}`
  );

  return summary;
};

const shutdown = async (signal) => {
  console.log(`[IPO_GMP_SYNC] Received ${signal}, closing DB pool...`);
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[IPO_GMP_SYNC] Shutdown error: ${error.message}`);
        process.exit(1);
      });
    });
  });

  if (!watchMode) {
    try {
      await runOnce('cli-once');
      await closePool();
      process.exit(0);
    } catch (error) {
      console.error(`[IPO_GMP_SYNC] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[IPO_GMP_SYNC] Watch mode started. interval=${DEFAULT_INTERVAL_MS}ms`);

  const intervalHandle = setInterval(() => {
    runOnce('interval').catch((error) => {
      console.error(`[IPO_GMP_SYNC] Interval run failed: ${error.message}`);
    });
  }, DEFAULT_INTERVAL_MS);

  runOnce('startup').catch((error) => {
    console.error(`[IPO_GMP_SYNC] Startup run failed: ${error.message}`);
  });

  process.on('exit', () => {
    clearInterval(intervalHandle);
  });
};

if (require.main === module) {
  main();
}

module.exports = {
  runOnce,
};
