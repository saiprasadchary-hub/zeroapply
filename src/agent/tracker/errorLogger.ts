export type ErrorSeverity = 'CRITICAL' | 'SECURITY' | 'NETWORK' | 'WARNING' | 'INFO';

export interface ErrorLogRecord {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  portal?: string;
  resolved?: boolean;
}

const STORAGE_KEY = 'zeroapply_error_history';

type ErrorListener = (errors: ErrorLogRecord[]) => void;

class ErrorLoggerService {
  private listeners: Set<ErrorListener> = new Set();

  public subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    listener(this.getErrors());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const errors = this.getErrors();
    this.listeners.forEach((listener) => {
      try {
        listener(errors);
      } catch (err) {
        console.error('[ErrorLogger] Listener error:', err);
      }
    });
  }

  public getErrors(): ErrorLogRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveErrors(errors: ErrorLogRecord[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, 150)));
    } catch (e) {
      console.error('Failed to save error logs:', e);
    }
  }

  public log(entry: Omit<ErrorLogRecord, 'id' | 'timestamp' | 'severity'> & { severity?: ErrorSeverity }): ErrorLogRecord {
    const errors = this.getErrors();
    const newRecord: ErrorLogRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      severity: entry.severity || 'CRITICAL',
      ...entry,
    };

    errors.unshift(newRecord);
    this.saveErrors(errors);
    this.notifyListeners();
    return newRecord;
  }

  public deleteError(id: string): void {
    const errors = this.getErrors().filter((e) => e.id !== id);
    this.saveErrors(errors);
    this.notifyListeners();
  }

  public clearErrors(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.notifyListeners();
  }

  public exportAsJson(): string {
    return JSON.stringify(this.getErrors(), null, 2);
  }

  public exportAsCsv(): string {
    const errors = this.getErrors();
    const rows = [['Timestamp', 'Severity', 'Source', 'Portal', 'Message', 'Stack']];

    for (const err of errors) {
      rows.push([
        `"${new Date(err.timestamp).toLocaleString()}"`,
        `"${err.severity}"`,
        `"${err.source.replace(/"/g, '""')}"`,
        `"${(err.portal || 'Global').replace(/"/g, '""')}"`,
        `"${err.message.replace(/"/g, '""')}"`,
        `"${(err.stack || '').replace(/"/g, '""')}"`,
      ]);
    }

    return rows.map((r) => r.join(',')).join('\n');
  }
}

export const ErrorLogger = new ErrorLoggerService();
