const asyncHandler = require('../../shared/middleware/asyncHandler');
const { ApiError } = require('../../utils/errorHandler');
const {
  normalizeIpoCalendarQuery,
  normalizeIpoId,
  normalizeIpoSubscriptionLatestQuery,
  normalizeIpoSubscriptionHistoryQuery,
  normalizeIpoSubscriptionSyncQuery,
  normalizeIpoGmpLatestQuery,
  normalizeIpoGmpHistoryQuery,
  normalizeIpoGmpSyncQuery,
} = require('./ipo.validation');
const {
  listIpoCalendar,
  getIpoById,
  listLatestIpoSubscriptions,
  getIpoSubscription,
  scrapeAndStoreIpoSubscriptions,
  listLatestIpoGmp,
  getIpoGmp,
  scrapeAndStoreIpoGmp,
} = require('./ipo.service');

const getIpoCalendar = asyncHandler(async (req, res) => {
  const query = normalizeIpoCalendarQuery(req.query);
  const calendar = await listIpoCalendar(query);

  res.status(200).json({
    success: true,
    data: calendar,
  });
});

const getIpo = asyncHandler(async (req, res) => {
  const ipoId = normalizeIpoId(req.params.ipoId);
  const ipo = await getIpoById(ipoId);

  if (!ipo) {
    throw new ApiError('IPO entry not found', 404, 'ERR_IPO_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      ipo,
    },
  });
});

const getIpoSubscriptionsLatest = asyncHandler(async (req, res) => {
  const query = normalizeIpoSubscriptionLatestQuery(req.query);
  const data = await listLatestIpoSubscriptions(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getIpoSubscriptionHistory = asyncHandler(async (req, res) => {
  const ipoId = normalizeIpoId(req.params.ipoId);
  const query = normalizeIpoSubscriptionHistoryQuery(req.query);
  const data = await getIpoSubscription(ipoId, query);

  if (!data) {
    throw new ApiError('IPO entry not found', 404, 'ERR_IPO_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data,
  });
});

const postIpoSubscriptionSync = asyncHandler(async (req, res) => {
  const query = normalizeIpoSubscriptionSyncQuery(req.query);
  const summary = await scrapeAndStoreIpoSubscriptions({
    source: 'api_sync_ipo_subscriptions',
    snapshotDate: query.snapshotDate,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data: summary,
  });
});

const getIpoGmpLatest = asyncHandler(async (req, res) => {
  const query = normalizeIpoGmpLatestQuery(req.query);
  const data = await listLatestIpoGmp(query);

  res.status(200).json({
    success: true,
    data,
  });
});

const getIpoGmpHistory = asyncHandler(async (req, res) => {
  const ipoId = normalizeIpoId(req.params.ipoId);
  const query = normalizeIpoGmpHistoryQuery(req.query);
  const data = await getIpoGmp(ipoId, query);

  if (!data) {
    throw new ApiError('IPO entry not found', 404, 'ERR_IPO_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data,
  });
});

const postIpoGmpSync = asyncHandler(async (req, res) => {
  const query = normalizeIpoGmpSyncQuery(req.query);
  const summary = await scrapeAndStoreIpoGmp({
    source: 'api_sync_ipo_gmp',
    snapshotDate: query.snapshotDate,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data: summary,
  });
});

module.exports = {
  getIpoCalendar,
  getIpo,
  getIpoSubscriptionsLatest,
  getIpoSubscriptionHistory,
  postIpoSubscriptionSync,
  getIpoGmpLatest,
  getIpoGmpHistory,
  postIpoGmpSync,
};
