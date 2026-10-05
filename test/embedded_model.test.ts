import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EmbeddedModelService } from '../desktop/model-service.mjs';
import { MODEL_BYTES } from '../desktop/model-config.mjs';
import { modelThreadLimit } from '../desktop/resource-policy.mjs';
import { ensureEmbeddedModelReady, initWebLlmEngine, stopEmbeddedModel, generateWebLlmResponse, getWebLlmState } from '../src/agent/llm/webLlmEngine';
import { checkOllamaHealth, checkOllamaStatus } from '../src/agent/localLlm/ollamaClient';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeroapply-model-test-'));
const file = path.join(dir, 'model.gguf');
fs.closeSync(fs.openSync(file, 'w'));
fs.truncateSync(file, MODEL_BYTES); // Sparse fixture: no model is loaded by this unit test.
class FakeProcess extends EventEmitter {
  killed = false;
  messages: { id: number; type: string; maxTokens?: number }[] = [];
  respond = true;
  postMessage(message: { id: number; type: string; maxTokens?: number }): void {
    this.messages.push(message);
    if (this.respond) queueMicrotask(() => this.emit('message', { id: message.id, result: message.type === 'init' ? true : 'Grounded answer' }));
  }
  kill(): void { this.killed = true; this.emit('exit'); }
}
let spawned = 0;
let child = new FakeProcess();
const service = new EmbeddedModelService({ modelPath: file, spawnProcess: () => { spawned++; return child; } });
try {
  assert.equal(service.status().isReady, false);
  assert.equal(spawned, 0);
  await assert.rejects(service.generate({ prompt: 'Question' }), /Review/);
  assert.equal(spawned, 0, 'Generation before click must not spawn inference');
  const first = service.start();
  assert.equal(service.start(), first, 'Duplicate starts share loading');
  await first;
  assert.equal(spawned, 1);
  assert.equal(service.status().isReady, true);
  const answer = service.generate({ prompt: 'Question', maxTokens: 9999 });
  await assert.rejects(service.generate({ prompt: 'Concurrent question' }), /another question/);
  assert.equal(await answer, 'Grounded answer');
  assert.equal(child.messages.at(-1)?.maxTokens, 512);
  await assert.rejects(service.generate({ prompt: 'x'.repeat(32001) }), /Invalid/);
  service.stop();
  assert.equal(child.killed, true);
  assert.equal(service.pending.size, 0);
  child = new FakeProcess(); child.respond = false;
  const cancelled = service.start();
  service.stop();
  await assert.rejects(cancelled, /unloaded/);
  child = new FakeProcess();
  await service.start();
  const pending = service.generate({ prompt: 'Question' });
  service.stop();
  await assert.rejects(pending, /unloaded/);
  assert.equal(service.status().isReady, false);
  child = new FakeProcess();
  child.respond = false;
  mock.timers.enable({ apis: ['setTimeout'] });
  const timedOut = service.start();
  mock.timers.tick(120_001);
  await assert.rejects(timedOut, /timed out/);
  assert.equal(child.killed, true, 'Timed-out model loads must release their process');
  assert.equal(service.pending.size, 0);
  mock.timers.reset();
  assert.equal(modelThreadLimit(1), 1);
  assert.equal(modelThreadLimit(16), 2);

  let starts = 0;
  let generates = 0;
  let stopped = 0;
  let finishStart: ((state: ReturnType<typeof getWebLlmState>) => void) | undefined;
  const fakeWindow = { zeroApply: {
    startEmbeddedLlm: () => { starts++; return new Promise<ReturnType<typeof getWebLlmState>>((resolve) => { finishStart = resolve; }); },
    generateEmbeddedLlm: async () => { generates++; return 'Real response'; },
    stopEmbeddedLlm: async () => { stopped++; },
  } };
  Object.assign(globalThis, { window: fakeWindow });
  assert.equal(await checkOllamaHealth(), false);
  assert.equal((await checkOllamaStatus()).online, false);
  await assert.rejects(ensureEmbeddedModelReady(), /Review/);
  await assert.rejects(generateWebLlmResponse('Question'), /Review/);
  assert.equal(starts, 0, 'Passive health/status and generation must never start the model');
  const loading = initWebLlmEngine('review-start');
  assert.equal(initWebLlmEngine('review-start'), loading);
  finishStart?.({ isReady: true, isLoading: false });
  await loading;
  assert.equal(starts, 1);
  assert.equal(await generateWebLlmResponse('Question'), 'Real response');
  assert.equal(generates, 1);
  await stopEmbeddedModel();
  assert.equal(stopped, 1);
  const stale = initWebLlmEngine('review-start');
  await stopEmbeddedModel();
  finishStart?.({ isReady: true, isLoading: false });
  await assert.rejects(stale, /cancelled/);
  assert.equal(getWebLlmState().isReady, false);
  delete (globalThis as { window?: unknown }).window;

  const main = fs.readFileSync('main.js', 'utf8');
  assert.doesNotMatch(main, /ensureOllamaRunning|install-ollama-engine|start-ollama-daemon/);
  const header = fs.readFileSync('src/components/Header.tsx', 'utf8');
  assert.doesNotMatch(header, /initWebLlmEngine|setInterval/);
  const persona = fs.readFileSync('src/components/PersonaForm.tsx', 'utf8');
  assert.match(persona, /initWebLlmEngine\('review-start'\)/);
  console.log('Embedded model lifecycle, concurrency, cancellation, passive status, and reviewed-start gating passed.');
} finally { service.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
