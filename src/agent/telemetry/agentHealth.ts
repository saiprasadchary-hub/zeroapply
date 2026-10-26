import { recordQuality } from './qualityMetrics';
export interface AgentHealthSnapshot {
  pendingRequests: number;
  lastInference?: {
    id: string; model: string; status: 'running' | 'completed' | 'failed';
    screenshotSent: boolean; startedAt: number; elapsedMs?: number; error?: string;
  };
  lastAnswer?: { question: string; source: string; evidence?: string; timestamp: number };
}
let health: AgentHealthSnapshot = { pendingRequests: 0 };
const pending = new Set<string>();
const listeners = new Set<(snapshot: AgentHealthSnapshot) => void>();
export function getAgentHealth(): AgentHealthSnapshot {
  return { ...health, lastInference: health.lastInference ? { ...health.lastInference } : undefined,
    lastAnswer: health.lastAnswer ? { ...health.lastAnswer } : undefined };
}
function publish(): void {
  health = { ...health, pendingRequests: pending.size };
  for (const listener of listeners) { try { listener(getAgentHealth()); } catch { /* Observers cannot interrupt inference. */ } }
}
export function subscribeAgentHealth(listener: (snapshot: AgentHealthSnapshot) => void): () => void {
  listeners.add(listener); listener(getAgentHealth()); return () => { listeners.delete(listener); };
}
export function beginInference(model: string, screenshotSent: boolean): string {
  const id = crypto.randomUUID(); pending.add(id);
  health.lastInference = { id, model, screenshotSent, status: 'running', startedAt: Date.now() }; publish(); return id;
}
export function finishInference(id: string, error?: string): void {
  if (error) recordQuality('failedInferences');
  pending.delete(id);
  if (health.lastInference?.id === id) health.lastInference = { ...health.lastInference,
    status: error ? 'failed' : 'completed', elapsedMs: Date.now() - health.lastInference.startedAt, error };
  publish();
}
export function reportAnswerEvidence(question: string, source: string, evidence?: string): void {
  health.lastAnswer = { question, source, evidence, timestamp: Date.now() }; publish();
}
