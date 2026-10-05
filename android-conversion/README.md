# ZeroApply Android with phone-local AI

Packages the existing responsive `src/App.tsx` interface with Capacitor 8.5.2. Persona, Resume, Profile, Notifications and account screens remain shared with the desktop source. Android build adapters start with an empty candidate profile and resume. Google sign-in still needs Android OAuth setup; email sign-in and guest mode are available.

The native Android plugin uses a pinned llama.cpp runtime and Qwen2.5 1.5B Q4_K_M model. The model downloads once into private app storage after **Review & start AutoApply** and a first-use download confirmation. App launch, status observation, opening LinkedIn and generation requests cannot start the model. The 1,117,320,736-byte download is checked against its pinned SHA-256 before loading. No Ollama, desktop connection or remote inference service is required. LinkedIn itself requires internet access.

The AI session uses at most two CPU threads and a 2,048-token context. Startup checks available memory and storage. Stop, browser close, backgrounding and activity destruction cancel generation and unload model/context resources. Moving into the resume picker temporarily preserves the active session. Supported builds include arm64-v8a and x86_64; 6GB RAM is a target, not a guarantee for every phone.

LinkedIn opens in a separate HTTPS-only WebView without a JavaScript-to-native bridge. Password fields are excluded from scanning. The workflow fills supported Easy Apply text/select fields using candidate facts and phone-local AI, then advances Next/Review steps. Missing facts, personal declarations, security checks, file uploads and unsupported controls require user handling. The user reviews and submits the final application manually. Live LinkedIn account flows need device verification.

## Build and verification

Use Node 22+, Java 21, Android SDK 36, NDK 28.2.13676358 and CMake 3.22.1. The workflow installs dependencies, checks answer policy/adapters/types, builds the existing web view, generates the native Android project, applies branding/privacy settings and fetches llama.cpp at commit `8e1642198dcd4e408f8776222d6ae31b74d01187`. It compiles both APKs and verifies the app signature. An emulator runs actual native inference with the pinned model, checks Stop behavior and secure LinkedIn origins, and exercises login/guest/navigation screens.

See `.github/workflows/android-conversion.yml` for the complete reproducible build. Generated `android/`, model files and signing keys are excluded from source control.

The AI edition uses application ID `com.zeroapply.app.android.ai` so it can coexist with the first interface-only APK, whose clean-runner development signing certificate cannot support a reliable in-place update. Profiles are not automatically migrated between editions. These APKs use development signing. A stable private release key and Android distribution/update setup are required before production releases; desktop automatic updates do not update Android APKs. Never commit a signing key.
