const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const {
  listWatchlists,
  createWatchlist,
  getWatchlist,
  patchWatchlist,
  removeWatchlist,
  addWatchlistItem,
  deleteWatchlistItem,
  reorderWatchlist,
} = require('./watchlists.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listWatchlists);
router.post('/', createWatchlist);

router.get('/:watchlistId', getWatchlist);
router.patch('/:watchlistId', patchWatchlist);
router.delete('/:watchlistId', removeWatchlist);

router.post('/:watchlistId/items', addWatchlistItem);
router.delete('/:watchlistId/items/:itemId', deleteWatchlistItem);
router.patch('/:watchlistId/items/reorder', reorderWatchlist);

module.exports = router;
