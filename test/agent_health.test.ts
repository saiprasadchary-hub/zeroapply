import assert from 'node:assert/strict';
import { initWebLlmEngine, generateWebLlmResponse, stopEmbeddedModel } from '../src/agent/llm/webLlmEngine';
import { getAgentHealth } from '../src/agent/telemetry/agentHealth';
let requestImages: string[] | undefined;
let fail = false;
Object.defineProperty(globalThis, 'window', { configurable: true, value: { zeroApply: {
  startEmbeddedLlm: async () => ({ isReady: true, isLoading: false, modelName: 'fixture-vision-model' }),
  generateEmbeddedLlm: async (request: { images?: string[] }): Promise<string> => {
    requestImages = request.images;
    if (fail) throw new Error('Local AI request timed out.');
    return 'Grounded fixture answer';
  },
} } });
await initWebLlmEngine('review-start');
await generateWebLlmResponse('Fixture question', '', 0, 128, ['fixture-screen-image']);
assert.deepEqual(requestImages, ['fixture-screen-image']);
assert.equal(getAgentHealth().lastInference?.screenshotSent, true);
assert.equal(getAgentHealth().lastInference?.status, 'completed');
assert.equal(getAgentHealth().lastInference?.model, 'fixture-vision-model');
await generateWebLlmResponse('Text-only fixture');
assert.equal(getAgentHealth().lastInference?.screenshotSent, false);
fail = true;
await assert.rejects(() => generateWebLlmResponse('Timeout fixture'), /timed out/);
assert.equal(getAgentHealth().lastInference?.status, 'failed');
assert.match(getAgentHealth().lastInference?.error || '', /timed out/);
assert.equal(getAgentHealth().pendingRequests, 0);
await stopEmbeddedModel();
console.log('Agent health passed: image payload delivered to inference bridge, text-only requests identified and timeout failures exposed.');
