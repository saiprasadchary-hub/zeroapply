import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

function buildAquaDropSvg(scale = 1): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" style="transform: scale(${scale});">
      <defs>
        <!-- Liquid Water Droplet Gradients -->
        <radialGradient id="test-aqua-shell" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.9" />
          <stop offset="20%" stop-color="#7dd3fc" stop-opacity="0.75" />
          <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.65" />
          <stop offset="78%" stop-color="#0284c7" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#075985" stop-opacity="0.98" />
        </radialGradient>

        <linearGradient id="test-aqua-rim" x1="32" y1="24" x2="58" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="35%" stop-color="#bae6fd" stop-opacity="0.85" />
          <stop offset="70%" stop-color="#38bdf8" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.95" />
        </linearGradient>

        <linearGradient id="test-aqua-visor" x1="45" y1="37" x2="46" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#16202e" />
          <stop offset="25%" stop-color="#0a1017" />
          <stop offset="70%" stop-color="#03060a" />
          <stop offset="100%" stop-color="#000204" />
        </linearGradient>

        <radialGradient id="test-aqua-bubble" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
          <stop offset="35%" stop-color="#bae6fd" stop-opacity="0.45" />
          <stop offset="80%" stop-color="#38bdf8" stop-opacity="0.65" />
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.85" />
        </radialGradient>

        <!-- Luminous Electric Cyan Eye Glow -->
        <filter id="test-aqua-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="test-aqua-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
      </defs>

      <!-- Ambient liquid drop shadow underneath -->
      <ellipse cx="45" cy="55.5" rx="11" ry="2.8" fill="#021429" opacity="0.4" filter="url(#test-aqua-shadow)" />

      <!-- Main Buoyant Water Droplet Body Group -->
      <g class="za-aqua-drop za-avatar-body">
        <!-- 1. Crystalline Hydrodynamic Liquid Teardrop Shape -->
        <path d="
          M 45 23.5
          C 46.2 26.5, 49.0 30.5, 53.5 35.5
          C 58.2 40.5, 59.2 46.5, 56.5 50.8
          C 53.5 54.8, 48.5 55.8, 45.0 55.8
          C 41.5 55.8, 36.5 54.8, 33.5 50.8
          C 30.8 46.5, 31.8 40.5, 36.5 35.5
          C 41.0 30.5, 43.8 26.5, 45 23.5 Z
        " fill="url(#test-aqua-shell)" stroke="url(#test-aqua-rim)" stroke-width="0.95" stroke-linejoin="round" />

        <!-- 2. Inner Refractive Caustic Water Curves -->
        <!-- Top liquid meniscus under peak -->
        <path d="M 40 32 C 43 34 47 34 50 32" stroke="#ffffff" stroke-width="0.75" stroke-linecap="round" fill="none" opacity="0.6" />
        <!-- Bottom deep liquid caustic pool -->
        <ellipse cx="45" cy="52.5" rx="8.5" ry="2.5" fill="#0284c7" opacity="0.5" />

        <!-- 3. Suspended Obsidian Visor Screen (Floating Inside Liquid Droplet) -->
        <!-- Liquid socket crease / dark pocket inside water -->
        <rect x="35.0" y="36.5" width="20.0" height="13.6" rx="6.8" fill="#031e3d" opacity="0.85" />
        <!-- Pitch-black obsidian glass screen -->
        <rect x="35.8" y="37.3" width="18.4" height="12.0" rx="6.0" fill="url(#test-aqua-visor)" stroke="#020b17" stroke-width="0.6" />

        <!-- Visor Curved Glossy Highlight (Signature Specular Glint along Top Right) -->
        <path d="M 46.5 38.6 C 50.5 38.3 52.8 39.4 53.4 41.8" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85" />
        <path d="M 47.4 39.0 C 50.0 38.8 52.0 39.6 52.6 41.2" stroke="#ffffff" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.95" />

        <!-- 4. Floating Micro-Bubbles inside Liquid Droplet (Exact match to reference figure) -->
        <!-- Large lower-left bubble -->
        <circle cx="34.2" cy="46.0" r="2.2" fill="url(#test-aqua-bubble)" stroke="#bae6fd" stroke-width="0.45" />
        <circle cx="33.6" cy="45.2" r="0.6" fill="#ffffff" opacity="0.9" />

        <!-- Small bottom-left bubble -->
        <circle cx="38.8" cy="51.2" r="1.3" fill="url(#test-aqua-bubble)" stroke="#bae6fd" stroke-width="0.4" />
        <circle cx="38.4" cy="50.8" r="0.4" fill="#ffffff" opacity="0.85" />

        <!-- Lower-right medium bubble -->
        <circle cx="51.5" cy="49.8" r="1.8" fill="url(#test-aqua-bubble)" stroke="#bae6fd" stroke-width="0.45" />
        <circle cx="51.0" cy="49.2" r="0.5" fill="#ffffff" opacity="0.9" />

        <!-- Mid-left tiny bubble -->
        <circle cx="32.4" cy="40.0" r="1.0" fill="url(#test-aqua-bubble)" stroke="#bae6fd" stroke-width="0.35" />
        <!-- Upper-left tiny bubble -->
        <circle cx="36.5" cy="34.5" r="1.1" fill="url(#test-aqua-bubble)" stroke="#bae6fd" stroke-width="0.35" />
        <!-- Mid-right tiny bubble -->
        <circle cx="56.2" cy="42.5" r="1.0" fill="url(#test-aqua-bubble)" stroke="#bae6fd" stroke-width="0.35" />

        <!-- 5. Outer Droplet Gloss Specular Highlights -->
        <!-- Signature large glossy reflection on upper right shoulder -->
        <ellipse cx="52.8" cy="34.8" rx="3.6" ry="2.2" transform="rotate(-32 52.8 34.8)" fill="#ffffff" opacity="0.85" />
        <!-- Soft rim glint near droplet tip -->
        <path d="M 44.2 25.0 C 43.8 27.5 41.5 31.0 38.5 34.0" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.75" />
      </g>

      <!-- 6. Glowing Electric Cyan Vertical Capsule / Stadium Pill Eyes -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: center;">
        <!-- Left Glowing Cyan Capsule Eye -->
        <g class="za-aqua-eye-left">
          <!-- Outer Neon Cyan Halo Glow -->
          <rect x="40.8" y="39.8" width="2.8" height="6.2" rx="1.4" fill="#00d8ff" filter="url(#test-aqua-eye-glow)" opacity="0.85" />
          <!-- Inner Bright Ice-Cyan Capsule Core -->
          <rect x="41.2" y="40.2" width="2.0" height="5.4" rx="1.0" fill="#f0f9ff" />
        </g>

        <!-- Right Glowing Cyan Capsule Eye -->
        <g class="za-aqua-eye-right">
          <!-- Outer Neon Cyan Halo Glow -->
          <rect x="46.4" y="39.8" width="2.8" height="6.2" rx="1.4" fill="#00d8ff" filter="url(#test-aqua-eye-glow)" opacity="0.85" />
          <!-- Inner Bright Ice-Cyan Capsule Core -->
          <rect x="46.8" y="40.2" width="2.0" height="5.4" rx="1.0" fill="#f0f9ff" />
        </g>
      </g>
    </svg>
  `;
}

async function main() {
  if (!chromePath) {
    console.error('No Chrome binary found');
    process.exit(1);
  }

  const svgSolo2x = buildAquaDropSvg(2.4);
  const svgSolo1x = buildAquaDropSvg(1.6);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Aqua Water Drop Droid — Preview</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body {
          background: #060913;
          color: #f1f5f9;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .container {
          max-width: 900px;
          width: 100%;
        }
        .title {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #38bdf8;
          font-size: 16px;
          margin-bottom: 24px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 16px;
          text-transform: uppercase;
        }
        .preview-box {
          width: 220px;
          height: 220px;
          background: radial-gradient(circle at center, #1e293b 0%, #090d16 100%);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="title">Aqua Water Drop Droid</div>
        <div class="subtitle">Liquid Crystal Droplet + Suspended Obsidian Visor + Floating Micro-Bubbles + Glowing Cyan Capsule Eyes</div>
        
        <div class="grid">
          <div class="card">
            <div class="card-title">Scaled 2.4x (High Detail View)</div>
            <div class="preview-box">
              ${svgSolo2x}
            </div>
          </div>
          <div class="card">
            <div class="card-title">Scaled 1.6x (Standard Cursor View)</div>
            <div class="preview-box">
              ${svgSolo1x}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const outputPath = path.join(
    '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6',
    'aqua_drop_preview.png'
  );

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 980, height: 600 },
    deviceScaleFactor: 2,
  });

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath });
  await browser.close();

  console.log(`Saved screenshot to: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
