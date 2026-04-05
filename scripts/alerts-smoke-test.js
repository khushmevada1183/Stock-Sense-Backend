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
  const email = `alerts.${Date.now()}@example.com`;
  const password = 'StrongPass123';

  const signup = await requestJson('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: 'Alerts Tester',
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

  const create = await requestJson('/api/v1/alerts', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      symbol: 'TCS',
      alertType: 'price_above',
      targetValue: 4500,
      metadata: {
        note: 'Phase 2 alert smoke test',
      },
    }),
  });

  assertStatus('create alert', create.response.status, 201);

  const alertId = create.body?.data?.alert?.id;
  if (!alertId) {
    throw new Error('create alert: missing alert id');
  }

  const list = await requestJson('/api/v1/alerts?symbol=TCS&isActive=true', {
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('list alerts', list.response.status, 200);

  const listAlerts = list.body?.data?.alerts || [];
  if (!listAlerts.some((alert) => alert.id === alertId)) {
    throw new Error('list alerts: created alert not found');
  }

  const patch = await requestJson(`/api/v1/alerts/${alertId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      targetValue: 4550,
      isActive: false,
    }),
  });

  assertStatus('update alert', patch.response.status, 200);

  const updated = patch.body?.data?.alert;
  if (!updated || Number(updated.targetValue) !== 4550 || updated.isActive !== false) {
    throw new Error('update alert: response payload mismatch');
  }

  const getOne = await requestJson(`/api/v1/alerts/${alertId}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('get alert', getOne.response.status, 200);

  const remove = await requestJson(`/api/v1/alerts/${alertId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('delete alert', remove.response.status, 200);

  const getDeleted = await requestJson(`/api/v1/alerts/${alertId}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('get deleted alert', getDeleted.response.status, 404);

  console.log(
    JSON.stringify(
      {
        ok: true,
        alertId,
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
