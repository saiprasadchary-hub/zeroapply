import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME_PATHS = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function findNotch() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  const userRefPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/.user_uploaded/media_1790924840854.png';
  const imgBase64 = fs.readFileSync(userRefPath).toString('base64');
  await page.setContent(`<img id="img" src="data:image/png;base64,${imgBase64}" /><canvas id="cvs"></canvas>`);

  const code = `
    (() => {
      const img = document.getElementById('img');
      const cvs = document.getElementById('cvs');
      cvs.width = img.naturalWidth;
      cvs.height = img.naturalHeight;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;

      const isCursor = (x, y) => {
        const idx = (Math.round(y) * cvs.width + Math.round(x)) * 4;
        return data[idx+3] > 50 && (data[idx] < 235 || data[idx+1] < 235 || data[idx+2] < 235);
      };

      // Search along line from apex (336, 159) to midpoint (560.5, 518.5)
      // from apex towards midpoint, find the first pixel where cursor ends (the notch)
      const apex = { x: 336, y: 159 };
      const mid = { x: 560.5, y: 518.5 };
      let notch = null;

      for (let t = 0.2; t <= 1.0; t += 0.005) {
        const x = apex.x + t * (mid.x - apex.x);
        const y = apex.y + t * (mid.y - apex.y);
        if (!isCursor(x, y)) {
          notch = { x, y, t };
          break;
        }
      }

      return { notch };
    })()
  `;
  const res = await page.evaluate(code);
  console.log('Notch point:', res);
  await browser.close();
}

findNotch().catch(console.error);
