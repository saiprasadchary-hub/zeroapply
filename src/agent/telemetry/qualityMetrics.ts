export type QualityEvent = 'writeAttempts' | 'verifiedWrites' | 'recoveredFields' | 'formatRejections' | 'blockedForms' | 'confirmedApplications' | 'uncertainApplications' | 'failedInferences';
export type QualityMetrics = Record<QualityEvent, number>;
const KEY = 'zeroapply_quality_metrics_v1';
const initial: QualityMetrics = { writeAttempts: 0, verifiedWrites: 0, recoveredFields: 0, formatRejections: 0, blockedForms: 0, confirmedApplications: 0, uncertainApplications: 0, failedInferences: 0 };
let counters = { ...initial };
try {
  const value = JSON.parse(typeof localStorage === 'undefined' ? '{}' : localStorage.getItem(KEY) || '{}') as Partial<QualityMetrics>;
  for (const key of Object.keys(initial) as QualityEvent[]) if (Number.isSafeInteger(value[key]) && value[key]! >= 0) counters[key] = value[key]!;
} catch { /* Metrics are optional; they never authorize browser actions. */ }
const listeners = new Set<() => void>();
export function getQualityMetrics(): QualityMetrics { return { ...counters }; }
export function recordQuality(event: QualityEvent): void {
  counters = { ...counters, [event]: counters[event] + 1 };
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(counters)); } catch { /* Keep aggregate counts in memory. */ }
  for (const listener of listeners) { try { listener(); } catch { /* Metrics cannot interrupt automation. */ } }
}
export function subscribeQuality(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
