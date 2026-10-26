import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
const pngPath = path.join(process.cwd(), 'src', 'assets', 'aqua_drop_clean.png');
const pngBase64 = fs.readFileSync(pngPath).toString('base64');
const dataUri = `data:image/png;base64,${pngBase64}`;

function buildAquaDropSvg(scale = 1): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" class="za-glass-svg" style="transform: scale(${scale});">
      <defs>
        <!-- Luminous Electric Cyan Eye Glow Filter -->
        <filter id="za-aqua-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Soft liquid ambient shadow filter -->
        <filter id="za-aqua-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" />
        </filter>
      </defs>

      <!-- Liquid ambient shadow underneath -->
      <ellipse class="za-avatar-shadow" cx="45" cy="53.0" rx="9.8" ry="2.6" fill="#011833" opacity="0.38" filter="url(#za-aqua-shadow)" />

      <!-- Photorealistic Water Droplet Mascot Body from User's Shared Reference -->
      <g class="za-aqua-head za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 38px;">
        <!-- Clean Transparent 3D Water Droplet Image -->
        <image href="${dataUri}" x="32" y="24" width="26" height="27.3" preserveAspectRatio="xMidYMid meet" />
      </g>

      <!-- Expressive Glowing Cyan Vertical Capsule Eyes (Blinks, Saccades & Tracks 360°) -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: center;">
        <!-- Left Glowing Cyan Capsule Eye -->
        <g class="za-aqua-eye-left">
          <!-- Outer Neon Cyan Halo Glow -->
          <rect x="41.2" y="38.8" width="2.8" height="6.2" rx="1.4" fill="#00e5ff" opacity="0.85" filter="url(#za-aqua-glow)" />
          <!-- Inner Bright Ice-Cyan Capsule Core -->
          <rect x="41.6" y="39.2" width="2.0" height="5.4" rx="1.0" fill="#f0fdff" />
        </g>

        <!-- Right Glowing Cyan Capsule Eye -->
        <g class="za-aqua-eye-right">
          <!-- Outer Neon Cyan Halo Glow -->
          <rect x="47.6" y="38.8" width="2.8" height="6.2" rx="1.4" fill="#00e5ff" opacity="0.85" filter="url(#za-aqua-glow)" />
          <!-- Inner Bright Ice-Cyan Capsule Core -->
          <rect x="48.0" y="39.2" width="2.0" height="5.4" rx="1.0" fill="#f0fdff" />
        </g>
      </g>
    </svg>
  `;
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath!, headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 500 }, deviceScaleFactor: 2 });

  const svg2x = buildAquaDropSvg(2.5);
  const svg1x = buildAquaDropSvg(1.5);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { background: #070913; margin: 0; padding: 40px; display: flex; gap: 40px; justify-content: center; align-items: center; }
        .box { width: 220px; height: 220px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
      </style>
    </head>
    <body>
      <div class="box">${svg2x}</div>
      <div class="box">${svg1x}</div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/aqua_drop_composite_test.png';
  await page.screenshot({ path: outPath });
  await browser.close();

  console.log(`Saved screenshot to: ${outPath}`);
}

main().catch(console.error);
