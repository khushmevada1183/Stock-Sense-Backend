const {
  runLiveTickStreamNow,
  startLiveTickStreamScheduler,
  stopLiveTickStreamScheduler,
} = require('../realtime/liveTickStreamer');
const { closePool } = require('../db/client');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_INTERVAL_MS = parsePositiveInt(process.env.LIVE_TICK_STREAM_INTERVAL_MS, 15000);

const runOnce = async (trigger = 'cli-once') => {
  const result = await runLiveTickStreamNow(trigger, {
    includeDefaultSymbols: true,
    persistTicks: true,
  });

  if (result.skipped) {
    console.log(`[LIVE_TICK_STREAM] trigger=${trigger} skipped reason=${result.reason}`);
    return result;
  }

  if (!result.success) {
    throw new Error(result.error || 'live tick stream run failed');
  }

  const summary = result.summary || {};

  console.log(
    `[LIVE_TICK_STREAM] trigger=${trigger} symbols=${summary.symbolCount || 0} ` +
      `ticks=${summary.tickCount || 0} emitted=${summary.emittedCount || 0} ` +
      `persisted=${summary.persistedCount || 0} failures=${summary.failureCount || 0}`
  );

  return result;
};

const shutdown = async (signal) => {
  console.log(`[LIVE_TICK_STREAM] Received ${signal}, shutting down...`);
  stopLiveTickStreamScheduler();
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[LIVE_TICK_STREAM] Shutdown error: ${error.message}`);
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
      console.error(`[LIVE_TICK_STREAM] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[LIVE_TICK_STREAM] Watch mode started interval=${DEFAULT_INTERVAL_MS}ms`);

  startLiveTickStreamScheduler({
    enabled: true,
    runOnStart: true,
    intervalMs: DEFAULT_INTERVAL_MS,
    persistTicks: true,
    includeDefaultSymbols: true,
  });
};

if (require.main === module) {
  main();
}

module.exports = {
  runOnce,
};
