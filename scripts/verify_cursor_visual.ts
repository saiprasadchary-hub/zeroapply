import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';
import { getLiveAgentLightHudScript } from '../src/agent/ui/liveAgentLightHUD';

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

  console.log('Launching Chrome to verify dark glass cursor rendering...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  // Track any console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('🔴 Page Console Error:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error('🔴 Page Uncaught Exception:', err.message);
  });

  // Load a test mock page with a simulated LinkedIn job modal
  const mockHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Mock LinkedIn Easy Apply</title>
    <style>
      body {
        margin: 0;
        background: #f3f2ef;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal {
        background: white;
        border-radius: 8px;
        width: 600px;
        padding: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .field {
        margin-bottom: 16px;
      }
      label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      input, select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
      }
      .btn {
        background: #0a66c2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 16px;
        font-weight: 600;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="backdrop">
      <div class="modal">
        <h2>Apply to Neosilica Energy</h2>
        <div class="field">
          <label>Willingness to Travel to customer location *</label>
          <select id="travel-select">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <button class="btn" id="next-btn">Next Step</button>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(mockHtml);

  // Inject Cursor & HUD
  await page.evaluate(getVisualCursorScript());
  await page.evaluate(getLiveAgentLightHudScript());

  // Test cursor movement and clicking
  await page.evaluate(() => {
    if ((window as any).__zeroapplyHUD) {
      (window as any).__zeroapplyHUD.setJob('AI Automation Engineer', 'LinkedIn (Live)');
      (window as any).__zeroapplyHUD.setStep(3, 5, 'Additional Questions');
      (window as any).__zeroapplyHUD.setQuestion('Willingness to Travel to customer location *', 'SELECT');
    }
    if ((window as any).__zeroapplyCursor) {
      (window as any).__zeroapplyCursor.glideTo(520, 380, '✦ Codex AI: Select Yes');
    }
  });

  await page.waitForTimeout(600);

  // Verify elements in DOM
  const cursorInfo = await page.evaluate(() => {
    const root = document.getElementById('zeroapply-codex-cursor-root');
    const container = root?.querySelector('.za-cursor-container') as HTMLElement;
    const svg = root?.querySelector('.za-glass-svg') as SVGElement;
    const badge = root?.querySelector('#za-active-badge') as HTMLElement;
    const parserError = root?.querySelector('parsererror');

    return {
      rootExists: !!root,
      containerExists: !!container,
      containerPos: container ? { left: container.style.left, top: container.style.top } : null,
      svgExists: !!svg,
      svgBBox: svg ? { width: svg.clientWidth, height: svg.clientHeight } : null,
      badgeText: badge ? badge.textContent : null,
      badgeDisplay: badge ? badge.style.display : null,
      hasParserError: !!parserError,
    };
  });

  console.log('Cursor Verification Info:', JSON.stringify(cursorInfo, null, 2));

  // Capture screenshot to artifact dir
  const artifactDir = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';
  const outPath = path.join(artifactDir, 'screenshot_real_agent_modal_filling.png');
  await page.screenshot({ path: outPath });
  console.log('📸 Saved verified screenshot to:', outPath);

  // Now glide to Submit button and capture review & submit state
  await page.evaluate(() => {
    if ((window as any).__zeroapplyHUD) {
      (window as any).__zeroapplyHUD.setStep(5, 5, 'Review & Submit');
      (window as any).__zeroapplyHUD.setQuestion('Review application before sending...', 'SUBMIT');
    }
    if ((window as any).__zeroapplyCursor) {
      (window as any).__zeroapplyCursor.glideTo(300, 610, '✦ Codex AI: Submit Application');
    }
  });

  await page.waitForTimeout(600);

  const reviewOutPath = path.join(artifactDir, 'screenshot_real_agent_review_submit.png');
  await page.screenshot({ path: reviewOutPath });
  console.log('📸 Saved verified review screenshot to:', reviewOutPath);

  await browser.close();
}

main().catch(console.error);
