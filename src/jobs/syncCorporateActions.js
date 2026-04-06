const { scrapeAndStoreCorporateActions } = require('../modules/institutional/institutional.service');
const { closePool } = require('../db/client');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_INTERVAL_MS = parsePositiveInt(
  process.env.CORPORATE_ACTIONS_SYNC_INTERVAL_MS,
  24 * 60 * 60 * 1000
);

const runOnce = async (trigger = 'cli-once') => {
  const summary = await scrapeAndStoreCorporateActions({
    source: 'job_sync_corporate_actions',
  });

  console.log(
    `[CORPORATE_ACTIONS_SYNC] trigger=${trigger} months=${summary.actionMonths.length} ` +
      `rows=${summary.rowCount} saved=${summary.savedCount}`
  );

  return summary;
};

const shutdown = async (signal) => {
  console.log(`[CORPORATE_ACTIONS_SYNC] Received ${signal}, closing DB pool...`);
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[CORPORATE_ACTIONS_SYNC] Shutdown error: ${error.message}`);
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
      console.error(`[CORPORATE_ACTIONS_SYNC] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[CORPORATE_ACTIONS_SYNC] Watch mode started. interval=${DEFAULT_INTERVAL_MS}ms`);

  const intervalHandle = setInterval(() => {
    runOnce('interval').catch((error) => {
      console.error(`[CORPORATE_ACTIONS_SYNC] Interval run failed: ${error.message}`);
    });
  }, DEFAULT_INTERVAL_MS);

  runOnce('startup').catch((error) => {
    console.error(`[CORPORATE_ACTIONS_SYNC] Startup run failed: ${error.message}`);
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
