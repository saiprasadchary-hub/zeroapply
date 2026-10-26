import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
const sourceImagePath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/.user_uploaded/media_1793005668856.jpg';

async function main() {
  const imageBuffer = fs.readFileSync(sourceImagePath);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  const browser = await chromium.launch({ executablePath: chromePath!, headless: true });
  const page = await browser.newPage();
  await page.setContent(`<img id="m" src="${base64Image}" />`, { waitUntil: 'load' });

  const info = await page.evaluate(() => {
    const img = document.getElementById('m') as HTMLImageElement;
    return { w: img.naturalWidth, h: img.naturalHeight };
  });

  await browser.close();
  console.log('Image dimensions:', info);
}

main();
