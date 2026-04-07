/* eslint-disable no-console */

const { scrapeAndStoreNews, recomputeNewsSentimentBatch } = require('../../src/modules/news/news.service');
const { closePool } = require('../../src/db/client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

const requestJson = async (path) => {
  const response = await fetch(`${BASE_URL}${path}`);
  let body;

  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }

  return { response, body };
};

const assertStatus = (label, actual, expected) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

const run = async () => {
  const syncSummary = await scrapeAndStoreNews({
    source: 'smoke_sync_news',
    limitPerSource: 25,
    includeNewsApi: false,
    includeRss: false,
    includeSocial: true,
  });

  if (syncSummary.savedCount < 1) {
    throw new Error('expected at least one news article to be saved');
  }

  const sentimentSummary = await recomputeNewsSentimentBatch({
    source: 'smoke_sync_news_sentiment',
    hours: 168,
    limit: 200,
  });

  if (sentimentSummary.updated < 1) {
    throw new Error('expected at least one article sentiment update');
  }

  const feedResponse = await requestJson('/api/v1/news?limit=10');
  assertStatus('news feed', feedResponse.response.status, 200);

  const feedRows = feedResponse.body?.data?.articles || [];
  if (feedRows.length < 1) {
    throw new Error('expected news feed rows');
  }

  const trendingResponse = await requestJson('/api/v1/news/trending?hours=48&limit=10');
  assertStatus('news trending', trendingResponse.response.status, 200);

  const fearGreedResponse = await requestJson('/api/v1/news/fear-greed?days=7');
  assertStatus('fear greed', fearGreedResponse.response.status, 200);

  const fearGreedLatest = fearGreedResponse.body?.data?.latest;
  if (!fearGreedLatest) {
    throw new Error('expected latest fear greed snapshot');
  }

  const symbol = feedRows.find((row) => Array.isArray(row.symbols) && row.symbols.length > 0)?.symbols?.[0];
  if (!symbol) {
    throw new Error('expected at least one news row with extracted symbol');
  }

  const stockSentimentResponse = await requestJson(`/api/v1/stocks/${symbol}/sentiment?days=30`);
  assertStatus('stock sentiment', stockSentimentResponse.response.status, 200);

  const stockSummary = stockSentimentResponse.body?.data?.summary;
  if (!stockSummary || typeof stockSummary.total !== 'number') {
    throw new Error('expected stock sentiment summary data');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        savedNews: syncSummary.savedCount,
        socialSnapshots: syncSummary.socialSavedCount,
        sentimentUpdated: sentimentSummary.updated,
        feedCount: feedRows.length,
        fearGreedScore: fearGreedLatest.score,
        symbol,
      },
      null,
      2
    )
  );
};

run()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
