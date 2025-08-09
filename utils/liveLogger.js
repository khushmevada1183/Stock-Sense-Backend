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
  <title>Live Logs - Stock Sense Backend</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; 
      background: #0d1117; 
      color: #f0f6fc; 
      height: 100vh;
      overflow: hidden;
    }
    
    header { 
      position: sticky; 
      top: 0; 
      background: #161b22; 
      border-bottom: 1px solid #30363d; 
      padding: 12px 16px; 
      display: flex; 
      gap: 12px; 
      align-items: center; 
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    
    .status-dot { 
      width: 8px; 
      height: 8px; 
      border-radius: 50%; 
      background: #3fb950; 
      animation: pulse 2s infinite; 
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    .title {
      font-weight: 600;
      color: #f0f6fc;
      font-size: 14px;
    }
    
    .subtitle {
      color: #8b949e;
      font-size: 12px;
    }
    
    #controls { 
      display: flex; 
      gap: 8px; 
      margin-left: auto; 
      align-items: center;
    }
    
    #log-container {
      height: calc(100vh - 60px);
      overflow-y: auto;
      background: #0d1117;
      position: relative;
    }
    
    #log { 
      padding: 0;
      font-size: 12px;
      line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    }
    
    .log-entry { 
      padding: 4px 16px; 
      border-bottom: 1px solid #21262d;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-height: 24px;
    }
    
    .log-entry:hover {
      background: #161b22;
    }
    
    .timestamp { 
      color: #6e7681; 
      font-size: 11px;
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .level-badge {
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      min-width: 40px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .level-http { background: #1f6feb; color: #fff; }
    .level-info { background: #238636; color: #fff; }
    .level-warn { background: #fb8500; color: #000; }
    .level-error { background: #da3633; color: #fff; }
    .level-ping { background: #6e7681; color: #fff; }
    
    .message { 
      flex: 1;
      word-break: break-word;
      white-space: pre-wrap;
    }
    
    .message.error { color: #f85149; }
    .message.warn { color: #f0883e; }
    .message.http { color: #79c0ff; }
    
    input, select { 
      background: #21262d; 
      color: #f0f6fc; 
      border: 1px solid #30363d; 
      padding: 6px 8px; 
      border-radius: 6px;
      font-size: 12px;
    }
    
    input:focus, select:focus {
      outline: none;
      border-color: #1f6feb;
      box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.2);
    }
    
    button { 
      background: #21262d; 
      color: #f0f6fc; 
      border: 1px solid #30363d; 
      padding: 6px 12px; 
      border-radius: 6px; 
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s ease;
    }
    
    button:hover {
      background: #30363d;
      border-color: #8b949e;
    }
    
    button.paused {
      background: #fb8500;
      color: #000;
      border-color: #fb8500;
    }
    
    .connection-status {
      position: absolute;
      top: 8px;
      right: 16px;
      font-size: 11px;
      color: #8b949e;
      background: #161b22;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #30363d;
    }
    
    .connection-status.connected { color: #3fb950; border-color: #3fb950; }
    .connection-status.disconnected { color: #f85149; border-color: #f85149; }
    
    label { color: #8b949e; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="status-dot"></div>
    <div>
      <div class="title">Live Logs</div>
      <div class="subtitle">Stock Sense Backend • Real-time application logs</div>
    </div>
    <div id="controls">
      <label>Level:</label>
      <select id="level">
        <option value="all" selected>All</option>
        <option value="http">HTTP</option>
        <option value="info">Info</option>
        <option value="warn">Warn</option>
        <option value="error">Error</option>
      </select>
      <input id="search" placeholder="Filter logs (regex)" />
      <button id="pause">Pause</button>
      <button id="clear">Clear</button>
    </div>
  </header>
  
  <div id="log-container">
    <div class="connection-status" id="status">Connecting...</div>
    <div id="log"></div>
  </div>

  <script>
    const log = document.getElementById('log');
    const logContainer = document.getElementById('log-container');
    const levelSel = document.getElementById('level');
    const search = document.getElementById('search');
    const pauseBtn = document.getElementById('pause');
    const clearBtn = document.getElementById('clear');
    const status = document.getElementById('status');
    
    let paused = false;
    let regex = null;
    let currentLevel = 'all';
    let autoScroll = true;
    let logCount = 0;
    const maxLogs = 1000; // Limit logs to prevent memory issues
    
    // Event listeners
    search.addEventListener('input', () => {
      try { 
        regex = search.value ? new RegExp(search.value, 'i') : null; 
      } catch { 
        regex = null; 
      }
    });
    
    levelSel.addEventListener('change', () => { 
      currentLevel = levelSel.value; 
    });
    
    pauseBtn.addEventListener('click', () => { 
      paused = !paused; 
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      pauseBtn.className = paused ? 'paused' : '';
    });
    
    clearBtn.addEventListener('click', () => { 
      log.innerHTML = ''; 
      logCount = 0;
    });
    
    // Check if user is at bottom for auto-scroll
    logContainer.addEventListener('scroll', () => {
      const threshold = 100;
      autoScroll = (logContainer.scrollHeight - logContainer.scrollTop - logContainer.clientHeight) < threshold;
    });
    
    function formatTime(timestamp) {
      try {
        return new Date(timestamp).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
      } catch {
        return timestamp;
      }
    }
    
    function createLogEntry(item) {
      if (!item || !item.message) return null;
      
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      
      const timestamp = document.createElement('span');
      timestamp.className = 'timestamp';
      timestamp.textContent = formatTime(item.time);
      
      const levelBadge = document.createElement('span');
      levelBadge.className = \`level-badge level-\${item.level || 'info'}\`;
      levelBadge.textContent = (item.level || 'info').toUpperCase();
      
      const message = document.createElement('span');
      message.className = \`message \${item.level || 'info'}\`;
      message.textContent = item.message;
      
      entry.appendChild(timestamp);
      entry.appendChild(levelBadge);
      entry.appendChild(message);
      
      return entry;
    }
    
    function addLogEntry(item) {
      if (paused) return;
      if (currentLevel !== 'all' && item.level !== currentLevel) return;
      if (regex && !regex.test(item.message)) return;
      
      const entry = createLogEntry(item);
      if (!entry) return;
      
      log.appendChild(entry);
      logCount++;
      
      // Remove old entries to prevent memory issues
      if (logCount > maxLogs) {
        log.removeChild(log.firstChild);
        logCount--;
      }
      
      // Auto-scroll to bottom if user is near bottom
      if (autoScroll) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
    
    // SSE Connection
    const eventSource = new EventSource('/live-logs/stream');
    
    eventSource.onopen = () => {
      status.textContent = 'Connected';
      status.className = 'connection-status connected';
    };
    
    eventSource.addEventListener('log', (event) => {
      try {
        const item = JSON.parse(event.data);
        if (item.level !== 'ping') { // Skip ping messages
          addLogEntry(item);
        }
      } catch (e) {
        console.error('Failed to parse log event:', e);
      }
    });
    
    eventSource.onerror = () => {
      status.textContent = 'Disconnected • Reconnecting...';
      status.className = 'connection-status disconnected';
      
      // Add error message to log
      const errorEntry = {
        time: new Date().toISOString(),
        level: 'error',
        message: '⚠️ Connection lost. Attempting to reconnect...'
      };
      addLogEntry(errorEntry);
    };
    
    // Initial scroll to bottom
    setTimeout(() => {
      logContainer.scrollTop = logContainer.scrollHeight;
    }, 100);
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
