import fs from 'node:fs';
import { MODEL_BYTES, MODEL_NAME } from './model-config.mjs';

// The process is created only by start(), never by construction or status reads.
export class EmbeddedModelService {
  constructor({ spawnProcess, modelPath, notify = () => {} }) {
    this.spawnProcess = spawnProcess;
    this.modelPath = modelPath;
    this.notify = notify;
    this.child = null;
    this.pending = new Map();
    this.nextId = 0;
    this.loading = null;
    this.busy = false;
    this.state = { isReady: false, isLoading: false, progressPercent: 0, progressText: 'AI standby', modelName: MODEL_NAME };
  }

  status() { return { ...this.state }; }
  update(updates) {
    this.state = { ...this.state, ...updates };
    this.notify(this.status());
  }

  start() {
    if (this.state.isReady) return Promise.resolve(this.status());
    if (this.loading) return this.loading;
    if (!fs.existsSync(this.modelPath) || fs.statSync(this.modelPath).size !== MODEL_BYTES) {
      return Promise.reject(new Error('The bundled model is missing or incomplete. Reinstall the complete ZeroApply desktop package.'));
    }
    this.update({ isLoading: true, error: undefined, progressText: 'Loading built-in AI…', progressPercent: 0 });
    let child;
    try { child = this.spawnProcess(); }
    catch (error) {
      this.update({ isLoading: false, error: error.message });
      return Promise.reject(error);
    }
    this.child = child;
    child.on('message', (message) => {
      if (this.child !== child || !message || typeof message !== 'object') return;
      if (message.progress !== undefined) {
        this.update({
          progressPercent: Math.round(Math.max(0, Math.min(1, message.progress)) * 100),
          progressText: typeof message.progressText === 'string' ? message.progressText : this.state.progressText,
        });
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error));
      else pending.resolve(message.result);
    });
    child.on('exit', () => {
      if (this.child !== child) return;
      this.stop('Built-in AI stopped unexpectedly. Click Review & start AutoApply to retry.');
    });
    const loading = this.request('init', { modelPath: this.modelPath }, 120_000)
      .then(() => {
        if (this.child !== child) throw new Error('Model startup cancelled.');
        this.update({ isReady: true, isLoading: false, progressPercent: 100, progressText: 'Built-in AI ready' });
        return this.status();
      }).catch((error) => {
        if (this.child === child) this.stop(error.message);
        throw error;
      }).finally(() => { if (this.loading === loading) this.loading = null; });
    this.loading = loading;
    return loading;
  }

  request(type, payload, timeoutMs) {
    if (!this.child) return Promise.reject(new Error('Built-in AI is not running.'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.stop('Built-in AI timed out. AutoApply stopped to keep your computer responsive.'), timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.child.postMessage({ id, type, ...payload }); }
      catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async generate({ prompt, systemPrompt = '', temperature = 0, maxTokens = 256 }) {
    if (!this.state.isReady) throw new Error('Click Review & start AutoApply to load the built-in AI.');
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 32_000
      || typeof systemPrompt !== 'string' || systemPrompt.length > 16_000
      || !Number.isFinite(temperature) || !Number.isFinite(maxTokens)) {
      throw new Error('Invalid built-in AI request.');
    }
    if (this.busy) throw new Error('Built-in AI is answering another question.');
    this.busy = true;
    const child = this.child;
    try {
      return await this.request('generate', {
        prompt, systemPrompt, temperature: Math.max(0, Math.min(1, temperature)),
        maxTokens: Math.max(16, Math.min(512, Math.floor(maxTokens))),
      }, 120_000);
    } finally { if (this.child === child) this.busy = false; }
  }

  stop(error) {
    const child = this.child;
    this.child = null;
    this.loading = null;
    this.busy = false;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(error || 'AutoApply stopped; built-in AI unloaded.'));
    }
    this.pending.clear();
    child?.kill();
    this.update({ isReady: false, isLoading: false, progressPercent: 0, progressText: 'AI standby', error });
  }
}
