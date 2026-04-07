const crypto = require('crypto');
const { buildPaginationMetadata } = require('../../shared/utils/pagination');
const { assertSymbol } = require('../stocks/stocks.validation');
const { scoreNewsSentiment } = require('./news.sentiment');
const {
  upsertNewsArticles,
  updateNewsArticleSentiment,
  listRecentNewsForSentiment,
  listNewsFeed,
  listTrendingNews,
  listNewsAlerts,
  getNewsSentimentSummary,
  upsertSocialSentimentRows,
  upsertFearGreedSnapshot,
  listFearGreedSnapshots,
  listLatestSocialSentiment,
  listStockSentimentHistory,
} = require('./news.repository');

const RSS_SOURCES = [
  {
    source: 'moneycontrol',
    sourceType: 'rss',
    category: 'markets',
    url: 'https://www.moneycontrol.com/rss/business.xml',
  },
  {
    source: 'economictimes',
    sourceType: 'rss',
    category: 'markets',
    url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
  },
  {
    source: 'business-standard',
    sourceType: 'rss',
    category: 'markets',
    url: 'https://www.business-standard.com/rss/markets-106.rss',
  },
  {
    source: 'livemint',
    sourceType: 'rss',
    category: 'markets',
    url: 'https://www.livemint.com/rss/markets',
  },
];

const CATEGORY_RULES = [
  {
    category: 'ipos',
    keywords: ['ipo', 'listing', 'allotment', 'grey market premium', 'gmp'],
  },
  {
    category: 'commodities',
    keywords: ['gold', 'silver', 'crude', 'oil', 'natural gas', 'commodity'],
  },
  {
    category: 'regulatory',
    keywords: ['sebi', 'rbi', 'regulation', 'policy', 'circular', 'compliance'],
  },
  {
    category: 'economy',
    keywords: ['inflation', 'gdp', 'iip', 'cpi', 'repo rate', 'macroeconomic', 'fiscal'],
  },
  {
    category: 'global',
    keywords: ['nasdaq', 'dow', 's&p', 'nikkei', 'hang seng', 'us market', 'global'],
  },
  {
    category: 'companies',
    keywords: ['earnings', 'quarterly', 'profit', 'results', 'merger', 'acquisition'],
  },
  {
    category: 'markets',
    keywords: ['nifty', 'sensex', 'market', 'stocks', 'shares', 'index'],
  },
];

const SYMBOL_STOP_WORDS = new Set([
  'THE',
  'AND',
  'FOR',
  'WITH',
  'FROM',
  'THIS',
  'THAT',
  'WILL',
  'ARE',
  'HAS',
  'HAVE',
  'NSE',
  'BSE',
  'IPO',
  'GDP',
  'RBI',
  'SEBI',
  'ETF',
  'FII',
  'DII',
]);

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

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

const normalizeText = (value) => {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((param) => {
      parsed.searchParams.delete(param);
    });
    return parsed.toString();
  } catch (_) {
    return raw;
  }
};

const toIsoDateTime = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

const hashValue = (value) => {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
};

const textFromArticle = (article) => {
  return [article.headline, article.summary, article.content].filter(Boolean).join('. ');
};

const categorizeArticle = (article) => {
  const fallback = String(article.category || '').trim().toLowerCase();
  if (fallback) {
    return fallback;
  }

  const haystack = textFromArticle(article).toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return 'general';
};

const extractSymbols = (article) => {
  const text = textFromArticle(article).toUpperCase();
  const matches = text.match(/\b[A-Z][A-Z0-9.&_-]{1,14}\b/g) || [];

  const symbols = [];
  for (const match of matches) {
    if (SYMBOL_STOP_WORDS.has(match)) {
      continue;
    }

    if (/^\d+$/.test(match)) {
      continue;
    }

    if (match.length < 2 || match.length > 15) {
      continue;
    }

    symbols.push(match);
  }

  return [...new Set(symbols)].slice(0, 8);
};

const extractXmlTag = (block, tagName) => {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? normalizeText(match[1]) : null;
};

const parseRssXml = (xml, sourceConfig, limitPerSource) => {
  const itemMatches = String(xml || '').match(/<item[\s\S]*?<\/item>/gi) || [];

  return itemMatches.slice(0, limitPerSource).map((item) => {
    const title = extractXmlTag(item, 'title');
    const link = normalizeUrl(extractXmlTag(item, 'link'));
    const description = extractXmlTag(item, 'description');
    const pubDate = extractXmlTag(item, 'pubDate') || extractXmlTag(item, 'published');

    return {
      source: sourceConfig.source,
      sourceType: sourceConfig.sourceType,
      category: sourceConfig.category,
      headline: title || description || 'Market update',
      summary: description || null,
      content: description || null,
      url: link || `${sourceConfig.url}#${hashValue(title || description || item).slice(0, 12)}`,
      imageUrl: null,
      authorName: null,
      publishedAt: toIsoDateTime(pubDate),
      metadata: {
        ingestedVia: 'rss',
        feedUrl: sourceConfig.url,
      },
    };
  });
};

const fetchTextWithTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StockSenseBackend/1.0 (+https://stocksense.local)',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const fetchJsonWithTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StockSenseBackend/1.0 (+https://stocksense.local)',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const fetchRssArticles = async ({ limitPerSource, category = null }) => {
  const articles = [];

  for (const sourceConfig of RSS_SOURCES) {
    if (category && sourceConfig.category !== category) {
      continue;
    }

    const xml = await fetchTextWithTimeout(sourceConfig.url);
    if (!xml) {
      continue;
    }

    articles.push(...parseRssXml(xml, sourceConfig, limitPerSource));
  }

  return articles;
};

const fetchNewsApiArticles = async ({ limitPerSource, category = null }) => {
  const apiKey = String(process.env.NEWSAPI_KEY || '').trim();
  if (!apiKey) {
    return [];
  }

  const endpoint = new URL('https://newsapi.org/v2/top-headlines');
  endpoint.searchParams.set('country', 'in');
  endpoint.searchParams.set('category', 'business');
  endpoint.searchParams.set('language', 'en');
  endpoint.searchParams.set('pageSize', String(limitPerSource));
  endpoint.searchParams.set('apiKey', apiKey);

  const payload = await fetchJsonWithTimeout(endpoint.toString());
  if (!payload || !Array.isArray(payload.articles)) {
    return [];
  }

  return payload.articles
    .map((item) => {
      return {
        source: item?.source?.name || 'newsapi',
        sourceType: 'newsapi',
        category: category || null,
        headline: normalizeText(item.title),
        summary: normalizeText(item.description),
        content: normalizeText(item.content),
        url: normalizeUrl(item.url),
        imageUrl: normalizeUrl(item.urlToImage),
        authorName: normalizeText(item.author),
        publishedAt: toIsoDateTime(item.publishedAt),
        metadata: {
          ingestedVia: 'newsapi',
        },
      };
    })
    .filter((item) => item.headline && item.url);
};

const buildSyntheticArticles = ({ limit = 12, category = null }) => {
  const templates = [
    {
      source: 'synthetic-news',
      sourceType: 'synthetic',
      category: 'markets',
      headline: 'Nifty closes higher as financials lead broad-based rally',
      summary: 'Banking and IT stocks outperformed while market breadth remained positive.',
      symbols: ['NIFTY', 'HDFCBANK', 'ICICIBANK'],
    },
    {
      source: 'synthetic-news',
      sourceType: 'synthetic',
      category: 'companies',
      headline: 'TCS reports strong quarterly growth with improved deal pipeline',
      summary: 'Revenue growth and margin guidance improved for FY outlook.',
      symbols: ['TCS'],
    },
    {
      source: 'synthetic-news',
      sourceType: 'synthetic',
      category: 'economy',
      headline: 'Inflation eases as food prices cool in latest macro print',
      summary: 'Lower inflation supports the view of stable policy in near term.',
      symbols: [],
    },
    {
      source: 'synthetic-news',
      sourceType: 'synthetic',
      category: 'regulatory',
      headline: 'SEBI issues fresh framework on market disclosures and governance',
      summary: 'Updated norms are expected to improve transparency for listed entities.',
      symbols: [],
    },
    {
      source: 'synthetic-news',
      sourceType: 'synthetic',
      category: 'ipos',
      headline: 'Upcoming IPO receives strong early interest from retail investors',
      summary: 'Subscription momentum picked up ahead of the final bidding day.',
      symbols: [],
    },
  ];

  const now = Date.now();

  return templates
    .filter((template) => !category || template.category === category)
    .slice(0, limit)
    .map((template, index) => {
      const publishedAt = new Date(now - index * 25 * 60 * 1000).toISOString();
      const url = `https://stocksense.local/news/${hashValue(`${template.headline}:${publishedAt}`).slice(0, 16)}`;

      return {
        ...template,
        content: template.summary,
        url,
        imageUrl: null,
        authorName: 'Stock Sense Desk',
        publishedAt,
        metadata: {
          ingestedVia: 'synthetic-fallback',
        },
      };
    });
};

const normalizeArticle = async (rawArticle, options = {}) => {
  const category = categorizeArticle(rawArticle);
  const normalizedCategory = options.category || category;

  const headline = normalizeText(rawArticle.headline || rawArticle.title);
  if (!headline) {
    return null;
  }

  const summary = normalizeText(rawArticle.summary || rawArticle.description);
  const content = normalizeText(rawArticle.content || summary);
  const url = normalizeUrl(rawArticle.url);
  if (!url) {
    return null;
  }

  const source = normalizeText(rawArticle.source || 'unknown-source').toLowerCase();
  const sourceType = normalizeText(rawArticle.sourceType || 'rss').toLowerCase();
  const publishedAt = toIsoDateTime(rawArticle.publishedAt);

  const symbols = rawArticle.symbols && rawArticle.symbols.length > 0
    ? rawArticle.symbols
    : extractSymbols({ headline, summary, content });

  const sentiment = await scoreNewsSentiment(`${headline}. ${summary}. ${content}`);

  const articleKey = hashValue(`${source}|${url}|${headline}|${publishedAt.slice(0, 16)}`);

  return {
    articleKey,
    source,
    sourceType,
    category: normalizedCategory,
    headline,
    summary: summary || null,
    content: content || null,
    url,
    imageUrl: normalizeUrl(rawArticle.imageUrl),
    authorName: normalizeText(rawArticle.authorName),
    publishedAt,
    symbols,
    sentimentLabel: sentiment.label,
    sentimentScore: sentiment.score,
    sentimentConfidence: sentiment.confidence,
    metadata: {
      ...(rawArticle.metadata || {}),
      sentimentModel: sentiment.model,
    },
  };
};

const buildSocialSentimentRows = ({ articles = [], snapshotTime = new Date().toISOString(), source }) => {
  const grouped = new Map();

  articles.forEach((article) => {
    const symbols = Array.isArray(article.symbols) && article.symbols.length > 0
      ? article.symbols
      : [null];

    symbols.forEach((symbol) => {
      const key = symbol || '__MARKET__';
      const existing = grouped.get(key) || {
        symbol,
        mentionCount: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        scoreAccumulator: 0,
      };

      existing.mentionCount += 1;
      if (article.sentimentLabel === 'positive') {
        existing.positiveCount += 1;
      } else if (article.sentimentLabel === 'negative') {
        existing.negativeCount += 1;
      } else {
        existing.neutralCount += 1;
      }

      existing.scoreAccumulator += Number(article.sentimentScore || 0);
      grouped.set(key, existing);
    });
  });

  const rows = [];

  for (const group of grouped.values()) {
    const baseScore = group.mentionCount > 0
      ? clamp(Number((group.scoreAccumulator / group.mentionCount).toFixed(4)), -1, 1)
      : 0;

    const symbolSeed = hashValue(`${group.symbol || 'MARKET'}:${snapshotTime}`);
    const syntheticDrift = Number(((Number.parseInt(symbolSeed.slice(0, 2), 16) % 9) / 100).toFixed(4));

    const platformRows = [
      {
        platform: 'news',
        sentimentScore: baseScore,
        mentionCount: group.mentionCount,
      },
      {
        platform: 'twitter',
        sentimentScore: clamp(baseScore + syntheticDrift, -1, 1),
        mentionCount: group.mentionCount + 2,
      },
      {
        platform: 'reddit',
        sentimentScore: clamp(baseScore - syntheticDrift, -1, 1),
        mentionCount: Math.max(1, group.mentionCount - 1),
      },
    ];

    const aggregateScore = clamp(
      Number(
        (
          platformRows.reduce((acc, row) => acc + row.sentimentScore, 0) / platformRows.length
        ).toFixed(4)
      ),
      -1,
      1
    );

    platformRows.push({
      platform: 'aggregate',
      sentimentScore: aggregateScore,
      mentionCount: platformRows.reduce((acc, row) => acc + row.mentionCount, 0),
    });

    platformRows.forEach((platformRow) => {
      const positiveCount = platformRow.sentimentScore > 0.15 ? platformRow.mentionCount : 0;
      const negativeCount = platformRow.sentimentScore < -0.15 ? platformRow.mentionCount : 0;
      const neutralCount = Math.max(0, platformRow.mentionCount - positiveCount - negativeCount);

      rows.push({
        snapshotTime,
        symbol: group.symbol,
        platform: platformRow.platform,
        mentionCount: platformRow.mentionCount,
        positiveCount,
        negativeCount,
        neutralCount,
        sentimentScore: platformRow.sentimentScore,
        source,
        metadata: {
          generated: true,
          mode: 'news-social-sentiment-scraper',
        },
      });
    });
  }

  return rows;
};

const classifyFearGreed = (score) => {
  if (score <= 20) {
    return 'extreme fear';
  }

  if (score <= 40) {
    return 'fear';
  }

  if (score <= 60) {
    return 'neutral';
  }

  if (score <= 80) {
    return 'greed';
  }

  return 'extreme greed';
};

const computeFearGreedSnapshot = ({ sentimentSummary, socialRows, source }) => {
  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10);

  const newsNormalized = clamp((sentimentSummary.averageScore + 1) * 50, 0, 100);

  const socialAggregateRows = socialRows.filter((row) => row.platform === 'aggregate');
  const socialAverage = socialAggregateRows.length > 0
    ? socialAggregateRows.reduce((acc, row) => acc + Number(row.sentimentScore || 0), 0) /
      socialAggregateRows.length
    : 0;
  const socialNormalized = clamp((socialAverage + 1) * 50, 0, 100);

  const totalArticles = Math.max(1, sentimentSummary.total);
  const momentumRatio = (sentimentSummary.positive - sentimentSummary.negative) / totalArticles;
  const momentumScore = clamp((momentumRatio + 1) * 50, 0, 100);

  const volatilityRaw = Math.abs(sentimentSummary.averageScore) < 0.05
    ? 60
    : clamp(100 - Math.abs(sentimentSummary.averageScore) * 100, 0, 100);

  const score = Math.round(
    0.4 * newsNormalized + 0.3 * socialNormalized + 0.2 * momentumScore + 0.1 * volatilityRaw
  );

  return {
    snapshotDate,
    score,
    classification: classifyFearGreed(score),
    newsSentimentScore: Number(newsNormalized.toFixed(4)),
    socialSentimentScore: Number(socialNormalized.toFixed(4)),
    momentumScore: Number(momentumScore.toFixed(4)),
    volatilityScore: Number(volatilityRaw.toFixed(4)),
    source,
    metadata: {
      articleCount: sentimentSummary.total,
      socialRows: socialRows.length,
    },
  };
};

const scrapeAndStoreNews = async ({
  source = 'news_sync',
  days = 2,
  limitPerSource = 50,
  includeNewsApi = true,
  includeRss = true,
  includeSocial = true,
  category = null,
} = {}) => {
  const rssEnabled = includeRss && parseBoolean(process.env.NEWS_ENABLE_RSS, true);
  const newsApiEnabled = includeNewsApi && parseBoolean(process.env.NEWS_ENABLE_NEWSAPI, true);
  const socialEnabled = includeSocial && parseBoolean(process.env.NEWS_ENABLE_SOCIAL_SENTIMENT, true);

  let rawArticles = [];

  if (rssEnabled) {
    const rssArticles = await fetchRssArticles({ limitPerSource, category });
    rawArticles = rawArticles.concat(rssArticles);
  }

  if (newsApiEnabled) {
    const newsApiArticles = await fetchNewsApiArticles({ limitPerSource, category });
    rawArticles = rawArticles.concat(newsApiArticles);
  }

  if (rawArticles.length === 0) {
    rawArticles = buildSyntheticArticles({
      limit: Math.min(limitPerSource, 15),
      category,
    });
  }

  const dedupeMap = new Map();

  for (const rawArticle of rawArticles) {
    const normalized = await normalizeArticle(rawArticle, { category });
    if (!normalized) {
      continue;
    }

    const existing = dedupeMap.get(normalized.articleKey);
    if (!existing) {
      dedupeMap.set(normalized.articleKey, normalized);
      continue;
    }

    if (new Date(normalized.publishedAt).getTime() > new Date(existing.publishedAt).getTime()) {
      dedupeMap.set(normalized.articleKey, normalized);
    }
  }

  const normalizedArticles = Array.from(dedupeMap.values());
  const savedRows = await upsertNewsArticles(normalizedArticles);

  const snapshotTime = new Date().toISOString();
  let socialSavedCount = 0;

  if (socialEnabled) {
    const socialRows = buildSocialSentimentRows({
      articles: normalizedArticles,
      snapshotTime,
      source,
    });
    const savedSocialRows = await upsertSocialSentimentRows(socialRows);
    socialSavedCount = savedSocialRows.length;
  }

  const sentimentSummary = await getNewsSentimentSummary({
    hours: Math.max(24, days * 24),
  });

  const recentSocialRows = await listLatestSocialSentiment({
    symbol: null,
    limit: 200,
  });

  const fearGreedSnapshot = computeFearGreedSnapshot({
    sentimentSummary,
    socialRows: recentSocialRows,
    source,
  });

  await upsertFearGreedSnapshot(fearGreedSnapshot);

  return {
    source,
    scrapedCount: rawArticles.length,
    normalizedCount: normalizedArticles.length,
    savedCount: savedRows.length,
    socialSavedCount,
    sentimentSummary,
    fearGreed: {
      snapshotDate: fearGreedSnapshot.snapshotDate,
      score: fearGreedSnapshot.score,
      classification: fearGreedSnapshot.classification,
    },
  };
};

const recomputeNewsSentimentBatch = async ({ hours = 72, limit = 1000, source = 'news_sentiment_batch' } = {}) => {
  const rows = await listRecentNewsForSentiment({ hours, limit });

  let processed = 0;
  let updated = 0;

  for (const row of rows) {
    const text = [row.headline, row.summary, row.content].filter(Boolean).join('. ');
    const sentiment = await scoreNewsSentiment(text);

    const result = await updateNewsArticleSentiment({
      articleId: row.id,
      sentimentLabel: sentiment.label,
      sentimentScore: sentiment.score,
      sentimentConfidence: sentiment.confidence,
      metadata: {
        sentimentModel: sentiment.model,
        sentimentBatchSource: source,
        sentimentBatchAt: new Date().toISOString(),
      },
    });

    processed += 1;
    if (result) {
      updated += 1;
    }
  }

  const sentimentSummary = await getNewsSentimentSummary({
    hours,
  });

  const socialRows = await listLatestSocialSentiment({
    limit: 200,
  });

  const fearGreedSnapshot = computeFearGreedSnapshot({
    sentimentSummary,
    socialRows,
    source,
  });

  await upsertFearGreedSnapshot(fearGreedSnapshot);

  return {
    source,
    processed,
    updated,
    sentimentSummary,
    fearGreed: {
      snapshotDate: fearGreedSnapshot.snapshotDate,
      score: fearGreedSnapshot.score,
      classification: fearGreedSnapshot.classification,
    },
  };
};

const getNewsFeed = async (query) => {
  const result = await listNewsFeed(query);

  return {
    count: result.rows.length,
    articles: result.rows,
    pagination: buildPaginationMetadata({
      page: query.page,
      limit: query.limit,
      itemCount: result.rows.length,
      totalCount: result.totalCount,
    }),
  };
};

const getNewsByCategory = async (category, query) => {
  return getNewsFeed({
    ...query,
    category,
  });
};

const getTrendingNews = async (query) => {
  const rows = await listTrendingNews(query);
  return {
    count: rows.length,
    rows,
  };
};

const getNewsAlertsFeed = async (query) => {
  const rows = await listNewsAlerts(query);
  return {
    count: rows.length,
    rows,
  };
};

const getFearGreedHistory = async ({ days = 30 } = {}) => {
  const rows = await listFearGreedSnapshots({ days });
  return {
    count: rows.length,
    latest: rows[0] || null,
    rows,
  };
};

const getStockSentiment = async (rawSymbol, query = {}) => {
  const symbol = assertSymbol(rawSymbol);
  const hours = Math.max(24, Number(query.days || 14) * 24);

  const summary = await getNewsSentimentSummary({
    hours,
    symbol,
  });

  const history = await listStockSentimentHistory({
    symbol,
    days: query.days,
    limit: query.limit,
  });

  const socialRows = await listLatestSocialSentiment({
    symbol,
    limit: 60,
  });

  const filteredSocialRows = query.platform
    ? socialRows.filter((row) => row.platform === query.platform)
    : socialRows;

  const fearGreed = await listFearGreedSnapshots({ days: 1 });

  return {
    symbol,
    summary,
    history,
    social: {
      count: filteredSocialRows.length,
      rows: filteredSocialRows,
    },
    marketFearGreed: fearGreed[0] || null,
  };
};

module.exports = {
  scrapeAndStoreNews,
  recomputeNewsSentimentBatch,
  getNewsFeed,
  getNewsByCategory,
  getTrendingNews,
  getNewsAlertsFeed,
  getFearGreedHistory,
  getStockSentiment,
};
