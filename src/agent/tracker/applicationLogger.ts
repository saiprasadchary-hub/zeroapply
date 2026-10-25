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
  evidenceId?: string;
  evidenceError?: string;
  details?: string;
}

const STORAGE_KEY = 'zeroapply_application_history_logs';

function applicationUrlKey(value: string): string {
  try {
    const url = new URL(value);
    const linkedInId = url.hostname.endsWith('linkedin.com') && (url.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || url.searchParams.get('currentJobId'));
    if (linkedInId) return `linkedin-job:${linkedInId}`;
    if (url.hostname === 'docs.google.com' && url.pathname.includes('/forms/')) {
      url.searchParams.delete('pli');
      url.searchParams.delete('usp');
    }
    for (const key of Array.from(url.searchParams.keys())) if (/^utm_|^(trk|trackingId)$/i.test(key)) url.searchParams.delete(key);
    url.hash = '';
    url.searchParams.sort();
    return url.toString();
  } catch { return value.trim(); }
}

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, 500)));
    } catch {}
  }

  public getLogs(): ApplicationLogRecord[] {
    return [...this.logs];
  }

  public hasSubmitted(target: { jobUrl?: string; jobTitle?: string; companyName?: string; portal?: string }): boolean {
    const key = target.jobUrl ? applicationUrlKey(target.jobUrl) : '';
    const normalize = (value?: string): string => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return this.logs.some(record => {
      if (record.status !== 'SUCCESS') return false;
      const savedUrl = record.jobUrl || record.url;
      if (key && savedUrl) return [record.jobUrl, record.url].some(url => !!url && key === applicationUrlKey(url));
      const company = normalize(target.companyName);
      return !!company && !['target company', 'company'].includes(company)
        && normalize(record.companyName) === company
        && !!normalize(target.jobTitle) && normalize(record.jobTitle) === normalize(target.jobTitle)
        && normalize(record.portal) === normalize(target.portal);
    });
  }

  public log(entry: Partial<ApplicationLogRecord> & { portal: string }): ApplicationLogRecord {
    const record: ApplicationLogRecord = {
      id: entry.id || `app_${crypto.randomUUID()}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      portal: entry.portal,
      jobTitle: entry.jobTitle || 'Software Engineer',
      companyName: entry.companyName || 'Target Company',
      status: entry.status || 'SUCCESS',
      fieldsFilled: entry.fieldsFilled ?? 0,
      totalFields: entry.totalFields ?? entry.fieldsFilled ?? 0,
      durationSeconds: entry.durationSeconds,
      jobUrl: entry.jobUrl || entry.url,
      url: entry.url,
      submissionEvidence: entry.submissionEvidence,
      evidenceId: entry.evidenceId,
      evidenceError: entry.evidenceError,
      details: entry.details,
    };

    if (record.status === 'SUCCESS') {
      const existing = this.logs.find(log => log.status === 'SUCCESS' && record.jobUrl && (log.jobUrl || log.url)
        && applicationUrlKey(record.jobUrl) === applicationUrlKey(log.jobUrl || log.url || ''));
      if (existing) return existing;
    }
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
