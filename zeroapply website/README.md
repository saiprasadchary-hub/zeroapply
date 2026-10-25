# ZeroApply website

A standalone, light-only, responsive desktop download website. Includes an animated interactive hero, clickable product preview, accessible demo dialog, platform selector, FAQ, and reduced-motion support.

## Preview

From this folder run `npm install`, then `npm run dev`. In the existing ZeroApply workspace, dependencies are already available from the parent directory, so `npm run dev` works immediately. Open http://127.0.0.1:5180.

Run `npm run build` for a production build. Deploy the resulting `dist` directory to a static host. No desktop app code or existing hosting configuration is modified.

## Connect the real installer

No installer was supplied, so the website honestly displays an availability message instead of a broken download. macOS and Linux are shown as coming soon because this repository currently packages Windows.

Place `ZeroApply-Setup.exe` in `downloads/`, then set `downloads/release.json` to:

```json
{"windows":"./downloads/ZeroApply-Setup.exe"}
```

Alternatively use your actual HTTPS installer URL. The Windows button automatically becomes a download button when configured. The interactive workspace uses clearly labeled illustrative data.

Google Fonts are optional: system fonts provide a fallback offline. Everything else is served locally. Visual direction takes inspiration from Antigravity's spacious editorial presentation, with original ZeroApply design and copy.
