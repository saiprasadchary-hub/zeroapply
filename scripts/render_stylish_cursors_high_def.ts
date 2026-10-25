import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { getCustomCombinedCursorMarkup } from '../src/cursors';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) process.exit(1);

  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });

  const ceramicPtr = getCustomCombinedCursorMarkup('pointer_orbital_ceramic', 'avatar_grok_bot', 'close-1', 'cursor');
  const starlightPtr = getCustomCombinedCursorMarkup('pointer_obsidian_starlight', 'avatar_grok_bot', 'close-2', 'cursor');
  const ceramicGrok = getCustomCombinedCursorMarkup('pointer_orbital_ceramic', 'avatar_grok_bot', 'close-3', 'combined');
  const starlightCloud = getCustomCombinedCursorMarkup('pointer_obsidian_starlight', 'avatar_cloud_bot', 'close-4', 'combined');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          padding: 40px;
          background: #090d16;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 250px);
          gap: 20px;
        }
        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .card.light {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #0f172a;
        }
        .preview-box {
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-title {
          font-size: 13px;
          font-weight: 600;
          text-align: center;
        }
        .card-tag {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 999px;
          background: #1e293b;
          color: #94a3b8;
        }
        .card.light .card-tag {
          background: #e2e8f0;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <div class="title">ZeroApply Stylish Cursors — High-Definition Vector Rendering</div>
      <div class="grid">
        <div class="card">
          <div class="preview-box">
            <div style="transform: scale(2.6);">${ceramicPtr}</div>
          </div>
          <div class="card-title">Orbital Nova Ceramic</div>
          <div class="card-tag">Pointer Only • 3D Metallic Orbit & Pearl</div>
        </div>

        <div class="card">
          <div class="preview-box">
            <div style="transform: scale(2.6);">${starlightPtr}</div>
          </div>
          <div class="card-title">Obsidian Celestial Starlight</div>
          <div class="card-tag">Pointer Only • Violet Rim & Starlight Flare</div>
        </div>

        <div class="card">
          <div class="preview-box">
            <div style="transform: scale(2.4);">${ceramicGrok}</div>
          </div>
          <div class="card-title">Orbital Ceramic + Grok Bot</div>
          <div class="card-tag">Combined Rig • 360° Saccadic Gaze</div>
        </div>

        <div class="card light">
          <div class="preview-box">
            <div style="transform: scale(2.4);">${starlightCloud}</div>
          </div>
          <div class="card-title">Celestial Starlight + Cloud Bot</div>
          <div class="card-tag">Combined Rig • Light Canvas Mode</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/stylish_cursors_high_def_preview.png';
  await page.screenshot({ path: outPath });
  console.log('Saved high-def preview to:', outPath);
  await browser.close();
}

main().catch(console.error);
