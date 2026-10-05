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

A local Apple Silicon preview installer has been built and verified: `release_build/ZeroApply-1.0.0-arm64-Preview.pkg` (approximately 1.2 GB). Double-click it to install ZeroApply into Applications. The package includes the app, brand icon, native AI runtime, and 1.1 GB GGUF weights. A SHA-256 checksum is saved beside it. It is unsigned and not notarized, so it is for local testing rather than public distribution. Windows and Intel macOS artifacts must be built by their native CI runners. No public release has been published in this session.

## One-time release setup

Connect the GitHub plugin, and add these repository Actions secrets using GitHub's settings (do not paste private certificates/passwords into chat):

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
