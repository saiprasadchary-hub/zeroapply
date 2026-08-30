export type WorkflowPhase =
  | 'starting'
  | 'scanning'
  | 'filling'
  | 'validating'
  | 'advancing'
  | 'submitting'
  | 'confirming'
  | 'completed';

export interface WorkflowCheckpoint {
  workflow: 'easy_apply' | 'standard_form';
  key: string;
  step: number;
  phase: WorkflowPhase;
  fieldsFilled: number;
  recoveryCount: number;
  updatedAt: number;
  detail?: string;
}

interface RecoverableOperationOptions {
  label: string;
  maxAttempts?: number;
  retryAllErrors?: boolean;
  isActive: () => boolean;
  wait: (milliseconds: number) => Promise<boolean>;
  onRetry?: (attempt: number, maxAttempts: number, error: unknown) => void;
  onRecovered?: () => void;
}

const TRANSIENT_ERROR = /abort|execution context|frame|navigation|network|timeout|timed out|temporar|target closed|webcontents|err_failed|err_aborted|econn|fetch|socket|detached|destroyed/i;
const PERMANENT_ERROR = /captcha|security checkpoint|not logged in|login required|mfa|one-time password|two-factor|verify your identity|missing required user data/i;

export function isRecoverableWorkflowError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return !PERMANENT_ERROR.test(message) && TRANSIENT_ERROR.test(message);
}

export async function runRecoverableOperation<T>(
  operation: (attempt: number) => Promise<T>,
  options: RecoverableOperationOptions,
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 4);
  let lastError: unknown = new Error(options.label + ' failed');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!options.isActive()) throw new Error('Operation stopped by user.');
    try {
      const result = await operation(attempt);
      if (attempt > 1) options.onRecovered?.();
      return result;
    } catch (error) {
      lastError = error;
      const canRetry = options.retryAllErrors || isRecoverableWorkflowError(error);
      if (!canRetry || attempt >= maxAttempts || !options.isActive()) throw error;
      options.onRetry?.(attempt + 1, maxAttempts, error);
      const delay = Math.min(2200, 300 * Math.pow(2, attempt - 1));
      if (!await options.wait(delay)) throw new Error('Operation stopped by user.');
    }
  }

  throw lastError;
}

function getSessionStorage(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export class WorkflowCheckpointJournal {
  private readonly storageKey: string;
  private checkpoint: WorkflowCheckpoint;

  constructor(workflow: WorkflowCheckpoint['workflow'], key: string, initial?: WorkflowCheckpoint) {
    this.storageKey = 'zeroapply_workflow_checkpoint_v1:' + encodeURIComponent(key);
    const saved = this.readStored();
    this.checkpoint = initial || saved || {
      workflow,
      key,
      step: 1,
      phase: 'starting',
      fieldsFilled: 0,
      recoveryCount: 0,
      updatedAt: Date.now(),
    };
  }

  current(): WorkflowCheckpoint {
    return { ...this.checkpoint };
  }

  mark(step: number, phase: WorkflowPhase, fieldsFilled: number, detail?: string): WorkflowCheckpoint {
    this.checkpoint = {
      ...this.checkpoint,
      step: Math.max(1, step),
      phase,
      fieldsFilled: Math.max(this.checkpoint.fieldsFilled, fieldsFilled),
      updatedAt: Date.now(),
      detail,
    };
    this.persist();
    return this.current();
  }

  recovered(detail?: string): WorkflowCheckpoint {
    this.checkpoint = {
      ...this.checkpoint,
      recoveryCount: this.checkpoint.recoveryCount + 1,
      updatedAt: Date.now(),
      detail: detail || this.checkpoint.detail,
    };
    this.persist();
    return this.current();
  }

  clear(): void {
    getSessionStorage()?.removeItem(this.storageKey);
  }

  private readStored(): WorkflowCheckpoint | undefined {
    try {
      const raw = getSessionStorage()?.getItem(this.storageKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as WorkflowCheckpoint;
      if (!parsed || typeof parsed.key !== 'string' || typeof parsed.step !== 'number') return undefined;
      if (parsed.phase === 'completed' || Date.now() - parsed.updatedAt > 2 * 60 * 60 * 1000) return undefined;
      return parsed;
    } catch {
      return undefined;
    }
  }

  private persist(): void {
    try {
      getSessionStorage()?.setItem(this.storageKey, JSON.stringify(this.checkpoint));
    } catch {
      // Storage can be disabled by the desktop session; in-memory recovery remains active.
    }
  }
}
