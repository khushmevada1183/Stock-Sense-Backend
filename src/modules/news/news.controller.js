const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  normalizeCategory,
  normalizeNewsFeedQuery,
  normalizeTrendingQuery,
  normalizeAlertsQuery,
  normalizeNewsSyncQuery,
  normalizeSentimentSyncQuery,
  normalizeFearGreedQuery,
  normalizeStockSentimentQuery,
} = require('./news.validation');
const {
  scrapeAndStoreNews,
  recomputeNewsSentimentBatch,
  getNewsFeed,
  getNewsByCategory,
  getTrendingNews,
  getNewsAlertsFeed,
  getFearGreedHistory,
  getStockSentiment,
} = require('./news.service');

const getFeed = asyncHandler(async (req, res) => {
  const query = normalizeNewsFeedQuery(req.query);
  const data = await getNewsFeed(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getFeedByCategory = asyncHandler(async (req, res) => {
  const category = normalizeCategory(req.params.category);
  const query = normalizeNewsFeedQuery(req.query);
  const data = await getNewsByCategory(category, query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getTrending = asyncHandler(async (req, res) => {
  const query = normalizeTrendingQuery(req.query);
  const data = await getTrendingNews(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getAlerts = asyncHandler(async (req, res) => {
  const query = normalizeAlertsQuery(req.query);
  const data = await getNewsAlertsFeed(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postSyncNews = asyncHandler(async (req, res) => {
  const query = normalizeNewsSyncQuery(req.query);

  const data = await scrapeAndStoreNews({
    source: 'api_sync_news',
    days: query.days,
    limitPerSource: query.limitPerSource,
    includeNewsApi: query.includeNewsApi,
    includeRss: query.includeRss,
    includeSocial: query.includeSocial,
    category: query.category,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const postSyncSentiment = asyncHandler(async (req, res) => {
  const query = normalizeSentimentSyncQuery(req.query);

  const data = await recomputeNewsSentimentBatch({
    source: 'api_sync_news_sentiment',
    hours: query.hours,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getFearGreedIndex = asyncHandler(async (req, res) => {
  const query = normalizeFearGreedQuery(req.query);
  const data = await getFearGreedHistory({ days: query.days });

  res.status(200).json({
    success: true,
    data,
  });
});

const getStockSentimentForSymbol = asyncHandler(async (req, res) => {
  const query = normalizeStockSentimentQuery(req.query);
  const data = await getStockSentiment(req.params.symbol, query);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getFeed,
  getFeedByCategory,
  getTrending,
  getAlerts,
  postSyncNews,
  postSyncSentiment,
  getFearGreedIndex,
  getStockSentimentForSymbol,
};
