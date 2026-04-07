const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => {
  return Math.min(max, Math.max(min, value));
};

const normalizePaginationQuery = (query = {}, options = {}) => {
  const defaultPage = toInteger(options.defaultPage, 1);
  const defaultLimit = toInteger(options.defaultLimit, 25);
  const maxLimit = toInteger(options.maxLimit, 100);

  const page = clamp(toInteger(query.page, defaultPage), 1, Number.MAX_SAFE_INTEGER);
  const limit = clamp(toInteger(query.limit, defaultLimit), 1, maxLimit);

  const explicitOffset = query.offset !== undefined
    ? clamp(toInteger(query.offset, 0), 0, Number.MAX_SAFE_INTEGER)
    : null;

  const offset = explicitOffset !== null ? explicitOffset : (page - 1) * limit;
  const derivedPage = explicitOffset !== null ? Math.floor(offset / limit) + 1 : page;

  return {
    page: derivedPage,
    limit,
    offset,
  };
};

const buildPaginationMetadata = ({
  page,
  limit,
  itemCount,
  totalCount,
}) => {
  const safePage = clamp(toInteger(page, 1), 1, Number.MAX_SAFE_INTEGER);
  const safeLimit = clamp(toInteger(limit, 25), 1, Number.MAX_SAFE_INTEGER);
  const safeItemCount = Math.max(0, toInteger(itemCount, 0));
  const hasTotalCount = Number.isFinite(totalCount);
  const safeTotalCount = hasTotalCount ? Math.max(0, toInteger(totalCount, 0)) : null;
  const totalPages = hasTotalCount
    ? Math.max(1, Math.ceil(safeTotalCount / safeLimit))
    : null;

  const metadata = {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    itemCount: safeItemCount,
    returnedCount: safeItemCount,
    totalCount: safeTotalCount,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: hasTotalCount ? safePage < totalPages : safeItemCount >= safeLimit,
    prevPage: safePage > 1 ? safePage - 1 : null,
    nextPage: hasTotalCount
      ? (safePage < totalPages ? safePage + 1 : null)
      : (safeItemCount >= safeLimit ? safePage + 1 : null),
  };

  return metadata;
};

module.exports = {
  normalizePaginationQuery,
  buildPaginationMetadata,
};
