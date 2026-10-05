export interface QALogPair {
  question: string;
  answer: string;
  source?: string;
  confidence?: number;
  fieldType?: string;
  category?: string;
  timestamp?: number;
}

export interface QALogRecord {
  id: string;
  timestamp: string;
  portal: string;
  jobTitle: string;
  company: string;
  companyName?: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'FAILED';
  fieldsCount: number;
  qaPairs: QALogPair[];
  url?: string;
  verificationReason?: string;
  atsScore?: number;
}

const STORAGE_KEY = 'zeroapply_qa_logs';
const PROCESS_STORAGE_KEY = 'zeroapply_process_sessions_v1';
const APP_STORAGE_KEY = 'zeroapply_application_history_logs';

class QALoggerService {
  private logs: QALogRecord[] = [];
  private activeJobId: string | null = null;
  private listeners: Set<(logs: QALogRecord[]) => void> = new Set();

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

    // Hydrate any sessions from process tracker or application history so existing records appear
    this.hydrateFromProcessSessions();
    this.sortLogs();
  }

  private save(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, 100)));
    } catch {}
  }

  private sortLogs(): void {
    this.logs.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime() || 0;
      const tB = new Date(b.timestamp).getTime() || 0;
      return tB - tA;
    });
  }

  private hydrateFromProcessSessions(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const processRaw = localStorage.getItem(PROCESS_STORAGE_KEY);
      if (processRaw) {
        const sessions: any[] = JSON.parse(processRaw);
        if (Array.isArray(sessions)) {
          for (const s of sessions) {
            const exists = this.logs.find((l) => l.id === s.id);
            if (exists) {
              // Update status and pairs if existing has fewer
              if (s.status === 'submitted' && exists.status !== 'SUBMITTED') {
                exists.status = 'SUBMITTED';
              }
              continue;
            }

            const qaPairs: QALogPair[] = [];
            if (Array.isArray(s.steps)) {
              for (const step of s.steps) {
                if (Array.isArray(step.qaItems)) {
                  for (const item of step.qaItems) {
                    if (
                      item.question &&
                      !qaPairs.some(
                        (p) => p.question.toLowerCase().trim() === item.question.toLowerCase().trim()
                      )
                    ) {
                      qaPairs.push({
                        question: item.question.trim(),
                        answer: String(item.answer || '').trim(),
                        source: item.source || 'persona',
                        fieldType: item.fieldType,
                        timestamp: item.timestamp,
                      });
                    }
                  }
                }
              }
            }

            this.logs.push({
              id: s.id || `qa_hydrated_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              timestamp: s.startedAt ? new Date(s.startedAt).toISOString() : new Date().toISOString(),
              portal: s.portal || 'LinkedIn',
              jobTitle: s.jobTitle || 'Software Position',
              company: s.companyName || 'Target Company',
              companyName: s.companyName || 'Target Company',
              status: s.status === 'submitted' ? 'SUBMITTED' : s.status === 'in_progress' ? 'IN_PROGRESS' : 'FAILED',
              fieldsCount: s.questionsCount || qaPairs.length,
              qaPairs,
              url: s.url,
            });
          }
        }
      }

      // Also check application history logs for any completed submissions
      const appRaw = localStorage.getItem(APP_STORAGE_KEY);
      if (appRaw) {
        const appLogs: any[] = JSON.parse(appRaw);
        if (Array.isArray(appLogs)) {
          for (const al of appLogs) {
            const matched = this.logs.find(
              (l) =>
                l.jobTitle.toLowerCase() === (al.jobTitle || '').toLowerCase() &&
                l.company.toLowerCase() === (al.companyName || '').toLowerCase()
            );
            if (!matched && al.jobTitle && al.companyName) {
              this.logs.push({
                id: al.id || `qa_app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                timestamp: al.timestamp || new Date().toISOString(),
                portal: al.portal || 'Direct Apply',
                jobTitle: al.jobTitle,
                company: al.companyName,
                companyName: al.companyName,
                status: al.status === 'SUCCESS' ? 'SUBMITTED' : 'FAILED',
                fieldsCount: al.fieldsFilled || 5,
                qaPairs: [],
                url: al.jobUrl,
                verificationReason: al.submissionEvidence || 'Application verified and recorded in history',
              });
            }
          }
        }
      }
    } catch {}
  }

  public getLogs(): QALogRecord[] {
    return [...this.logs];
  }

  public startJob(jobTitle: string, company: string, portal = 'LinkedIn', id?: string, url?: string): QALogRecord {
    const cleanJobTitle = (jobTitle || 'Job Application').trim();
    const cleanCompany = (company || 'Target Employer').trim();
    const cleanPortal = (portal || 'LinkedIn').trim();

    // Check if job with this ID already exists
    let entry = id ? this.logs.find((l) => l.id === id) : null;

    if (!entry) {
      // Check if there is an in-progress record for the exact same job title & company
      entry = this.logs.find(
        (l) =>
          l.status === 'IN_PROGRESS' &&
          l.jobTitle.toLowerCase() === cleanJobTitle.toLowerCase() &&
          l.company.toLowerCase() === cleanCompany.toLowerCase()
      );
    }

    if (entry) {
      entry.jobTitle = cleanJobTitle;
      entry.company = cleanCompany;
      entry.companyName = cleanCompany;
      entry.portal = cleanPortal;
      if (url) entry.url = url;
      this.activeJobId = entry.id;
      this.save();
      this.notify();
      return entry;
    }

    // Create fresh real-time tracking record
    const newRecord: QALogRecord = {
      id: id || `qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      portal: cleanPortal,
      jobTitle: cleanJobTitle,
      company: cleanCompany,
      companyName: cleanCompany,
      status: 'IN_PROGRESS',
      fieldsCount: 0,
      qaPairs: [],
      url,
    };

    this.logs.unshift(newRecord);
    this.activeJobId = newRecord.id;
    this.save();
    this.notify();
    return newRecord;
  }

  public recordQuestionAnswer(
    question: string,
    answer: string,
    meta?: { source?: string; confidence?: number; fieldType?: string; category?: string },
    jobId?: string
  ): void {
    const cleanQ = (question || '').trim();
    const cleanA = (answer !== undefined && answer !== null ? String(answer) : '').trim();
    if (!cleanQ) return;

    let target = jobId
      ? this.logs.find((l) => l.id === jobId)
      : this.activeJobId
      ? this.logs.find((l) => l.id === this.activeJobId)
      : null;

    if (!target) {
      target = this.logs.find((l) => l.status === 'IN_PROGRESS') || this.logs[0];
    }

    if (!target) {
      target = this.startJob('Active Application', 'Target Employer', 'Direct Apply');
    }

    // Update existing question if already present (e.g. re-answer pass or audit update)
    const existingIndex = target.qaPairs.findIndex(
      (p) => p.question.toLowerCase().trim() === cleanQ.toLowerCase()
    );

    if (existingIndex >= 0) {
      target.qaPairs[existingIndex].answer = cleanA;
      if (meta?.source) target.qaPairs[existingIndex].source = meta.source;
      if (meta?.confidence !== undefined) target.qaPairs[existingIndex].confidence = meta.confidence;
      if (meta?.fieldType) target.qaPairs[existingIndex].fieldType = meta.fieldType;
      if (meta?.category) target.qaPairs[existingIndex].category = meta.category;
      target.qaPairs[existingIndex].timestamp = Date.now();
    } else {
      target.qaPairs.push({
        question: cleanQ,
        answer: cleanA,
        source: meta?.source || 'persona',
        confidence: meta?.confidence,
        fieldType: meta?.fieldType,
        category: meta?.category,
        timestamp: Date.now(),
      });
    }

    target.fieldsCount = target.qaPairs.length;
    this.save();
    this.notify();
  }

  public recordSubmission(success: boolean, reason?: string, jobId?: string): void {
    let target = jobId
      ? this.logs.find((l) => l.id === jobId)
      : this.activeJobId
      ? this.logs.find((l) => l.id === this.activeJobId)
      : null;

    if (!target) {
      target = this.logs.find((l) => l.status === 'IN_PROGRESS') || this.logs[0];
    }

    if (!target) return;

    target.status = success ? 'SUBMITTED' : 'FAILED';
    if (reason) target.verificationReason = reason;
    target.fieldsCount = Math.max(target.fieldsCount, target.qaPairs.length);

    this.save();
    this.notify();
  }

  public finalizeJob(jobId?: string): void {
    if (!jobId || this.activeJobId === jobId) {
      this.activeJobId = null;
    }
  }

  public updateJobDetails(
    details: { jobTitle?: string; company?: string; companyName?: string; portal?: string; url?: string },
    jobId?: string
  ): void {
    let target = jobId
      ? this.logs.find((l) => l.id === jobId)
      : this.activeJobId
      ? this.logs.find((l) => l.id === this.activeJobId)
      : null;

    if (!target) return;

    if (details.jobTitle) target.jobTitle = details.jobTitle;
    if (details.company) target.company = details.company;
    if (details.companyName || details.company) target.companyName = details.companyName || details.company;
    if (details.portal) target.portal = details.portal;
    if (details.url) target.url = details.url;

    this.save();
    this.notify();
  }

  public addLog(record: Omit<QALogRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): QALogRecord {
    const entry: QALogRecord = {
      id: record.id || `qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: record.timestamp || new Date().toISOString(),
      portal: record.portal,
      jobTitle: record.jobTitle,
      company: record.company,
      companyName: record.companyName || record.company,
      status: record.status,
      fieldsCount: record.fieldsCount ?? record.qaPairs.length,
      qaPairs: record.qaPairs || [],
      url: record.url,
      verificationReason: record.verificationReason,
    };

    this.logs.unshift(entry);
    this.save();
    this.notify();
    return entry;
  }

  public deleteLog(id: string): void {
    this.logs = this.logs.filter((l) => l.id !== id);
    if (this.activeJobId === id) this.activeJobId = null;
    this.save();
    this.notify();
  }

  public clearLogs(): void {
    this.logs = [];
    this.activeJobId = null;
    this.save();
    this.notify();
  }

  public subscribe(cb: (logs: QALogRecord[]) => void): () => void {
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

  public exportAsCsv(): string {
    const headers = ['ID', 'Timestamp', 'Portal', 'Job Title', 'Company', 'Status', 'Question', 'Answer', 'Source'];
    const rows: string[] = [headers.join(',')];

    for (const log of this.logs) {
      if (log.qaPairs.length === 0) {
        rows.push([
          `"${log.id}"`,
          `"${log.timestamp}"`,
          `"${log.portal}"`,
          `"${log.jobTitle.replace(/"/g, '""')}"`,
          `"${(log.companyName || log.company).replace(/"/g, '""')}"`,
          `"${log.status}"`,
          '""',
          '""',
          '""',
        ].join(','));
      } else {
        for (const qa of log.qaPairs) {
          rows.push([
            `"${log.id}"`,
            `"${log.timestamp}"`,
            `"${log.portal}"`,
            `"${log.jobTitle.replace(/"/g, '""')}"`,
            `"${(log.companyName || log.company).replace(/"/g, '""')}"`,
            `"${log.status}"`,
            `"${qa.question.replace(/"/g, '""')}"`,
            `"${qa.answer.replace(/"/g, '""')}"`,
            `"${qa.source || ''}"`,
          ].join(','));
        }
      }
    }

    return rows.join('\n');
  }

  public exportAsJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const QALogger = new QALoggerService();
