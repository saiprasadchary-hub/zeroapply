import type { NetworkConfig } from './types';
import { DEFAULT_NETWORK_CONFIG } from './types';

export class NetworkError extends Error {
  public isTransient: boolean;
  public statusCode?: number;
  public originalError?: unknown;

  constructor(message: string, isTransient: boolean = true, statusCode?: number, originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.isTransient = isTransient;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

/**
 * Classifies an error to determine if it is a transient network issue that should be retried.
 */
export function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof NetworkError) return err.isTransient;

  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  // Common transient network failure keywords
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_connection_reset') ||
    msg.includes('err_connection_timed_out') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_network_changed') ||
    msg.includes('err_empty_response') ||
    msg.includes('failed to fetch') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}

/**
 * Calculates exponential backoff delay with full jitter to avoid thundering herd problem.
 */
export function calculateBackoffDelay(
  attempt: number,
  config: Partial<NetworkConfig> = {}
): number {
  const baseDelay = config.baseDelayMs ?? DEFAULT_NETWORK_CONFIG.baseDelayMs;
  const maxDelay = config.maxDelayMs ?? DEFAULT_NETWORK_CONFIG.maxDelayMs;
  const factor = config.exponentialFactor ?? DEFAULT_NETWORK_CONFIG.exponentialFactor;

  const rawDelay = baseDelay * Math.pow(factor, attempt);
  const cappedDelay = Math.min(rawDelay, maxDelay);
  
  // Full jitter: random between 0.5 * delay and 1.2 * delay
  const jitter = cappedDelay * (0.5 + Math.random() * 0.7);
  return Math.round(jitter);
}

/**
 * Executes an async task with automatic retries, adaptive backoff, and network error classification.
 */
export async function withNetworkRetry<T>(
  task: (attempt: number) => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
    abortSignal?: AbortSignal;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_NETWORK_CONFIG.maxRetries;
  let attempt = 0;

  while (true) {
    if (options.abortSignal?.aborted) {
      throw new Error('Operation aborted by user.');
    }

    try {
      return await task(attempt);
    } catch (err) {
      attempt++;

      const isTransient = isTransientNetworkError(err);
      if (attempt > maxRetries || !isTransient) {
        throw err;
      }

      const delayMs = calculateBackoffDelay(attempt - 1, {
        baseDelayMs: options.baseDelayMs,
        maxDelayMs: options.maxDelayMs,
      });

      if (options.onRetry) {
        options.onRetry(attempt, delayMs, err);
      }

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, delayMs);
        if (options.abortSignal) {
          options.abortSignal.addEventListener(
            'abort',
            () => {
              clearTimeout(timeout);
              reject(new Error('Operation aborted during retry wait.'));
            },
            { once: true }
          );
        }
      });
    }
  }
}
