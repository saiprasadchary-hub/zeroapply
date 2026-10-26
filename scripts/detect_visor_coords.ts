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

  const visorData = await page.evaluate(() => {
    const img = document.getElementById('m') as HTMLImageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Find black visor pixels: r < 25, g < 25, b < 30
    let vMinX = w, vMaxX = 0, vMinY = h, vMaxY = 0;
    // Find bright eye pixels inside visor: b > 180, g > 180, r > 100
    let eMinX = w, eMaxX = 0, eMinY = h, eMaxY = 0;

    for (let y = Math.round(h * 0.35); y < Math.round(h * 0.8); y++) {
      for (let x = Math.round(w * 0.25); x < Math.round(w * 0.75); x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r < 25 && g < 25 && b < 35) {
          if (x < vMinX) vMinX = x;
          if (x > vMaxX) vMaxX = x;
          if (y < vMinY) vMinY = y;
          if (y > vMaxY) vMaxY = y;
        }

        if (b > 180 && g > 180 && r > 80) {
          if (x < eMinX) eMinX = x;
          if (x > eMaxX) eMaxX = x;
          if (y < eMinY) eMinY = y;
          if (y > eMaxY) eMaxY = y;
        }
      }
    }

    return {
      visor: { vMinX, vMaxX, vMinY, vMaxY, w: vMaxX - vMinX, h: vMaxY - vMinY },
      eyes: { eMinX, eMaxX, eMinY, eMaxY, w: eMaxX - eMinX, h: eMaxY - eMinY },
    };
  });

  await browser.close();
  console.log('Detected Visor and Eyes:', visorData);
}

main();
