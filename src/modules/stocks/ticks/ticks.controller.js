const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { ingestTicks, listTicks, listHistory } = require('./ticks.service');

const createTicks = asyncHandler(async (req, res) => {
  const data = await ingestTicks(req.params.symbol, req.body);

  res.status(201).json({
    success: true,
    data,
  });
});

const getTicks = asyncHandler(async (req, res) => {
  const data = await listTicks(req.params.symbol, req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  res.status(200).json({
    success: true,
    data,
  });
});

const getHistory = asyncHandler(async (req, res) => {
  const data = await listHistory(req.params.symbol, req.query);
  res.setHeader('Cache-Control', 'public, max-age=300');

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  createTicks,
  getTicks,
  getHistory,
};
