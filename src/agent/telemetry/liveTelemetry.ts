/**
 * ZeroApply Telemetry - Real-time Live Telemetry System
 * Dispatches live action records to transparent HUD, tracks metrics,
 * and maintains audit statistics for applications, questions, and fields.
 */

export type LiveActionType = 'scroll' | 'click' | 'think' | 'type' | 'check' | 'navigate' | 'submit' | 'status';

export interface LiveActionRecord {
  type: LiveActionType;
  title: string;
  target?: string;
  value?: string;
  source?: 'memory' | 'persona' | 'ollama' | 'webllm' | 'system' | 'rule';
  model?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  timestamp?: number;
}

export interface TelemetryStats {
  jobsAttempted: number;
  jobsApplied: number;
  fieldsFilled: number;
  questionsSolved: number;
  errorsCount: number;
  lastActiveTimestamp: number;
}

export type TelemetryListener = (action: LiveActionRecord) => void;

export class LiveTelemetrySystem {
  private listeners = new Set<TelemetryListener>();
  private history: LiveActionRecord[] = [];
  private stats: TelemetryStats = {
    jobsAttempted: 0,
    jobsApplied: 0,
    fieldsFilled: 0,
    questionsSolved: 0,
    errorsCount: 0,
    lastActiveTimestamp: Date.now(),
  };

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(action: LiveActionRecord): void {
    const record: LiveActionRecord & { timestamp: number } = {
      ...action,
      timestamp: action.timestamp || Date.now(),
    };

    this.history.push(record);
    if (this.history.length > 500) {
      this.history.shift();
    }

    this.stats.lastActiveTimestamp = record.timestamp;

    if (record.type === 'think' && record.status === 'completed') {
      this.stats.questionsSolved += 1;
    } else if (record.type === 'type' && record.status === 'completed') {
      this.stats.fieldsFilled += 1;
    } else if (record.type === 'submit' && record.status === 'completed') {
      this.stats.jobsApplied += 1;
    } else if (record.status === 'failed') {
      this.stats.errorsCount += 1;
    }

    for (const listener of this.listeners) {
      try {
        listener(record);
      } catch (err) {
        console.error('Error in telemetry listener:', err);
      }
    }
  }

  public getStats(): TelemetryStats {
    return { ...this.stats };
  }

  public getRecentHistory(count = 20): LiveActionRecord[] {
    return this.history.slice(-count);
  }

  public reset(): void {
    this.history = [];
    this.stats = {
      jobsAttempted: 0,
      jobsApplied: 0,
      fieldsFilled: 0,
      questionsSolved: 0,
      errorsCount: 0,
      lastActiveTimestamp: Date.now(),
    };
  }
}

export const liveTelemetry = new LiveTelemetrySystem();
