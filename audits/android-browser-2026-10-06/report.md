# Android browser update — 1.0.2

Replaced the Android Browser tab's LinkedIn instruction panel with an isolated Chromium WebView showing website content directly. Added website/search input, history, reload/stop, popup dismissal, and Open in Chrome. Kept existing shared header and mobile bottom navigation; applied Android system insets and clipped native website content above the bottom navigation. Native browser is hidden when other app tabs are active.

Website support: HTTP/HTTPS navigation across hosts, JavaScript and DOM storage, persistent first- and third-party cookies, authentication popup opener/close handling, and site-requested file uploads including multiple files. Secure-connection failures remain blocked. Remote websites receive no Capacitor/native bridge. AutoApply script evaluation remains restricted to secure LinkedIn documents. External browser sessions remain separate from embedded website sessions.

Google and other identity providers may disallow embedded authentication. Open in Chrome uses the phone's real browser for those sites; this does not transfer Chrome cookies back into the app. No claim of universal website login compatibility. ZeroApply's own Firebase Google login uses the existing native Credential Manager configuration.

Artifact: `android-ai-download/ZeroApply-Full-LLM.apk`, 1,138,139,351 bytes, package `com.zeroapply.app.android.ai`, versionCode 3, versionName 1.0.2. Same signing certificate as the preceding full APK, verified by an in-place emulator update. APK SHA-256: `d9cf30fef96caf37dc1d32468bc29c42684dec2f9abd9b8e9b8973b37518c242`.

The unchanged Qwen2.5 1.5B GGUF model is bundled uncompressed, 1,117,320,736 bytes. Native arm64 and x86_64 runtimes are retained. Signature v2 and 16KB zip alignment verification passed.

Validation:
- Android TypeScript type check passed.
- Eight adapter/profile-answer tests passed.
- Android APK and instrumentation APK builds passed.
- Two native browser tests passed on Android 15: website URL validation and a real HTTP login fixture with form submission, HttpOnly persistent session cookie, redirects between 127.0.0.1 and localhost, reopen retaining login, popup returning to its opener, hidden browser pane, and remote native bridge isolation.
- Mobile UI smoke passed with existing guest persona, Resume, navigation, and browser address bar. Visual check confirmed real LinkedIn content, unobscured app header and bottom navigation. Screenshot in this directory.
- No real third-party account credentials were used. Local LLM inference was not rerun for this browser-only update.
