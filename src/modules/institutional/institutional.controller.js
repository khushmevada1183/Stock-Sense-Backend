const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  normalizeFiiDiiLatestQuery,
  normalizeFiiDiiHistoryQuery,
  normalizeFiiDiiCumulativeQuery,
  normalizeFiiDiiSyncQuery,
  normalizeBlockDealsLatestQuery,
  normalizeBlockDealsHistoryQuery,
  normalizeBlockDealsSyncQuery,
  normalizeMutualFundsLatestQuery,
  normalizeMutualFundsHistoryQuery,
  normalizeMutualFundsTopHoldersQuery,
  normalizeMutualFundsSyncQuery,
  normalizeInsiderTradesLatestQuery,
  normalizeInsiderTradesHistoryQuery,
  normalizeInsiderTradesSummaryQuery,
  normalizeInsiderTradesSyncQuery,
  normalizeShareholdingLatestQuery,
  normalizeShareholdingHistoryQuery,
  normalizeShareholdingTrendsQuery,
  normalizeShareholdingSyncQuery,
  normalizeCorporateActionsLatestQuery,
  normalizeCorporateActionsHistoryQuery,
  normalizeCorporateActionsSummaryQuery,
  normalizeCorporateActionsSyncQuery,
  normalizeEarningsCalendarLatestQuery,
  normalizeEarningsCalendarHistoryQuery,
  normalizeEarningsCalendarSummaryQuery,
  normalizeEarningsCalendarSyncQuery,
} = require('./institutional.validation');
const {
  getLatestFiiDiiFlows,
  getFiiDiiFlowHistory,
  getFiiDiiCumulativeFlows,
  scrapeAndStoreFiiDiiFlows,
  getLatestBlockDeals,
  getBlockDealsHistory: getBlockDealsHistoryData,
  scrapeAndStoreBlockDeals,
  getLatestMutualFundHoldings,
  getMutualFundHoldingHistory,
  getMutualFundTopHolders,
  scrapeAndStoreMutualFundHoldings,
  getLatestInsiderTrades,
  getInsiderTradeHistory,
  getInsiderTradeSummary,
  scrapeAndStoreInsiderTrades,
  getLatestShareholdingPatterns,
  getShareholdingPatternHistory,
  getShareholdingPatternTrends,
  scrapeAndStoreShareholdingPatterns,
  getLatestCorporateActions,
  getCorporateActionHistory,
  getCorporateActionSummary,
  scrapeAndStoreCorporateActions,
  getLatestEarningsCalendar,
  getEarningsCalendarHistory: getEarningsCalendarHistoryData,
  getEarningsCalendarSummary: getEarningsCalendarSummaryData,
  scrapeAndStoreEarningsCalendar,
} = require('./institutional.service');

const getFiiDiiLatest = asyncHandler(async (req, res) => {
  const query = normalizeFiiDiiLatestQuery(req.query);
  const data = await getLatestFiiDiiFlows(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getFiiDiiHistory = asyncHandler(async (req, res) => {
  const query = normalizeFiiDiiHistoryQuery(req.query);
  const data = await getFiiDiiFlowHistory(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getFiiDiiCumulative = asyncHandler(async (req, res) => {
  const query = normalizeFiiDiiCumulativeQuery(req.query);
  const data = await getFiiDiiCumulativeFlows(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postFiiDiiSync = asyncHandler(async (req, res) => {
  const query = normalizeFiiDiiSyncQuery(req.query);
  const data = await scrapeAndStoreFiiDiiFlows({
    source: 'api_sync_fii_dii',
    fromDate: query.fromDate,
    toDate: query.toDate,
    days: query.days,
    segment: query.segment,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getBlockDealsLatest = asyncHandler(async (req, res) => {
  const query = normalizeBlockDealsLatestQuery(req.query);
  const data = await getLatestBlockDeals(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getBlockDealsHistory = asyncHandler(async (req, res) => {
  const query = normalizeBlockDealsHistoryQuery(req.query);
  const data = await getBlockDealsHistoryData(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postBlockDealsSync = asyncHandler(async (req, res) => {
  const query = normalizeBlockDealsSyncQuery(req.query);
  const data = await scrapeAndStoreBlockDeals({
    source: 'api_sync_block_deals',
    fromDate: query.fromDate,
    toDate: query.toDate,
    days: query.days,
    exchange: query.exchange,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getMutualFundsLatest = asyncHandler(async (req, res) => {
  const query = normalizeMutualFundsLatestQuery(req.query);
  const data = await getLatestMutualFundHoldings(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getMutualFundsHistory = asyncHandler(async (req, res) => {
  const query = normalizeMutualFundsHistoryQuery(req.query);
  const data = await getMutualFundHoldingHistory(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getMutualFundsTopHolders = asyncHandler(async (req, res) => {
  const query = normalizeMutualFundsTopHoldersQuery(req.query);
  const data = await getMutualFundTopHolders(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postMutualFundsSync = asyncHandler(async (req, res) => {
  const query = normalizeMutualFundsSyncQuery(req.query);
  const data = await scrapeAndStoreMutualFundHoldings({
    source: 'api_sync_mutual_funds',
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    months: query.months,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getInsiderTradesLatest = asyncHandler(async (req, res) => {
  const query = normalizeInsiderTradesLatestQuery(req.query);
  const data = await getLatestInsiderTrades(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getInsiderTradesHistory = asyncHandler(async (req, res) => {
  const query = normalizeInsiderTradesHistoryQuery(req.query);
  const data = await getInsiderTradeHistory(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getInsiderTradesSummary = asyncHandler(async (req, res) => {
  const query = normalizeInsiderTradesSummaryQuery(req.query);
  const data = await getInsiderTradeSummary(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postInsiderTradesSync = asyncHandler(async (req, res) => {
  const query = normalizeInsiderTradesSyncQuery(req.query);
  const data = await scrapeAndStoreInsiderTrades({
    source: 'api_sync_insider_trades',
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    transactionType: query.transactionType,
    days: query.days,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getShareholdingLatest = asyncHandler(async (req, res) => {
  const query = normalizeShareholdingLatestQuery(req.query);
  const data = await getLatestShareholdingPatterns(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getShareholdingHistory = asyncHandler(async (req, res) => {
  const query = normalizeShareholdingHistoryQuery(req.query);
  const data = await getShareholdingPatternHistory(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getShareholdingTrends = asyncHandler(async (req, res) => {
  const query = normalizeShareholdingTrendsQuery(req.query);
  const data = await getShareholdingPatternTrends(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postShareholdingSync = asyncHandler(async (req, res) => {
  const query = normalizeShareholdingSyncQuery(req.query);
  const data = await scrapeAndStoreShareholdingPatterns({
    source: 'api_sync_shareholding_patterns',
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    quarters: query.quarters,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getCorporateActionsLatest = asyncHandler(async (req, res) => {
  const query = normalizeCorporateActionsLatestQuery(req.query);
  const data = await getLatestCorporateActions(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getCorporateActionsHistory = asyncHandler(async (req, res) => {
  const query = normalizeCorporateActionsHistoryQuery(req.query);
  const data = await getCorporateActionHistory(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getCorporateActionsSummary = asyncHandler(async (req, res) => {
  const query = normalizeCorporateActionsSummaryQuery(req.query);
  const data = await getCorporateActionSummary(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postCorporateActionsSync = asyncHandler(async (req, res) => {
  const query = normalizeCorporateActionsSyncQuery(req.query);
  const data = await scrapeAndStoreCorporateActions({
    source: 'api_sync_corporate_actions',
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    actionType: query.actionType,
    months: query.months,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const getEarningsCalendarLatest = asyncHandler(async (req, res) => {
  const query = normalizeEarningsCalendarLatestQuery(req.query);
  const data = await getLatestEarningsCalendar(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getEarningsCalendarHistory = asyncHandler(async (req, res) => {
  const query = normalizeEarningsCalendarHistoryQuery(req.query);
  const data = await getEarningsCalendarHistoryData(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getEarningsCalendarSummary = asyncHandler(async (req, res) => {
  const query = normalizeEarningsCalendarSummaryQuery(req.query);
  const data = await getEarningsCalendarSummaryData(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const postEarningsCalendarSync = asyncHandler(async (req, res) => {
  const query = normalizeEarningsCalendarSyncQuery(req.query);
  const data = await scrapeAndStoreEarningsCalendar({
    source: 'api_sync_earnings_calendar',
    fromDate: query.fromDate,
    toDate: query.toDate,
    symbol: query.symbol,
    fiscalQuarter: query.fiscalQuarter,
    quarters: query.quarters,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getFiiDiiLatest,
  getFiiDiiHistory,
  getFiiDiiCumulative,
  postFiiDiiSync,
  getBlockDealsLatest,
  getBlockDealsHistory,
  postBlockDealsSync,
  getMutualFundsLatest,
  getMutualFundsHistory,
  getMutualFundsTopHolders,
  postMutualFundsSync,
  getInsiderTradesLatest,
  getInsiderTradesHistory,
  getInsiderTradesSummary,
  postInsiderTradesSync,
  getShareholdingLatest,
  getShareholdingHistory,
  getShareholdingTrends,
  postShareholdingSync,
  getCorporateActionsLatest,
  getCorporateActionsHistory,
  getCorporateActionsSummary,
  postCorporateActionsSync,
  getEarningsCalendarLatest,
  getEarningsCalendarHistory,
  getEarningsCalendarSummary,
  postEarningsCalendarSync,
};
