const { scrapeAndStoreNews } = require('../modules/news/news.service');
const { closePool } = require('../db/client');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const DEFAULT_INTERVAL_MS = parsePositiveInt(
  process.env.NEWS_SYNC_INTERVAL_MS,
  15 * 60 * 1000
);

const runOnce = async (trigger = 'cli-once') => {
  const summary = await scrapeAndStoreNews({
    source: `job_sync_news:${trigger}`,
    days: parsePositiveInt(process.env.NEWS_SYNC_LOOKBACK_DAYS, 2),
    limitPerSource: parsePositiveInt(process.env.NEWS_SYNC_LIMIT_PER_SOURCE, 50),
    includeNewsApi: parseBoolean(process.env.NEWS_ENABLE_NEWSAPI, true),
    includeRss: parseBoolean(process.env.NEWS_ENABLE_RSS, true),
    includeSocial: parseBoolean(process.env.NEWS_ENABLE_SOCIAL_SENTIMENT, true),
  });

  console.log(
    `[NEWS_SYNC] trigger=${trigger} scraped=${summary.scrapedCount} normalized=${summary.normalizedCount} ` +
      `saved=${summary.savedCount} socialSaved=${summary.socialSavedCount} fearGreed=${summary.fearGreed.score}`
  );

  return summary;
};

const shutdown = async (signal) => {
  console.log(`[NEWS_SYNC] Received ${signal}, closing DB pool...`);
  await closePool();
  process.exit(0);
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const watchMode = args.has('--watch');

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error(`[NEWS_SYNC] Shutdown error: ${error.message}`);
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
      console.error(`[NEWS_SYNC] Failed: ${error.message}`);
      await closePool();
      process.exit(1);
    }
  }

  console.log(`[NEWS_SYNC] Watch mode started. interval=${DEFAULT_INTERVAL_MS}ms`);

  const intervalHandle = setInterval(() => {
    runOnce('interval').catch((error) => {
      console.error(`[NEWS_SYNC] Interval run failed: ${error.message}`);
    });
  }, DEFAULT_INTERVAL_MS);

  runOnce('startup').catch((error) => {
    console.error(`[NEWS_SYNC] Startup run failed: ${error.message}`);
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
