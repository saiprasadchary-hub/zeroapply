# ZeroApply Android phone AI — verification report

| Area | Earlier APK | Phone AI edition |
| --- | --- | --- |
| Interface | Existing responsive ZeroApply screens | Same screens and logo |
| AI | No Android inference runtime | Native llama.cpp and Qwen2.5 1.5B Q4_K_M |
| First use | No model | Explicit reviewed start plus one-time download confirmation |
| Startup | Interface only | Model stays unloaded until Review & start AutoApply |
| LinkedIn | Manual external links | Separate in-app LinkedIn WebView and AI-assisted Easy Apply fields |
| Final submission | Manual | User reviews and submits manually |
| Stop | No phone AI | Cancels inference and releases model/context memory |
| Phone target | Interface smoke test | 64-bit phones; target 6GB RAM, check free memory/storage |

The model is 1,117,320,736 bytes and is validated with SHA-256 `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`. It downloads from the pinned Qwen revision `91cad51170dc346986eccefdc2dd33a9da36ead9` into private app storage. There is no Ollama requirement, computer connection, or remote inference endpoint. LinkedIn and optional account/cloud features still use the internet.

Runtime limits: two CPU threads, 2,048-token context, 128-token batches, 256-token maximum output and 120-second generation deadline. Startup requires at least 4GiB total memory, about 1.5GiB available memory, supported 64-bit ABI and enough storage for the model. A 6GB RAM specification alone cannot guarantee compatibility or speed across processors and Android/WebView versions.

Security changes include HTTPS-only app and LinkedIn navigation, disabled backups/mixed content/WebView debugging, no native JavaScript bridge in the remote LinkedIn WebView, password exclusion, private model storage and integrity checking, disabled bridge prompt logging, bounded inference, cancellation and user review before submission. Personal declarations and unsupported/missing facts pause for manual handling. LinkedIn security checks are completed by the user.

Seven adapter/answer-policy tests, TypeScript and web build checks pass. Both arm64-v8a and x86_64 native libraries compile, and APK signature/page alignment checks pass. Android emulator tests have passed real inference, unloaded startup, active cancellation, the installed app-to-native AI connection, model unmapping after Stop and secure LinkedIn origin checks. Fresh-process launch, blank guest profile, original mobile navigation, Resume and the Android Browser screen also pass. The final run completed successfully: [Android build and emulator verification](https://github.com/saiprasadchary-hub/zeroapply/actions/runs/37354029371). Native instrumentation completed both tests in 42.49 seconds. This is test duration, not a phone inference-speed benchmark.

Live LinkedIn sign-in, account-specific forms, resume uploads and real phone performance have not been verified. No real applications were submitted.

The AI edition uses `com.zeroapply.app.android.ai`, distinct from the first APK, to preserve the earlier installation. Profiles do not automatically transfer. It uses development signing. Production distribution and reliable updates need a stable private release signing key and an Android distribution/update channel. Google sign-in still needs Android OAuth configuration.

Source: [Android change](https://github.com/saiprasadchary-hub/zeroapply/pull/2). The original desktop source and unrelated working-tree changes were preserved.

## Tested download

- APK: `android-ai-download/ZeroApply-Phone-AI.apk`
- Size: 19,132,341 bytes (about 19 MB)
- APK SHA-256: `285fb7bdfc6a529d27df929c30aeb2d958236eb84e8f5b2f91ba79432d31b74a`
- ZIP SHA-256: `1014e292e64fce2fd1d0a1810dc2a281e0839fee396702b943fe0495a87a4eee`
- Source revision: `03d445875d7117af5ddb26655bf9893cae3cf57c`
- [Cloud artifact](https://github.com/saiprasadchary-hub/zeroapply/actions/runs/37354029371/artifacts/11364715373)
- Local screenshot: `android-ai-download/zeroapply-android.png`

The downloaded ZIP hash matches the build service's digest, and the extracted APK hash matches the build's checksum file. The screenshot shows the original ZeroApply logo/navigation, LinkedIn with phone AI screen and AI OFF status after restart.
