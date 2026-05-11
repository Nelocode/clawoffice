// Tipos compartidos para el estado de Hermes Agent
export type HermesStatus = 'idle' | 'thinking' | 'executing' | 'error' | 'waiting';

export interface HermesWorker {
  id: string;
  name: string;
  skill: string;
  status: HermesStatus;
  progress?: number;       // 0–100
  startedAt?: number;
  message?: string;
  logs: LogEntry[];
}

export interface LogEntry {
  ts: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  text: string;
  workerId?: string;
}

export interface HermesState {
  status: HermesStatus;
  message: string;
  sessionId: string;
  uptime: number;
  workers: HermesWorker[];
  recentLogs: LogEntry[];
  lastUpdated: number;
}
