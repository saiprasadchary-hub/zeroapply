export interface WebLlmEngineState {
  isReady: boolean;
  isLoading: boolean;
  progressText?: string;
  progressPercent?: number;
  modelName?: string;
  error?: string;
}

let currentState: WebLlmEngineState = {
  isReady: false, isLoading: false, progressText: 'AI standby', progressPercent: 0,
  modelName: 'Qwen2.5 1.5B (built-in)',
};
const subscribers = new Set<(state: WebLlmEngineState) => void>();
let startup: Promise<void> | null = null;
let sessionVersion = 0;
let bridgeSubscribed = false;

export function getWebLlmState(): WebLlmEngineState { return { ...currentState }; }
function updateState(state: WebLlmEngineState): void {
  currentState = { ...state };
  for (const subscriber of subscribers) subscriber(getWebLlmState());
}
export function subscribeWebLlmState(callback: (state: WebLlmEngineState) => void): () => void {
  if (!bridgeSubscribed && typeof window !== 'undefined' && window.zeroApply?.onEmbeddedLlmState) {
    bridgeSubscribed = true;
    window.zeroApply.onEmbeddedLlmState(updateState);
    void window.zeroApply.getEmbeddedLlmStatus?.().then(updateState).catch(() => {});
  }
  subscribers.add(callback);
  callback(getWebLlmState());
  return () => { subscribers.delete(callback); };
}

// Only the reviewed start button grants a session. Observation and generation cannot wake it.
export function initWebLlmEngine(trigger: 'review-start'): Promise<void> {
  if (trigger !== 'review-start') return Promise.reject(new Error('Click Review & start AutoApply to load built-in AI.'));
  if (startup) return startup;
  if (currentState.isReady) return Promise.resolve();
  const bridge = typeof window === 'undefined' ? undefined : window.zeroApply;
  if (!bridge?.startEmbeddedLlm) return Promise.reject(new Error('Built-in AI is available in the ZeroApply desktop app.'));
  const version = ++sessionVersion;
  updateState({ ...currentState, isLoading: true, error: undefined, progressText: 'Loading built-in AI…' });
  const loading = bridge.startEmbeddedLlm().then((state) => {
    if (version !== sessionVersion) throw new Error('AutoApply startup cancelled.');
    updateState(state);
  }).catch((error: unknown) => {
    if (version === sessionVersion) updateState({ ...currentState, isLoading: false, isReady: false, error: error instanceof Error ? error.message : 'Built-in AI failed to start.' });
    throw error;
  }).finally(() => { if (startup === loading) startup = null; });
  startup = loading;
  return loading;
}

export async function ensureEmbeddedModelReady(): Promise<void> {
  if (startup) await startup;
  if (!currentState.isReady) throw new Error(currentState.error || 'Click Review & start AutoApply on your persona to load built-in AI.');
}

export async function stopEmbeddedModel(): Promise<void> {
  ++sessionVersion;
  startup = null;
  updateState({ ...currentState, isReady: false, isLoading: false, progressPercent: 0, progressText: 'AI standby', error: undefined });
  if (typeof window !== 'undefined') await window.zeroApply?.stopEmbeddedLlm?.();
}

export async function generateWebLlmResponse(prompt: string, systemPrompt = '', temperature = 0, maxTokens = 256): Promise<string> {
  await ensureEmbeddedModelReady();
  const generate = typeof window === 'undefined' ? undefined : window.zeroApply?.generateEmbeddedLlm;
  if (!generate) throw new Error('Built-in AI requires the desktop app.');
  return generate({ prompt, systemPrompt, temperature, maxTokens });
}
