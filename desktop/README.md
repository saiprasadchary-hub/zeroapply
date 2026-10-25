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

## Google sign-in in Chrome

The desktop Google button opens a local ZeroApply sign-in page in installed Google Chrome. After Google authentication, a short-lived callback sends the Google credential directly to the desktop app, which verifies it through Firebase and persists its own session. The app comes to the foreground after the handoff. Cancel and a five-minute timeout close the callback listener. Job-site sign-in sessions remain independent.

Enable Google as a provider in Firebase Authentication and include `localhost` under Authentication → Settings → Authorized domains for project `zero-apply`. The browser page displays an authorization error if this domain is missing. No website deployment or custom URL protocol is required; the sign-in page is bundled with the desktop app. Chrome is required for desktop Google sign-in. Email sign-in continues through the existing form.

Verification: `node --test test/browser_auth_handoff.test.mjs`. A real Google-account sign-in should also be checked in the desktop app with the project's Firebase configuration; callback tests do not authenticate a live account.

The embedded agent browser keeps Google pages and new tabs inside ZeroApply. All embedded browser tabs and their authentication popups share `persist:zeroapply_auth`, so a website session established there persists across tabs and app restarts. Chrome-based ZeroApply account login authenticates Firebase; it does not establish Google website cookies in Electron. The built-in browser's Google account chooser only shows accounts signed into that browser session. Google may reject embedded sign-in with `disallowed_useragent`; an OAuth identity token cannot be converted into Google website cookies.

Direct Google website **Sign in** and **Add account** links from embedded Google pages open their original Google authentication URL in Chrome. New tabs, search, and third-party OAuth popup callbacks stay inside their original browsing context. This routing is not a Google website session transfer: unlike ZeroApply's Firebase sign-in, the Google website authentication endpoint does not supply the app's loopback callback. Users return manually; Google website cookies established in Chrome remain there.
