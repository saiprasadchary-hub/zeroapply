import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { EmbeddedModelService } from '../desktop/model-service.mjs';
import { MODEL_FILENAME } from '../desktop/model-config.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const service = new EmbeddedModelService({
  modelPath: path.join(root, 'public/models/zeroapply', MODEL_FILENAME),
  spawnProcess: () => {
    const child = fork(path.join(root, 'desktop/model-runtime.cjs'), [], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    child.stderr.on('data', (data) => process.stderr.write(data));
    child.postMessage = (message) => child.send(message);
    return child;
  },
});
const start = Date.now();
try {
  assert.equal(service.child, null);
  await service.start();
  console.log(`Built-in model loaded in ${Date.now() - start}ms.`);
  const answer = await service.generate({
    prompt: 'How many years of TypeScript experience do I have? Return just the number.',
    systemPrompt: 'Use only this applicant fact: I have 3 years of TypeScript experience. Answer concisely.',
    maxTokens: 16,
  });
  console.log(`Built-in model answer: ${answer.trim()}`);
  assert.match(answer.trim(), /^3(?:\b|$)/);
  const second = await service.generate({
    prompt: 'What is my city? Return just the city name.',
    systemPrompt: 'Use only this applicant fact: My city is Hyderabad. Answer concisely.', maxTokens: 16,
  });
  assert.match(second, /Hyderabad/i);
  console.log('Two native inference requests passed with isolated histories.');
} finally {
  service.stop();
  assert.equal(service.child, null);
  console.log('Built-in model process stopped and resources released.');
}
