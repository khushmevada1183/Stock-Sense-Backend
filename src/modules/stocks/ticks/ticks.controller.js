const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { ingestTicks, listTicks } = require('./ticks.service');

const createTicks = asyncHandler(async (req, res) => {
  const data = await ingestTicks(req.params.symbol, req.body);

  res.status(201).json({
    success: true,
    data,
  });
});

const getTicks = asyncHandler(async (req, res) => {
  const data = await listTicks(req.params.symbol, req.query);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  createTicks,
  getTicks,
};
