const asyncHandler = require('../../../shared/middleware/asyncHandler');
const {
  getFundamentalData,
  getFinancialsData,
  syncFundamentalsBatch,
} = require('./fundamentals.service');
const {
  getFundamentalsSyncStatus,
  runFundamentalsSyncNow,
} = require('../../../jobs/fundamentalsSyncScheduler');

const getFundamental = asyncHandler(async (req, res) => {
  const result = await getFundamentalData(req.params.symbol, req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.success(result);
});

const getFinancials = asyncHandler(async (req, res) => {
  const result = await getFinancialsData(req.params.symbol, req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.success(result);
});

const getFundamentalsStatus = asyncHandler(async (_req, res) => {
  return res.success(getFundamentalsSyncStatus());
});

const runFundamentalsSync = asyncHandler(async (req, res) => {
  const trigger = req.body?.trigger || 'manual';
  const mode = String(req.body?.mode || '').trim().toLowerCase();

  const result = mode === 'scheduler'
    ? await runFundamentalsSyncNow(trigger, req.body || {})
    : await syncFundamentalsBatch(req.body || {});

  return res.success(result);
});

module.exports = {
  getFundamental,
  getFinancials,
  getFundamentalsStatus,
  runFundamentalsSync,
};
