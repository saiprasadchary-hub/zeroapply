export interface QAPair {
  question: string;
  answer: string;
  category?: string;
  source?: 'ollama' | 'persona' | 'memory' | 'heuristic' | 'custom';
  confidence?: number;
  timestamp?: string;
}

export interface QALogRecord {
  id: string;
  timestamp: string;
  portal: string;
  jobTitle: string;
  companyName: string;
  status?: 'SUBMITTED' | 'IN_PROGRESS' | 'REVIEW';
  qaPairs: QAPair[];
}

const STORAGE_KEY = 'zeroapply_qa_history';

type LogListener = (logs: QALogRecord[]) => void;

export class QALogger {
  private static listeners: Set<LogListener> = new Set();

  public static subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners() {
    const logs = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(logs);
      } catch (err) {
        console.error('[QALogger] Listener error:', err);
      }
    });
  }

  public static getLogs(): QALogRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static saveLogs(logs: QALogRecord[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 150)));
    } catch (e) {
      console.error('Failed to save QA logs:', e);
    }
  }

  public static addLog(record: Omit<QALogRecord, 'id' | 'timestamp'>): QALogRecord {
    const logs = this.getLogs();
    const newRecord: QALogRecord = {
      ...record,
      status: record.status || 'SUBMITTED',
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newRecord);
    this.saveLogs(logs);
    this.notifyListeners();
    return newRecord;
  }

  /**
   * Real-time merge: Updates or creates a live active application QA record as fields are filled
   */
  public static addOrUpdateActiveLog(
    portal: string,
    jobTitle: string,
    companyName: string,
    newPairs: QAPair[],
    status: 'SUBMITTED' | 'IN_PROGRESS' | 'REVIEW' = 'IN_PROGRESS'
  ): QALogRecord {
    if (!newPairs || newPairs.length === 0) {
      return this.getLogs()[0] || this.addLog({ portal, jobTitle, companyName, status, qaPairs: [] });
    }

    const logs = this.getLogs();
    const now = Date.now();

    // Look for an existing in-progress or recently updated log within the last 15 minutes
    const existingIndex = logs.findIndex((l) => {
      const isSameTarget = l.portal === portal && l.jobTitle === jobTitle && l.companyName === companyName;
      const isRecent = now - new Date(l.timestamp).getTime() < 15 * 60 * 1000;
      return isSameTarget && (l.status === 'IN_PROGRESS' || isRecent);
    });

    if (existingIndex >= 0) {
      const existing = logs[existingIndex];
      const mergedPairs = [...existing.qaPairs];

      for (const pair of newPairs) {
        const pIndex = mergedPairs.findIndex((p) => p.question.toLowerCase().trim() === pair.question.toLowerCase().trim());
        if (pIndex >= 0) {
          mergedPairs[pIndex] = { ...mergedPairs[pIndex], ...pair };
        } else {
          mergedPairs.push(pair);
        }
      }

      const updatedRecord: QALogRecord = {
        ...existing,
        timestamp: new Date().toISOString(),
        status,
        qaPairs: mergedPairs,
      };

      logs[existingIndex] = updatedRecord;
      this.saveLogs(logs);
      this.notifyListeners();
      return updatedRecord;
    } else {
      return this.addLog({
        portal,
        jobTitle,
        companyName,
        status,
        qaPairs: newPairs,
      });
    }
  }

  public static deleteLog(id: string): void {
    const logs = this.getLogs().filter((l) => l.id !== id);
    this.saveLogs(logs);
    this.notifyListeners();
  }

  public static clearLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.notifyListeners();
  }

  public static exportAsJson(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }

  public static exportAsCsv(): string {
    const logs = this.getLogs();
    const rows = [['Timestamp', 'Portal', 'Job Title', 'Company', 'Status', 'Question', 'Answer', 'Source']];

    for (const log of logs) {
      for (const qa of log.qaPairs) {
        rows.push([
          `"${new Date(log.timestamp).toLocaleString()}"`,
          `"${log.portal.replace(/"/g, '""')}"`,
          `"${log.jobTitle.replace(/"/g, '""')}"`,
          `"${log.companyName.replace(/"/g, '""')}"`,
          `"${log.status || 'SUBMITTED'}"`,
          `"${qa.question.replace(/"/g, '""')}"`,
          `"${qa.answer.replace(/"/g, '""')}"`,
          `"${qa.source || 'persona'}"`,
        ]);
      }
    }

    return rows.map((r) => r.join(',')).join('\n');
  }
}
