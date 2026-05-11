// ───── Estado de Hermes Agent ─────
export type HermesStatus = 'idle' | 'thinking' | 'executing' | 'error' | 'waiting';

export interface WorkerInfo {
  id: string;
  name: string;
  status: HermesStatus;
  progress: number;       // 0–1
  currentTask: string;
  lastActive: string;     // ISO timestamp
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;          // INFO, WARN, ERROR, DEBUG
  message: string;
  source: string;
}

export interface SessionInfo {
  title: string;
  lastMessage: string;
  lastRole: string;
  totalMessages: number;
  lastUpdated: string;
}

export interface HermesState {
  status: HermesStatus;
  workers: WorkerInfo[];
  logs: LogEntry[];
  session: SessionInfo | null;
  connected: boolean;
  hermesVersion: string;
  uptime: number;
  lastActivity?: string | null;
}
