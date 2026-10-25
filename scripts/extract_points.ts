import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function extractKeyPoints() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  
  const userRefPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/.user_uploaded/media_1790924840854.png';
  const imgBase64 = fs.readFileSync(userRefPath).toString('base64');

  await page.setContent(`
    <img id="img" src="data:image/png;base64,${imgBase64}" />
    <canvas id="cvs"></canvas>
  `);

  const code = `
    (() => {
      const img = document.getElementById('img');
      const cvs = document.getElementById('cvs');
      cvs.width = img.naturalWidth;
      cvs.height = img.naturalHeight;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const idata = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const data = idata.data;

      const isCursor = (x, y) => {
        const idx = (y * cvs.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        return a > 50 && (r < 235 || g < 235 || b < 235);
      };

      let apex = { x: 0, y: 1000 };
      for (let y = 150; y < 220; y++) {
        for (let x = 300; x < 400; x++) {
          if (isCursor(x, y) && y < apex.y) {
            apex = { x, y };
          }
        }
      }

      let bottomTip = { x: 0, y: 0 };
      for (let y = 550; y < 630; y++) {
        for (let x = 400; x < 500; x++) {
          if (isCursor(x, y) && y > bottomTip.y) {
            bottomTip = { x, y };
          }
        }
      }

      let rightTip = { x: 0, y: 0 };
      for (let x = 630; x < 700; x++) {
        for (let y = 380; y < 480; y++) {
          if (isCursor(x, y) && x > rightTip.x) {
            rightTip = { x, y };
          }
        }
      }

      // Find inner cleft
      let cleft = { x: 0, y: 0, dist: 1000 };
      for (let y = 350; y < 500; y++) {
        for (let x = 460; x < 570; x++) {
          if (!isCursor(x, y)) {
            if (isCursor(x, y - 20) && isCursor(x - 20, y) && isCursor(x + 20, y)) {
              const d = Math.hypot(x - apex.x, y - apex.y);
              if (d < cleft.dist) {
                cleft = { x, y, dist: d };
              }
            }
          }
        }
      }

      return { apex, bottomTip, rightTip, cleft };
    })()
  `;

  const res = await page.evaluate(code);
  console.log('Extracted Keypoints:', JSON.stringify(res, null, 2));
  await browser.close();
}

extractKeyPoints().catch(console.error);
