const {
  runTechnicalIndicatorRecomputeNow,
  startTechnicalIndicatorScheduler,
  stopTechnicalIndicatorScheduler,
} = require('./technicalIndicatorsScheduler');
const { closePool } = require('../db/client');

const INTERVAL_MS = Number.parseInt(process.env.TECHNICAL_INDICATOR_INTERVAL_MS || String(15 * 60 * 1000), 10);

const runOnce = async ({ ignoreMarketHours = false } = {}) => {
  const result = await runTechnicalIndicatorRecomputeNow('cli-once', {
    ignoreMarketHours,
  });

  if (result.skipped) {
    console.log(`[TECHNICAL_INDICATORS] Skipped: ${result.reason}`);
    return result;
  }

  if (!result.success) {
    throw new Error(result.error || 'Technical indicator recompute failed');
  }

  const summary = result.summary;
  console.log(
    `[TECHNICAL_INDICATORS] tasks=${summary.totalTasks} successes=${summary.successes} ` +
      `skipped=${summary.skipped} failures=${summary.failures}`
  );

  return result;
};

const shutdown = async (signal) => {
  console.log(`[TECHNICAL_INDICATORS] Received ${signal}, closing DB pool...`);
  stopTechnicalIndicatorScheduler();
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');
  const ignoreMarketHours = args.has('--ignore-market-hours') || args.has('--force');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[TECHNICAL_INDICATORS] Shutdown error: ${error.message}`);
        process.exit(1);
      });
    });
  });

  if (!watchMode) {
    try {
      await runOnce({ ignoreMarketHours });
      await closePool();
      process.exit(0);
    } catch (error) {
      console.error(`[TECHNICAL_INDICATORS] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(
    `[TECHNICAL_INDICATORS] Watch mode started. interval=${INTERVAL_MS}ms ignoreMarketHours=${ignoreMarketHours}`
  );

  startTechnicalIndicatorScheduler({
    enabled: true,
    intervalMs: INTERVAL_MS,
    runOnStart: true,
    forceRun: ignoreMarketHours,
  });
};

if (require.main === module) {
  main();
}

module.exports = {
  runOnce,
};
