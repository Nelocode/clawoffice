import { useEffect, useRef, useCallback, useState } from 'react';
import type { HermesState, HermesStatus } from '../types';

// --- SIMULATED STATE FOR DEMO ---
// En producción, reemplazar con WebSocket real al backend de Hermes
function generateMockState(): HermesState {
  const workers = [
    { id: 'w1', name: 'Scrum Master', skill: 'code-scrum-master', status: 'idle' as HermesStatus, logs: [], progress: 0 },
    { id: 'w2', name: 'Frontend Builder', skill: 'code-frontend-builder', status: 'idle' as HermesStatus, logs: [], progress: 0 },
    { id: 'w3', name: 'Backend Builder', skill: 'code-backend-builder', status: 'idle' as HermesStatus, logs: [], progress: 0 },
    { id: 'w4', name: 'Auditor', skill: 'code-auditor', status: 'idle' as HermesStatus, logs: [], progress: 0 },
    { id: 'w5', name: 'Test Guardian', skill: 'code-test-guardian', status: 'idle' as HermesStatus, logs: [], progress: 0 },
    { id: 'w6', name: 'Youtube Watchdog', skill: 'cgnt-youtube-watchdog', status: 'idle' as HermesStatus, logs: [], progress: 0 },
  ];

  return {
    status: 'idle',
    message: 'Hermes Agent listo',
    sessionId: 'ses-' + Math.random().toString(36).slice(2, 8),
    uptime: Date.now() - 1715000000000,
    workers,
    recentLogs: [
      { ts: Date.now() - 5000, level: 'info', text: 'Hermes Agent iniciado' },
      { ts: Date.now() - 3000, level: 'info', text: 'Skills cargados: code-*, cgnt-*' },
    ],
    lastUpdated: Date.now(),
  };
}

interface UseHermesOptions {
  endpoint?: string;
  pollInterval?: number;
}

export function useHermesState(opts: UseHermesOptions = {}) {
  const { pollInterval = 3000 } = opts;
  const [state, setState] = useState<HermesState>(generateMockState);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebSocket connection
  const connect = useCallback(() => {
    if (!opts.endpoint) return; // no WS available, fallback to polling
    const ws = new WebSocket(opts.endpoint);
    ws.onopen = () => setConnected(true);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setState(prev => ({ ...prev, ...data, lastUpdated: Date.now() }));
      } catch { /* ignore malformed */ }
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    wsRef.current = ws;
  }, [opts.endpoint]);

  // Polling fallback / mock
  useEffect(() => {
    if (opts.endpoint) {
      connect();
      return () => { wsRef.current?.close(); };
    }
    // Mock: simulate state changes
    setConnected(true);
    intervalRef.current = setInterval(() => {
      setState(prev => {
        // Round-robin workers through states
        const tick = Date.now();
        const updated = prev.workers.map((w, i) => {
          const phase = Math.floor(tick / 2000 + i) % 5;
          const statuses: HermesStatus[] = ['idle', 'thinking', 'executing', 'thinking', 'idle'];
          const msgs: Record<HermesStatus, string> = {
            idle: 'Waiting',
            thinking: `Analizando tarea #${Math.floor(tick / 5000) % 10}...`,
            executing: `Ejecutando paso ${phase * 20}%`,
            error: 'Error',
            waiting: 'En cola',
          };
          return {
            ...w,
            status: statuses[phase],
            progress: phase === 2 ? Math.min(100, (tick % 8000) / 80) : 0,
            message: msgs[statuses[phase]],
          };
        });

        const now = Date.now();
        return {
          ...prev,
          workers: updated,
          status: updated.some(w => w.status === 'executing') ? 'executing' as HermesStatus
                : updated.some(w => w.status === 'thinking') ? 'thinking' as HermesStatus
                : 'idle' as HermesStatus,
          message: updated.some(w => w.status === 'executing') ? 'Pipeline activo' : 'En espera',
          recentLogs: [
            ...prev.recentLogs.slice(-50),
            ...updated
              .filter(w => w.status !== 'idle')
              .map(w => ({ ts: now, level: 'info' as const, text: `[${w.name}] ${w.message}`, workerId: w.id })),
          ],
          lastUpdated: now,
        };
      });
    }, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      wsRef.current?.close();
    };
  }, [connect, pollInterval, opts.endpoint]);

  return { state, connected };
}
