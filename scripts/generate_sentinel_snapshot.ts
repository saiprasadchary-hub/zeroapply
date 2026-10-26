import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import {
  getCustomCombinedCursorMarkup,
  getAvatarOption,
  CURSOR_AVATAR_OPTIONS,
} from '../src/cursors';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) {
    console.error('No Chrome binary found');
    process.exit(1);
  }

  const sentinelAvt = getAvatarOption('avatar_sentinel_bot');
  console.log('Sentinel Option:', sentinelAvt);

  // Generate SVG markup
  const avatarOnlySvg = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_sentinel_bot', 'preview-sentinel-avatar', 'avatar');
  const combinedNeonSvg = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_sentinel_bot', 'preview-neon-sentinel', 'combined');
  const combinedStealthSvg = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_sentinel_bot', 'preview-stealth-sentinel', 'combined');
  const combinedCeramicSvg = getCustomCombinedCursorMarkup('pointer_orbital_ceramic', 'avatar_sentinel_bot', 'preview-ceramic-sentinel', 'combined');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Aero Sentinel Droid — Cobalt Plush Orb Showcase</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body {
          background: #060913;
          color: #f1f5f9;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .container {
          max-width: 900px;
          width: 100%;
        }
        .title {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #60a5fa;
          font-size: 16px;
          margin-bottom: 24px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        .card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .preview-box {
          width: 180px;
          height: 180px;
          background: radial-gradient(circle at center, #1e293b 0%, #090d16 100%);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scale-2x svg {
          transform: scale(2.2);
        }
        .scale-1-5x svg {
          transform: scale(1.6);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="title">Aero Sentinel Droid</div>
        <div class="subtitle">Cobalt Blue Velvet 3D Mascot Orb + Glossy Obsidian Visor + White Capsule Eyes</div>
        
        <div class="grid">
          <div class="card">
            <div class="card-title">Avatar Standalone (2.2x Scale)</div>
            <div class="preview-box scale-2x">
              ${avatarOnlySvg}
            </div>
          </div>
          <div class="card">
            <div class="card-title">Combined with Cyber Neon Aurora Delta</div>
            <div class="preview-box scale-1-5x">
              ${combinedNeonSvg}
            </div>
          </div>
          <div class="card">
            <div class="card-title">Combined with Dark Obsidian Stealth</div>
            <div class="preview-box scale-1-5x">
              ${combinedStealthSvg}
            </div>
          </div>
          <div class="card">
            <div class="card-title">Combined with Orbital Ceramic Tailless</div>
            <div class="preview-box scale-1-5x">
              ${combinedCeramicSvg}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const outputPath = path.join(
    '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6',
    'sentinel_cobalt_orb_preview.png'
  );

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 980, height: 750 },
    deviceScaleFactor: 2,
  });

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath });
  await browser.close();

  console.log(`Saved screenshot to: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
