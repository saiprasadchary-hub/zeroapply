# ZeroApply Android with phone-local AI

Packages the existing responsive `src/App.tsx` interface with Capacitor 8.5.2. Persona, Resume, Profile, Notifications and account screens remain shared with the desktop source. Android build adapters start with an empty candidate profile and resume. Native Google sign-in requires the Firebase Android OAuth configuration; email sign-in and guest mode use the existing Firebase service.

The native Android plugin uses a pinned llama.cpp runtime and Qwen2.5 1.5B Q4_K_M model. The full APK includes the model; **Review & start AutoApply** verifies and copies it into private app storage on first use. Builds without bundled assets retain the confirmed first-use download fallback. App launch, status observation, opening LinkedIn and generation requests cannot start the model. The 1,117,320,736-byte download is checked against its pinned SHA-256 before loading. No Ollama, desktop connection or remote inference service is required. LinkedIn itself requires internet access.

The AI session uses at most two CPU threads and a 2,048-token context. Startup checks available memory and storage. Stop, browser close, backgrounding and activity destruction cancel generation and unload model/context resources. Moving into the resume picker temporarily preserves the active session. Supported builds include arm64-v8a and x86_64; 6GB RAM is a target, not a guarantee for every phone.

The Browser tab embeds an isolated Chromium WebView with an address/search bar, history controls, saved cookies, cross-site redirects and login popups. It accepts HTTP/HTTPS websites and provides Open in Chrome for providers that block embedded sign-in. The remote WebView has no JavaScript-to-native bridge; automatic form filling remains restricted to secure LinkedIn pages. Password fields are excluded from scanning. The workflow fills supported Easy Apply text/select fields using candidate facts and phone-local AI, then advances Next/Review steps. Missing facts, personal declarations, security checks, file uploads and unsupported controls require user handling. The user reviews and submits the final application manually. Live LinkedIn account flows need device verification.

## Build and verification

Use Node 22+, Java 21, Android SDK 36, NDK 28.2.13676358 and CMake 3.22.1. The workflow installs dependencies, checks answer policy/adapters/types, builds the existing web view, generates the native Android project, applies branding/privacy settings and fetches llama.cpp at commit `8e1642198dcd4e408f8776222d6ae31b74d01187`. It compiles both APKs and verifies the app signature. An emulator runs actual native inference with the pinned model, checks Stop behavior and secure LinkedIn origins, and exercises login/guest/navigation screens.

See `.github/workflows/android-conversion.yml` for the complete reproducible build. Generated `android/`, model files and signing keys are excluded from source control.

The AI edition uses application ID `com.zeroapply.app.android.ai` so it can coexist with the first interface-only APK, whose clean-runner development signing certificate cannot support a reliable in-place update. Profiles are not automatically migrated between editions. These APKs use development signing. A stable private release key and Android distribution/update setup are required before production releases; desktop automatic updates do not update Android APKs. Never commit a signing key.

## Bundled model and real Android login/browser

Run `node android-conversion/bundle-model.mjs` after downloading the pinned model and preparing/syncing Android. The script checks size and SHA-256 before bundling the GGUF without compression. First AI startup copies and verifies the asset into private storage, without a network download. The phone needs about 1.6 GB free for this copy in addition to the installed APK.

The existing browser selector is retained. Real Chrome opens installed Chrome (or the system browser if Chrome is absent), with its normal login session. Automatic filling requires the in-app browser because the existing bridge cannot control external Chrome tabs. The app uses the shared responsive interface.

Google login uses Android Credential Manager, then exchanges its Google ID token with the existing Firebase authentication service. Register `com.zeroapply.app.android.ai` in Firebase, register the APK signing SHA-1/SHA-256, enable Google authentication, and put matching `google-services.json` in `android-conversion/android/app/`. The Google Services plugin supplies `default_web_client_id`. Email/password and verification keep using the existing Firebase service.

The 1.0.2 APK was compiled and verified on an Android 15 emulator, including login-fixture session cookies, redirects and popups. Real third-party account sign-in still needs device verification. See `../audits/android-browser-2026-10-06/report.md`.

The local full build now has Firebase Android app `1:233558169610:android:599636a5e42bc23942a7f3`, with OAuth configuration retained under `firebase/google-services.json`. Its local development signing key is retained under `.keys/zeroapply-android.jks` and excluded from Git. Preserve that key for compatible local updates. CI requires the matching key supplied securely; a new random key must have its own Firebase signing fingerprints registered.
