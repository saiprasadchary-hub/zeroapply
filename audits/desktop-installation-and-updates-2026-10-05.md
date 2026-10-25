# ZeroApply installers and updates

| Area | Before | After |
|---|---|---|
| Branding | ZeroApply Desktop / legacy setup | ZeroApply name, existing logo, Windows ICO and macOS ICNS |
| Windows installer | Separate Inno installer | Standard NSIS Setup compatible with in-app updates |
| macOS | No production release job | Apple Silicon and Intel DMG + ZIP release jobs |
| Updates | Opens a GitHub webpage | In-app check, download progress, and explicit Restart & update |
| Release delivery | Windows tag release only | Signed release pipeline on main changes and manual runs |
| AutoApply protection | No updater activity guard | Download/restart blocked during AutoApply and AI startup/use |
| Small PCs | 8 GB JavaScript heap limit and experimental GPU switch | 2 GB heap limit; experimental GPU switches removed |
| AI setup | Legacy optional setup action | Bundled verified GGUF; no Ollama installation; model remains idle until Review & start AutoApply |

The release channel is the public GitHub Releases server for `saiprasadchary-hub/zeroapply`. No GitHub token is shipped to users. Release metadata and installers are published together only after every platform passes packaging and verification. macOS architecture feeds are merged so each Mac downloads its matching update. App data is stored outside the installed app and survives updates.

Automatic checks run after startup and every six hours while AI/AutoApply is idle. Download and installation require a user click. Offline errors leave the installed version usable. Preview builds explicitly disable public update installation; signed release builds enable it. The standard updater verifies download hashes and operating-system signatures. Website-only deployments do not replace desktop binaries: desktop changes must pass the desktop release workflow.

## Current distribution status

A local Apple Silicon preview installer has been built and verified: `release_build/ZeroApply-1.0.0-arm64-Preview.pkg` (approximately 1.2 GB). Double-click it to install ZeroApply into Applications. The package includes the app, brand icon, native AI runtime, and 1.1 GB GGUF weights. A SHA-256 checksum is saved beside it. It is unsigned and not notarized, so it is for local testing rather than public distribution. Windows and Intel macOS artifacts must be built by their native CI runners. No public release has been published in this session. The user chose previews first because signing certificates are not yet available. Draft PR #1 builds unsigned Windows x64 and both macOS architectures through GitHub Actions; previews explicitly keep live updates disabled.

## One-time release setup

GitHub is connected and repository publishing access is verified. The tested app snapshot is available in draft pull request https://github.com/saiprasadchary-hub/zeroapply/pull/1, with Windows and macOS preview builds running. Before publishing a signed production release, configure/verify these repository Actions secrets in GitHub settings (do not paste private certificates/passwords into chat):

- `WINDOWS_SIGN_CERT_BASE64`, `WINDOWS_SIGN_CERT_PASSWORD`: trusted Windows code-signing PFX and password.
- `MAC_SIGN_CERT_BASE64`, `MAC_SIGN_CERT_PASSWORD`: Developer ID Application certificate P12 and password.
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`: Apple notarization credentials.

The release channel must be publicly readable. Preserve signing identities between releases so existing installations accept updates. Enable GitHub Actions and push the reviewed desktop changes to main, or run **ZeroApply Desktop Release** manually. The workflow creates version `1.0.(1000 + run number)`, builds Windows x64, macOS Apple Silicon, and macOS Intel, verifies them, and publishes a stable release. Every subsequent successful run becomes the latest update. Missing signing secrets fail the release rather than publishing an unsigned production app.

## Validation

- All 28 existing regression suites passed.
- Four new updater tests passed: passive/deduplicated checks, explicit install, busy AutoApply guards, unsigned preview restrictions, and offline recovery.
- Intel/Apple Silicon update metadata merge verified against representative builder feeds.
- Type checking and renderer build passed; existing build/lint warnings remain.
- Dependency audit after adding updater: 0 reported vulnerabilities.
- Packaged macOS startup smoke check passed.
- Final packaged built-in AI inference passed (Hyderabad answer).
- Package payload verified to include the executable, icon, native runtime and GGUF; installer SHA-256 recorded.
- Local DMG construction exceeded temporary free disk space; the local preview uses a PKG installer. CI still produces standard DMG + ZIP releases.
- Existing whitespace issues remain in unrelated working changes; new updater files lint clean.

## Sources

- [electron-builder v26 automatic updates](https://www.electron.build/v26/docs/features/auto-update/)
- [electron-builder v26 macOS signing and notarization](https://www.electron.build/v26/docs/mac/)
- [GitHub runner architectures](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

## Verified preview downloads

GitHub Actions run https://github.com/saiprasadchary-hub/zeroapply/actions/runs/37273120536 completed successfully for Windows x64, macOS Intel and macOS Apple Silicon on 5 October 2026. Every platform passed app checks, installer packaging, packaged startup and actual bundled AI inference. Public publishing was intentionally skipped because previews were requested. Preview version: 1.0.1004.

| Platform | Download | Contents |
|---|---|---|
| Windows x64 | https://github.com/saiprasadchary-hub/zeroapply/actions/runs/37273120536/artifacts/11329133740 | ZIP containing ZeroApply Setup.exe |
| macOS Apple Silicon | https://github.com/saiprasadchary-hub/zeroapply/actions/runs/37273120536/artifacts/11329408303 | ZIP containing DMG installer and app ZIP |
| macOS Intel | https://github.com/saiprasadchary-hub/zeroapply/actions/runs/37273120536/artifacts/11329751957 | ZIP containing DMG installer and app ZIP |

Sign in to GitHub to download Actions artifacts. Extract the downloaded archive; run Setup.exe on Windows, or open the DMG and drag ZeroApply into Applications on Mac. Both Mac archives include DMG and ZIP copies and are approximately 2.5 GB; the Windows archive is approximately 1.4 GB. These are unsigned previews and may show operating-system security prompts. Artifact retention expires on 3 January 2027. The local Apple Silicon PKG remains available as a smaller alternative.

## Launchpad installation fix

The original local PKG allowed bundle relocation, and macOS reused the build copy in Downloads instead of installing into Applications. The app was copied into `/Applications/ZeroApply.app`, registered with Launch Services and opened. The PKG was rebuilt with relocation disabled; package metadata confirms `relocatable="false"` and `install-location="/Applications"`. Both the original preview download path and the Launchpad-Fix path now contain the corrected installer. Reproduce with `node scripts/build-mac-preview.cjs` after packaging the macOS app. Launchpad visual inspection was unavailable because the computer-use service timed out.

## Startup repair (5 October 2026)

Observed a development Electron window on localhost:5173 stuck on Initializing ZeroApply. Development and installed apps shared a single-instance session directory. Source fixes now give development its own directory and bound auth restoration to five seconds, handle auth errors/restricted local storage, and cancel fallback timers on restore or unmount. The running development app reached its dashboard after the fix, with AI standby. Type checking, build, two startup timer tests, auth policy, renderer recovery, and security checks passed.

A small repair package is available at `release_startup_fix/ZeroApply-Startup-Fix.pkg` (81 MB). It updates only `Contents/Info.plist` and `Contents/Resources/app.asar`; the executable and unpacked native dependencies were verified identical to the installed copy. The existing AI model remains unchanged. Installer metadata verifies the exact Applications target. Obsolete local full preview installers were removed to recover space; GitHub preview artifacts remain available.

The installed app has NOT yet received this repair: macOS permissions prevented replacing the installer-owned app. The repair is open in Installer at Install. The user must approve the installation using macOS administrator authentication. Automatic approval also rejected opening the unsigned app and quitting the running Electron development copy (possible unsaved state); these actions were not bypassed. Quit that development copy after saving work, then open the installed ZeroApply app after repairing it. Public trusted releases still require Apple signing/notarization credentials. Startup fixes were pushed to the existing PR branch in commit bf5e786c9c5a4930b4cc33ab33b6ff456056cea5.
