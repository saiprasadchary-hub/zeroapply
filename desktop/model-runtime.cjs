const os = require('node:os');
const port = process.parentPort;
const send = (message) => port ? port.postMessage(message) : process.send?.(message);
let model;
let context;
let runtime;
let busy = false;

async function handle(message) {
  if (!message || typeof message.id !== 'number') return;
  if (busy) { send({ id: message.id, error: 'Built-in AI is busy.' }); return; }
  busy = true;
  try {
    if (message.type === 'init') {
      const { getAvailableMemory, modelThreadLimit } = await import('./resource-policy.mjs');
      if (os.totalmem() < 4 * 1024 ** 3 || await getAvailableMemory() < 1.5 * 1024 ** 3) throw new Error('Built-in AI needs 4 GB total RAM and about 1.5 GB of available memory. Close unused apps and retry.');
      const fs = require('node:fs');
      const { createHash } = require('node:crypto');
      const { MODEL_SHA256, MODEL_BYTES } = await import('./model-config.mjs');
      const hash = createHash('sha256');
      let verifiedBytes = 0;
      let lastProgress = -1;
      for await (const chunk of fs.createReadStream(message.modelPath)) {
        hash.update(chunk);
        verifiedBytes += chunk.length;
        const progress = Math.floor(verifiedBytes / MODEL_BYTES * 60);
        if (progress > lastProgress) {
          lastProgress = progress;
          send({ progress: progress / 100, progressText: 'Checking built-in AI…' });
        }
      }
      if (hash.digest('hex') !== MODEL_SHA256) throw new Error('Bundled model integrity check failed. Reinstall the complete ZeroApply package.');
      runtime = await import('node-llama-cpp');
      const threads = modelThreadLimit();
      // Apple Silicon ships one combined Metal/CPU binary; zero model GPU layers
      // keeps inference on the CPU. Other platforms use their CPU-only binary.
      const gpu = process.platform === 'darwin' && process.arch === 'arm64' ? 'metal' : false;
      const llama = await runtime.getLlama({ gpu, build: 'never', skipDownload: true, maxThreads: threads });
      model = await llama.loadModel({
        modelPath: message.modelPath, gpuLayers: 0, useMmap: true,
        onLoadProgress: (progress) => send({ progress: 0.6 + 0.35 * progress, progressText: 'Loading built-in AI…' }),
      });
      context = await model.createContext({ contextSize: 4096, batchSize: 128, threads, sequences: 1 });
      send({ id: message.id, result: true });
    } else if (message.type === 'generate') {
      if (!context) throw new Error('Built-in AI is not initialized.');
      // Bound input tokens as well as output, and never reuse another answer's history.
      const systemPrompt = message.systemPrompt || '';
      const systemTokens = model.tokenize(systemPrompt);
      const promptTokens = model.tokenize(message.prompt);
      if (promptTokens.length + systemTokens.length > 3200) throw new Error('This question contains too much context. Shorten it before using built-in AI.');
      const session = new runtime.LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt });
      try {
        const answer = await session.prompt(message.prompt, { temperature: message.temperature, maxTokens: message.maxTokens });
        if (!answer.trim()) throw new Error('Built-in AI returned an empty answer. Review this question manually.');
        send({ id: message.id, result: answer });
      } finally { session.dispose({ disposeSequence: true }); }
    } else throw new Error('Unknown built-in AI command.');
  } catch (error) {
    send({ id: message.id, error: error instanceof Error ? error.message : 'Built-in AI failed.' });
  } finally { busy = false; }
}

if (port) port.on('message', (event) => void handle(event.data));
else process.on('message', (message) => void handle(message));
