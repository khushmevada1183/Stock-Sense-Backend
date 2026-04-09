/* eslint-disable no-console */

const { evaluateActiveAlerts } = require('../../src/modules/alerts/alerts.service');
const { processQueuedNotifications } = require('../../src/modules/notifications/notifications.service');
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  const email = `notify.${Date.now()}@example.com`;
  const password = 'StrongPass123';
  const symbol = 'NOTIFCHK';

  const signup = await requestJson('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: 'Notification Tester',
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

  const pushDevice = await requestJson('/api/v1/notifications/push-devices', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      provider: 'mock',
      platform: 'android',
      deviceToken: `devtok-${Date.now()}-notification-smoke`,
      metadata: { source: 'notification-smoke' },
    }),
  });

  assertStatus('register push device', pushDevice.response.status, 201);

  const createAlert = await requestJson('/api/v1/alerts', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      symbol,
      alertType: 'price_above',
      targetValue: 120,
      metadata: {
        notificationChannels: ['email', 'push'],
      },
    }),
  });

  assertStatus('create alert', createAlert.response.status, 201);

  const alertId = createAlert.body?.data?.alert?.id;
  if (!alertId) {
    throw new Error('create alert: missing alert id');
  }

  const now = Date.now();
  const ingest = await requestJson(`/api/v1/stocks/${symbol}/ticks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'notification-smoke',
      datasetType: 'test',
      timeframe: '1m',
      sourceFamily: 'smoke',
      ticks: [
        {
          timestamp: new Date(now - 60 * 1000).toISOString(),
          open: 100,
          high: 110,
          low: 99,
          close: 105,
          volume: 900,
        },
        {
          timestamp: new Date(now).toISOString(),
          open: 130,
          high: 140,
          low: 125,
          close: 135,
          volume: 1300,
        },
      ],
    }),
  });

  assertStatus('ingest ticks', ingest.response.status, 201);

  const evaluation = await evaluateActiveAlerts({
    cooldownSeconds: 1,
    datasetType: 'test',
  });
  if (evaluation.triggeredCount < 1) {
    throw new Error('expected at least one triggered alert after evaluation');
  }

  const maxAttempts = 5;
  let sentChannels = new Set();
  let processing = { sentCount: 0, failedCount: 0 };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    processing = await processQueuedNotifications({ limit: 200 });

    const notifications = await requestJson('/api/v1/notifications?limit=200', {
      headers: { authorization: `Bearer ${token}` },
    });

    assertStatus('list notifications', notifications.response.status, 200);

    const items = notifications.body?.data?.notifications || [];
    const alertNotifications = items.filter((item) => item.alertId === alertId && item.status === 'sent');
    sentChannels = new Set(alertNotifications.map((item) => item.channel));

    if (sentChannels.has('email') && sentChannels.has('push')) {
      break;
    }

    if (attempt < maxAttempts) {
      await sleep(150);
    }
  }

  if (!sentChannels.has('email') || !sentChannels.has('push')) {
    throw new Error('expected both email and push sent notifications for triggered alert');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        alertId,
        sentChannels: [...sentChannels],
        sentCount: processing.sentCount,
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
