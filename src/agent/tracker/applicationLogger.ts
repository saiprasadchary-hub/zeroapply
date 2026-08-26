import { FirebaseCloudSync } from '../../services/firebase/cloudSyncService';
import { getSecureItem, removeSecureItem, setSecureItem } from '../../services/secureStorage';

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
      const data = getSecureItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to read application logs:', error);
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
      setSecureItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save application log:', e);
    }
    this.notifyListeners();
    void FirebaseCloudSync.logAppliedJob({
      jobId: newRecord.id,
      title: newRecord.jobTitle,
      company: newRecord.companyName,
      platform: newRecord.portal,
      url: newRecord.url,
      status: newRecord.status === 'SUCCESS' ? 'applied' : 'failed',
    });
    return newRecord;
  }

  public static clearLogs(): void {
    try {
      removeSecureItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear application logs:', error);
    }
    this.notifyListeners();
  }

  public static deleteLog(id: string): void {
    const logs = this.getLogs().filter((l) => l.id !== id);
    try {
      setSecureItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to delete application log:', e);
    }
    this.notifyListeners();
  }

  public static exportToJson(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
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
