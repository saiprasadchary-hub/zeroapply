import { ErrorLogger } from '../agent/tracker/errorLogger';

const DUPLICATE_WINDOW_MS = 5_000;
const recentErrors = new Map<string, number>();

function errorDetails(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) {
    return {
      message: value.message.trim().slice(0, 1_000) || 'Unknown application error',
      stack: value.stack?.slice(0, 8_000),
    };
  }
  if (typeof value === 'string') return { message: value.trim().slice(0, 1_000) || 'Unknown application error' };
  try {
    return { message: JSON.stringify(value).slice(0, 1_000) };
  } catch {
    return { message: 'Unknown application error' };
  }
}

function shouldReport(source: string, message: string): boolean {
  const fingerprint = `${source}:${message}`;
  const now = Date.now();
  const previous = recentErrors.get(fingerprint) || 0;
  recentErrors.set(fingerprint, now);
  for (const [key, timestamp] of recentErrors) {
    if (now - timestamp > DUPLICATE_WINDOW_MS) recentErrors.delete(key);
  }
  return now - previous > DUPLICATE_WINDOW_MS;
}

export function registerGlobalErrorRecovery(onUserMessage: (message: string) => void): () => void {
  const report = (source: string, value: unknown) => {
    const details = errorDetails(value);
    if (!shouldReport(source, details.message)) return;
    ErrorLogger.log({
      source,
      message: details.message,
      stack: details.stack,
      severity: 'CRITICAL',
      resolved: false,
    });
    onUserMessage('A background operation failed safely. Retry the action; reload ZeroApply if it continues.');
  };

  const handleError = (event: ErrorEvent) => {
    report('RendererError', event.error || event.message);
  };
  const handleRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    report('UnhandledPromise', event.reason);
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}

