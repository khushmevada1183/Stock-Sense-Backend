const {
  upsertFiiDiiActivityRows,
  listFiiDiiLatestSummary,
  listFiiDiiHistoryRows,
  listFiiDiiCumulative,
  upsertBlockDealRows,
  listBlockDealsLatest,
  listBlockDealsHistory,
  upsertMutualFundHoldingRows,
  listMutualFundsLatest,
  listMutualFundsHistory,
  listMutualFundsTopHolders,
  upsertInsiderTradeRows,
  listInsiderTradesLatest,
  listInsiderTradesHistory,
  listInsiderTradeSummary,
  upsertShareholdingPatternRows,
  listShareholdingLatest,
  listShareholdingHistory,
  listShareholdingTrends,
  upsertCorporateActionRows,
  listCorporateActionsLatest,
  listCorporateActionsHistory,
  listCorporateActionSummary,
  upsertEarningsCalendarRows,
  listEarningsCalendarLatest,
  listEarningsCalendarHistory,
  listEarningsCalendarSummary,
} = require('./institutional.repository');

const SEGMENTS = ['equity', 'debt', 'hybrid'];
const CATEGORIES = ['FII', 'DII'];
const BLOCK_DEAL_EXCHANGES = ['NSE', 'BSE'];

const BLOCK_DEAL_SYMBOLS = [
  { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd' },
  { symbol: 'TCS', companyName: 'Tata Consultancy Services Ltd' },
  { symbol: 'INFY', companyName: 'Infosys Ltd' },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd' },
  { symbol: 'ICICIBANK', companyName: 'ICICI Bank Ltd' },
  { symbol: 'SBIN', companyName: 'State Bank of India' },
  { symbol: 'LT', companyName: 'Larsen & Toubro Ltd' },
  { symbol: 'ITC', companyName: 'ITC Ltd' },
  { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Ltd' },
  { symbol: 'KOTAKBANK', companyName: 'Kotak Mahindra Bank Ltd' },
  { symbol: 'AXISBANK', companyName: 'Axis Bank Ltd' },
  { symbol: 'MARUTI', companyName: 'Maruti Suzuki India Ltd' },
  { symbol: 'SUNPHARMA', companyName: 'Sun Pharmaceutical Industries Ltd' },
  { symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Ltd' },
  { symbol: 'ULTRACEMCO', companyName: 'UltraTech Cement Ltd' },
];

const BUYER_NAMES = [
  'Morgan Stanley Asia',
  'Nomura Singapore',
  'SBI Mutual Fund',
  'HDFC Asset Management',
  'ICICI Prudential AMC',
  'Nippon India AMC',
  'Kotak Mahindra Asset',
  'Aditya Birla Sun Life AMC',
  'Axis AMC',
  'UTI AMC',
];

const SELLER_NAMES = [
  'Goldman Sachs India',
  'Citigroup Global Markets',
  'JP Morgan Securities',
  'HSBC Securities',
  'Kotak Securities',
  'ICICI Securities',
  'Motilal Oswal Financial',
  'IIFL Securities',
  'Edelweiss Broking',
  'JM Financial',
];

const MUTUAL_FUND_AMCS = [
  'SBI Mutual Fund',
  'ICICI Prudential Mutual Fund',
  'HDFC Mutual Fund',
  'Nippon India Mutual Fund',
  'Kotak Mutual Fund',
  'Axis Mutual Fund',
  'Aditya Birla Sun Life Mutual Fund',
  'UTI Mutual Fund',
  'Mirae Asset Mutual Fund',
  'DSP Mutual Fund',
];

const MUTUAL_FUND_SCHEME_TYPES = [
  'Large Cap',
  'Bluechip',
  'Focused Equity',
  'Flexi Cap',
  'Value Discovery',
  'Opportunities',
  'Equity Savings',
  'Multicap',
];

const INSIDER_NAMES = [
  'Mukesh Ambani',
  'Nandan Nilekani',
  'Amitabh Chaudhry',
  'Rajiv Bajaj',
  'Kiran Mazumdar',
  'Sanjiv Mehta',
  'Pawan Munjal',
  'Harsh Mariwala',
  'Sandeep Bakhshi',
  'S N Subrahmanyan',
  'Rajnish Kumar',
  'Venu Srinivasan',
];

const INSIDER_ROLES = [
  'Promoter Group',
  'Managing Director',
  'Whole-Time Director',
  'Executive Director',
  'Chief Financial Officer',
  'Chief Executive Officer',
  'Independent Director',
  'Key Managerial Personnel',
];

const INSIDER_TRADE_MODES = ['market', 'off-market', 'inter-se'];
const CORPORATE_ACTION_TYPES = ['dividend', 'split', 'bonus', 'rights', 'buyback'];
const SPLIT_RATIOS = [2, 5, 10];
const BONUS_RATIOS = [1, 2, 3];
const EARNINGS_CALL_TIMES = ['pre-market', 'post-market', 'market-hours'];

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

const addMonths = (date, months) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
};

const toMonthStart = (date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

const toQuarterStart = (date) => {
  const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
};

const toQuarterEnd = (date) => {
  const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth + 3, 0));
};

const addQuarters = (date, quarters) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + quarters * 3, 1));
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

const deterministicInteger = (seed, min, max) => {
  return Math.floor(deterministicRange(seed, min, max, 0));
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

const buildMonthRange = ({ fromDate, toDate, months }) => {
  const parsedTo = toDateObject(toDate) || new Date(`${formatDate(new Date())}T00:00:00.000Z`);
  const normalizedTo = toMonthStart(parsedTo);

  const parsedFrom = toDateObject(fromDate) || addMonths(normalizedTo, -Math.max(1, months) + 1);
  const normalizedFrom = toMonthStart(parsedFrom);

  const startDate = normalizedFrom <= normalizedTo ? normalizedFrom : normalizedTo;
  const endDate = normalizedFrom <= normalizedTo ? normalizedTo : normalizedFrom;

  const monthDates = [];
  for (let current = new Date(startDate); current <= endDate; current = addMonths(current, 1)) {
    monthDates.push(formatDate(current));
  }

  return monthDates;
};

const buildQuarterRange = ({ fromDate, toDate, quarters }) => {
  const parsedTo = toDateObject(toDate) || new Date(`${formatDate(new Date())}T00:00:00.000Z`);
  const normalizedTo = toQuarterStart(parsedTo);

  const parsedFrom = toDateObject(fromDate) || addQuarters(normalizedTo, -Math.max(1, quarters) + 1);
  const normalizedFrom = toQuarterStart(parsedFrom);

  const startDate = normalizedFrom <= normalizedTo ? normalizedFrom : normalizedTo;
  const endDate = normalizedFrom <= normalizedTo ? normalizedTo : normalizedFrom;

  const quarterDates = [];
  for (let current = new Date(startDate); current <= endDate; current = addQuarters(current, 1)) {
    quarterDates.push(formatDate(toQuarterEnd(current)));
  }

  return quarterDates;
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

const syntheticBlockDealRow = ({ tradeDate, exchange, slot, source }) => {
  const seed = stringHash(`${tradeDate}:${exchange}:${slot}`);
  const listing = BLOCK_DEAL_SYMBOLS[seed % BLOCK_DEAL_SYMBOLS.length];
  const buyerName = BUYER_NAMES[(seed + 5) % BUYER_NAMES.length];
  const sellerName = SELLER_NAMES[(seed + 17) % SELLER_NAMES.length];
  const dealType = seed % 4 === 0 ? 'bulk' : 'block';
  const quantity = deterministicInteger(seed + 29, 50000, 1800000);
  const pricePerShare = deterministicRange(seed + 71, 85, 4200, 2);
  const totalValueCr = Number(((quantity * pricePerShare) / 10000000).toFixed(2));

  return {
    dealKey: [
      tradeDate,
      exchange,
      listing.symbol,
      dealType,
      buyerName.replace(/\s+/g, '_'),
      sellerName.replace(/\s+/g, '_'),
      slot,
    ].join(':'),
    tradeDate,
    exchange,
    symbol: listing.symbol,
    companyName: listing.companyName,
    dealType,
    quantity,
    pricePerShare,
    totalValueCr,
    buyerName,
    sellerName,
    source,
    metadata: {
      generated: true,
      mode: 'synthetic_block_deals_scraper',
    scrapeAndStoreEarningsCalendar,
    getLatestEarningsCalendar,
    getEarningsCalendarHistory,
    getEarningsCalendarSummary,
      slot,
    },
  };
};

const scrapeAndStoreBlockDeals = async ({
  source = 'synthetic_block_deals_scraper',
  fromDate = null,
  toDate = null,
  days = 7,
  exchange = null,
  limit = 200,
} = {}) => {
  const dates = buildDateRange({ fromDate, toDate, days });

  if (dates.length === 0) {
    return {
      source,
      tradeDates: [],
      exchanges: exchange ? [exchange] : BLOCK_DEAL_EXCHANGES,
      rowCount: 0,
      savedCount: 0,
    };
  }

  const selectedExchanges = exchange ? [exchange] : BLOCK_DEAL_EXCHANGES;
  const maxRows = Math.max(1, Number.parseInt(limit, 10) || 200);

  const rows = [];

  for (const tradeDate of dates) {
    for (const selectedExchange of selectedExchanges) {
      const dealsForExchange = 4 + (stringHash(`${tradeDate}:${selectedExchange}`) % 3);
      for (let slot = 0; slot < dealsForExchange && rows.length < maxRows; slot += 1) {
        rows.push(
          syntheticBlockDealRow({
            tradeDate,
            exchange: selectedExchange,
            slot,
            source,
          })
        );
      }

      if (rows.length >= maxRows) {
        break;
      }
    }

    if (rows.length >= maxRows) {
      break;
    }
  }

  const saved = await upsertBlockDealRows(rows);

  return {
    source,
    tradeDates: dates,
    exchanges: selectedExchanges,
    rowCount: rows.length,
    savedCount: saved.length,
  };
};

const getLatestBlockDeals = async (query) => {
  const rows = await listBlockDealsLatest({
    tradeDate: query.tradeDate,
    exchange: query.exchange,
    symbol: query.symbol,
    dealType: query.dealType,
    limit: query.limit,
  });

  return {
    tradeDate: rows[0]?.tradeDate || query.tradeDate || null,
    count: rows.length,
    rows,
  };
};

const getBlockDealsHistory = async (query) => {
  const rows = await listBlockDealsHistory({
    fromDate: query.fromDate,
    toDate: query.toDate,
    exchange: query.exchange,
    symbol: query.symbol,
    dealType: query.dealType,
    limit: query.limit,
  });

  return {
    count: rows.length,
    rows,
  };
};

const syntheticMutualFundHoldingRow = ({ holdingMonth, listing, slot, source }) => {
  const seed = stringHash(`${holdingMonth}:${listing.symbol}:${slot}`);
  const amcName = MUTUAL_FUND_AMCS[seed % MUTUAL_FUND_AMCS.length];
  const schemeType = MUTUAL_FUND_SCHEME_TYPES[(seed + 11) % MUTUAL_FUND_SCHEME_TYPES.length];
  const schemeName = `${amcName} ${schemeType} Fund`;
  const quantity = deterministicInteger(seed + 19, 12000, 2500000);
  const impliedPrice = deterministicRange(seed + 47, 40, 4200, 2);
  const marketValueCr = Number(((quantity * impliedPrice) / 10000000).toFixed(2));
  const holdingPercent = deterministicRange(seed + 73, 0.05, 9.8, 4);

  return {
    holdingKey: [
      holdingMonth,
      amcName.replace(/\s+/g, '_'),
      schemeName.replace(/\s+/g, '_'),
      listing.symbol,
      slot,
    ].join(':'),
    holdingMonth,
    amcName,
    schemeName,
    symbol: listing.symbol,
    companyName: listing.companyName,
    quantity,
    marketValueCr,
    holdingPercent,
    source,
    metadata: {
      generated: true,
      mode: 'synthetic_mutual_fund_holdings_scraper',
      slot,
    },
  };
};

const resolveListings = (symbol) => {
  if (!symbol) {
    return BLOCK_DEAL_SYMBOLS;
  }

  const found = BLOCK_DEAL_SYMBOLS.find((item) => item.symbol === symbol);
  if (found) {
    return [found];
  }

  return [
    {
      symbol,
      companyName: symbol,
    },
  ];
};

const scrapeAndStoreMutualFundHoldings = async ({
  source = 'synthetic_mutual_fund_holdings_scraper',
  fromDate = null,
  toDate = null,
  symbol = null,
  months = 6,
  limit = 300,
} = {}) => {
  const holdingMonths = buildMonthRange({ fromDate, toDate, months });

  if (holdingMonths.length === 0) {
    return {
      source,
      holdingMonths: [],
      rowCount: 0,
      savedCount: 0,
    };
  }

  const listings = resolveListings(symbol);
  const maxRows = Math.max(1, Number.parseInt(limit, 10) || 300);

  const rows = [];

  for (const holdingMonth of holdingMonths) {
    for (const listing of listings) {
      const slots = 2 + (stringHash(`${holdingMonth}:${listing.symbol}`) % 3);
      for (let slot = 0; slot < slots && rows.length < maxRows; slot += 1) {
        rows.push(
          syntheticMutualFundHoldingRow({
            holdingMonth,
            listing,
            slot,
            source,
          })
        );
      }

      if (rows.length >= maxRows) {
        break;
      }
    }

    if (rows.length >= maxRows) {
      break;
    }
  }

  const saved = await upsertMutualFundHoldingRows(rows);

  return {
    source,
    holdingMonths,
    symbols: listings.map((item) => item.symbol),
    rowCount: rows.length,
    savedCount: saved.length,
  };
};

const getLatestMutualFundHoldings = async (query) => {
  const rows = await listMutualFundsLatest({
    monthDate: query.monthDate,
    symbol: query.symbol,
    amcName: query.amcName,
    schemeName: query.schemeName,
    limit: query.limit,
  });

  return {
    holdingMonth: rows[0]?.holdingMonth || query.monthDate || null,
    count: rows.length,
    rows,
  };
};

const getMutualFundHoldingHistory = async (query) => {
  const rows = await listMutualFundsHistory({
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    amcName: query.amcName,
    schemeName: query.schemeName,
    limit: query.limit,
  });

  return {
    count: rows.length,
    rows,
  };
};

const getMutualFundTopHolders = async (query) => {
  const rows = await listMutualFundsTopHolders({
    monthDate: query.monthDate,
    symbol: query.symbol,
    limit: query.limit,
  });

  return {
    holdingMonth: rows[0]?.holdingMonth || query.monthDate || null,
    count: rows.length,
    rows,
  };
};

const syntheticInsiderTradeRow = ({ tradeDate, listing, slot, source }) => {
  const seed = stringHash(`${tradeDate}:${listing.symbol}:${slot}`);
  const insiderName = INSIDER_NAMES[seed % INSIDER_NAMES.length];
  const insiderRole = INSIDER_ROLES[(seed + 7) % INSIDER_ROLES.length];
  const transactionType = seed % 3 === 0 ? 'sell' : 'buy';
  const exchange = seed % 5 === 0 ? 'BSE' : 'NSE';
  const mode = INSIDER_TRADE_MODES[(seed + 11) % INSIDER_TRADE_MODES.length];
  const quantity = deterministicInteger(seed + 31, 1200, 450000);
  const averagePrice = deterministicRange(seed + 61, 55, 4300, 2);
  const tradeValueCr = Number(((quantity * averagePrice) / 10000000).toFixed(2));

  return {
    tradeKey: [
      tradeDate,
      listing.symbol,
      insiderName.replace(/\s+/g, '_'),
      insiderRole.replace(/\s+/g, '_'),
      transactionType,
      slot,
    ].join(':'),
    tradeDate,
    exchange,
    symbol: listing.symbol,
    companyName: listing.companyName,
    insiderName,
    insiderRole,
    transactionType,
    quantity,
    averagePrice,
    tradeValueCr,
    mode,
    source,
    metadata: {
      generated: true,
      mode: 'synthetic_insider_trades_scraper',
      slot,
    },
  };
};

const scrapeAndStoreInsiderTrades = async ({
  source = 'synthetic_insider_trades_scraper',
  fromDate = null,
  toDate = null,
  symbol = null,
  transactionType = null,
  days = 30,
  limit = 300,
} = {}) => {
  const dates = buildDateRange({ fromDate, toDate, days });

  if (dates.length === 0) {
    return {
      source,
      tradeDates: [],
      rowCount: 0,
      savedCount: 0,
    };
  }

  const listings = resolveListings(symbol);
  const maxRows = Math.max(1, Number.parseInt(limit, 10) || 300);

  const rows = [];

  for (const tradeDate of dates) {
    for (const listing of listings) {
      const slots = 1 + (stringHash(`${tradeDate}:${listing.symbol}`) % 3);
      for (let slot = 0; slot < slots && rows.length < maxRows; slot += 1) {
        const row = syntheticInsiderTradeRow({
          tradeDate,
          listing,
          slot,
          source,
        });

        if (!transactionType || row.transactionType === transactionType) {
          rows.push(row);
        }
      }

      if (rows.length >= maxRows) {
        break;
      }
    }

    if (rows.length >= maxRows) {
      break;
    }
  }

  const saved = await upsertInsiderTradeRows(rows);

  return {
    source,
    tradeDates: dates,
    symbols: listings.map((item) => item.symbol),
    rowCount: rows.length,
    savedCount: saved.length,
  };
};

const getLatestInsiderTrades = async (query) => {
  const rows = await listInsiderTradesLatest({
    tradeDate: query.tradeDate,
    symbol: query.symbol,
    transactionType: query.transactionType,
    insiderName: query.insiderName,
    insiderRole: query.insiderRole,
    limit: query.limit,
  });

  return {
    tradeDate: rows[0]?.tradeDate || query.tradeDate || null,
    count: rows.length,
    rows,
  };
};

const getInsiderTradeHistory = async (query) => {
  const rows = await listInsiderTradesHistory({
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    transactionType: query.transactionType,
    insiderName: query.insiderName,
    insiderRole: query.insiderRole,
    limit: query.limit,
  });

  return {
    count: rows.length,
    rows,
  };
};

const getInsiderTradeSummary = async (query) => {
  const rows = await listInsiderTradeSummary({
    range: query.range,
    symbol: query.symbol,
    transactionType: query.transactionType,
    limit: query.limit,
  });

  return {
    range: query.range,
    count: rows.length,
    rows,
  };
};

const syntheticShareholdingPatternRow = ({ periodEnd, listing, source }) => {
  const seed = stringHash(`${periodEnd}:${listing.symbol}`);

  let promoterHolding = deterministicRange(seed + 17, 22, 72, 4);
  let institutionalHolding = deterministicRange(seed + 29, 9, 48, 4);
  let retailHolding = deterministicRange(seed + 41, 6, 45, 4);

  const cappedTotal = 98.5;
  const totalWithoutOther = promoterHolding + institutionalHolding + retailHolding;

  if (totalWithoutOther > cappedTotal) {
    const scale = cappedTotal / totalWithoutOther;
    promoterHolding = Number((promoterHolding * scale).toFixed(4));
    institutionalHolding = Number((institutionalHolding * scale).toFixed(4));
    retailHolding = Number((retailHolding * scale).toFixed(4));
  }

  let otherHolding = Number((100 - promoterHolding - institutionalHolding - retailHolding).toFixed(4));

  if (otherHolding < 0) {
    retailHolding = Number(Math.max(0, retailHolding + otherHolding).toFixed(4));
    otherHolding = Number((100 - promoterHolding - institutionalHolding - retailHolding).toFixed(4));
  }

  const maxMutualFundHolding = Number(Math.max(0.5, institutionalHolding - 0.2).toFixed(4));
  let mutualFundHolding = deterministicRange(seed + 53, 0.5, Math.max(0.5, institutionalHolding), 4);
  mutualFundHolding = Number(Math.min(mutualFundHolding, maxMutualFundHolding).toFixed(4));

  return {
    patternKey: [periodEnd, listing.symbol, source].join(':'),
    periodEnd,
    symbol: listing.symbol,
    companyName: listing.companyName,
    promoterHolding,
    institutionalHolding,
    retailHolding,
    otherHolding,
    mutualFundHolding,
    source,
    metadata: {
      generated: true,
      mode: 'synthetic_shareholding_pattern_scraper',
    },
  };
};

const scrapeAndStoreShareholdingPatterns = async ({
  source = 'synthetic_shareholding_pattern_scraper',
  fromDate = null,
  toDate = null,
  symbol = null,
  quarters = 8,
  limit = 400,
} = {}) => {
  const periodEnds = buildQuarterRange({ fromDate, toDate, quarters });

  if (periodEnds.length === 0) {
    return {
      source,
      periodEnds: [],
      rowCount: 0,
      savedCount: 0,
    };
  }

  const listings = resolveListings(symbol);
  const maxRows = Math.max(1, Number.parseInt(limit, 10) || 400);

  const rows = [];
  for (const periodEnd of periodEnds) {
    for (const listing of listings) {
      rows.push(
        syntheticShareholdingPatternRow({
          periodEnd,
          listing,
          source,
        })
      );

      if (rows.length >= maxRows) {
        break;
      }
    }

    if (rows.length >= maxRows) {
      break;
    }
  }

  const saved = await upsertShareholdingPatternRows(rows);

  return {
    source,
    periodEnds,
    symbols: listings.map((item) => item.symbol),
    rowCount: rows.length,
    savedCount: saved.length,
  };
};

const getLatestShareholdingPatterns = async (query) => {
  const rows = await listShareholdingLatest({
    periodDate: query.periodDate,
    symbol: query.symbol,
    limit: query.limit,
  });

  return {
    periodEnd: rows[0]?.periodEnd || query.periodDate || null,
    count: rows.length,
    rows,
  };
};

const getShareholdingPatternHistory = async (query) => {
  const rows = await listShareholdingHistory({
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    limit: query.limit,
  });

  return {
    count: rows.length,
    rows,
  };
};

const getShareholdingPatternTrends = async (query) => {
  const rows = await listShareholdingTrends({
    range: query.range,
    symbol: query.symbol,
    limit: query.limit,
  });

  return {
    range: query.range,
    count: rows.length,
    rows,
  };
};

const syntheticCorporateActionRow = ({
  monthDate,
  listing,
  slot,
  source,
  forcedActionType = null,
}) => {
  const seed = stringHash(`${monthDate}:${listing.symbol}:${slot}`);
  const monthObject = toDateObject(monthDate) || new Date(`${monthDate}T00:00:00.000Z`);
  const actionType = forcedActionType || CORPORATE_ACTION_TYPES[(seed + 13) % CORPORATE_ACTION_TYPES.length];

  const actionDay = 1 + ((seed + 17) % 26);
  const actionDate = formatDate(
    new Date(Date.UTC(monthObject.getUTCFullYear(), monthObject.getUTCMonth(), actionDay))
  );
  const actionDateObject = toDateObject(actionDate);

  const announcementLeadDays = 10 + ((seed + 19) % 45);
  const recordLeadDays = 1 + ((seed + 23) % 10);
  const announcementDate = formatDate(addDays(actionDateObject, -announcementLeadDays));
  const recordDate = formatDate(addDays(actionDateObject, -recordLeadDays));

  let ratioNumerator = null;
  let ratioDenominator = null;
  let cashValue = 0;
  let title = '';
  let details = '';

  switch (actionType) {
    case 'dividend': {
      cashValue = deterministicRange(seed + 29, 1.5, 95, 2);
      title = `${listing.symbol} dividend payout`;
      details = `Declared dividend of INR ${cashValue} per share.`;
      break;
    }
    case 'split': {
      ratioNumerator = SPLIT_RATIOS[(seed + 31) % SPLIT_RATIOS.length];
      ratioDenominator = 1;
      title = `${listing.symbol} stock split ${ratioNumerator}:${ratioDenominator}`;
      details = `Face value adjusted through ${ratioNumerator}:${ratioDenominator} split.`;
      break;
    }
    case 'bonus': {
      ratioNumerator = BONUS_RATIOS[(seed + 37) % BONUS_RATIOS.length];
      ratioDenominator = 1;
      title = `${listing.symbol} bonus issue ${ratioNumerator}:${ratioDenominator}`;
      details = `Bonus shares announced in ratio ${ratioNumerator}:${ratioDenominator}.`;
      break;
    }
    case 'rights': {
      ratioNumerator = 1 + ((seed + 41) % 2);
      ratioDenominator = 5 + ((seed + 43) % 6);
      cashValue = deterministicRange(seed + 47, 35, 620, 2);
      title = `${listing.symbol} rights issue ${ratioNumerator}:${ratioDenominator}`;
      details = `Rights issue price set at INR ${cashValue} per share.`;
      break;
    }
    case 'buyback': {
      cashValue = deterministicRange(seed + 53, 120, 4200, 2);
      title = `${listing.symbol} buyback offer`;
      details = `Buyback announced at INR ${cashValue} per share.`;
      break;
    }
    default: {
      title = `${listing.symbol} corporate action`;
      details = 'Corporate action update.';
      break;
    }
  }

  return {
    actionKey: [actionDate, listing.symbol, actionType, slot, source].join(':'),
    actionDate,
    announcementDate,
    recordDate,
    symbol: listing.symbol,
    companyName: listing.companyName,
    actionType,
    title,
    details,
    ratioNumerator,
    ratioDenominator,
    cashValue,
    source,
    metadata: {
      generated: true,
      mode: 'synthetic_corporate_actions_scraper',
      slot,
    },
  };
};

const scrapeAndStoreCorporateActions = async ({
  source = 'synthetic_corporate_actions_scraper',
  fromDate = null,
  toDate = null,
  symbol = null,
  actionType = null,
  months = 24,
  limit = 300,
} = {}) => {
  const actionMonths = buildMonthRange({ fromDate, toDate, months });

  if (actionMonths.length === 0) {
    return {
      source,
      actionMonths: [],
      rowCount: 0,
      savedCount: 0,
    };
  }

  const listings = resolveListings(symbol);
  const maxRows = Math.max(1, Number.parseInt(limit, 10) || 300);

  const rows = [];

  for (const monthDate of actionMonths) {
    for (const listing of listings) {
      const actionsForListing = 1 + (stringHash(`${monthDate}:${listing.symbol}`) % 2);
      for (let slot = 0; slot < actionsForListing && rows.length < maxRows; slot += 1) {
        rows.push(
          syntheticCorporateActionRow({
            monthDate,
            listing,
            slot,
            source,
            forcedActionType: actionType,
          })
        );
      }

      if (rows.length >= maxRows) {
        break;
      }
    }

    if (rows.length >= maxRows) {
      break;
    }
  }

  const saved = await upsertCorporateActionRows(rows);

  return {
    source,
    actionMonths,
    symbols: listings.map((item) => item.symbol),
    rowCount: rows.length,
    savedCount: saved.length,
  };
};

const getLatestCorporateActions = async (query) => {
  const rows = await listCorporateActionsLatest({
    actionDate: query.actionDate,
    symbol: query.symbol,
    actionType: query.actionType,
    limit: query.limit,
  });

  return {
    actionDate: rows[0]?.actionDate || query.actionDate || null,
    count: rows.length,
    rows,
  };
};

const getCorporateActionHistory = async (query) => {
  const rows = await listCorporateActionsHistory({
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    actionType: query.actionType,
    limit: query.limit,
  });

  return {
    count: rows.length,
    rows,
  };
};

const getCorporateActionSummary = async (query) => {
  const rows = await listCorporateActionSummary({
    range: query.range,
    symbol: query.symbol,
    actionType: query.actionType,
    limit: query.limit,
  });

  return {
    range: query.range,
    count: rows.length,
    rows,
  };
};

const getFiscalQuarterFromPeriodEnd = (periodEndDate) => {
  const month = periodEndDate.getUTCMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter}`;
};

const syntheticEarningsCalendarRow = ({
  periodEnd,
  listing,
  slot,
  source,
  forcedFiscalQuarter = null,
}) => {
  const seed = stringHash(`${periodEnd}:${listing.symbol}:${slot}`);
  const periodEndDate = toDateObject(periodEnd) || new Date(`${periodEnd}T00:00:00.000Z`);
  const derivedQuarter = getFiscalQuarterFromPeriodEnd(periodEndDate);
  const fiscalQuarter = forcedFiscalQuarter || derivedQuarter;
  const fiscalYear = periodEndDate.getUTCFullYear();

  const epsEstimate = deterministicRange(seed + 11, 2.5, 180, 2);
  const epsDeltaPercent = deterministicRange(seed + 13, -22, 28, 2);
  const epsActual = Number((epsEstimate * (1 + epsDeltaPercent / 100)).toFixed(2));

  const revenueEstimateCr = deterministicRange(seed + 17, 250, 125000, 2);
  const revenueDeltaPercent = deterministicRange(seed + 19, -14, 18, 2);
  const revenueActualCr = Number((revenueEstimateCr * (1 + revenueDeltaPercent / 100)).toFixed(2));

  const surprisePercent = Number((((epsActual - epsEstimate) / Math.abs(epsEstimate || 1)) * 100).toFixed(2));
  const callTime = EARNINGS_CALL_TIMES[(seed + 23) % EARNINGS_CALL_TIMES.length];
  const eventDelayDays = 20 + ((seed + 29) % 36);
  const eventDate = formatDate(addDays(periodEndDate, eventDelayDays));

  return {
    earningsKey: [
      eventDate,
      listing.symbol,
      fiscalYear,
      fiscalQuarter,
      source,
      slot,
    ].join(':'),
    eventDate,
    periodEnd,
    symbol: listing.symbol,
    companyName: listing.companyName,
    fiscalYear,
    fiscalQuarter,
    epsActual,
    epsEstimate,
    revenueActualCr,
    revenueEstimateCr,
    surprisePercent,
    callTime,
    source,
    metadata: {
      generated: true,
      mode: 'synthetic_earnings_calendar_seed',
      slot,
    },
  };
};

const scrapeAndStoreEarningsCalendar = async ({
  source = 'synthetic_earnings_calendar_seed',
  fromDate = null,
  toDate = null,
  symbol = null,
  fiscalQuarter = null,
  quarters = 8,
  limit = 320,
} = {}) => {
  const periodEnds = buildQuarterRange({ fromDate, toDate, quarters });

  if (periodEnds.length === 0) {
    return {
      source,
      periodEnds: [],
      rowCount: 0,
      savedCount: 0,
    };
  }

  const listings = resolveListings(symbol);
  const maxRows = Math.max(1, Number.parseInt(limit, 10) || 320);

  const rows = [];

  for (const periodEnd of periodEnds) {
    for (const listing of listings) {
      const row = syntheticEarningsCalendarRow({
        periodEnd,
        listing,
        slot: 0,
        source,
        forcedFiscalQuarter: fiscalQuarter,
      });

      if (!fiscalQuarter || row.fiscalQuarter === fiscalQuarter) {
        rows.push(row);
      }

      if (rows.length >= maxRows) {
        break;
      }
    }

    if (rows.length >= maxRows) {
      break;
    }
  }

  const saved = await upsertEarningsCalendarRows(rows);

  return {
    source,
    periodEnds,
    symbols: listings.map((item) => item.symbol),
    rowCount: rows.length,
    savedCount: saved.length,
  };
};

const getLatestEarningsCalendar = async (query) => {
  const rows = await listEarningsCalendarLatest({
    eventDate: query.eventDate,
    symbol: query.symbol,
    fiscalQuarter: query.fiscalQuarter,
    limit: query.limit,
  });

  return {
    eventDate: rows[0]?.eventDate || query.eventDate || null,
    count: rows.length,
    rows,
  };
};

const getEarningsCalendarHistory = async (query) => {
  const rows = await listEarningsCalendarHistory({
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    fiscalQuarter: query.fiscalQuarter,
    limit: query.limit,
  });

  return {
    count: rows.length,
    rows,
  };
};

const getEarningsCalendarSummary = async (query) => {
  const rows = await listEarningsCalendarSummary({
    range: query.range,
    symbol: query.symbol,
    fiscalQuarter: query.fiscalQuarter,
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
  scrapeAndStoreBlockDeals,
  getLatestBlockDeals,
  getBlockDealsHistory,
  scrapeAndStoreMutualFundHoldings,
  getLatestMutualFundHoldings,
  getMutualFundHoldingHistory,
  getMutualFundTopHolders,
  scrapeAndStoreInsiderTrades,
  getLatestInsiderTrades,
  getInsiderTradeHistory,
  getInsiderTradeSummary,
  scrapeAndStoreShareholdingPatterns,
  getLatestShareholdingPatterns,
  getShareholdingPatternHistory,
  getShareholdingPatternTrends,
  scrapeAndStoreCorporateActions,
  getLatestCorporateActions,
  getCorporateActionHistory,
  getCorporateActionSummary,
  scrapeAndStoreEarningsCalendar,
  getLatestEarningsCalendar,
  getEarningsCalendarHistory,
  getEarningsCalendarSummary,
};
