import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  const cleanImgPath = path.join(process.cwd(), 'src/assets/aero_sentinel_clean.png');
  const imgBuffer = fs.readFileSync(cleanImgPath);
  const base64Uri = `data:image/png;base64,${imgBuffer.toString('base64')}`;

  const browser = await chromium.launch({ executablePath: chromePath!, headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });

  // Test SVG with the clean mascot + glowing white capsule eyes inside the visor
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="400" height="400" style="background: #0b0f19;">
      <defs>
        <filter id="za-glass-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" />
          <feOffset dx="0" dy="1.6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="za-sentinel-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="za-nd-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#e879f9" />
        </linearGradient>
        <linearGradient id="za-nd-core" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>

      <!-- Soft ground shadow -->
      <ellipse class="za-avatar-shadow" cx="45" cy="53.0" rx="11.2" ry="2.8" fill="#010617" opacity="0.4" filter="url(#za-glass-shadow)" />

      <!-- Fluffy Cobalt Sentinel mascot image -->
      <g class="za-sentinel-head za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 40.8px;">
        <image href="${base64Uri}" x="31.2" y="28.4" width="27.6" height="24.38" preserveAspectRatio="xMidYMid meet" />
      </g>

      <!-- Living Glowing Capsule Eyes in Visor -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: 45.4px 40.5px;">
        <!-- Left Vertical White Stadium Eye -->
        <g class="za-sentinel-eye-left">
          <rect x="41.2" y="37.4" width="2.6" height="6.2" rx="1.3" fill="#ffffff" filter="url(#za-sentinel-glow)" />
          <rect x="41.6" y="37.8" width="1.2" height="5.4" rx="0.6" fill="#f8fafc" opacity="0.95" />
        </g>

        <!-- Right Vertical White Stadium Eye -->
        <g class="za-sentinel-eye-right">
          <rect x="47.0" y="37.4" width="2.6" height="6.2" rx="1.3" fill="#ffffff" filter="url(#za-sentinel-glow)" />
          <rect x="47.4" y="37.8" width="1.2" height="5.4" rx="0.6" fill="#f8fafc" opacity="0.95" />
        </g>
      </g>

      <!-- Combined with Tailless Neon Pointer for showcase -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z"
            fill="url(#za-nd-core)" stroke="url(#za-nd-rim)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"
            filter="url(#za-glass-shadow)" />
    </svg>
  `;

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 40px; background: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
        <div style="box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          ${svgMarkup}
        </div>
      </body>
    </html>
  `);

  const previewPath1 = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/sentinel_fuzzy_composite_test.png';
  await page.screenshot({ path: previewPath1 });
  console.log('Saved test screenshot to:', previewPath1);

  await browser.close();
}

main().catch(console.error);
