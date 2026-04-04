const { upsertTicks, getTicks } = require('./ticks.repository');
const { normalizeIngestPayload, normalizeTicksQuery } = require('./ticks.validation');

const ingestTicks = async (symbol, body) => {
  const payload = normalizeIngestPayload(symbol, body);
  const upsertedCount = await upsertTicks(payload.symbol, payload.ticks);

  return {
    symbol: payload.symbol,
    receivedCount: payload.ticks.length,
    upsertedCount,
  };
};

const listTicks = async (symbol, queryParams) => {
  const options = normalizeTicksQuery(symbol, queryParams);
  const items = await getTicks(options.symbol, options);

  return {
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    limit: options.limit,
    count: items.length,
    items,
  };
};

module.exports = {
  ingestTicks,
  listTicks,
};
