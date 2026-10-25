import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

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

  console.log('Connecting to localhost:5173 to verify Cursor Studio dropdown...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 6000 });
  } catch (err) {
    console.log('Could not connect to http://localhost:5173:', (err as any).message);
    await browser.close();
    return;
  }

  // Find Profile tab button and click it
  const profileTabBtn = await page.$('button:has-text("Profile")') || await page.$('[data-tab="profile"]');
  if (profileTabBtn) {
    console.log('Clicking Profile tab...');
    await profileTabBtn.click();
    await page.waitForTimeout(500);
  }

  // Scroll down to Cursor Studio
  await page.evaluate(() => {
    const studio = document.querySelector('.za-cursor-container, button[aria-haspopup="listbox"]');
    if (studio) studio.scrollIntoView({ behavior: 'auto', block: 'center' });
  });

  await page.waitForTimeout(400);

  // Capture before opening dropdown
  const artifactDir = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';
  const closedPath = path.join(artifactDir, 'screenshot_profile_cursor_dropdown_closed.png');
  await page.screenshot({ path: closedPath });
  console.log('📸 Saved closed dropdown screenshot to:', closedPath);

  // Click dropdown button to open
  const dropdownTrigger = await page.$('button[aria-haspopup="listbox"]');
  if (dropdownTrigger) {
    console.log('Opening Cursor Studio dropdown...');
    await dropdownTrigger.click();
    await page.waitForTimeout(400);

    const openPath = path.join(artifactDir, 'screenshot_profile_cursor_dropdown_open.png');
    await page.screenshot({ path: openPath });
    console.log('📸 Saved open dropdown screenshot to:', openPath);
  } else {
    console.log('Dropdown trigger not found via selector');
  }

  await browser.close();
}

main().catch(console.error);
