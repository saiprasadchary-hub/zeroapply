import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME_PATHS = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function traceContour() {
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

      // Threshold to detect solid cursor body + rim (ignoring faint outer aura blur)
      const isSolidCursor = (x, y) => {
        const idx = (Math.round(y) * cvs.width + Math.round(x)) * 4;
        const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
        // Background is white (~255, 255, 255)
        // Solid body or glowing rim has luminance < 220 or colorful
        const isWhite = r > 230 && g > 230 && b > 230;
        return a > 100 && !isWhite;
      };

      // Let's sample key vertices normalized to a 48x48 box:
      // Apex at (16, 7.5)
      // Bounding box in image:
      // Apex: (336, 159)
      // Bottom Tip: (438, 613)
      // Right Tip: (683, 424)
      //
      // If we map:
      // Target box: width ~ 20-22 units, height ~ 22-24 units
      // Let scale = 22 / (613 - 159) = 22 / 454 = 0.048458
      // Then:
      // Apex at { x: 16, y: 7.5 }
      // Bottom Tip: x = 16 + (438 - 336)*scale = 16 + 102*0.048458 = 20.94
      //             y = 7.5 + (613 - 159)*scale = 7.5 + 454*0.048458 = 29.5
      // Right Tip:  x = 16 + (683 - 336)*scale = 16 + 347*0.048458 = 32.8
      //             y = 7.5 + (424 - 159)*scale = 7.5 + 265*0.048458 = 20.34

      // Now let's trace the actual cleft curve between bottom tip and right tip in image:
      // Sample 15 points along the inner curve
      const cleftPoints = [];
      for (let y = 350; y <= 580; y += 15) {
        // scan horizontally for the inner edge
        let firstInside = null;
        let insideCount = 0;
        for (let x = 400; x <= 650; x += 2) {
          if (isSolidCursor(x, y)) {
            insideCount++;
          }
        }
      }

      // Let's find the inner notch:
      // The notch is the vertex where the inner boundary reaches closest to the apex
      let minDistanceToApex = 9999;
      let notchPx = null;
      for (let y = 300; y < 580; y += 2) {
        for (let x = 400; x < 650; x += 2) {
          // If this point is solid, but a point below it is NOT solid, it's on the cleft bottom edge
          if (isSolidCursor(x, y) && (!isSolidCursor(x, y+4) || !isSolidCursor(x+2, y+3) || !isSolidCursor(x-2, y+3))) {
            const d = Math.hypot(x - 336, y - 159);
            if (d < minDistanceToApex) {
              minDistanceToApex = d;
              notchPx = { x, y, d };
            }
          }
        }
      }

      return { notchPx };
    })()
  `;

  const res = await page.evaluate(code);
  console.log('Result:', res);
  await browser.close();
}

traceContour().catch(console.error);
