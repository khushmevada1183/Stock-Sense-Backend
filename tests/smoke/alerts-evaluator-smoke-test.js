/* eslint-disable no-console */

const { evaluateActiveAlerts } = require('../../src/modules/alerts/alerts.service');
const { closePool } = require('../../src/db/client');

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
  const email = `evaluator.${Date.now()}@example.com`;
  const password = 'StrongPass123';
  const symbol = 'ALRTEVAL';

  const signup = await requestJson('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: 'Alert Evaluator Tester',
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

  const createAlertResponse = await requestJson('/api/v1/alerts', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      symbol,
      alertType: 'price_above',
      targetValue: 100,
    }),
  });

  assertStatus('create alert', createAlertResponse.response.status, 201);

  const alertId = createAlertResponse.body?.data?.alert?.id;
  if (!alertId) {
    throw new Error('create alert: missing alert id');
  }

  const now = Date.now();
  const ingestResponse = await requestJson(`/api/v1/stocks/${symbol}/ticks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'alerts-evaluator-smoke',
      ticks: [
        {
          timestamp: new Date(now - 60 * 1000).toISOString(),
          open: 140,
          high: 150,
          low: 130,
          close: 145,
          volume: 1000,
        },
        {
          timestamp: new Date(now).toISOString(),
          open: 145,
          high: 160,
          low: 140,
          close: 155,
          volume: 1500,
        },
      ],
    }),
  });

  assertStatus('ingest ticks', ingestResponse.response.status, 201);

  const evaluationSummary = await evaluateActiveAlerts({ cooldownSeconds: 1 });

  if (evaluationSummary.triggeredCount < 1) {
    throw new Error('evaluator: expected at least one triggered alert');
  }

  const triggeredIds = new Set(
    (evaluationSummary.triggeredAlerts || []).map((alert) => String(alert.id))
  );

  if (!triggeredIds.has(alertId)) {
    throw new Error('evaluator: created alert was not triggered');
  }

  const getAlertResponse = await requestJson(`/api/v1/alerts/${alertId}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assertStatus('get alert', getAlertResponse.response.status, 200);

  const lastTriggeredAt = getAlertResponse.body?.data?.alert?.lastTriggeredAt;
  if (!lastTriggeredAt) {
    throw new Error('evaluator: expected lastTriggeredAt to be populated');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        alertId,
        triggeredCount: evaluationSummary.triggeredCount,
        lastTriggeredAt,
      },
      null,
      2
    )
  );
};

run()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
