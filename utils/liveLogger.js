const { EventEmitter } = require('events');

// Ring buffer to store recent logs
class RingBuffer {
  constructor(limit = 200) {
    this.limit = limit;
    this.buffer = [];
  }
  push(item) {
    this.buffer.push(item);
    if (this.buffer.length > this.limit) this.buffer.shift();
  }
  all() {
    return this.buffer.slice();
  }
}

// Manage SSE clients and log broadcasting
class LiveLogger extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.history = new RingBuffer(300);
    this.keepAliveInterval = null;
    this.consolePatched = false;

    // Start keepalive pings
    this.startKeepAlive();
  }

  startKeepAlive() {
    if (this.keepAliveInterval) return;
    this.keepAliveInterval = setInterval(() => {
      this.broadcast('', 'ping');
    }, 15000);
    this.keepAliveInterval.unref?.();
  }

  // Broadcast a log line to all SSE clients
  broadcast(message, level = 'info') {
    const time = new Date().toISOString();
    const payload = { time, level, message: message?.toString?.() ?? String(message) };
    const data = `event: log\nid: ${Date.now()}\ndata: ${JSON.stringify(payload)}\n\n`;

    // Save in history (skip empty ping messages)
    if (level !== 'ping' && payload.message.trim() !== '') {
      this.history.push(payload);
    }

    for (const res of this.clients) {
      try {
        res.write(data);
      } catch (_) {
        // Ignore write errors
      }
    }
  }

  // Morgan stream compatible interface
  get morganStream() {
    return {
      write: (str) => {
        try {
          // Mirror to stdout
          process.stdout.write(str);
        } catch (_) {}
        this.broadcast(str.trim(), 'http');
      }
    };
  }

  // Patch console methods to also broadcast to SSE
  patchConsole() {
    if (this.consolePatched) return;
    this.consolePatched = true;
    const logger = this;
    const orig = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };
    const wrap = (fn, level) => (...args) => {
      try { orig[fn.name || 'log'](...args); } catch (_) {}
      try {
        const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        logger.broadcast(msg, level);
      } catch (_) {}
    };
    console.log = wrap(orig.log, 'info');
    console.info = wrap(orig.info, 'info');
    console.warn = wrap(orig.warn, 'warn');
    console.error = wrap(orig.error, 'error');
  }

  // SSE handler
  sseHandler = (req, res) => {
    // Headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send recent history
    const history = this.history.all();
    for (const item of history) {
      res.write(`event: log\ndata: ${JSON.stringify(item)}\n\n`);
    }

    // Register client
    this.clients.add(res);

    // Remove client on close
    req.on('close', () => {
      this.clients.delete(res);
      try { res.end(); } catch (_) {}
    });
  }

  // Simple HTML page to view live logs with auto-scroll
  htmlHandler = (_req, res) => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Live Logs</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background:#0b0f14; color:#e3e8ef; }
    header { position:sticky; top:0; background:#0b0f14; border-bottom:1px solid #1f2937; padding:10px 14px; display:flex; gap:10px; align-items:center; z-index:10; }
    .pill { padding:4px 8px; border-radius:999px; background:#111827; color:#9ca3af; font-size:12px; }
    #controls { display:flex; gap:8px; margin-left:auto; }
    #log { padding:12px 14px; white-space:pre-wrap; line-height:1.4; }
    .row { padding:2px 0; border-bottom:1px dashed #111827; }
    .t { color:#9ca3af; }
    .lvl-http { color:#60a5fa; }
    .lvl-info { color:#a7f3d0; }
    .lvl-warn { color:#f59e0b; }
    .lvl-error { color:#f87171; }
    .muted { color:#6b7280; }
    input, select { background:#0b1220; color:#e3e8ef; border:1px solid #1f2937; padding:6px 8px; border-radius:6px; }
    button { background:#111827; color:#e3e8ef; border:1px solid #1f2937; padding:6px 10px; border-radius:6px; cursor:pointer; }
  </style>
  </head>
  <body>
    <header>
      <div class="pill">/live-logs</div>
      <div class="muted">Live application logs (auto-scroll)</div>
      <div id="controls">
        <label class="muted">Level:</label>
        <select id="level">
          <option value="all" selected>all</option>
          <option value="http">http</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <input id="search" placeholder="filter text (regex)" />
        <button id="pause">Pause</button>
        <button id="clear">Clear</button>
      </div>
    </header>
    <div id="log"></div>
    <script>
      const log = document.getElementById('log');
      const levelSel = document.getElementById('level');
      const search = document.getElementById('search');
      const pauseBtn = document.getElementById('pause');
      const clearBtn = document.getElementById('clear');
      let paused = false;
      let rx = null;
      let currentLevel = 'all';
      search.addEventListener('input', () => {
        try { rx = search.value ? new RegExp(search.value, 'i') : null; } catch { rx = null; }
      });
      levelSel.addEventListener('change', () => { currentLevel = levelSel.value; });
      pauseBtn.addEventListener('click', () => { paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });
      clearBtn.addEventListener('click', () => { log.innerHTML = ''; });
      function fmt(d){ try{ return new Date(d).toLocaleTimeString(); }catch{ return d; } }
      function row(item){
        const div = document.createElement('div');
        div.className = 'row';
        const lvlClass = 'lvl-' + (item.level || 'info');
        div.innerHTML = '<span class="t">[' + fmt(item.time) + ']</span> ' + '<span class="' + lvlClass + '">(' + (item.level||'info') + ')</span> ' + (item.message || '');
        return div;
      }
      const es = new EventSource('/live-logs/stream');
      es.addEventListener('log', (ev) => {
        if (paused) return;
        try { var item = JSON.parse(ev.data); } catch { return; }
        if (currentLevel !== 'all' && item.level !== currentLevel) return;
        if (rx && !rx.test(item.message)) return;
        const el = row(item);
        log.appendChild(el);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
      });
      es.onerror = () => {
        const el = document.createElement('div');
        el.className = 'row lvl-error';
        el.textContent = '⚠️ Connection lost. Retrying...';
        log.appendChild(el);
      };
    </script>
  </body>
  </html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}

const liveLogger = new LiveLogger();

module.exports = {
  liveLogger,
  sseHandler: (...args) => liveLogger.sseHandler(...args),
  liveLogsPage: (...args) => liveLogger.htmlHandler(...args),
  morganStream: liveLogger.morganStream,
  patchConsole: () => liveLogger.patchConsole(),
  broadcast: (msg, level) => liveLogger.broadcast(msg, level),
};
