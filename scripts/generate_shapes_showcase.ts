import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { CURSOR_THEMES, getCursorSvgMarkup } from '../src/cursors';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) process.exit(1);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 750 },
  });

  const cardsHtml = CURSOR_THEMES.map((theme) => {
    const svgMarkup = getCursorSvgMarkup(theme);
    return `
      <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="width: 72px; height: 72px; background: #09090b; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; border: 1px solid #27272a;">
          ${svgMarkup}
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #18181b; margin-bottom: 4px;">${theme.name}</div>
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 9999px; background: ${theme.badgeBg}; border: 1px solid ${theme.badgeBorder}; color: ${theme.badgeTextColor}; margin-bottom: 8px;">
          ${theme.tag}
        </div>
        <div style="font-size: 11px; color: #71717a; line-height: 1.4;">${theme.description}</div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ZeroApply Cursor Shapes Showcase</title>
      <style>
        body {
          margin: 0;
          padding: 40px;
          background: #f4f4f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .header h1 {
          font-size: 24px;
          font-weight: 800;
          color: #18181b;
          margin: 0 0 8px 0;
        }
        .header p {
          font-size: 14px;
          color: #71717a;
          margin: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✦ 8 Distinct Visual Cursor Archetypes</h1>
        <p>Each cursor possesses custom geometry, purpose-built silhouettes, and distinct interactive dynamics.</p>
      </div>
      <div class="grid">
        ${cardsHtml}
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);

  const artifactDir = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';
  const outputPath = path.join(artifactDir, 'screenshot_cursor_shapes_grid.png');
  await page.screenshot({ path: outputPath });
  console.log('📸 Saved shapes showcase grid to:', outputPath);

  await browser.close();
}

main().catch(console.error);
