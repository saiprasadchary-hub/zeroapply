export interface ApplicationLogRecord {
  id: string;
  timestamp: string;
  portal: string;
  jobTitle: string;
  companyName: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  fieldsFilled: number;
  totalFields: number;
  durationSeconds?: number;
  jobUrl?: string;
  url?: string;
  submissionEvidence?: string;
  details?: string;
}

const STORAGE_KEY = 'zeroapply_application_history_logs';

class ApplicationLoggerService {
  private logs: ApplicationLogRecord[] = [];
  private listeners: Set<(logs: ApplicationLogRecord[]) => void> = new Set();

  constructor() {
    this.load();
  }

  private load(): void {
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

  private save(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch {}
  }

  public getLogs(): ApplicationLogRecord[] {
    return [...this.logs];
  }

  public log(entry: Partial<ApplicationLogRecord> & { portal: string }): ApplicationLogRecord {
    const record: ApplicationLogRecord = {
      id: entry.id || `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      portal: entry.portal,
      jobTitle: entry.jobTitle || 'Software Engineer',
      companyName: entry.companyName || 'Target Company',
      status: entry.status || 'SUCCESS',
      fieldsFilled: entry.fieldsFilled ?? 0,
      totalFields: entry.totalFields ?? entry.fieldsFilled ?? 0,
      durationSeconds: entry.durationSeconds,
      jobUrl: entry.jobUrl,
      submissionEvidence: entry.submissionEvidence,
      details: entry.details,
    };

    this.logs.unshift(record);
    this.save();
    this.notify();
    return record;
  }

  public deleteLog(id: string): void {
    this.logs = this.logs.filter((l) => l.id !== id);
    this.save();
    this.notify();
  }

  public clearLogs(): void {
    this.logs = [];
    this.save();
    this.notify();
  }

  public subscribe(cb: (logs: ApplicationLogRecord[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.getLogs());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const snap = this.getLogs();
    this.listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch {}
    });
  }

  public exportToCsv(): string {
    const headers = ['ID', 'Timestamp', 'Portal', 'Job Title', 'Company', 'Status', 'Fields Filled', 'Total Fields', 'Job URL'];
    const rows = [headers.join(',')];

    for (const log of this.logs) {
      rows.push([
        `"${log.id}"`,
        `"${log.timestamp}"`,
        `"${log.portal}"`,
        `"${log.jobTitle}"`,
        `"${log.companyName}"`,
        `"${log.status}"`,
        log.fieldsFilled,
        log.totalFields,
        `"${log.jobUrl || ''}"`,
      ].join(','));
    }

    return rows.join('\n');
  }

  public exportToJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const ApplicationLogger = new ApplicationLoggerService();
