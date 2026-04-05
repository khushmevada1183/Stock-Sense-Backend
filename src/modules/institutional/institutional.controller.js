const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  normalizeFiiDiiLatestQuery,
  normalizeFiiDiiHistoryQuery,
  normalizeFiiDiiCumulativeQuery,
  normalizeFiiDiiSyncQuery,
} = require('./institutional.validation');
const {
  getLatestFiiDiiFlows,
  getFiiDiiFlowHistory,
  getFiiDiiCumulativeFlows,
  scrapeAndStoreFiiDiiFlows,
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

module.exports = {
  getFiiDiiLatest,
  getFiiDiiHistory,
  getFiiDiiCumulative,
  postFiiDiiSync,
};
