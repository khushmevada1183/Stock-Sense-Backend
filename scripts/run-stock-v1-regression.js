/* eslint-disable no-console */

const { spawn } = require('child_process');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parsePositiveInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 10000}`;
const healthPath = process.env.REGRESSION_HEALTH_PATH || '/health';
const healthPollIntervalMs = parsePositiveInt(process.env.REGRESSION_HEALTH_POLL_MS, 1000);
const healthTimeoutMs = parsePositiveInt(process.env.REGRESSION_HEALTH_TIMEOUT_MS, 45000);
const stopTimeoutMs = parsePositiveInt(process.env.REGRESSION_STOP_TIMEOUT_MS, 10000);
const shouldAutoStartServer = parseBoolean(process.env.REGRESSION_START_SERVER, true);
const serverCommand = process.env.REGRESSION_SERVER_COMMAND || 'node';
const serverArgs = (process.env.REGRESSION_SERVER_ARGS || 'src/server.js')
  .split(' ')
  .map((item) => item.trim())
  .filter(Boolean);

const serverEnvDefaults = {
  NODE_ENV: 'test',
  WEBSOCKET_ENABLED: 'false',
  LIVE_TICK_STREAM_ENABLED: 'false',
  MARKET_SYNC_ENABLED: 'false',
  ALERT_EVALUATOR_ENABLED: 'false',
  NOTIFICATION_DELIVERY_ENABLED: 'false',
  TECHNICAL_INDICATOR_SCHEDULER_ENABLED: 'false',
  FUNDAMENTALS_SYNC_SCHEDULER_ENABLED: 'false',
};

const smokeTests = [
  {
    label: 'timescale-smoke',
    command: 'node',
    args: ['tests/smoke/timescale-history-smoke-test.js'],
  },
  {
    label: 'cache-smoke',
    command: 'node',
    args: ['tests/smoke/cache-layer-smoke-test.js'],
  },
  {
    label: 'alerts-evaluator-smoke',
    command: 'node',
    args: ['tests/smoke/alerts-evaluator-smoke-test.js'],
  },
  {
    label: 'notification-delivery-smoke',
    command: 'node',
    args: ['tests/smoke/notification-delivery-smoke-test.js'],
  },
];

const isHealthy = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${baseUrl}${healthPath}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch (_) {
    return false;
  }
};

const waitForHealthy = async (serverProcess = null) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= healthTimeoutMs) {
    if (await isHealthy()) {
      return true;
    }

    if (serverProcess && serverProcess.exitCode !== null) {
      throw new Error(`server exited before health check passed (exitCode=${serverProcess.exitCode})`);
    }

    await wait(healthPollIntervalMs);
  }

  throw new Error(`server did not become healthy within ${healthTimeoutMs}ms`);
};

const runCommand = (label, command, args = []) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        BASE_URL: baseUrl,
      },
    });

    child.on('error', (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${label} failed (${command} ${args.join(' ')}) with code=${code} signal=${signal || 'none'}`
        )
      );
    });
  });
};

const buildServerEnv = () => {
  const env = {
    ...process.env,
  };

  for (const [key, value] of Object.entries(serverEnvDefaults)) {
    if (env[key] === undefined || env[key] === null || env[key] === '') {
      env[key] = value;
    }
  }

  return env;
};

const stopServer = async (serverProcess) => {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill('SIGTERM');
  const startedAt = Date.now();

  while (serverProcess.exitCode === null && Date.now() - startedAt <= stopTimeoutMs) {
    await wait(250);
  }

  if (serverProcess.exitCode === null) {
    serverProcess.kill('SIGKILL');
  }
};

const run = async () => {
  const summary = {
    ok: false,
    baseUrl,
    autoStartedServer: false,
    tests: [],
  };

  let startedServer = null;

  try {
    let healthy = await isHealthy();

    if (!healthy) {
      if (!shouldAutoStartServer) {
        throw new Error('server is not reachable and REGRESSION_START_SERVER=false');
      }

      startedServer = spawn(serverCommand, serverArgs, {
        stdio: 'inherit',
        env: buildServerEnv(),
      });

      summary.autoStartedServer = true;
      await waitForHealthy(startedServer);
      healthy = true;
    }

    if (!healthy) {
      throw new Error('server health check failed');
    }

    for (const smokeTest of smokeTests) {
      const startedAt = Date.now();
      await runCommand(smokeTest.label, smokeTest.command, smokeTest.args);
      summary.tests.push({
        label: smokeTest.label,
        durationMs: Date.now() - startedAt,
      });
    }

    summary.ok = true;
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await stopServer(startedServer);
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
