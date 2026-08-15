export interface ApplicationLogRecord {
  id: string;
  timestamp: string;
  portal: string;
  jobTitle: string;
  companyName: string;
  fieldsFilled: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  url: string;
}

const STORAGE_KEY = 'zeroapply_application_history';

type LogListener = (logs: ApplicationLogRecord[]) => void;

export class ApplicationLogger {
  private static listeners: Set<LogListener> = new Set();

  public static subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke with current logs
    listener(this.getLogs());
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners() {
    const logs = this.getLogs();
    this.listeners.forEach(listener => listener(logs));
  }
  public static getLogs(): ApplicationLogRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addLog(record: Omit<ApplicationLogRecord, 'id' | 'timestamp'>): ApplicationLogRecord {
    const logs = this.getLogs();
    const newRecord: ApplicationLogRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newRecord);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save application log:', e);
    }
    this.notifyListeners();
    return newRecord;
  }

  public static clearLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.notifyListeners();
  }

  public static exportToCsv(): string {
    const logs = this.getLogs();
    if (logs.length === 0) return '';

    const headers = ['ID', 'Date', 'Portal', 'Job Title', 'Company', 'Fields Filled', 'Status', 'URL'];
    const rows = logs.map(log => [
      log.id,
      new Date(log.timestamp).toLocaleString(),
      `"${log.portal}"`,
      `"${log.jobTitle}"`,
      `"${log.companyName}"`,
      log.fieldsFilled,
      log.status,
      `"${log.url}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
