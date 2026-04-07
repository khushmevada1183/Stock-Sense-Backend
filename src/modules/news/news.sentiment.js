const POSITIVE_KEYWORDS = [
  'rally',
  'surge',
  'beat',
  'growth',
  'strong',
  'record high',
  'upgrade',
  'profit jump',
  'bullish',
  'outperform',
  'optimistic',
  'gain',
  'recovery',
  'expansion',
  'buyback',
  'dividend',
];

const NEGATIVE_KEYWORDS = [
  'crash',
  'drop',
  'fall',
  'miss',
  'weak',
  'downgrade',
  'loss',
  'bearish',
  'selloff',
  'decline',
  'investigation',
  'fraud',
  'warning',
  'default',
  'slowdown',
  'risk',
];

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

const lexicalSentiment = (text) => {
  const normalized = String(text || '').toLowerCase();

  const positiveHits = POSITIVE_KEYWORDS.reduce((acc, keyword) => {
    return acc + (normalized.includes(keyword) ? 1 : 0);
  }, 0);

  const negativeHits = NEGATIVE_KEYWORDS.reduce((acc, keyword) => {
    return acc + (normalized.includes(keyword) ? 1 : 0);
  }, 0);

  const totalHits = positiveHits + negativeHits;
  const score = totalHits === 0 ? 0 : (positiveHits - negativeHits) / totalHits;

  const boundedScore = clamp(Number(score.toFixed(4)), -1, 1);
  const confidence = clamp(
    Number((0.45 + Math.min(0.45, totalHits * 0.08) + Math.abs(boundedScore) * 0.1).toFixed(4)),
    0,
    1
  );

  let label = 'neutral';
  if (boundedScore > 0.15) {
    label = 'positive';
  } else if (boundedScore < -0.15) {
    label = 'negative';
  }

  return {
    model: 'lexical',
    label,
    score: boundedScore,
    confidence,
    positiveHits,
    negativeHits,
  };
};

const inferFinbertPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const labelRaw = String(payload.label || payload.sentiment || '').trim().toLowerCase();
  const map = {
    positive: 'positive',
    negative: 'negative',
    neutral: 'neutral',
    bullish: 'positive',
    bearish: 'negative',
  };

  const label = map[labelRaw] || null;
  const score = Number.parseFloat(payload.score ?? payload.sentimentScore ?? payload.compound ?? 0);
  const confidence = Number.parseFloat(payload.confidence ?? payload.probability ?? 0.75);

  if (!label || !Number.isFinite(score) || !Number.isFinite(confidence)) {
    return null;
  }

  return {
    model: 'finbert',
    label,
    score: clamp(Number(score.toFixed(4)), -1, 1),
    confidence: clamp(Number(confidence.toFixed(4)), 0, 1),
  };
};

const fetchFinbertSentiment = async (text) => {
  const endpoint = String(process.env.NEWS_FINBERT_ENDPOINT || '').trim();
  if (!endpoint) {
    return null;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return inferFinbertPayload(payload);
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const scoreNewsSentiment = async (text) => {
  const modelPreference = String(process.env.NEWS_SENTIMENT_MODEL || 'lexical').trim().toLowerCase();

  if (modelPreference === 'finbert') {
    const finbert = await fetchFinbertSentiment(text);
    if (finbert) {
      return finbert;
    }
  }

  return lexicalSentiment(text);
};

module.exports = {
  scoreNewsSentiment,
};
