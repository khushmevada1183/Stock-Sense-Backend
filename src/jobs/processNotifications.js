const {
  runNotificationDeliveryNow,
  startNotificationDeliveryScheduler,
  stopNotificationDeliveryScheduler,
} = require('./notificationDeliveryScheduler');
const { closePool } = require('../db/client');

const INTERVAL_MS = Number.parseInt(process.env.NOTIFICATION_DELIVERY_INTERVAL_MS || '30000', 10);

const runOnce = async () => {
  const result = await runNotificationDeliveryNow('cli-once');

  if (result.skipped) {
    console.log(`[NOTIFICATION_DELIVERY] Skipped: ${result.reason}`);
    return result;
  }

  if (!result.success) {
    throw new Error(result.error || 'Notification delivery run failed');
  }

  const summary = result.summary;
  console.log(
    `[NOTIFICATION_DELIVERY] claimed=${summary.claimedCount} sent=${summary.sentCount} failed=${summary.failedCount}`
  );

  return result;
};

const shutdown = async (signal) => {
  console.log(`[NOTIFICATION_DELIVERY] Received ${signal}, closing DB pool...`);
  stopNotificationDeliveryScheduler();
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[NOTIFICATION_DELIVERY] Shutdown error: ${error.message}`);
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
      console.error(`[NOTIFICATION_DELIVERY] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[NOTIFICATION_DELIVERY] Watch mode started. interval=${INTERVAL_MS}ms`);

  startNotificationDeliveryScheduler({
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
