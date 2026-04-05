const { ApiError } = require('../../utils/errorHandler');

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
const SYMBOL_REGEX = /^[A-Z0-9.&_-]{1,20}$/;

const normalizeWatchlistId = (rawWatchlistId) => {
  const watchlistId = String(rawWatchlistId || '').trim();
  if (!UUID_REGEX.test(watchlistId)) {
    throw new ApiError('Invalid watchlistId format', 400, 'ERR_INVALID_WATCHLIST_ID');
  }

  return watchlistId;
};

const normalizeWatchlistItemId = (rawItemId) => {
  const itemId = String(rawItemId || '').trim();
  if (!UUID_REGEX.test(itemId)) {
    throw new ApiError('Invalid itemId format', 400, 'ERR_INVALID_WATCHLIST_ITEM_ID');
  }

  return itemId;
};

const normalizeWatchlistName = (rawName) => {
  const name = String(rawName || '').trim();
  if (!name) {
    throw new ApiError('name is required', 400, 'ERR_INVALID_PAYLOAD');
  }

  if (name.length > 100) {
    throw new ApiError('name must not exceed 100 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  return name;
};

const normalizeDescription = (rawDescription) => {
  if (rawDescription === undefined) {
    return undefined;
  }

  if (rawDescription === null || rawDescription === '') {
    return null;
  }

  const description = String(rawDescription).trim();
  if (description.length > 500) {
    throw new ApiError('description must not exceed 500 characters', 400, 'ERR_INVALID_PAYLOAD');
  }

  return description;
};

const normalizeSymbol = (rawSymbol) => {
  const symbol = String(rawSymbol || '').trim().toUpperCase();
  if (!SYMBOL_REGEX.test(symbol)) {
    throw new ApiError('symbol must be a valid NSE/BSE symbol', 400, 'ERR_INVALID_SYMBOL');
  }

  return symbol;
};

const normalizeWatchlistCreatePayload = (body) => {
  return {
    name: normalizeWatchlistName(body?.name),
    description: normalizeDescription(body?.description) ?? null,
  };
};

const normalizeWatchlistUpdatePayload = (body) => {
  const payload = {};

  if (body?.name !== undefined) {
    payload.name = normalizeWatchlistName(body.name);
  }

  if (body?.description !== undefined) {
    payload.description = normalizeDescription(body.description);
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError('No updatable fields were provided', 400, 'ERR_INVALID_PAYLOAD');
  }

  return payload;
};

const normalizeAddWatchlistItemPayload = (body) => {
  return {
    symbol: normalizeSymbol(body?.symbol),
  };
};

const normalizeWatchlistReorderPayload = (body) => {
  if (!Array.isArray(body?.itemIds) || body.itemIds.length === 0) {
    throw new ApiError('itemIds must be a non-empty array', 400, 'ERR_INVALID_PAYLOAD');
  }

  if (body.itemIds.length > 500) {
    throw new ApiError('itemIds cannot exceed 500 records', 400, 'ERR_PAYLOAD_TOO_LARGE');
  }

  const normalized = body.itemIds.map((itemId) => normalizeWatchlistItemId(itemId));
  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    throw new ApiError('itemIds contains duplicates', 400, 'ERR_INVALID_PAYLOAD');
  }

  return {
    itemIds: normalized,
  };
};

module.exports = {
  normalizeWatchlistId,
  normalizeWatchlistItemId,
  normalizeWatchlistCreatePayload,
  normalizeWatchlistUpdatePayload,
  normalizeAddWatchlistItemPayload,
  normalizeWatchlistReorderPayload,
};
