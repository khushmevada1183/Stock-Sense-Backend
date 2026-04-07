const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { getTechnicalIndicators } = require('./technical.service');
const {
  getTechnicalIndicatorSchedulerStatus,
  runTechnicalIndicatorRecomputeNow,
} = require('../../../jobs/technicalIndicatorsScheduler');

const getTechnical = asyncHandler(async (req, res) => {
  const data = await getTechnicalIndicators(req.params.symbol, req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.success(data);
});

const getTechnicalSchedulerStatus = asyncHandler(async (req, res) => {
  const status = getTechnicalIndicatorSchedulerStatus();

  return res.success(status);
});

const runTechnicalRecompute = asyncHandler(async (req, res) => {
  const result = await runTechnicalIndicatorRecomputeNow('api-manual', req.query);

  if (result.skipped || result.success) {
    return res.success(result);
  }

  return res.status(500).json({
    success: false,
    error: {
      message: 'Technical indicator recompute failed',
      code: 'ERR_TECHNICAL_RECOMPUTE_FAILED',
      statusCode: 500,
      details: result,
      requestId: req.requestId || req.context?.requestId || null,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = {
  getTechnical,
  getTechnicalSchedulerStatus,
  runTechnicalRecompute,
};
