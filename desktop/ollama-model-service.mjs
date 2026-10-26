export const OLLAMA_MODEL = 'qwen3.5:4b';
import { validateInferenceExtras } from './inference-policy.mjs';

/** Uses the existing local Ollama server through the desktop's trusted IPC bridge. */
export class OllamaModelService {
  constructor({ notify = () => {}, fetchImpl = globalThis.fetch, timeoutMs = 180_000 } = {}) {
    this.notify = notify;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.version = 0;
    this.loading = null;
    this.busy = false;
    this.queue = [];
    this.pendingGenerations = new Map();
    this.controllers = new Set();
    this.healthTimer = null;
    this.state = { isReady: false, isLoading: false, progressPercent: 0, progressText: 'Local AI standby', modelName: OLLAMA_MODEL, supportsVision: false, supportsStructuredOutput: true };
  }

  status() { return { ...this.state }; }
  update(state) {
    this.state = { ...this.state, ...state };
    this.notify(this.status());
  }
  checkVersion(version) {
    if (version !== this.version) throw new Error('Local AI request cancelled.');
  }

  async request(endpoint, body, timeoutMs = this.timeoutMs) {
    const version = this.version;
    const controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetch(`http://127.0.0.1:11434/api/${endpoint}`, {
        signal: controller.signal,
        redirect: 'error',
        ...(body === undefined ? {} : {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        }),
      });
      if (!response.ok) throw new Error(`Local Ollama returned HTTP ${response.status}.`);
      const data = await response.json();
      this.checkVersion(version);
      if (controller.signal.aborted) throw new Error('Local AI request timed out.');
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid local Ollama response.');
      if (data.error) throw new Error(String(data.error));
      return data;
    } catch (error) {
      this.checkVersion(version);
      if (controller.signal.aborted) throw new Error('Local AI request timed out.');
      throw error;
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
    }
  }

  async infer(prompt, system = '', temperature = 0, maxTokens = 256, images, responseSchema) {
    const data = await this.request('generate', {
      model: OLLAMA_MODEL, prompt, system, ...(images?.length ? { images } : {}), ...(responseSchema ? { format: responseSchema } : {}), stream: false, think: false, keep_alive: '30m',
      options: { temperature, num_ctx: 4096, num_predict: maxTokens },
    });
    if (data.model !== OLLAMA_MODEL || data.done !== true || typeof data.response !== 'string' || !data.response.trim()) {
      throw new Error('Local model did not return a complete answer.');
    }
    return data.response.trim();
  }

  start() {
    if (this.loading) return this.loading;
    if (this.state.isReady) return Promise.resolve(this.status());
    const version = this.version;
    this.update({ isReady: false, isLoading: true, error: undefined, progressPercent: 20, progressText: `Connecting to ${OLLAMA_MODEL}…` });
    const loading = (async () => {
      const tags = await this.request('tags', undefined, 5_000);
      if (!Array.isArray(tags.models) || !tags.models.some(model => (model?.name || model?.model) === OLLAMA_MODEL)) {
        throw new Error(`Install ${OLLAMA_MODEL} in local Ollama to activate AI.`);
      }
      this.update({ progressPercent: 60, progressText: 'Verifying local AI response…' });
      const info = await this.request('show', { model: OLLAMA_MODEL }, 5_000).catch(() => ({}));
      this.checkVersion(version);
      this.update({ supportsVision: Array.isArray(info.capabilities) && info.capabilities.includes('vision') });
      const answer = await this.infer('Reply with the single word READY.', '', 0, 16);
      this.checkVersion(version);
      if (!/\bREADY\b/i.test(answer)) throw new Error('Local AI verification failed.');
      this.update({ isReady: true, isLoading: false, progressPercent: 100, error: undefined, progressText: `${OLLAMA_MODEL} active locally` });
      this.scheduleHealthCheck();
      return this.status();
    })().catch(error => {
      if (version === this.version) this.update({ isReady: false, isLoading: false, error: error.message, progressText: 'Local AI unavailable' });
      throw error;
    }).finally(() => { if (this.loading === loading) this.loading = null; });
    this.loading = loading;
    return loading;
  }

  scheduleHealthCheck() {
    clearTimeout(this.healthTimer);
    this.healthTimer = setTimeout(() => { void this.checkHealth(); }, 30_000);
    this.healthTimer.unref?.();
  }
  async checkHealth() {
    const version = this.version;
    try {
      if (!this.state.isReady || this.busy) return;
      const running = await this.request('ps', undefined, 5_000);
      if (!Array.isArray(running.models) || !running.models.some(model => (model?.name || model?.model) === OLLAMA_MODEL)) {
        throw new Error('Local model unloaded. Click Review & start AutoApply to reconnect.');
      }
    } catch (error) {
      if (version === this.version) this.update({ isReady: false, error: error.message, progressText: 'Local AI unavailable' });
    } finally {
      if (version === this.version && this.state.isReady) this.scheduleHealthCheck();
    }
  }

  async generate({ prompt, systemPrompt = '', temperature = 0, maxTokens = 256, images, responseSchema }) {
    if (!this.state.isReady) throw new Error(this.state.error || 'Local AI is not ready. Click Review & start AutoApply to retry.');
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 32_000
      || typeof systemPrompt !== 'string' || systemPrompt.length > 16_000
      || !Number.isFinite(temperature) || !Number.isFinite(maxTokens)) throw new Error('Invalid local AI request.');
    validateInferenceExtras({ images, responseSchema }, this.state.supportsVision);
    const key = JSON.stringify([prompt, systemPrompt, temperature, maxTokens, images, responseSchema]);
    const existing = this.pendingGenerations.get(key);
    if (existing) return existing;
    if (this.pendingGenerations.size >= 4) throw new Error('Local AI queue is full; wait for the current questions to finish.');
    const pending = new Promise((resolve, reject) => {
      this.queue.push({ prompt, systemPrompt, temperature, maxTokens, images, responseSchema, resolve, reject });
      void this.drainQueue();
    });
    const tracked = pending.finally(() => {
      if (this.pendingGenerations.get(key) === tracked) this.pendingGenerations.delete(key);
    });
    this.pendingGenerations.set(key, tracked);
    return tracked;
  }

  async inferWithRecovery(job, version) {
    for (let attempt = 0; attempt < 2; attempt++) {
      this.checkVersion(version);
      try {
        return await this.infer(job.prompt, job.systemPrompt,
          Math.max(0, Math.min(1, job.temperature)), Math.max(16, Math.min(512, Math.floor(job.maxTokens))), job.images, job.responseSchema);
      } catch (error) {
        this.checkVersion(version);
        if (attempt || !/timed out|HTTP 503/i.test(error.message)) throw error;
        // The failed request has already been aborted. Recheck the server before
        // one serialized retry; never overlap requests or clear the active form.
        await this.request('version', undefined, 5000);
        this.checkVersion(version);
        this.update({ progressText: 'Local AI response delayed; retrying the same question once…' });
      }
    }
    throw new Error('Local AI recovery exhausted.');
  }

  async drainQueue() {
    if (this.busy) return;
    const version = this.version;
    this.busy = true;
    try {
      while (this.queue.length && version === this.version) {
        const job = this.queue.shift();
        try {
          if (!this.state.isReady) throw new Error(this.state.error || 'Local AI is not ready.');
          const answer = await this.inferWithRecovery(job, version);
          this.checkVersion(version);
          this.update({ progressText: `${OLLAMA_MODEL} active locally` });
          job.resolve(answer);
        } catch (error) {
          if (version === this.version) this.update({ isReady: false, error: error.message, progressText: 'Local AI unavailable' });
          job.reject(error);
        }
      }
    } finally { if (version === this.version) this.busy = false; }
  }

  stop(error) {
    ++this.version;
    this.pendingGenerations.clear();
    for (const job of this.queue.splice(0)) job.reject(new Error('Local AI request cancelled.'));
    clearTimeout(this.healthTimer);
    this.healthTimer = null;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    this.loading = null;
    this.busy = false;
    this.update({ isReady: false, isLoading: false, progressPercent: 0, error, progressText: 'Local AI standby' });
  }
}
