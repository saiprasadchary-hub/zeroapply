/**
 * ZeroApply Recovery - Workflow Self-Healing System
 */

export interface WorkflowCheckpoint {
  workflow: string;
  key: string;
  step: number;
  phase: string;
  fieldsFilled: number;
  recoveryCount: number;
  updatedAt: number;
}

export function isRecoverableWorkflowError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  if (/captcha|security checkpoint/i.test(msg)) return false;

  const recoverablePatterns = [
    /execution context/i,
    /destroyed/i,
    /frame detached/i,
    /timeout/i,
    /stale/i,
    /navigation/i,
    /abort/i,
    /err_aborted/i,
    /network/i,
    /temporary/i,
  ];

  return recoverablePatterns.some((p) => p.test(msg));
}

export async function runRecoverableOperation<T>(
  operation: () => Promise<T>,
  options: {
    label?: string;
    maxAttempts?: number;
    isActive?: () => boolean;
    wait?: (ms?: number) => Promise<boolean>;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, isActive = () => true, wait = async () => true } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!isActive()) throw new Error('Operation aborted: inactive');
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (!isRecoverableWorkflowError(err) || attempt === maxAttempts) {
        throw err;
      }
      await wait(100 * attempt);
    }
  }

  throw lastError;
}
