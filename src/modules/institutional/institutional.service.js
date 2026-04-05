const {
  upsertFiiDiiActivityRows,
  listFiiDiiLatestSummary,
  listFiiDiiHistoryRows,
  listFiiDiiCumulative,
} = require('./institutional.repository');

const SEGMENTS = ['equity', 'debt', 'hybrid'];
const CATEGORIES = ['FII', 'DII'];

const toDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};

const toDateObject = (value) => {
  const normalized = toDateOnly(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const formatDate = (value) => {
  return value.toISOString().slice(0, 10);
};

const addDays = (date, days) => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

const stringHash = (value) => {
  const text = String(value || '');
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const deterministicRange = (seed, min, max, decimals = 2) => {
  const normalized = (seed % 10000) / 10000;
  const value = min + normalized * (max - min);
  return Number(value.toFixed(decimals));
};

const isWeekend = (date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

const buildDateRange = ({ fromDate, toDate, days }) => {
  const parsedTo = toDateObject(toDate) || new Date(`${formatDate(new Date())}T00:00:00.000Z`);
  const parsedFrom = toDateObject(fromDate) || addDays(parsedTo, -Math.max(1, days) + 1);

  const startDate = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
  const endDate = parsedFrom <= parsedTo ? parsedTo : parsedFrom;

  const dates = [];
  for (let current = new Date(startDate); current <= endDate; current = addDays(current, 1)) {
    if (!isWeekend(current)) {
      dates.push(formatDate(current));
    }
  }

  return dates;
};

const segmentMultiplier = {
  equity: 1,
  debt: 0.35,
  hybrid: 0.15,
};

const syntheticFlowRow = ({ flowDate, category, segment, source }) => {
  const seed = stringHash(`${flowDate}:${category}:${segment}`);
  const multiplier = segmentMultiplier[segment] || 1;

  const grossBuy = deterministicRange(seed + 13, 450, 4200, 2) * multiplier;
  const grossSell = deterministicRange(seed + 29, 420, 4100, 2) * multiplier;

  const grossBuyRounded = Number(grossBuy.toFixed(2));
  const grossSellRounded = Number(grossSell.toFixed(2));
  const netValue = Number((grossBuyRounded - grossSellRounded).toFixed(2));

  return {
    flowDate,
    category,
    segment,
    source,
    grossBuy: grossBuyRounded,
    grossSell: grossSellRounded,
    netValue,
    metadata: {
      generated: true,
      mode: 'synthetic_fii_dii_scraper',
    },
  };
};

const scrapeAndStoreFiiDiiFlows = async ({
  source = 'synthetic_fii_dii_scraper',
  fromDate = null,
  toDate = null,
  days = 30,
  segment = null,
} = {}) => {
  const dates = buildDateRange({ fromDate, toDate, days });

  if (dates.length === 0) {
    return {
      source,
      flowDates: [],
      rowCount: 0,
      savedCount: 0,
    };
  }

  const segments = segment ? [segment] : SEGMENTS;

  const rows = [];
  for (const flowDate of dates) {
    for (const category of CATEGORIES) {
      for (const selectedSegment of segments) {
        rows.push(
          syntheticFlowRow({
            flowDate,
            category,
            segment: selectedSegment,
            source,
          })
        );
      }
    }
  }

  const saved = await upsertFiiDiiActivityRows(rows);

  return {
    source,
    flowDates: dates,
    rowCount: rows.length,
    savedCount: saved.length,
  };
};

const getLatestFiiDiiFlows = async (query) => {
  const summary = await listFiiDiiLatestSummary({
    limit: query.limit,
    segment: query.segment,
  });

  return {
    count: summary.length,
    summary,
  };
};

const getFiiDiiFlowHistory = async (query) => {
  const rows = await listFiiDiiHistoryRows({
    fromDate: query.fromDate,
    toDate: query.toDate,
    segment: query.segment,
    limit: query.limit,
  });

  return {
    count: rows.length,
    rows,
  };
};

const getFiiDiiCumulativeFlows = async (query) => {
  const rows = await listFiiDiiCumulative({
    range: query.range,
    segment: query.segment,
    limit: query.limit,
  });

  return {
    range: query.range,
    count: rows.length,
    rows,
  };
};

module.exports = {
  scrapeAndStoreFiiDiiFlows,
  getLatestFiiDiiFlows,
  getFiiDiiFlowHistory,
  getFiiDiiCumulativeFlows,
};
