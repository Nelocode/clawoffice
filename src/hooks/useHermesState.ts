import { useEffect, useRef, useCallback, useState } from 'react';
import type { HermesState, HermesStatus, WorkerInfo, LogEntry } from '../types';

interface ConnectionConfig {
  wsUrl?: string;
  httpUrl?: string;
  pollingInterval?: number;
  autoConnect?: boolean;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  wsUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4099`,
  httpUrl: `${window.location.protocol}//${window.location.hostname}:4099`,
  pollingInterval: 5000,
  autoConnect: true,
};

const DEFAULT_WORKERS: WorkerInfo[] = [
  { id: 'hermes-core', name: 'Hermes Core', status: 'idle', progress: 0, currentTask: 'Starting...', lastActive: new Date().toISOString() },
  { id: 'session-writer', name: 'Session Store', status: 'idle', progress: 0, currentTask: 'Initializing...', lastActive: new Date().toISOString() },
  { id: 'log-watcher', name: 'Log Collector', status: 'idle', progress: 0, currentTask: 'Standing by', lastActive: new Date().toISOString() },
];

const STATUS_PRIORITY: Record<HermesStatus, number> = {
  'error': 0,
  'executing': 1,
  'thinking': 2,
  'waiting': 3,
  'idle': 4,
};

export function useHermesState(config: ConnectionConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const pollTimer = useRef<ReturnType<typeof setInterval>>();
  const mountedRef = useRef(true);
  const reconnectAttempts = useRef(0);

  const [state, setState] = useState<HermesState>({
    status: 'idle',
    workers: DEFAULT_WORKERS,
    logs: [],
    session: null,
    connected: false,
    hermesVersion: 'Connecting...',
    uptime: 0,
  });

  // ───── Update helpers ─────
  const mergeState = useCallback((partial: Partial<HermesState>) => {
    setState(prev => {
      const updated = { ...prev, ...partial };
      // Determine global status from workers
      const activeWorkers = updated.workers.filter(w => w.status !== 'idle');
      if (activeWorkers.length > 0) {
        const highestPriority = activeWorkers.reduce((best, w) =>
          STATUS_PRIORITY[w.status] < STATUS_PRIORITY[best.status] ? w : best
        );
        updated.status = highestPriority.status;
      } else {
        updated.status = updated.connected ? 'idle' : 'error';
      }
      return updated;
    });
  }, []);

  // ───── WebSocket connection ─────
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(cfg.wsUrl!);

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        mergeState({ connected: true, hermesVersion: 'connected' });
        // Request initial state
        ws.send(JSON.stringify({ type: 'request_state' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state' && msg.payload) {
            const p = msg.payload;
            mergeState({
              status: p.status || 'idle',
              workers: p.workers || DEFAULT_WORKERS,
              logs: p.logs || [],
              session: p.session || null,
              lastActivity: p.lastActivity || null,
              connected: true,
              hermesVersion: p.hermesVersion || 'connected',
              uptime: p.uptime || 0,
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        mergeState({ connected: false });
        wsRef.current = null;

        // Auto reconnect with backoff
        if (mountedRef.current && reconnectAttempts.current < 10) {
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          reconnectAttempts.current += 1;
          reconnectTimer.current = setTimeout(connectWebSocket, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      // WebSocket not available, fall back to polling
      mergeState({ connected: false });
    }
  }, [cfg.wsUrl, mergeState]);

  // ───── HTTP polling fallback ─────
  const pollHttpState = useCallback(async () => {
    try {
      const res = await fetch(`${cfg.httpUrl}/state`);
      if (!res.ok) return;
      const p = await res.json();
      mergeState({
        status: p.status || 'idle',
        workers: p.workers || DEFAULT_WORKERS,
        logs: p.logs || [],
        session: p.session || null,
        lastActivity: p.lastActivity || null,
        connected: true,
        hermesVersion: p.hermesVersion || 'connected',
        uptime: p.uptime || 0,
      });
    } catch {
      mergeState({ connected: false });
    }
  }, [cfg.httpUrl, mergeState]);

  // ───── Lifecycle ─────
  useEffect(() => {
    mountedRef.current = true;

    if (cfg.autoConnect !== false) {
      connectWebSocket();

      // Fallback polling if WS fails
      pollTimer.current = setInterval(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          pollHttpState();
        }
      }, cfg.pollingInterval);
    }

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, [cfg.autoConnect, cfg.pollingInterval, connectWebSocket, pollHttpState]);

  // ───── Keepalive ping ─────
  useEffect(() => {
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
    return () => clearInterval(ping);
  }, []);

  return state;
}
