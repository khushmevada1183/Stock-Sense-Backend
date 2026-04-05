const asyncHandler = require('../../shared/middleware/asyncHandler');
const { ApiError } = require('../../utils/errorHandler');
const {
  normalizeWatchlistId,
  normalizeWatchlistItemId,
  normalizeWatchlistCreatePayload,
  normalizeWatchlistUpdatePayload,
  normalizeAddWatchlistItemPayload,
  normalizeWatchlistReorderPayload,
} = require('./watchlists.validation');
const {
  listUserWatchlists,
  createUserWatchlist,
  getUserWatchlistDetails,
  updateUserWatchlist,
  deleteUserWatchlist,
  addItemToWatchlist,
  removeItemFromWatchlist,
  reorderUserWatchlistItems,
} = require('./watchlists.service');

const getUserIdFromRequest = (req) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError('Authentication required', 401, 'ERR_UNAUTHORIZED');
  }

  return String(userId);
};

const listWatchlists = asyncHandler(async (req, res) => {
  const watchlists = await listUserWatchlists(getUserIdFromRequest(req));

  res.status(200).json({
    success: true,
    data: {
      watchlists,
    },
  });
});

const createWatchlist = asyncHandler(async (req, res) => {
  const payload = normalizeWatchlistCreatePayload(req.body);
  const watchlist = await createUserWatchlist(getUserIdFromRequest(req), payload);

  res.status(201).json({
    success: true,
    data: {
      watchlist,
    },
  });
});

const getWatchlist = asyncHandler(async (req, res) => {
  const watchlistId = normalizeWatchlistId(req.params.watchlistId);
  const watchlist = await getUserWatchlistDetails(getUserIdFromRequest(req), watchlistId);

  if (!watchlist) {
    throw new ApiError('Watchlist not found', 404, 'ERR_WATCHLIST_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      watchlist,
    },
  });
});

const patchWatchlist = asyncHandler(async (req, res) => {
  const watchlistId = normalizeWatchlistId(req.params.watchlistId);
  const payload = normalizeWatchlistUpdatePayload(req.body);
  const watchlist = await updateUserWatchlist(getUserIdFromRequest(req), watchlistId, payload);

  if (!watchlist) {
    throw new ApiError('Watchlist not found', 404, 'ERR_WATCHLIST_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      watchlist,
    },
  });
});

const removeWatchlist = asyncHandler(async (req, res) => {
  const watchlistId = normalizeWatchlistId(req.params.watchlistId);
  const deleted = await deleteUserWatchlist(getUserIdFromRequest(req), watchlistId);

  if (!deleted) {
    throw new ApiError('Watchlist not found', 404, 'ERR_WATCHLIST_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'Watchlist deleted successfully',
    },
  });
});

const addWatchlistItem = asyncHandler(async (req, res) => {
  const watchlistId = normalizeWatchlistId(req.params.watchlistId);
  const payload = normalizeAddWatchlistItemPayload(req.body);

  const item = await addItemToWatchlist(getUserIdFromRequest(req), watchlistId, payload);

  if (!item) {
    throw new ApiError('Watchlist not found', 404, 'ERR_WATCHLIST_NOT_FOUND');
  }

  res.status(201).json({
    success: true,
    data: {
      item,
    },
  });
});

const deleteWatchlistItem = asyncHandler(async (req, res) => {
  const watchlistId = normalizeWatchlistId(req.params.watchlistId);
  const itemId = normalizeWatchlistItemId(req.params.itemId);

  const result = await removeItemFromWatchlist(getUserIdFromRequest(req), watchlistId, itemId);

  if (!result.watchlistFound) {
    throw new ApiError('Watchlist not found', 404, 'ERR_WATCHLIST_NOT_FOUND');
  }

  if (!result.itemDeleted) {
    throw new ApiError('Watchlist item not found', 404, 'ERR_WATCHLIST_ITEM_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'Watchlist item deleted successfully',
    },
  });
});

const reorderWatchlist = asyncHandler(async (req, res) => {
  const watchlistId = normalizeWatchlistId(req.params.watchlistId);
  const payload = normalizeWatchlistReorderPayload(req.body);

  const watchlist = await reorderUserWatchlistItems(getUserIdFromRequest(req), watchlistId, payload);

  if (!watchlist) {
    throw new ApiError('Watchlist not found', 404, 'ERR_WATCHLIST_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      watchlist,
    },
  });
});

module.exports = {
  listWatchlists,
  createWatchlist,
  getWatchlist,
  patchWatchlist,
  removeWatchlist,
  addWatchlistItem,
  deleteWatchlistItem,
  reorderWatchlist,
};
