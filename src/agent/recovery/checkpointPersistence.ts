/**
 * ZeroApply Recovery - Batch Checkpoint Persistence
 * Saves and restores multi-job application progress in local storage
 * so interrupted or paused sessions can seamlessly resume.
 */

export interface AutoApplyCheckpoint {
  portal: string;
  roleKeyword: string;
  location: string;
  currentCardIndex: number;
  appliedJobIds: string[];
  skippedJobIds: string[];
  successfulCount: number;
  timestamp: number;
}

export const CHECKPOINT_STORAGE_KEY = 'zeroapply_batch_checkpoint';

/**
 * Persists the current batch run state to storage.
 */
export function saveCheckpoint(checkpoint: AutoApplyCheckpoint): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint));
  } catch (err) {
    console.warn('[CheckpointPersistence] Failed to save checkpoint:', err);
  }
}

/**
 * Loads the most recent valid checkpoint from storage (valid for 24 hours).
 */
export function loadCheckpoint(): AutoApplyCheckpoint | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: AutoApplyCheckpoint = JSON.parse(raw);
    if (!parsed || !parsed.portal || typeof parsed.currentCardIndex !== 'number') {
      return null;
    }

    // Expiration check: discard checkpoints older than 24 hours
    const maxAgeMs = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      clearCheckpoint();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears the stored checkpoint after a batch finishes or is explicitly reset.
 */
export function clearCheckpoint(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
  } catch {}
}

/**
 * Checks if a resumable checkpoint is available.
 */
export function hasPendingCheckpoint(): boolean {
  return loadCheckpoint() !== null;
}
