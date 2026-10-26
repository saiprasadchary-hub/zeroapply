import fs from 'node:fs';
import path from 'node:path';
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

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

      const isBg = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let qHead = 0, qTail = 0;

      // Studio background detection:
      // The background is light blue/white studio lighting.
      // Outside the water drop, luminance is > 212.
      const checkBg = (r, g, b, y) => {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        return lum > 212 && b >= g && g >= r - 10 && (b - r) < 65;
      };

      for (let x = 0; x < w; x++) {
        let p = x * 4;
        if (checkBg(data[p], data[p+1], data[p+2], 0)) {
          isBg[x] = 1;
          queue[qTail++] = x;
        }
        let idxH = (h - 1) * w + x;
        let pH = idxH * 4;
        if (checkBg(data[pH], data[pH+1], data[pH+2], h - 1)) {
          isBg[idxH] = 1;
          queue[qTail++] = idxH;
        }
      }
      for (let y = 0; y < h; y++) {
        let idx0 = y * w;
        let p0 = idx0 * 4;
        if (isBg[idx0] === 0 && checkBg(data[p0], data[p0+1], data[p0+2], y)) {
          isBg[idx0] = 1;
          queue[qTail++] = idx0;
        }
        let idxW = y * w + (w - 1);
        let pW = idxW * 4;
        if (isBg[idxW] === 0 && checkBg(data[pW], data[pW+1], data[pW+2], y)) {
          isBg[idxW] = 1;
          queue[qTail++] = idxW;
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
              const p = nidx * 4;
              if (checkBg(data[p], data[p+1], data[p+2], ny)) {
                isBg[nidx] = 1;
                queue[qTail++] = nidx;
              }
            }
          }
        }
      }

      // Smooth mask the bottom floor reflection:
      // The bottom of the water droplet bulb forms a smooth curve at around y = 780
      // Any floor reflection below the curved bottom is cleared smoothly
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nidx = y * w + x;
          // Droplet bottom curve equation (ellipse centered at 512, 540 with rx 345, ry 240)
          const normX = (x - 515) / 345;
          const normY = (y - 540) / 240;
          const distSq = normX * normX + normY * normY;
          if (y > 700 && distSq > 1.05) {
            isBg[nidx] = 1;
          }
        }
      }

      // Blank out static eyes inside the visor screen
      for (let y = 460; y <= 630; y++) {
        for (let x = 375; x <= 680; x++) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];

          // Eye pixels have cyan/blue glow or bright white
          if (b > 100 && (g > 85 || r > 70)) {
            data[i] = 7;
            data[i+1] = 9;
            data[i+2] = 14;
          }
        }
      }

      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nidx = y * w + x;
          if (isBg[nidx] === 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          } else {
            data[nidx * 4 + 3] = 0;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      const pad = 6;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(h - cropY, (maxY - minY) + pad * 2);

      const targetW = 200;
      const targetH = Math.round((cropH / cropW) * targetW);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetW;
      outCanvas.height = targetH;
      const outCtx = outCanvas.getContext('2d');
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      return {
        dataUrl: outCanvas.toDataURL('image/png'),
        w: targetW,
        h: targetH,
        crop: { cropX, cropY, cropW, cropH }
      };
    })()
  `;

  const result = await page.evaluate(script);
  await browser.close();

  const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  const outPath = path.join(process.cwd(), 'src', 'assets', 'aqua_drop_clean.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));

  const artifactPath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/aqua_drop_clean.png';
  fs.writeFileSync(artifactPath, Buffer.from(base64Data, 'base64'));

  console.log(`✅ Saved perfectly smooth water drop image to: ${outPath} (${result.w}x${result.h})`);
  console.log('Crop:', result.crop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
