const { query } = require('../../db/client');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeSymbol = (value) => String(value || '').trim().toUpperCase();

const normalizeSymbolList = (values = []) => {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => normalizeSymbol(value))
      .filter(Boolean)
  ));
};

let newsArticleSymbolsBridgeAvailable;

const isNewsArticleSymbolsBridgeAvailable = async () => {
  if (typeof newsArticleSymbolsBridgeAvailable === 'boolean') {
    return newsArticleSymbolsBridgeAvailable;
  }

  try {
    const result = await query(`
      SELECT to_regclass('public.news_article_symbols') IS NOT NULL AS available;
    `);

    newsArticleSymbolsBridgeAvailable = Boolean(result.rows[0]?.available);
  } catch (_error) {
    newsArticleSymbolsBridgeAvailable = false;
  }

  return newsArticleSymbolsBridgeAvailable;
};

const buildSymbolFilterClause = (parameterIndex, useBridgeTable) => {
  const legacyClause = `$${parameterIndex} = ANY(symbols)`;

  if (!useBridgeTable) {
    return legacyClause;
  }

  return `(
    EXISTS (
      SELECT 1
      FROM news_article_symbols nas
      WHERE nas.article_id = news_articles.id
        AND nas.symbol = $${parameterIndex}
    )
    OR ${legacyClause}
  )`;
};

const syncNewsArticleSymbols = async (articleId, symbols = []) => {
  const normalizedSymbols = normalizeSymbolList(symbols);

  try {
    await query(
      `
        DELETE FROM news_article_symbols
        WHERE article_id = $1::uuid;
      `,
      [articleId]
    );

    if (normalizedSymbols.length === 0) {
      return;
    }

    const values = [articleId];

    const placeholders = normalizedSymbols.map((symbol, index) => {
      values.push(symbol);
      const symbolParam = index + 2;
      return `($1::uuid, $${symbolParam}, 1)`;
    });

    await query(
      `
        INSERT INTO news_article_symbols (article_id, symbol, relevance_score)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (article_id, symbol)
        DO UPDATE SET relevance_score = EXCLUDED.relevance_score;
      `,
      values
    );
  } catch (error) {
    if (error.code === '42P01') {
      return;
    }

    throw error;
  }
};

const buildNewsWhereClause = ({
  category = null,
  sentiment = null,
  source = null,
  symbol = null,
  fromDate = null,
  toDate = null,
  queryText = null,
} = {}, useBridgeTable = false) => {
  const clauses = [];
  const values = [];

  if (category) {
    values.push(category);
    clauses.push(`category = $${values.length}`);
  }

  if (sentiment) {
    values.push(sentiment);
    clauses.push(`sentiment_label = $${values.length}`);
  }

  if (source) {
    values.push(`%${source}%`);
    clauses.push(`source ILIKE $${values.length}`);
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(buildSymbolFilterClause(values.length, useBridgeTable));
  }

  if (fromDate) {
    values.push(fromDate);
    clauses.push(`published_at >= $${values.length}::date`);
  }

  if (toDate) {
    values.push(toDate);
    clauses.push(`published_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  if (queryText) {
    values.push(queryText);
    clauses.push(
      `to_tsvector('english', COALESCE(headline, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(content, '')) @@ plainto_tsquery('english', $${values.length})`
    );
  }

  return {
    values,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
  };
};

const upsertNewsArticles = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO news_articles (
          article_key,
          source,
          source_type,
          category,
          headline,
          summary,
          content,
          url,
          image_url,
          author_name,
          published_at,
          symbols,
          sentiment_label,
          sentiment_score,
          sentiment_confidence,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::timestamptz,
          $12::text[],
          $13,
          $14,
          $15,
          $16::jsonb
        )
        ON CONFLICT (article_key)
        DO UPDATE SET
          source = EXCLUDED.source,
          source_type = EXCLUDED.source_type,
          category = EXCLUDED.category,
          headline = EXCLUDED.headline,
          summary = EXCLUDED.summary,
          content = EXCLUDED.content,
          url = EXCLUDED.url,
          image_url = EXCLUDED.image_url,
          author_name = EXCLUDED.author_name,
          published_at = EXCLUDED.published_at,
          symbols = EXCLUDED.symbols,
          sentiment_label = EXCLUDED.sentiment_label,
          sentiment_score = EXCLUDED.sentiment_score,
          sentiment_confidence = EXCLUDED.sentiment_confidence,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.articleKey,
        row.source,
        row.sourceType,
        row.category,
        row.headline,
        row.summary,
        row.content,
        row.url,
        row.imageUrl,
        row.authorName,
        row.publishedAt,
        row.symbols || [],
        row.sentimentLabel,
        row.sentimentScore,
        row.sentimentConfidence,
        JSON.stringify(row.metadata || {}),
      ]
    );

    await syncNewsArticleSymbols(result.rows[0].id, row.symbols || []);

    saved.push(result.rows[0]);
  }

  return saved;
};

const updateNewsArticleSentiment = async ({
  articleId,
  sentimentLabel,
  sentimentScore,
  sentimentConfidence,
  metadata = {},
}) => {
  const result = await query(
    `
      UPDATE news_articles
      SET
        sentiment_label = $2,
        sentiment_score = $3,
        sentiment_confidence = $4,
        metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id::text AS id;
    `,
    [
      articleId,
      sentimentLabel,
      sentimentScore,
      sentimentConfidence,
      JSON.stringify(metadata),
    ]
  );

  return result.rows[0] || null;
};

const listRecentNewsForSentiment = async ({ hours = 72, limit = 1000 } = {}) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        headline,
        summary,
        content,
        metadata
      FROM news_articles
      WHERE published_at >= NOW() - ($1::int || ' hours')::interval
      ORDER BY published_at DESC
      LIMIT $2;
    `,
    [toPositiveInt(hours, 72), toPositiveInt(limit, 1000)]
  );

  return result.rows;
};

const listNewsFeed = async ({
  category = null,
  sentiment = null,
  source = null,
  symbol = null,
  fromDate = null,
  toDate = null,
  queryText = null,
  limit = 25,
  offset = 0,
} = {}) => {
  const useBridgeTable = await isNewsArticleSymbolsBridgeAvailable();
  const filters = buildNewsWhereClause({
    category,
    sentiment,
    source,
    symbol,
    fromDate,
    toDate,
    queryText,
  }, useBridgeTable);

  const values = [...filters.values, toPositiveInt(limit, 25), Math.max(0, offset)];

  const result = await query(
    `
      SELECT
        id::text AS id,
        source,
        source_type AS "sourceType",
        category,
        headline,
        summary,
        content,
        url,
        image_url AS "imageUrl",
        author_name AS "authorName",
        published_at AS "publishedAt",
        symbols,
        sentiment_label AS "sentimentLabel",
        sentiment_score AS "sentimentScore",
        sentiment_confidence AS "sentimentConfidence",
        metadata,
        COUNT(*) OVER()::int AS total_count
      FROM news_articles
      ${filters.whereClause}
      ORDER BY published_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length};
    `,
    values
  );

  const rows = result.rows.map(({ total_count: _ignored, ...row }) => row);
  const totalCount = result.rows.length > 0 ? Number(result.rows[0].total_count || 0) : 0;

  return {
    rows,
    totalCount,
  };
};

const listTrendingNews = async ({ hours = 24, limit = 20, category = null, symbol = null } = {}) => {
  const useBridgeTable = await isNewsArticleSymbolsBridgeAvailable();
  const clauses = [`published_at >= NOW() - ($1::int || ' hours')::interval`];
  const values = [toPositiveInt(hours, 24)];

  if (category) {
    values.push(category);
    clauses.push(`category = $${values.length}`);
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(buildSymbolFilterClause(values.length, useBridgeTable));
  }

  values.push(toPositiveInt(limit, 20));

  const result = await query(
    `
      SELECT
        id::text AS id,
        source,
        source_type AS "sourceType",
        category,
        headline,
        summary,
        url,
        image_url AS "imageUrl",
        published_at AS "publishedAt",
        symbols,
        sentiment_label AS "sentimentLabel",
        sentiment_score AS "sentimentScore",
        sentiment_confidence AS "sentimentConfidence",
        metadata,
        (ABS(sentiment_score) * GREATEST(sentiment_confidence, 0.01)) AS impact_score
      FROM news_articles
      WHERE ${clauses.join(' AND ')}
      ORDER BY impact_score DESC, published_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listNewsAlerts = async ({
  hours = 12,
  limit = 20,
  minConfidence = 0.65,
  minScore = 0.4,
  symbol = null,
} = {}) => {
  const useBridgeTable = await isNewsArticleSymbolsBridgeAvailable();
  const clauses = [
    `published_at >= NOW() - ($1::int || ' hours')::interval`,
    `sentiment_confidence >= $2`,
    `ABS(sentiment_score) >= $3`,
  ];
  const values = [toPositiveInt(hours, 12), minConfidence, minScore];

  if (symbol) {
    values.push(symbol);
    clauses.push(buildSymbolFilterClause(values.length, useBridgeTable));
  }

  values.push(toPositiveInt(limit, 20));

  const result = await query(
    `
      SELECT
        id::text AS id,
        source,
        category,
        headline,
        summary,
        url,
        published_at AS "publishedAt",
        symbols,
        sentiment_label AS "sentimentLabel",
        sentiment_score AS "sentimentScore",
        sentiment_confidence AS "sentimentConfidence",
        metadata
      FROM news_articles
      WHERE ${clauses.join(' AND ')}
      ORDER BY ABS(sentiment_score) DESC, sentiment_confidence DESC, published_at DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const getNewsSentimentSummary = async ({ hours = 24, symbol = null } = {}) => {
  const useBridgeTable = await isNewsArticleSymbolsBridgeAvailable();
  const values = [toPositiveInt(hours, 24)];
  const clauses = [`published_at >= NOW() - ($1::int || ' hours')::interval`];

  if (symbol) {
    values.push(symbol);
    clauses.push(buildSymbolFilterClause(values.length, useBridgeTable));
  }

  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sentiment_label = 'positive')::int AS positive,
        COUNT(*) FILTER (WHERE sentiment_label = 'negative')::int AS negative,
        COUNT(*) FILTER (WHERE sentiment_label = 'neutral')::int AS neutral,
        COALESCE(AVG(sentiment_score), 0)::numeric(10,4) AS avg_score,
        COALESCE(AVG(sentiment_confidence), 0)::numeric(10,4) AS avg_confidence
      FROM news_articles
      WHERE ${clauses.join(' AND ')};
    `,
    values
  );

  const row = result.rows[0] || {};

  return {
    total: Number(row.total || 0),
    positive: Number(row.positive || 0),
    negative: Number(row.negative || 0),
    neutral: Number(row.neutral || 0),
    averageScore: Number(row.avg_score || 0),
    averageConfidence: Number(row.avg_confidence || 0),
  };
};

const upsertSocialSentimentRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const saved = [];

  for (const row of rows) {
    const result = await query(
      `
        INSERT INTO social_sentiment_snapshots (
          snapshot_time,
          symbol,
          platform,
          mention_count,
          positive_count,
          negative_count,
          neutral_count,
          sentiment_score,
          source,
          metadata
        )
        VALUES (
          $1::timestamptz,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb
        )
        ON CONFLICT (snapshot_time, (COALESCE(symbol, '__MARKET__')), platform, source)
        DO UPDATE SET
          mention_count = EXCLUDED.mention_count,
          positive_count = EXCLUDED.positive_count,
          negative_count = EXCLUDED.negative_count,
          neutral_count = EXCLUDED.neutral_count,
          sentiment_score = EXCLUDED.sentiment_score,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text AS id;
      `,
      [
        row.snapshotTime,
        row.symbol,
        row.platform,
        row.mentionCount,
        row.positiveCount,
        row.negativeCount,
        row.neutralCount,
        row.sentimentScore,
        row.source,
        JSON.stringify(row.metadata || {}),
      ]
    );

    saved.push(result.rows[0]);
  }

  return saved;
};

const upsertFearGreedSnapshot = async (row) => {
  const result = await query(
    `
      INSERT INTO fear_greed_index_snapshots (
        snapshot_date,
        score,
        classification,
        news_sentiment_score,
        social_sentiment_score,
        momentum_score,
        volatility_score,
        source,
        metadata
      )
      VALUES (
        $1::date,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::jsonb
      )
      ON CONFLICT (snapshot_date)
      DO UPDATE SET
        score = EXCLUDED.score,
        classification = EXCLUDED.classification,
        news_sentiment_score = EXCLUDED.news_sentiment_score,
        social_sentiment_score = EXCLUDED.social_sentiment_score,
        momentum_score = EXCLUDED.momentum_score,
        volatility_score = EXCLUDED.volatility_score,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text AS id;
    `,
    [
      row.snapshotDate,
      row.score,
      row.classification,
      row.newsSentimentScore,
      row.socialSentimentScore,
      row.momentumScore,
      row.volatilityScore,
      row.source,
      JSON.stringify(row.metadata || {}),
    ]
  );

  return result.rows[0] || null;
};

const listFearGreedSnapshots = async ({ days = 30 } = {}) => {
  const result = await query(
    `
      SELECT
        id::text AS id,
        to_char(snapshot_date, 'YYYY-MM-DD') AS "snapshotDate",
        score,
        classification,
        news_sentiment_score AS "newsSentimentScore",
        social_sentiment_score AS "socialSentimentScore",
        momentum_score AS "momentumScore",
        volatility_score AS "volatilityScore",
        source,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM fear_greed_index_snapshots
      WHERE snapshot_date >= CURRENT_DATE - ($1::int - 1)
      ORDER BY snapshot_date DESC;
    `,
    [toPositiveInt(days, 30)]
  );

  return result.rows;
};

const listLatestSocialSentiment = async ({ symbol = null, limit = 40 } = {}) => {
  const values = [];
  const clauses = [];

  if (symbol) {
    values.push(symbol);
    clauses.push(`symbol = $${values.length}`);
  }

  values.push(toPositiveInt(limit, 40));

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await query(
    `
      SELECT
        id::text AS id,
        snapshot_time AS "snapshotTime",
        symbol,
        platform,
        mention_count AS "mentionCount",
        positive_count AS "positiveCount",
        negative_count AS "negativeCount",
        neutral_count AS "neutralCount",
        sentiment_score AS "sentimentScore",
        source,
        metadata
      FROM social_sentiment_snapshots
      ${whereClause}
      ORDER BY snapshot_time DESC
      LIMIT $${values.length};
    `,
    values
  );

  return result.rows;
};

const listStockSentimentHistory = async ({ symbol, days = 14, limit = 30 } = {}) => {
  const useBridgeTable = await isNewsArticleSymbolsBridgeAvailable();
  const symbolClause = buildSymbolFilterClause(1, useBridgeTable);

  const result = await query(
    `
      SELECT
        to_char(day_bucket, 'YYYY-MM-DD') AS date,
        SUM(article_count)::int AS "articleCount",
        SUM(positive_count)::int AS positive,
        SUM(negative_count)::int AS negative,
        SUM(neutral_count)::int AS neutral,
        COALESCE(AVG(avg_sentiment_score), 0)::numeric(10,4) AS "averageSentimentScore",
        COALESCE(AVG(avg_sentiment_confidence), 0)::numeric(10,4) AS "averageConfidence"
      FROM (
        SELECT
          date_trunc('day', published_at)::date AS day_bucket,
          COUNT(*)::int AS article_count,
          COUNT(*) FILTER (WHERE sentiment_label = 'positive')::int AS positive_count,
          COUNT(*) FILTER (WHERE sentiment_label = 'negative')::int AS negative_count,
          COUNT(*) FILTER (WHERE sentiment_label = 'neutral')::int AS neutral_count,
          AVG(sentiment_score)::numeric(10,4) AS avg_sentiment_score,
          AVG(sentiment_confidence)::numeric(10,4) AS avg_sentiment_confidence
        FROM news_articles
        WHERE
          ${symbolClause}
          AND published_at >= NOW() - ($2::int || ' days')::interval
        GROUP BY day_bucket
      ) AS grouped
      GROUP BY day_bucket
      ORDER BY day_bucket DESC
      LIMIT $3;
    `,
    [symbol, toPositiveInt(days, 14), toPositiveInt(limit, 30)]
  );

  return result.rows;
};

module.exports = {
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
};
