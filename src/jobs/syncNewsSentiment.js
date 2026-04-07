const { recomputeNewsSentimentBatch } = require('../modules/news/news.service');
const { closePool } = require('../db/client');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_INTERVAL_MS = parsePositiveInt(
  process.env.NEWS_SENTIMENT_SYNC_INTERVAL_MS,
  30 * 60 * 1000
);

const runOnce = async (trigger = 'cli-once') => {
  const summary = await recomputeNewsSentimentBatch({
    source: `job_sync_news_sentiment:${trigger}`,
    hours: parsePositiveInt(process.env.NEWS_SENTIMENT_LOOKBACK_HOURS, 72),
    limit: parsePositiveInt(process.env.NEWS_SENTIMENT_BATCH_LIMIT, 1000),
  });

  console.log(
    `[NEWS_SENTIMENT] trigger=${trigger} processed=${summary.processed} updated=${summary.updated} ` +
      `fearGreed=${summary.fearGreed.score}(${summary.fearGreed.classification})`
  );

  return summary;
};

const shutdown = async (signal) => {
  console.log(`[NEWS_SENTIMENT] Received ${signal}, closing DB pool...`);
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[NEWS_SENTIMENT] Shutdown error: ${error.message}`);
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
      console.error(`[NEWS_SENTIMENT] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[NEWS_SENTIMENT] Watch mode started. interval=${DEFAULT_INTERVAL_MS}ms`);

  const intervalHandle = setInterval(() => {
    runOnce('interval').catch((error) => {
      console.error(`[NEWS_SENTIMENT] Interval run failed: ${error.message}`);
    });
  }, DEFAULT_INTERVAL_MS);

  runOnce('startup').catch((error) => {
    console.error(`[NEWS_SENTIMENT] Startup run failed: ${error.message}`);
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
