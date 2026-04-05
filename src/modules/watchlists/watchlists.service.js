const { ApiError } = require('../../utils/errorHandler');
const {
  listWatchlistsByUser,
  createWatchlist,
  getWatchlistById,
  updateWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  reorderWatchlistItems,
} = require('./watchlists.repository');

const listUserWatchlists = async (userId) => {
  return listWatchlistsByUser(userId);
};

const createUserWatchlist = async (userId, payload) => {
  return createWatchlist({
    userId,
    name: payload.name,
    description: payload.description,
  });
};

const getUserWatchlistDetails = async (userId, watchlistId) => {
  return getWatchlistById({ userId, watchlistId });
};

const updateUserWatchlist = async (userId, watchlistId, payload) => {
  return updateWatchlist({
    userId,
    watchlistId,
    name: payload.name,
    description: payload.description,
  });
};

const deleteUserWatchlist = async (userId, watchlistId) => {
  return deleteWatchlist({ userId, watchlistId });
};

const addItemToWatchlist = async (userId, watchlistId, payload) => {
  try {
    return await addWatchlistItem({
      userId,
      watchlistId,
      symbol: payload.symbol,
    });
  } catch (error) {
    if (error && error.code === '23505') {
      throw new ApiError('Symbol already exists in watchlist', 409, 'ERR_WATCHLIST_ITEM_EXISTS');
    }

    throw error;
  }
};

const removeItemFromWatchlist = async (userId, watchlistId, itemId) => {
  return removeWatchlistItem({ userId, watchlistId, itemId });
};

const reorderUserWatchlistItems = async (userId, watchlistId, payload) => {
  const reorderResult = await reorderWatchlistItems({
    userId,
    watchlistId,
    itemIds: payload.itemIds,
  });

  if (!reorderResult.watchlistFound) {
    return null;
  }

  if (!reorderResult.reordered) {
    throw new ApiError('itemIds must exactly match existing watchlist items', 400, 'ERR_INVALID_REORDER');
  }

  return getWatchlistById({ userId, watchlistId });
};

module.exports = {
  listUserWatchlists,
  createUserWatchlist,
  getUserWatchlistDetails,
  updateUserWatchlist,
  deleteUserWatchlist,
  addItemToWatchlist,
  removeItemFromWatchlist,
  reorderUserWatchlistItems,
};
