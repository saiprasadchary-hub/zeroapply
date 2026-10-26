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
    <head>
      <style>
        body { margin: 0; background: transparent; overflow: hidden; }
      </style>
    </head>
    <body>
      <img id="mascot" src="${base64Image}" />
      <canvas id="c"></canvas>
    </body>
    </html>
  `, { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const img = document.getElementById('mascot') as HTMLImageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const canvas = document.getElementById('c') as HTMLCanvasElement;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Detect background color by sampling the 4 corners
    // Corners are studio background: soft light blue/cyan
    // We remove the background by setting alpha = 0 for pixels matching studio background
    // In this image, the studio background has:
    // High brightness: R > 195, G > 215, B > 235
    // With very low saturation difference: (B - R) between 20 and 55, B >= G >= R
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Background check: high lightness, subtle blue tint
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 218 && b >= g && g >= r - 8 && (b - r) < 60) {
          data[i + 3] = 0; // transparent!
        }
      }
    }

    // Now cover the static glowing eyes inside the black visor screen
    // so our dynamic SVG animated eyes can move, blink, and look around cleanly!
    // The visor is located around the center-lower area:
    // x from 30% to 70%, y from 44% to 70%
    const minX = Math.round(w * 0.32);
    const maxX = Math.round(w * 0.68);
    const minY = Math.round(h * 0.45);
    const maxY = Math.round(h * 0.70);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // The glowing eyes in the visor are cyan / light blue / white
        // Visor glass is dark black (r < 30, g < 30, b < 40)
        // Eye pixels have b > 100 and (g > 80 or r > 60)
        if (b > 85 && (g > 70 || r > 50)) {
          // Fill with obsidian black glass of the visor
          data[i] = 7;
          data[i + 1] = 9;
          data[i + 2] = 14;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Find bounding box of visible mascot
    let bx0 = w, bx1 = 0, by0 = h, by1 = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3];
        if (a > 30) {
          if (x < bx0) bx0 = x;
          if (x > bx1) bx1 = x;
          if (y < by0) by0 = y;
          if (y > by1) by1 = y;
        }
      }
    }

    // Crop to bounding box
    const pad = 12;
    const cropX = Math.max(0, bx0 - pad);
    const cropY = Math.max(0, by0 - pad);
    const cropW = Math.min(w - cropX, (bx1 - bx0) + pad * 2);
    const cropH = Math.min(h - cropY, (by1 - by0) + pad * 2);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d')!;
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return {
      dataUrl: cropCanvas.toDataURL('image/png'),
      w: cropW,
      h: cropH,
      box: { bx0, bx1, by0, by1 }
    };
  });

  await browser.close();

  const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  const outPath = path.join(process.cwd(), 'src', 'assets', 'aqua_drop_mascot.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));

  // Also copy to brain artifacts directory so we can inspect it with view_file!
  const artifactPath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/aqua_drop_mascot_clean.png';
  fs.writeFileSync(artifactPath, Buffer.from(base64Data, 'base64'));

  console.log(`✅ Saved transparent water drop image to: ${outPath} (${result.w}x${result.h})`);
  console.log('Mascot box:', result.box);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
