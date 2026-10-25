# Security and built-in model check — 5 October 2026

| Area | Before | After |
|---|---|---|
| Dependency findings | 21 affected packages, including one critical | Zero findings in the installed dependency set and updated lockfile |
| Desktop requests | Local frames could pass sender checks | Exact app origin and main-frame identity required |
| Embedded browser | Security preferences could depend on supplied values | Web security enforced; insecure content, subframe/worker Node, and experimental features disabled |
| Hosting headers | Protective headers missing | MIME, framing, referrer and HTTPS headers configured; not deployed |
| Content security policy | JavaScript unsafe-eval allowed | unsafe-eval removed; WebAssembly support retained for PDF processing |
| Local inference | Ollama auto-started at app launch; built-in fallback returned placeholders | Official quantized Qwen2.5 1.5B model and native llama.cpp runtime bundled; no Ollama required |
| Start timing | Header polling and desktop startup could wake the engine | Model starts only through the reviewed AutoApply start handler; status reads are passive |
| Smaller computers | No bounded model lifecycle | Separate process, at most two CPU threads, one request at a time, 4,096-token context, memory checks, startup/generation timeouts |
| Cleanup | Background daemon could persist | Process stops on cancellation, completed run, failure, page readiness timeout, renderer reload/crash, window close and app quit |
| Model integrity | Incomplete browser-model download script | Pinned official model revision, exact size and SHA-256 verified before installation and before loading |
| Builds | Model copies filled the disk during renderer build | Renderer build excludes native model files; installer includes one model copy as a resource |

## Validation

Typecheck and all 28 configured test suites passed. Lint completed with existing warnings. The production renderer build passed with existing bundle-size warnings. Native inference returned grounded answers for two fictional applicant questions with isolated histories; the inference process unloaded afterward. The same model ran in an Electron utility process. An unsigned local macOS package was built and inspected to confirm model resources, native binaries and the service files were included. Real inference from the packaged app also passed using its included weights and native binaries, without Ollama or model downloads. The temporary unsigned macOS test package was removed afterward to recover disk space.

The ATS sample was updated to include a complete phone number and explicit skills in the resume document, matching the current document-only scorer. The renderer recovery test now checks that reload and crashes stop the model.

## Model and distribution

The model file is 1,117,320,736 bytes (about 1.1 GB), Qwen2.5-1.5B-Instruct Q4_K_M. It is downloaded into `public/models/zeroapply` for development and copied to the desktop installer's `resources/models` directory. Users of the complete desktop installer need no model download or Ollama installation. Model inference has no network API. First loading can take tens of seconds on a busy or slower computer; progress and cancellation keep the interface usable. The runtime requires at least 4 GB total RAM and about 1.5 GB available memory, otherwise it refuses to load and asks the user to close unused apps.

Windows release packaging now runs on Windows to include matching native binaries. The signed-release workflow downloads and verifies the model, runs project checks, builds the installer, and runs both UI and packaged-model verification before publishing. Windows packaging was not run on this macOS host. No release or hosting deployment was published during this work.

This is a source and dependency review, not a penetration test or live-service audit. Firestore ownership rules were inspected, not emulator-tested; live authentication and low-end Windows performance remain unmeasured.

Sources: [Official Qwen model](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), [llama.cpp Electron packaging](https://node-llama-cpp.withcat.ai/guide/electron), [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security), [Firebase hosting headers](https://firebase.google.com/docs/hosting/full-config#headers).
