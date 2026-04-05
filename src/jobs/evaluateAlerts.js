const {
  runAlertEvaluationNow,
  startAlertEvaluatorScheduler,
  stopAlertEvaluatorScheduler,
} = require('./alertEvaluatorScheduler');
const { closePool } = require('../db/client');

const INTERVAL_MS = Number.parseInt(process.env.ALERT_EVALUATOR_INTERVAL_MS || '30000', 10);

const runOnce = async ({ ignoreMarketHours = false } = {}) => {
  const result = await runAlertEvaluationNow('cli-once', { ignoreMarketHours });

  if (result.skipped) {
    console.log(`[ALERT_EVALUATOR] Skipped: ${result.reason}`);
    return result;
  }

  if (!result.success) {
    throw new Error(result.error || 'Alert evaluator run failed');
  }

  const summary = result.summary;
  console.log(
    `[ALERT_EVALUATOR] active=${summary.activeAlertCount} checked=${summary.checkedCount} ` +
      `triggered=${summary.triggeredCount} skippedCooldown=${summary.skippedCooldownCount}`
  );

  return result;
};

const shutdown = async (signal) => {
  console.log(`[ALERT_EVALUATOR] Received ${signal}, closing DB pool...`);
  stopAlertEvaluatorScheduler();
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
        console.error(`[ALERT_EVALUATOR] Shutdown error: ${error.message}`);
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
      console.error(`[ALERT_EVALUATOR] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(
    `[ALERT_EVALUATOR] Watch mode started. interval=${INTERVAL_MS}ms ignoreMarketHours=${ignoreMarketHours}`
  );

  startAlertEvaluatorScheduler({
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
