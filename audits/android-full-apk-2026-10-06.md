# ZeroApply full Android APK — 6 October 2026

Artifact: `android-ai-download/ZeroApply-Full-LLM.apk` (1,137,519,606 bytes, version 1.0.1, application ID `com.zeroapply.app.android.ai`).

The app packages the shared responsive interface, a pinned native llama.cpp runtime, and the complete 1,117,320,736-byte Qwen2.5 1.5B Q4_K_M model. Model extraction into private storage is deferred until the reviewed AI start action. The default external browser choice opens installed Chrome, with the system browser as a fallback. Automatic application form filling requires the in-app browser because external Chrome tabs are not controllable through the current bridge.

Firebase Android app registration was created in the existing `zero-apply` project, with the APK signing SHA-1 and SHA-256 registered. The downloaded OAuth configuration matches this Android package and certificate. A server-side configuration read confirmed email/password and Google login are enabled, and the Google OAuth client matches the APK. Real-account sign-in still requires device verification.

Completed checks:
- Seven Android source/policy tests passed.
- Android TypeScript check and shared web production build passed.
- Both ARM64 and x86-64 native libraries and Android Java compiled successfully; test APK compiled.
- APK v2 signature verified and matches the registered Firebase fingerprint.
- APK ZIP alignment passed; every native library supports 16 KB pages.
- GGUF inside the APK is stored uncompressed, has the expected size, and matches SHA-256 `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`.
- APK SHA-256: `0d45537e0eb378c33e27083c9c6e92ff531ddb1f0b1ecfe45cef403246e7a00a`.

Emulator installation, interface smoke checks, native inference and cancellation verification are pending while the system image downloads. This APK uses a locally retained development signing key, not a production distribution key.
