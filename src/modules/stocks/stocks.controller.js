const asyncHandler = require('../../shared/middleware/asyncHandler');
const {
  searchStocks,
  getStockProfile,
  getStockQuote,
  getStockPeers,
} = require('./stocks.service');

const search = asyncHandler(async (req, res) => {
  const result = await searchStocks(req.query);
  res.setHeader('Cache-Control', 'public, max-age=30');

  return res.success(
    {
      query: result.query,
      count: result.results.length,
      results: result.results,
    },
    {
      pagination: result.pagination,
    }
  );
});

const profile = asyncHandler(async (req, res) => {
  const result = await getStockProfile(req.params.symbol);
  res.setHeader('Cache-Control', 'public, max-age=30');

  return res.success(result);
});

const quote = asyncHandler(async (req, res) => {
  const result = await getStockQuote(req.params.symbol);
  res.setHeader('Cache-Control', 'no-store');

  return res.success(result);
});

const peers = asyncHandler(async (req, res) => {
  const result = await getStockPeers(req.params.symbol, req.query);
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.success(result);
});

module.exports = {
  search,
  profile,
  quote,
  peers,
};
