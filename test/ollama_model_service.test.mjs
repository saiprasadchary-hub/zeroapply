import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OllamaModelService, OLLAMA_MODEL } from '../desktop/ollama-model-service.mjs';

const json = data => ({ ok: true, json: async () => data });
function makeService(generate = async () => json({ model: OLLAMA_MODEL, done: true, response: 'READY' })) {
  return new OllamaModelService({ fetchImpl: async (url, options) => {
    if (url.endsWith('/show')) return json({ capabilities: ['completion', 'vision'] });
    if (url.endsWith('/tags') || url.endsWith('/ps')) return json({ models: [{ name: OLLAMA_MODEL }] });
    return generate(options);
  } });
}

test('readiness requires verified inference and generation uses the exact local model', async () => {
  const requests = [];
  const service = makeService(async options => {
    requests.push(JSON.parse(options.body));
    return json({ model: OLLAMA_MODEL, done: true, response: requests.length === 1 ? 'READY' : 'Hyderabad' });
  });
  try {
    await assert.rejects(service.generate({ prompt: 'Hello' }), /not ready/);
    const start = service.start();
    assert.equal(service.start(), start);
    assert.equal(service.status().isReady, false);
    await start;
    assert.equal(service.status().isReady, true);
    assert.equal(await service.generate({ prompt: 'City?', systemPrompt: 'City is Hyderabad', maxTokens: 900 }), 'Hyderabad');
    assert.equal(requests[1].model, OLLAMA_MODEL);
    assert.equal(requests[1].system, 'City is Hyderabad');
    assert.equal(requests[1].options.num_predict, 512);
    await assert.rejects(service.generate({ prompt: '' }), /Invalid/);
  } finally { service.stop(); }
});

test('wrong model, incomplete response, missing model, and offline server never report ready', async () => {
  for (const response of [
    { model: 'another-model', done: true, response: 'READY' },
    { model: OLLAMA_MODEL, done: false, response: 'READY' },
    { model: OLLAMA_MODEL, done: true, response: '' },
  ]) {
    const service = makeService(async () => json(response));
    try {
      await assert.rejects(service.start());
      assert.equal(service.status().isReady, false);
      assert.equal(service.status().isLoading, false);
    } finally { service.stop(); }
  }
  for (const fetchImpl of [async () => json({ models: [] }), async () => { throw new Error('offline'); }]) {
    const service = new OllamaModelService({ fetchImpl });
    await assert.rejects(service.start());
    assert.equal(service.status().isReady, false);
    service.stop();
  }
});

test('stop prevents late startup responses from reactivating the service', async () => {
  let finish;
  let began;
  const started = new Promise(resolve => { began = resolve; });
  const service = makeService(() => new Promise(resolve => { finish = resolve; began(); }));
  const startup = service.start();
  await started;
  service.stop();
  finish(json({ model: OLLAMA_MODEL, done: true, response: 'READY' }));
  await assert.rejects(startup, /cancelled/);
  assert.equal(service.status().isReady, false);
  assert.equal(service.controllers.size, 0);
});

test('active and queued inference are cancelled on stop', async () => {
  let count = 0;
  const service = makeService(async options => {
    if (++count === 1) return json({ model: OLLAMA_MODEL, done: true, response: 'READY' });
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  });
  await service.start();
  const pending = service.generate({ prompt: 'Question' });
  const queued = service.generate({ prompt: 'Other question' });
  const cancelled = Promise.all([assert.rejects(pending, /cancelled/), assert.rejects(queued, /cancelled/)]);
  service.stop();
  await cancelled;
  assert.equal(count, 2);
  assert.equal(service.busy, false);
  assert.equal(service.controllers.size, 0);

  const timeout = new OllamaModelService({ timeoutMs: 5, fetchImpl: async (url, options) => {
    if (url.endsWith('/tags')) return json({ models: [{ name: OLLAMA_MODEL }] });
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  } });
  await assert.rejects(timeout.start(), /timed out/);
  assert.equal(timeout.status().isReady, false);
  assert.equal(timeout.controllers.size, 0);
  timeout.stop();
});

test('health check removes ready status after model unload', async () => {
  const service = makeService();
  try {
    await service.start();
    service.fetch = async () => json({ models: [] });
    await service.checkHealth();
    assert.equal(service.status().isReady, false);
    assert.match(service.status().error, /unloaded/);
  } finally { service.stop(); }
});


test('overlapping questions run in order with only one inference active', async () => {
  const prompts = [];
  let finishFirst;
  const service = makeService(async options => {
    const { prompt } = JSON.parse(options.body);
    if (prompt.includes('single word READY')) return json({ model: OLLAMA_MODEL, done: true, response: 'READY' });
    prompts.push(prompt);
    if (prompt === 'First') await new Promise(resolve => { finishFirst = resolve; });
    return json({ model: OLLAMA_MODEL, done: true, response: prompt });
  });
  try {
    await service.start();
    const first = service.generate({ prompt: 'First' });
    const second = service.generate({ prompt: 'Second' });
    const third = service.generate({ prompt: 'Third' });
    assert.deepEqual(prompts, ['First']);
    finishFirst();
    assert.deepEqual(await Promise.all([first, second, third]), ['First', 'Second', 'Third']);
    assert.deepEqual(prompts, ['First', 'Second', 'Third']);
    assert.equal(service.busy, false);
  } finally { service.stop(); }
});

test('failed inference rejects queued work without sending more requests', async () => {
  let fail;
  let calls = 0;
  const service = makeService(async () => {
    if (++calls === 1) return json({ model: OLLAMA_MODEL, done: true, response: 'READY' });
    return new Promise((_resolve, reject) => { fail = reject; });
  });
  try {
    await service.start();
    const first = service.generate({ prompt: 'First' });
    const second = service.generate({ prompt: 'Second' });
    const rejected = Promise.all([assert.rejects(first, /offline/), assert.rejects(second, /offline/)]);
    fail(new Error('offline'));
    await rejected;
    assert.equal(calls, 2);
    assert.equal(service.busy, false);
    assert.equal(service.queue.length, 0);
    assert.equal(service.status().isReady, false);
  } finally { service.stop(); }
});

test('vision screenshots reach local inference and malformed payloads are rejected', async () => {
  const requests = [];
  const service = makeService(async options => {
    requests.push(JSON.parse(options.body));
    return json({ model: OLLAMA_MODEL, done: true, response: 'READY' });
  });
  try {
    await service.start();
    const images = ['aGVsbG8='];
    const responseSchema = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] };
    await service.generate({ prompt: 'Read the screenshot', images, responseSchema });
    assert.deepEqual(requests[1].images, images);
    assert.deepEqual(requests[1].format, responseSchema);
    assert.equal(service.status().supportsVision, true);
    for (const invalid of [['https://example.com/image.png'], ['aGVsbG8=', 'aGVsbG8='], 'aGVsbG8=']) {
      await assert.rejects(service.generate({ prompt: 'Read', images: invalid }), /screenshot/);
    }
    assert.equal(service.status().isReady, true);
    await assert.rejects(service.generate({ prompt: 'Read', responseSchema: { type: 'object', $ref: 'https://attacker.test' } }), /references/);
  } finally { service.stop(); }
});

test('transient inference timeout retries once without dropping readiness or queued work', async () => {
  let calls = 0;
  const states = [];
  const service = new OllamaModelService({ notify: state => states.push(state), fetchImpl: async (url) => {
    if (url.endsWith('/tags')) return json({ models: [{ name: OLLAMA_MODEL }] });
    if (url.endsWith('/show')) return json({ capabilities: ['completion'] });
    if (url.endsWith('/version')) return json({ version: 'test' });
    if (++calls === 2) throw new Error('Local AI request timed out.');
    return json({ model: OLLAMA_MODEL, done: true, response: calls === 1 ? 'READY' : 'answer' });
  } });
  try {
    await service.start();
    const before = states.length;
    const answers = await Promise.all([service.generate({ prompt: 'First' }), service.generate({ prompt: 'Second' })]);
    assert.deepEqual(answers, ['answer', 'answer']);
    assert.equal(calls, 4);
    assert.ok(states.slice(before).every(state => state.isReady && !state.error));
  } finally { service.stop(); }
});

test('persistent timeout has a bounded retry and becomes an explicit failure', async () => {
  let calls = 0;
  const service = new OllamaModelService({ fetchImpl: async url => {
    if (url.endsWith('/tags')) return json({ models: [{ name: OLLAMA_MODEL }] });
    if (url.endsWith('/show')) return json({ capabilities: [] });
    if (url.endsWith('/version')) return json({ version: 'test' });
    if (++calls === 1) return json({ model: OLLAMA_MODEL, done: true, response: 'READY' });
    throw new Error('Local AI request timed out.');
  } });
  try {
    await service.start();
    await assert.rejects(service.generate({ prompt: 'Question' }), /timed out/);
    assert.equal(calls, 3);
    assert.equal(service.status().isReady, false);
  } finally { service.stop(); }
});
