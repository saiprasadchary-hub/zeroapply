import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
const sourceImagePath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/.user_uploaded/media_1793009482724.jpg';

async function main() {
  const imageBuffer = fs.readFileSync(sourceImagePath);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

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

      // 1. Flood fill to find all connected background checkerboard pixels
      const isBg = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let qHead = 0, qTail = 0;

      // Check if pixel is neutral background (checkerboard grey/white)
      // Checkerboard: r, g, b are almost equal, and lum > 140.
      const checkBg = (r, g, b) => {
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const lum = (r + g + b) / 3;
        return chroma < 26 && lum > 140;
      };

      for (let x = 0; x < w; x++) {
        let pTop = x * 4;
        if (checkBg(data[pTop], data[pTop+1], data[pTop+2])) {
          isBg[x] = 1;
          queue[qTail++] = x;
        }
        let idxBottom = (h - 1) * w + x;
        let pBottom = idxBottom * 4;
        if (checkBg(data[pBottom], data[pBottom+1], data[pBottom+2])) {
          isBg[idxBottom] = 1;
          queue[qTail++] = idxBottom;
        }
      }

      for (let y = 0; y < h; y++) {
        let idxL = y * w;
        let pL = idxL * 4;
        if (isBg[idxL] === 0 && checkBg(data[pL], data[pL+1], data[pL+2])) {
          isBg[idxL] = 1;
          queue[qTail++] = idxL;
        }
        let idxR = y * w + (w - 1);
        let pR = idxR * 4;
        if (isBg[idxR] === 0 && checkBg(data[pR], data[pR+1], data[pR+2])) {
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
              if (checkBg(data[np], data[np+1], data[np+2])) {
                isBg[nidx] = 1;
                queue[qTail++] = nidx;
              }
            }
          }
        }
      }

      // 2. Set Alpha with smooth circular edge antialiasing
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
              if (lum > 225) {
                data[p + 3] = 0;
              } else if (lum > 140) {
                const factor = (225 - lum) / 85;
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

      // Crop closely to circle with 4px padding
      const pad = 4;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(h - cropY, (maxY - minY) + pad * 2);

      // Make crop square
      const maxDim = Math.max(cropW, cropH);
      const centerX = cropX + cropW / 2;
      const centerY = cropY + cropH / 2;
      const sqX = Math.round(centerX - maxDim / 2);
      const sqY = Math.round(centerY - maxDim / 2);

      const targetDim = 240;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = targetDim;
      cropCanvas.height = targetDim;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.imageSmoothingEnabled = true;
      cropCtx.imageSmoothingQuality = 'high';
      cropCtx.drawImage(canvas, sqX, sqY, maxDim, maxDim, 0, 0, targetDim, targetDim);

      const croppedPng = cropCanvas.toDataURL('image/png');

      return {
        originalDim: { w, h },
        bbox: { minX, maxX, minY, maxY, cropW, cropH, maxDim },
        targetDim,
        pngDataUrl: croppedPng
      };
    })()
  `;

  const result = await page.evaluate(script);
  console.log('Result:', {
    originalDim: result.originalDim,
    bbox: result.bbox,
    targetDim: result.targetDim
  });

  // Save clean PNG
  const base64Data = result.pngDataUrl.replace(/^data:image\/png;base64,/, '');
  const outPath1 = path.join(process.cwd(), 'src/assets/grok_bot_clean.png');
  const outPath2 = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/grok_bot_clean.png';
  fs.writeFileSync(outPath1, Buffer.from(base64Data, 'base64'));
  fs.writeFileSync(outPath2, Buffer.from(base64Data, 'base64'));

  console.log('Saved clean PNG to:', outPath1);
  console.log('Saved clean PNG to:', outPath2);

  await browser.close();
}

main().catch(console.error);
