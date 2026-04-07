/* eslint-disable no-console */

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, options);
  let body;

  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }

  return { response, body };
};

const assertStatus = (label, actual, expected) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

const run = async () => {
  const email = `watchlist.${Date.now()}@example.com`;
  const password = 'StrongPass123';

  const signup = await requestJson('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: 'Watchlist Tester',
    }),
  });

  assertStatus('signup', signup.response.status, 201);

  const token = signup.body?.data?.accessToken;
  if (!token) {
    throw new Error('signup: missing access token');
  }

  const authHeaders = {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };

  const createWatchlist = await requestJson('/api/v1/watchlists', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Core Picks',
      description: 'Phase 2 watchlist smoke test',
    }),
  });

  assertStatus('create watchlist', createWatchlist.response.status, 201);

  const watchlistId = createWatchlist.body?.data?.watchlist?.id;
  if (!watchlistId) {
    throw new Error('create watchlist: missing watchlist id');
  }

  const addItem1 = await requestJson(`/api/v1/watchlists/${watchlistId}/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ symbol: 'TCS' }),
  });

  assertStatus('add item 1', addItem1.response.status, 201);

  const addItem2 = await requestJson(`/api/v1/watchlists/${watchlistId}/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ symbol: 'RELIANCE' }),
  });

  assertStatus('add item 2', addItem2.response.status, 201);

  const item1Id = addItem1.body?.data?.item?.id;
  const item2Id = addItem2.body?.data?.item?.id;

  if (!item1Id || !item2Id) {
    throw new Error('add items: missing item ids');
  }

  const getBefore = await requestJson(`/api/v1/watchlists/${watchlistId}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('get watchlist before reorder', getBefore.response.status, 200);

  const beforeOrder = (getBefore.body?.data?.watchlist?.items || []).map((item) => item.id);

  const reorder = await requestJson(`/api/v1/watchlists/${watchlistId}/items/reorder`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ itemIds: [item2Id, item1Id] }),
  });

  assertStatus('reorder watchlist items', reorder.response.status, 200);

  const getAfter = await requestJson(`/api/v1/watchlists/${watchlistId}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('get watchlist after reorder', getAfter.response.status, 200);

  const afterOrder = (getAfter.body?.data?.watchlist?.items || []).map((item) => item.id);

  if (!(afterOrder[0] === item2Id && afterOrder[1] === item1Id)) {
    throw new Error('reorder assertion failed: item order mismatch');
  }

  const deleteItem = await requestJson(`/api/v1/watchlists/${watchlistId}/items/${item1Id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('delete watchlist item', deleteItem.response.status, 200);

  const getFinal = await requestJson(`/api/v1/watchlists/${watchlistId}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('get watchlist final', getFinal.response.status, 200);

  const remainingItems = (getFinal.body?.data?.watchlist?.items || []).length;

  if (remainingItems !== 1) {
    throw new Error(`expected 1 remaining item, got ${remainingItems}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        watchlistId,
        beforeOrder,
        afterOrder,
        remainingItems,
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
