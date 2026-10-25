import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { CURSOR_THEMES, getCursorSvgMarkup } from '../src/cursors';

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

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1000, height: 600 },
  });

  const flagshipTheme = CURSOR_THEMES.find(t => t.id === 'obsidian_glass')!;
  const svgMarkup = getCursorSvgMarkup(flagshipTheme);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Photorealistic Realistic AI Companion Bot Cursor</title>
      <style>
        body {
          margin: 0;
          padding: 40px;
          background: #090a0f;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        h1 {
          font-size: 26px;
          font-weight: 800;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #ffffff 0%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p {
          color: #94a3b8;
          font-size: 14px;
          margin-top: 0;
          margin-bottom: 32px;
        }
        .showcase {
          display: flex;
          gap: 32px;
        }
        .panel {
          width: 380px;
          border-radius: 20px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .panel-dark {
          background: radial-gradient(circle at top left, #1e293b, #0f172a 70%, #090d16 100%);
          border: 1px solid rgba(56, 189, 248, 0.25);
        }
        .panel-light {
          background: radial-gradient(circle at top left, #ffffff, #f1f5f9 70%, #e2e8f0 100%);
          border: 1px solid #cbd5e1;
        }
        .cursor-stage {
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          position: relative;
        }
        .cursor-stage svg {
          width: 110px;
          height: 110px;
          filter: drop-shadow(0 14px 24px rgba(0,0,0,0.35));
        }
        .panel-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .panel-dark .panel-title { color: #f8fafc; }
        .panel-light .panel-title { color: #0f172a; }
        .panel-desc {
          font-size: 12px;
          text-align: center;
          line-height: 1.5;
        }
        .panel-dark .panel-desc { color: #94a3b8; }
        .panel-light .panel-desc { color: #475569; }
      </style>
    </head>
    <body>
      <h1>xAI Grok Bot: Autonomous Cyber Copilot</h1>
      <p>Precision Pointer • Pitch-Black Orb • Front Stadium Eyes • 360° All-Direction Gaze (No Headphones)</p>
      <div class="showcase">
        <div class="panel panel-dark">
          <div class="cursor-stage">
            ${svgMarkup}
          </div>
          <div class="panel-title">Deep Space Dark Mode</div>
          <div class="panel-desc">Pure Grok Bot orb with front-facing eyes animating in all directions (front, up-right, left, down, up-left, right).</div>
        </div>
        <div class="panel panel-light">
          <div class="cursor-stage">
            ${svgMarkup}
          </div>
          <div class="panel-title">Titanium Light Surface</div>
          <div class="panel-desc">High-contrast stealth pointer and deep obsidian orb with organic saccadic eye animations.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);

  const outputPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/photorealistic_cursor_preview.png';
  await page.screenshot({ path: outputPath });
  console.log('📸 Saved preview screenshot to:', outputPath);

  await browser.close();
}

main().catch(console.error);
