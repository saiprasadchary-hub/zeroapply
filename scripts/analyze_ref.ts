import fs from 'node:fs';
import { PNG } from 'pngjs';

// We can analyze the user uploaded image using pngjs if installed, or playwright canvas
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function analyze() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  
  const userRefPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/.user_uploaded/media_1790924840854.png';
  const imgBase64 = fs.readFileSync(userRefPath).toString('base64');

  await page.setContent(`
    <img id="img" src="data:image/png;base64,${imgBase64}" />
    <canvas id="cvs"></canvas>
  `);

  const points = await page.evaluate(async () => {
    const img = document.getElementById('img') as HTMLImageElement;
    await img.decode();
    const cvs = document.getElementById('cvs') as HTMLCanvasElement;
    cvs.width = img.naturalWidth;
    cvs.height = img.naturalHeight;
    const ctx = cvs.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const idata = ctx.getImageData(0, 0, cvs.width, cvs.height);
    const data = idata.data;

    let minX = cvs.width, maxX = 0, minY = cvs.height, maxY = 0;
    // Find non-white pixels
    const coloredPixels: { x: number; y: number; r: number; g: number; b: number }[] = [];

    for (let y = 0; y < cvs.height; y++) {
      for (let x = 0; x < cvs.width; x++) {
        const idx = (y * cvs.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Background is white (r>245, g>245, b>245)
        if (a > 50 && (r < 240 || g < 240 || b < 240)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    return {
      width: cvs.width,
      height: cvs.height,
      bbox: { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY },
    };
  });

  console.log('Analyzed points:', points);
  await browser.close();
}

analyze().catch(console.error);
