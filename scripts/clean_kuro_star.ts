import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
const sourceImagePath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/.user_uploaded/media_1793008921957.png';

async function main() {
  const imageBuffer = fs.readFileSync(sourceImagePath);
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  const browser = await chromium.launch({ executablePath: chromePath!, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><style>body { margin: 0; background: transparent; }</style></head>
    <body>
      <img id="m" src="${base64Image}" />
      <canvas id="c"></canvas>
    </body>
    </html>
  `, { waitUntil: 'load' });

  const script = `
    (() => {
      const img = document.getElementById('m');
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const canvas = document.getElementById('c');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample border pixels
      const borderSamples = [];
      for (let x = 0; x < 10; x++) {
        let p = x * 4;
        borderSamples.push([data[p], data[p+1], data[p+2], data[p+3]]);
      }

      // Check if image already has alpha transparency:
      let hasAlpha = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) {
          hasAlpha = true;
          break;
        }
      }

      // 1. If background is white or checkerboard, flood fill from border
      const isBg = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let qHead = 0, qTail = 0;

      // White background detection (r, g, b > 230) or alpha === 0
      const checkBg = (r, g, b, a) => {
        if (a < 10) return true;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const lum = (r + g + b) / 3;
        // White/light grey background
        return chroma < 25 && lum > 210;
      };

      for (let x = 0; x < w; x++) {
        let pTop = x * 4;
        if (checkBg(data[pTop], data[pTop+1], data[pTop+2], data[pTop+3])) {
          isBg[x] = 1;
          queue[qTail++] = x;
        }
        let idxBottom = (h - 1) * w + x;
        let pBottom = idxBottom * 4;
        if (checkBg(data[pBottom], data[pBottom+1], data[pBottom+2], data[pBottom+3])) {
          isBg[idxBottom] = 1;
          queue[qTail++] = idxBottom;
        }
      }

      for (let y = 0; y < h; y++) {
        let idxL = y * w;
        let pL = idxL * 4;
        if (isBg[idxL] === 0 && checkBg(data[pL], data[pL+1], data[pL+2], data[pL+3])) {
          isBg[idxL] = 1;
          queue[qTail++] = idxL;
        }
        let idxR = y * w + (w - 1);
        let pR = idxR * 4;
        if (isBg[idxR] === 0 && checkBg(data[pR], data[pR+1], data[pR+2], data[pR+3])) {
          isBg[idxR] = 1;
          queue[qTail++] = idxR;
        }
      }

      const dx = [1, -1, 0, 0];
      const dy = [0, 0, 1, -1];

      while (qHead < qTail) {
        const curr = queue[qHead++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        for (let i = 0; i < 4; i++) {
          const nx = cx + dx[i];
          const ny = cy + dy[i];

          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nidx = ny * w + nx;
            if (isBg[nidx] === 0) {
              const np = nidx * 4;
              if (checkBg(data[np], data[np+1], data[np+2], data[np+3])) {
                isBg[nidx] = 1;
                queue[qTail++] = nidx;
              }
            }
          }
        }
      }

      // 2. Set Alpha with smooth edge antialiasing
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const p = idx * 4;

          if (isBg[idx] === 1) {
            data[p + 3] = 0;
          } else {
            // Check if adjacent to background
            let adjacentBg = false;
            for (let i = 0; i < 4; i++) {
              const nx = x + dx[i];
              const ny = y + dy[i];
              if (nx < 0 || nx >= w || ny < 0 || ny >= h || isBg[ny * w + nx] === 1) {
                adjacentBg = true;
                break;
              }
            }

            if (adjacentBg) {
              const r = data[p];
              const g = data[p+1];
              const b = data[p+2];
              const lum = (r + g + b) / 3;
              if (lum > 245) {
                data[p + 3] = 0;
              } else if (lum > 160) {
                const factor = (245 - lum) / 85;
                data[p + 3] = Math.round(factor * 255);
              }
            }
          }
        }
      }

      // 3. Find Bounding Box
      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = (y * w + x) * 4;
          if (data[p + 3] > 20) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Crop with small 6px padding
      const pad = 6;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(h - cropY, (maxY - minY) + pad * 2);

      // Target dimension 240px wide proportional
      const targetW = 240;
      const targetH = Math.round(targetW * (cropH / cropW));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = targetW;
      cropCanvas.height = targetH;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.imageSmoothingEnabled = true;
      cropCtx.imageSmoothingQuality = 'high';
      cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      const croppedPng = cropCanvas.toDataURL('image/png');

      return {
        originalDim: { w, h },
        borderSamples,
        hasAlpha,
        bbox: { minX, maxX, minY, maxY, cropW, cropH },
        targetDim: { targetW, targetH },
        pngDataUrl: croppedPng
      };
    })()
  `;

  const result = await page.evaluate(script);
  console.log('Result:', {
    originalDim: result.originalDim,
    borderSamples: result.borderSamples,
    hasAlpha: result.hasAlpha,
    bbox: result.bbox,
    targetDim: result.targetDim
  });

  // Save the clean PNG
  const base64Data = result.pngDataUrl.replace(/^data:image\/png;base64,/, '');
  const outPath1 = path.join(process.cwd(), 'src/assets/kuro_star_clean.png');
  const outPath2 = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/kuro_star_clean.png';
  fs.writeFileSync(outPath1, Buffer.from(base64Data, 'base64'));
  fs.writeFileSync(outPath2, Buffer.from(base64Data, 'base64'));

  console.log('Saved clean PNG to:', outPath1);
  console.log('Saved clean PNG to:', outPath2);

  await browser.close();
}

main().catch(console.error);
