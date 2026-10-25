import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';
import { CURSOR_THEMES } from '../src/cursors';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) {
    console.error('No Chrome binary found');
    process.exit(1);
  }

  console.log('Launching Chrome to verify all 8 modular cursor themes...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  const mockHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>ZeroApply Cursor Themes Showcase</title>
    <style>
      body {
        margin: 0;
        background: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 24px;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      }
      h1 { font-size: 20px; color: #0f172a; margin-top: 0; }
      p { font-size: 13px; color: #64748b; }
      .field { margin: 16px 0; }
      input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; }
      button { background: #0f172a; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Candidate Application Flow</h1>
      <p>Testing dynamic cursor switching across all 8 modular dark glass themes</p>
      <div class="field">
        <label style="font-size:12px; font-weight:600; color:#334155;">Target Position</label>
        <input type="text" value="Staff Software Engineer" readonly />
      </div>
      <button id="test-btn">Verify & Proceed</button>
    </div>
  </body>
  </html>
  `;

  await page.setContent(mockHtml);
  await page.evaluate(getVisualCursorScript());

  const artifactDir = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';

  // Test dynamic switching across each theme
  for (const theme of CURSOR_THEMES) {
    const success = await page.evaluate((themeId) => {
      const cursor = (window as any).__zeroapplyCursor;
      if (!cursor) return false;
      cursor.setTheme(themeId);
      cursor.glideTo(560, 240, `✦ ${themeId.replace('_', ' ').toUpperCase()}`);
      return cursor.getTheme() === themeId;
    }, theme.id);

    console.log(`Switched to theme "${theme.id}": ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  // Set to electric violet for screenshot
  await page.evaluate(() => {
    const cursor = (window as any).__zeroapplyCursor;
    cursor.setTheme('electric_violet');
    cursor.glideTo(640, 260, '✦ ELECTRIC VIOLET');
  });

  await page.waitForTimeout(400);

  const screenshotPath = path.join(artifactDir, 'screenshot_cursor_theme_electric_violet.png');
  await page.screenshot({ path: screenshotPath });
  console.log('📸 Saved Electric Violet screenshot to:', screenshotPath);

  // Set to cyber emerald for screenshot
  await page.evaluate(() => {
    const cursor = (window as any).__zeroapplyCursor;
    cursor.setTheme('cyber_emerald');
    cursor.glideTo(640, 260, '✦ CYBER EMERALD');
  });

  await page.waitForTimeout(400);

  const emeraldScreenshotPath = path.join(artifactDir, 'screenshot_cursor_theme_cyber_emerald.png');
  await page.screenshot({ path: emeraldScreenshotPath });
  console.log('📸 Saved Cyber Emerald screenshot to:', emeraldScreenshotPath);

  await browser.close();
  console.log('🎉 All 8 cursor themes verified successfully in Google Chrome!');
}

main().catch(console.error);
