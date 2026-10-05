export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  stack?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NETWORK';
  portal?: string;
  resolved: boolean;
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = 'zeroapply_error_logs';
const MAX_LOGS = 200;

class ErrorLoggerService {
  private logs: ErrorLogEntry[] = [];
  private listeners: Set<(logs: ErrorLogEntry[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.logs = JSON.parse(raw);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, MAX_LOGS)));
    } catch {}
  }

  public log(entry: Partial<ErrorLogEntry> & { message: string; source?: string }): ErrorLogEntry {
    const newEntry: ErrorLogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      source: entry.source || 'General',
      message: entry.message,
      stack: entry.stack,
      severity: entry.severity || 'MEDIUM',
      resolved: entry.resolved ?? false,
      meta: entry.meta,
    };

    this.logs.unshift(newEntry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.length = MAX_LOGS;
    }

    this.saveToStorage();
    this.notify();
    return newEntry;
  }

  public getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
    this.saveToStorage();
    this.notify();
  }

  public subscribe(fn: (logs: ErrorLogEntry[]) => void): () => void {
    this.listeners.add(fn);
    fn(this.getLogs());
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    const snapshot = this.getLogs();
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch {}
    });
  }
}

export const ErrorLogger = new ErrorLoggerService();
