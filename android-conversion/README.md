# ZeroApply Android APK — existing mobile view

This build packages `src/App.tsx` and the existing responsive React interface in Capacitor 8.5.2. It reuses the Persona, Resume, Profile, Notifications and account UI; it does not replace them with the separate `mobile/` companion.

Build-only adapters blank the seeded developer profile in App and PersonaManager, block desktop AutoApply before AI/browser startup, and replace Electron's browser component with an explanatory screen and manual job-site links. Desktop source files are unchanged. Google sign-in requires native Android OAuth setup; email sign-in and guest mode remain available. Resume Studio opens a blank candidate resume; Load Demo remains an explicit action. Android does not include the desktop model, Node runtime or Electron process. Resume editing, login, cloud sync and export require further device/backend checks beyond the emulator smoke test.

## Build

From the repository root:

```sh
npm ci
node --test android-conversion/test/adapters.test.mjs
npx vite build --config android-conversion/vite.config.ts
npm ci --prefix android-conversion --ignore-scripts
cd android-conversion
npx cap add android
cd android
./gradlew assembleDebug --no-daemon
```

Use Node 22+, Java 21 and Android SDK 36. The GitHub workflow additionally applies the existing logo, disables Android backups/cleartext traffic, verifies the APK signature and exercises guest login and the existing mobile navigation on an emulator.

The resulting APK is installable and uses a development signing certificate. It is not a Google Play production release. A stable private release signing key is required before distributing updates: successive debug builds from different clean runners can have different certificates. Never commit signing keys. Desktop automatic updates do not manage Android updates.
