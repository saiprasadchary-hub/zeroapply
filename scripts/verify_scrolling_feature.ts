import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { ensureVisualCursor, cursorScrollPage, cursorScrollContainer, cursorScrollElementIntoView } from '../src/agent/stealth/agentCursor';

const ARTIFACT_DIR = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';
const LOCAL_ARTIFACTS = path.join(process.cwd(), 'artifacts');

for (const dir of [ARTIFACT_DIR, LOCAL_ARTIFACTS]) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
}

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function saveProof(name: string, page: any): Promise<string> {
  const filename = `${name}.png`;
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_ARTIFACTS, filename);
  await page.screenshot({ path: p1, fullPage: false });
  try { fs.copyFileSync(p1, p2); } catch {}
  console.log(`📸 [Proof Captured]: ${p1}`);
  return p1;
}

async function run() {
  if (!chromePath) {
    throw new Error('No supported Chrome/Chromium browser found.');
  }

  console.log('🚀 Starting Scrolling Feature Verification...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const demoUrl = `file://${path.resolve('clone-linkedin/index.html')}`;
  console.log('Loading page:', demoUrl);
  await page.goto(demoUrl, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  const webview = {
    executeJavaScript: async <T>(code: string): Promise<T> => {
      return page.evaluate((c) => eval(c), code);
    },
  };

  await ensureVisualCursor(webview);

  // 1. Test Scrolling Page Down
  console.log('Testing page scroll down...');
  await cursorScrollPage(webview, 450, 'AI: Scrolling Page Down ↓');
  await page.waitForTimeout(500);
  await saveProof('proof_scroll_page_down', page);

  // 2. Test Scrolling Page Back Up
  console.log('Testing page scroll up...');
  await cursorScrollPage(webview, -450, 'AI: Returning to Top ↑');
  await page.waitForTimeout(500);
  await saveProof('proof_scroll_page_up', page);

  // 3. Test Scroll Element Into View (Job Card)
  console.log('Testing scrolling element into view...');
  await cursorScrollElementIntoView(webview, '.job-card:nth-child(2), li.jobs-search-results__list-item:nth-child(2)', 'AI: Scrolling to Next Job Posting');
  await page.waitForTimeout(600);
  await saveProof('proof_scroll_element_into_view', page);

  // 4. Open modal and test modal container scrolling
  console.log('Opening Easy Apply modal...');
  await page.evaluate(() => {
    const btn = document.getElementById('main-easy-apply-btn');
    if (btn) btn.click();
  });
  await page.waitForSelector('#easy-apply-modal-overlay.active', { timeout: 4000 });
  await page.waitForTimeout(600);

  // Scroll modal down
  console.log('Testing modal container scroll...');
  await cursorScrollContainer(webview, '#easy-apply-modal-overlay.active .modal-content, .modal-body', 250, 'AI: Scrolling Form Questions ↓');
  await page.waitForTimeout(500);
  await saveProof('proof_scroll_modal_container', page);

  await browser.close();
  console.log('🎉 Scrolling Feature Verification complete!');
}

run().catch((err) => {
  console.error('Fatal error in scrolling verification:', err);
  process.exit(1);
});
