import fs from 'node:fs';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { watch } from 'chokidar';

// ───── Config ─────
const WS_PORT = parseInt(process.env.WS_PORT || '4099');
const HERMES_HOME = process.env.HERMES_HOME || (
  process.platform === 'darwin'
    ? '/Users/i2carvajal/.hermes'
    : '/root/.hermes'
);
const SESSIONS_DIR = `${HERMES_HOME}/sessions`;
const LOGS_DIR = `${HERMES_HOME}/logs`;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '2000');

// ───── State ─────
let currentState = {
  status: 'idle',
  workers: [],
  logs: [],
  lastActivity: null,
  session: null,
  connected: true,
  hermesVersion: 'unknown',
  uptime: 0,
};

const clients = new Set();

// ───── Helpers ─────
function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1) {
      try { ws.send(msg); } catch { clients.delete(ws); }
    } else {
      clients.delete(ws);
    }
  }
}

function getLatestSessionFile() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) return null;
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        time: fs.statSync(`${SESSIONS_DIR}/${f}`).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);
    return files.length > 0 ? `${SESSIONS_DIR}/${files[0].name}` : null;
  } catch {
    return null;
  }
}

function parseSessionActivity(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;

    const lastLine = JSON.parse(lines[lines.length - 1]);
    const firstLine = JSON.parse(lines[0]);

    return {
      title: firstLine.title || firstLine.content?.slice(0, 60) || 'Untitled',
      lastMessage: lastLine.content?.slice(0, 200) || '',
      lastRole: lastLine.role || 'unknown',
      totalMessages: lines.length,
      lastUpdated: lastLine.timestamp || lastLine.ts || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function readLatestLogs() {
  try {
    if (!fs.existsSync(LOGS_DIR)) return [];
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.log'))
      .map(f => ({
        name: f,
        time: fs.statSync(`${LOGS_DIR}/${f}`).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) return [];

    const logFile = `${LOGS_DIR}/${files[0].name}`;
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    // Take last 50 lines
    return lines.slice(-50).map((line, i) => {
      try {
        const parsed = JSON.parse(line);
        return {
          id: `log-${Date.now()}-${i}`,
          timestamp: parsed.timestamp || new Date().toISOString(),
          level: (parsed.level || 'info').toUpperCase(),
          message: parsed.message || parsed.msg || line.slice(0, 200),
          source: parsed.source || 'hermes',
        };
      } catch {
        return {
          id: `log-${Date.now()}-${i}`,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: line.slice(0, 200),
          source: 'hermes',
        };
      }
    });
  } catch {
    return [];
  }
}

import { execSync } from 'node:child_process';

function isHermesRunning() {
  try {
    const out = execSync('pgrep -f "hermes" 2>/dev/null || true', { timeout: 2000, encoding: 'utf-8' });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

// ───── Poll State ─────
function pollState() {
  try {
    const sessionFile = getLatestSessionFile();
    const session = parseSessionActivity(sessionFile);
    const logs = readLatestLogs();
    const running = isHermesRunning();

    // Infer status from session activity
    let status = 'idle';
    if (running) {
      if (session && session.lastRole === 'assistant') {
        status = 'executing';
      } else if (session && session.lastRole === 'user') {
        status = 'waiting';
      } else {
        status = 'thinking';
      }
    }

    // Build workers from session context
    const workers = [
      {
        id: 'hermes-core',
        name: 'Hermes Core',
        status: running ? (status === 'executing' ? 'executing' : 'thinking') : 'idle',
        progress: running ? 0.65 : 1.0,
        currentTask: session?.lastMessage?.slice(0, 60) || 'Standing by',
        lastActive: session?.lastUpdated || new Date().toISOString(),
      },
      {
        id: 'session-writer',
        name: 'Session Store',
        status: sessionFile ? 'executing' : 'idle',
        progress: session ? Math.min(session.totalMessages / 100, 1) : 0,
        currentTask: session
          ? `${session.totalMessages} msgs in "${session.title}"`
          : 'No active session',
        lastActive: session?.lastUpdated || new Date().toISOString(),
      },
      {
        id: 'log-watcher',
        name: 'Log Collector',
        status: logs.length > 0 ? 'executing' : 'idle',
        progress: 1.0,
        currentTask: `${logs.length} recent entries`,
        lastActive: new Date().toISOString(),
      },
    ];

    currentState = {
      ...currentState,
      status,
      workers,
      logs: logs.slice(-20),
      lastActivity: session?.lastUpdated || currentState.lastActivity,
      session,
      connected: true,
      uptime: currentState.uptime + (POLL_INTERVAL / 1000),
    };

    broadcast({ type: 'state', payload: currentState });
  } catch (err) {
    console.error('Poll error:', err.message);
  }
}

// ───── File watcher for real-time updates ─────
function startWatchers() {
  // Watch session files
  if (fs.existsSync(SESSIONS_DIR)) {
    const sessionWatcher = watch(`${SESSIONS_DIR}/*.jsonl`, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500 },
    });

    sessionWatcher.on('change', () => {
      broadcast({ type: 'event', payload: { kind: 'session_update', timestamp: new Date().toISOString() } });
    });
  }

  // Watch log files
  if (fs.existsSync(LOGS_DIR)) {
    const logWatcher = watch(`${LOGS_DIR}/*.log`, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    });

    logWatcher.on('change', (path) => {
      broadcast({ type: 'event', payload: { kind: 'log_update', path, timestamp: new Date().toISOString() } });
    });
  }
}

// ───── HTTP + WebSocket Server ─────
const server = createServer((req, res) => {
  // Simple health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: currentState.uptime }));
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // State snapshot via HTTP
  if (req.url === '/state') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(currentState));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected (${clients.size} total)`);

  // Send current state immediately
  ws.send(JSON.stringify({ type: 'state', payload: currentState }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected (${clients.size} remaining)`);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      if (msg.type === 'request_state') {
        ws.send(JSON.stringify({ type: 'state', payload: currentState }));
      }
    } catch {
      // ignore bad messages
    }
  });
});

// ───── Start ─────
server.listen(WS_PORT, () => {
  console.log(`HermesBridge listening on http://0.0.0.0:${WS_PORT}`);
  console.log(`  WS: ws://localhost:${WS_PORT}`);
  console.log(`  HTTP state: http://localhost:${WS_PORT}/state`);
  console.log(`  Health: http://localhost:${WS_PORT}/health`);
  console.log(`  Watching: ${SESSIONS_DIR} + ${LOGS_DIR}`);
  process.stdout.write('READY\n');
});

startWatchers();

// Poll state periodically
setInterval(pollState, POLL_INTERVAL);
pollState();
