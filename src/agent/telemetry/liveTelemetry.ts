export type LiveActionType = 
  | 'click' 
  | 'type' 
  | 'scroll'
  | 'check'
  | 'think' 
  | 'scan' 
  | 'attach' 
  | 'validate' 
  | 'security' 
  | 'submit' 
  | 'step' 
  | 'pause' 
  | 'status';

export type LiveActionSource = 'ollama' | 'persona' | 'memory' | 'heuristic' | 'dom' | 'security';

export interface LiveActionRecord {
  id: string;
  timestamp: number;
  type: LiveActionType;
  title: string;
  detail?: string;
  target?: string;
  value?: string;
  source?: LiveActionSource;
  confidence?: number;
  model?: string;
  stepIndex?: number;
  totalSteps?: number;
  fieldsProgress?: { current: number; total: number };
  status: 'running' | 'completed' | 'warning' | 'error';
  durationMs?: number;
}

export interface LiveTelemetryStats {
  fieldsFilled: number;
  questionsSolved: number;
  stepsCompleted: number;
  jobsProcessed: number;
  activeModel: string;
  lastLatencyMs: number;
}

type TelemetryListener = (action: LiveActionRecord, history: LiveActionRecord[], stats: LiveTelemetryStats) => void;

class LiveTelemetryService {
  private currentAction: LiveActionRecord | null = null;
  private history: LiveActionRecord[] = [];
  private listeners: Set<TelemetryListener> = new Set();
  private stats: LiveTelemetryStats = {
    fieldsFilled: 0,
    questionsSolved: 0,
    stepsCompleted: 0,
    jobsProcessed: 0,
    activeModel: 'qwen2.5:3b',
    lastLatencyMs: 0,
  };

  public getCurrentAction(): LiveActionRecord | null {
    return this.currentAction;
  }

  public getHistory(): LiveActionRecord[] {
    return [...this.history];
  }

  public getStats(): LiveTelemetryStats {
    return { ...this.stats };
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    if (this.currentAction) {
      listener(this.currentAction, this.getHistory(), this.getStats());
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(action: LiveActionRecord) {
    const hist = this.getHistory();
    const st = this.getStats();
    this.listeners.forEach((cb) => {
      try {
        cb(action, hist, st);
      } catch (err) {
        console.error('[LiveTelemetry] Listener error:', err);
      }
    });
  }

  public emit(actionParams: Omit<LiveActionRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): LiveActionRecord {
    const record: LiveActionRecord = {
      id: actionParams.id || Math.random().toString(36).substring(2, 9),
      timestamp: actionParams.timestamp || Date.now(),
      ...actionParams,
    };

    this.currentAction = record;
    this.history.unshift(record);
    if (this.history.length > 60) {
      this.history.pop();
    }

    if (record.durationMs) {
      this.stats.lastLatencyMs = record.durationMs;
    }
    if (record.type === 'type' && record.status === 'completed') {
      this.stats.fieldsFilled += 1;
    }
    if (record.type === 'think' && record.status === 'completed') {
      this.stats.questionsSolved += 1;
    }
    if (record.type === 'step' && record.status === 'completed') {
      this.stats.stepsCompleted += 1;
    }
    if (record.type === 'submit' && record.status === 'completed') {
      this.stats.jobsProcessed += 1;
    }

    this.notify(record);
    return record;
  }

  public startAction(
    actionParams: Omit<LiveActionRecord, 'id' | 'timestamp' | 'status'>
  ): {
    id: string;
    complete: (updates?: Partial<LiveActionRecord>) => LiveActionRecord;
    fail: (errorMsg: string) => LiveActionRecord;
  } {
    const startTime = Date.now();
    const record = this.emit({
      ...actionParams,
      status: 'running',
    });

    return {
      id: record.id,
      complete: (updates = {}) => {
        const durationMs = Date.now() - startTime;
        return this.emit({
          ...record,
          ...updates,
          durationMs,
          status: 'completed',
        });
      },
      fail: (errorMsg: string) => {
        const durationMs = Date.now() - startTime;
        return this.emit({
          ...record,
          detail: errorMsg,
          durationMs,
          status: 'error',
        });
      },
    };
  }

  public updateStats(partial: Partial<LiveTelemetryStats>) {
    this.stats = { ...this.stats, ...partial };
    if (this.currentAction) {
      this.notify(this.currentAction);
    }
  }

  public clear() {
    this.history = [];
    this.stats = {
      fieldsFilled: 0,
      questionsSolved: 0,
      stepsCompleted: 0,
      jobsProcessed: 0,
      activeModel: 'qwen2.5:3b',
      lastLatencyMs: 0,
    };
    const readyRecord: LiveActionRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type: 'status',
      title: 'Agent Standing By',
      detail: 'Ready for batch application',
      status: 'completed',
    };
    this.currentAction = readyRecord;
    this.notify(readyRecord);
  }
}

export const liveTelemetry = new LiveTelemetryService();
