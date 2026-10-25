# ZeroApply Android

Installable Android companion using a bundled React interface and Capacitor 8.

## Included

- ZeroApply branding, accessible touch controls and bottom navigation.
- Blank profiles, device-local saving and email/verified-account authentication.
- Explicit profile upload/download to the existing Firebase account.
- PDF, DOCX and TXT resume text import, maximum 10 MB.
- Account application tracking with guest mode available offline.
- No Electron process, desktop browser agent or model weights in the APK.

AutoApply and the desktop local LLM are not implemented on Android. The About screen states this clearly. The app does not automatically apply to jobs or load AI.

## Build

From the repository root, install the locked web dependencies with `npm ci`, then run `npx vite build --config mobile/vite.config.ts`.

Install the Android framework with `npm install --prefix mobile --ignore-scripts`. From `mobile`, run `npx cap add android` once, or `npx cap sync android` after web changes. Use Java 21 and Android SDK 36. From `mobile/android`, run `./gradlew assembleDebug`.

The GitHub Android workflow builds an APK, checks its signature, and launches it in an Android emulator. Its artifact includes the APK, checksum and test screenshot. This first APK uses Android's development signing certificate. A stable privately held production signing key and increasing version codes are required before offering reliable updates or publishing to Google Play. Do not commit keystores or passwords.

## Privacy and updates

Guests keep profile and resume text on the device. Signed-in users send that data to their account only on Save. Loading a cloud profile is an explicit action. Account application tracking subscribes to the authenticated user's applications. Android backups and cleartext traffic are disabled. The APK contains its UI locally; this build does not silently replace executable code from a website. App changes require a new APK or, after publication, a store update.

Android device testing of sign-in, cloud permissions, document formats and large text remains required before a public release. Emulator startup checks do not verify every phone or backend account configuration.
