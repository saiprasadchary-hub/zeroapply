import { liveTelemetry, type LiveActionRecord } from '../telemetry/liveTelemetry';

export type ProcessLogLevel = 'INFO' | 'SUCCESS' | 'ACTION' | 'LLM' | 'SECURITY' | 'WARNING' | 'ERROR';

export interface ProcessLogRecord {
  id: string;
  timestamp: string;
  level: ProcessLogLevel;
  source: string;
  message: string;
  detail?: string;
  target?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'zeroapply_process_history';

type ProcessListener = (logs: ProcessLogRecord[]) => void;

class ProcessLoggerService {
  private listeners: Set<ProcessListener> = new Set();
  private isBridged: boolean = false;

  constructor() {
    this.initTelemetryBridge();
  }

  private initTelemetryBridge() {
    if (this.isBridged) return;
    this.isBridged = true;

    liveTelemetry.subscribe((action: LiveActionRecord) => {
      let level: ProcessLogLevel = 'ACTION';
      let source = 'AgentEngine';

      switch (action.type) {
        case 'think':
          level = 'LLM';
          source = 'Qwen 2.5 Local';
          break;
        case 'type':
          level = 'ACTION';
          source = 'HumanSimulator (DOM)';
          break;
        case 'click':
          level = 'ACTION';
          source = 'Step Navigator';
          break;
        case 'attach':
          level = 'ACTION';
          source = 'Resume Injector';
          break;
        case 'security':
          level = 'SECURITY';
          source = 'Security Guardian';
          break;
        case 'validate':
          level = action.status === 'warning' ? 'WARNING' : 'INFO';
          source = 'Form Validator';
          break;
        case 'submit':
          level = action.status === 'completed' ? 'SUCCESS' : 'ACTION';
          source = 'AutoApplyEngine';
          break;
        case 'step':
          level = 'INFO';
          source = 'EasyApply Workflow';
          break;
        default:
          level = action.status === 'error' ? 'ERROR' : action.status === 'warning' ? 'WARNING' : 'INFO';
          source = 'Agent Core';
      }

      this.log({
        level,
        source,
        message: action.title,
        detail: action.detail,
        target: action.target,
        latencyMs: action.durationMs,
        metadata: {
          confidence: action.confidence,
          model: action.model,
          value: action.value,
          stepIndex: action.stepIndex,
          totalSteps: action.totalSteps,
        },
      });
    });
  }

  public subscribe(listener: ProcessListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const logs = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(logs);
      } catch (err) {
        console.error('[ProcessLogger] Listener error:', err);
      }
    });
  }

  public getLogs(): ProcessLogRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLogs(logs: ProcessLogRecord[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 300)));
    } catch (e) {
      console.error('Failed to save process logs:', e);
    }
  }

  public log(entry: Omit<ProcessLogRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): ProcessLogRecord {
    const logs = this.getLogs();
    const newRecord: ProcessLogRecord = {
      id: entry.id || Math.random().toString(36).substring(2, 9),
      timestamp: entry.timestamp || new Date().toISOString(),
      ...entry,
    };

    logs.unshift(newRecord);
    this.saveLogs(logs);
    this.notifyListeners();
    return newRecord;
  }

  public deleteLog(id: string): void {
    const logs = this.getLogs().filter((l) => l.id !== id);
    this.saveLogs(logs);
    this.notifyListeners();
  }

  public clearLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.notifyListeners();
  }

  public exportAsJson(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }

  public exportAsCsv(): string {
    const logs = this.getLogs();
    const rows = [['Timestamp', 'Level', 'Source', 'Message', 'Detail', 'Target', 'Latency (ms)']];

    for (const l of logs) {
      rows.push([
        `"${new Date(l.timestamp).toLocaleString()}"`,
        `"${l.level}"`,
        `"${l.source.replace(/"/g, '""')}"`,
        `"${l.message.replace(/"/g, '""')}"`,
        `"${(l.detail || '').replace(/"/g, '""')}"`,
        `"${(l.target || '').replace(/"/g, '""')}"`,
        `"${l.latencyMs || 0}"`,
      ]);
    }

    return rows.map((r) => r.join(',')).join('\n');
  }
}

export const ProcessLogger = new ProcessLoggerService();
