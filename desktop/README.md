# Built-in AutoApply model

The complete desktop installer includes Qwen2.5 1.5B Instruct Q4_K_M and the native llama.cpp runtime. Users do not install Ollama. The renderer never loads model weights. Only the persona's reviewed AutoApply start handler requests model startup; observations do not start inference. AutoApply awaits readiness before processing application forms.

Inference runs in an Electron utility process with a maximum of two CPU threads and bounded memory/context/output. It stops when the run completes, is cancelled, fails, or the renderer closes/reloads. A low-memory computer receives an actionable error rather than starting inference.

For development, run `npm run model:download` once, then `npm run electron:dev`. The downloader pins the official model revision and verifies SHA-256. The model is about 1.1 GB and is ignored by Git. Production packaging includes it through `extraResources`. Build Windows installers on Windows so native binaries match the target. Native binaries stay outside ASAR; service source stays inside it.

Validation commands:

- `npm run test:embedded-llm`: lifecycle, concurrency, startup gating, cancellation.
- `npm run test:embedded-llm:inference`: real local model answers and resource cleanup.
- `electron scripts/verify-electron-model.cjs`: Electron utility-process inference.
- Packaged executable with `--verify-bundled-model`: verify installed model/runtime offline, then exit.

The explicit verification flags are for release checks. Normal app launch remains idle. Small-PC response speed varies; require at least 4 GB RAM and approximately 1.5 GB available memory before model startup.

Model source: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
Runtime integration: https://node-llama-cpp.withcat.ai/guide/electron
