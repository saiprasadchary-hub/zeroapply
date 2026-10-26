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
  if (!chromePath) {
    console.error('No Chrome binary found');
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(sourceImagePath);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 1200 },
  });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="srcCanvas"></canvas>
      <canvas id="outCanvas"></canvas>
    </body>
    </html>
  `);

  const result = await page.evaluate(async (imgSrc) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        const srcCanvas = document.getElementById('srcCanvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, 0, 0);

        const imgData = srcCtx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // The background in the image is a light blue/lavender gradient
        // Corners: (0,0), (w-1, 0), etc.
        // Let's sample the background color from top-left, top-right
        // and detect the droplet contour using flood-fill from edges
        const isBg = new Uint8Array(w * h);
        const queue = [];

        // Check color difference with background
        // Background has high brightness and blue tint (R > 180, G > 200, B > 230)
        function isBackgroundColor(r, g, b) {
          // Studio background is very light, high luminance, soft cyan/blue tint
          // R: 200-245, G: 220-250, B: 240-255
          // Droplet rim has dark blue caustics or distinct highlights
          // Let's check if r > 185 && g > 205 && b > 225
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          return lum > 215 && (b >= g) && (g >= r - 10);
        }

        // Push perimeter pixels to queue if they match background
        for (let x = 0; x < w; x++) {
          const idx0 = (0 * w + x) * 4;
          if (isBackgroundColor(data[idx0], data[idx0+1], data[idx0+2])) {
            isBg[0 * w + x] = 1;
            queue.push(x, 0);
          }
          const idxH = ((h - 1) * w + x) * 4;
          if (isBackgroundColor(data[idxH], data[idxH+1], data[idxH+2])) {
            isBg[(h - 1) * w + x] = 1;
            queue.push(x, h - 1);
          }
        }
        for (let y = 0; y < h; y++) {
          const idx0 = (y * w + 0) * 4;
          if (isBackgroundColor(data[idx0], data[idx0+1], data[idx0+2])) {
            isBg[y * w + 0] = 1;
            queue.push(0, y);
          }
          const idxW = (y * w + (w - 1)) * 4;
          if (isBackgroundColor(data[idxW], data[idxW+1], data[idxW+2])) {
            isBg[y * w + (w - 1)] = 1;
            queue.push(w - 1, y);
          }
        }

        // BFS flood fill
        let head = 0;
        const dx = [1, -1, 0, 0];
        const dy = [0, 0, 1, -1];

        while (head < queue.length) {
          const qx = queue[head++];
          const qy = queue[head++];

          for (let i = 0; i < 4; i++) {
            const nx = qx + dx[i];
            const ny = qy + dy[i];

            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = ny * w + nx;
              if (isBg[nidx] === 0) {
                const p = nidx * 4;
                const r = data[p];
                const g = data[p+1];
                const b = data[p+2];

                if (isBackgroundColor(r, g, b)) {
                  isBg[nidx] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }

        // Find bounding box of non-background
        let minX = w, maxX = 0, minY = h, maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const nidx = y * w + x;
            if (isBg[nidx] === 0) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Create transparent data
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const nidx = y * w + x;
            if (isBg[nidx] === 1) {
              data[nidx * 4 + 3] = 0; // Transparent
            }
          }
        }

        // In the visor area:
        // Find visor screen center. Visor is pitch black in the center/lower half
        // Let's cover the static glowing eyes so dynamic animated eyes can move over it!
        // We look for pixels inside the visor (dark region around center-lower) that have glowing cyan eye color:
        // Eye color has high cyan brightness (R > 140, G > 220, B > 250) in the visor zone
        // Visor zone is roughly: center X ± 0.25*width, Y: 0.45*height to 0.75*height
        const cxMin = Math.round(minX + (maxX - minX) * 0.28);
        const cxMax = Math.round(minX + (maxX - minX) * 0.72);
        const cyMin = Math.round(minY + (maxY - minY) * 0.48);
        const cyMax = Math.round(minY + (maxY - minY) * 0.72);

        for (let y = cyMin; y <= cyMax; y++) {
          for (let x = cxMin; x <= cxMax; x++) {
            const p = (y * w + x) * 4;
            const r = data[p];
            const g = data[p+1];
            const b = data[p+2];

            // If it's the glowing eye pixel (cyan/light blue inside the visor)
            // Replace with the obsidian black visor glass color (#080b12)
            if (b > 120 && (g > 80 || r > 80)) {
              // It's the eye! Fill with glossy black glass
              data[p] = 8;
              data[p+1] = 11;
              data[p+2] = 18;
            }
          }
        }

        // Put image data back
        srcCtx.putImageData(imgData, 0, 0);

        // Crop to bounding box with small margin
        const pad = 10;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(w - cropX, (maxX - minX) + pad * 2);
        const cropH = Math.min(h - cropY, (maxY - minY) + pad * 2);

        const outCanvas = document.getElementById('outCanvas');
        outCanvas.width = cropW;
        outCanvas.height = cropH;
        const outCtx = outCanvas.getContext('2d');
        outCtx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        resolve({
          dataUrl: outCanvas.toDataURL('image/png'),
          w: cropW,
          h: cropH,
          minX, maxX, minY, maxY
        });
      };
      img.onerror = reject;
      img.src = imgSrc;
    });
  }, base64Image);

  await browser.close();

  // Save the cropped transparent image
  const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  const outPath = path.join(process.cwd(), 'src', 'assets', 'aqua_drop_clean.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));

  console.log(`✅ Saved transparent water drop image to: ${outPath} (${result.w}x${result.h})`);
  console.log('Bounding Box:', { minX: result.minX, maxX: result.maxX, minY: result.minY, maxY: result.maxY });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
