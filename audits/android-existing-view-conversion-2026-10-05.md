# ZeroApply Android conversion — 5 October 2026

The requested conversion uses the existing desktop app's responsive mobile interface (`src/App.tsx`) in a Capacitor Android shell. It does not substitute the separate companion in `mobile/`.

| Before | After |
| --- | --- |
| Mobile layout available only in the web/desktop renderer | Existing layout bundled for an installable Android APK |
| Electron browser required by Browser tab | Android explanatory screen with manual job-site links |
| Desktop AutoApply would attempt unavailable IPC | Build guard reports the limitation before AI or browser startup |
| Developer profile seeded into App and PersonaManager | Fresh Android profiles start blank |
| Resume Studio auto-loaded a demo | Android opens a blank candidate resume; explicit Load Demo retained |
| Web Google popup sign-in shown on Android | Clear setup message; email and guest entry retained |
| Android template logo | Existing ZeroApply logo in launcher and app |

Source: `android-conversion/` and `.github/workflows/android-conversion.yml`. Changes are isolated from desktop source files and from the separate companion scaffold. Draft PR: https://github.com/saiprasadchary-hub/zeroapply/pull/2.

Local validation: four adapter tests passed; TypeScript check and converted web build passed. A phone-sized browser check opened guest mode with a blank profile, existing Resume Studio and Android browser explanation. AI stayed off. Android dependency audit reported zero vulnerabilities after updating Capacitor to 8.5.2 and locking the patched UUID build dependency.

Android builds: the initial build encountered duplicate template icon resources; fixed by retaining the adaptive icon XML resources and replacing density-specific PNGs. The next build compiled the APK and verified its Android signature. Final Android run 37291394408 passed every step, including signature verification, zero-vulnerability dependency audit and emulator install/login/guest-profile/Resume/browser-navigation checks. Download: https://github.com/saiprasadchary-hub/zeroapply/actions/runs/37291394408/artifacts/11337300659. APK saved at android-download/ZeroApply-Android.apk (6,117,837 bytes; approximately 5.8 MiB). APK SHA-256: dcb35790f261d93a61cf739344a492685064570aefc1c45e972b6640a3efb567. The downloaded artifact ZIP hash and included APK checksum both match. Emulator screenshot is android-download/zeroapply-android.png.

The successful build commit is 9e3c771f78b809d01802bf812589e32025786663. Emulator runner hardware acceleration was enabled on the ephemeral CI machine; no Mac security settings were changed.

This APK uses Android development signing. Production updates require a stable privately held release key; debug certificates from clean CI runners may differ. Google Play publication is not performed. Desktop auto-updates do not update Android. Android AutoApply, embedded desktop LLM and native Google OAuth are not implemented. Real-device sign-in, backend permissions, resume file import/export and keyboard interactions remain to be tested.
