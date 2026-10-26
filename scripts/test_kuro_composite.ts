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
  const cleanImgPath = path.join(process.cwd(), 'src/assets/kuro_star_clean.png');
  const imgBuffer = fs.readFileSync(cleanImgPath);
  const base64Uri = `data:image/png;base64,${imgBuffer.toString('base64')}`;

  const browser = await chromium.launch({ executablePath: chromePath!, headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });

  // Option A: Glowing white vertical capsule eyes (matching the companion bot series)
  const svgA = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="300" height="300">
      <defs>
        <filter id="za-kuro-glow-a" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="za-glass-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" />
          <feOffset dx="0" dy="1.6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
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

      <ellipse class="za-avatar-shadow za-kuro-shadow" cx="45" cy="53.0" rx="10.8" ry="2.6" fill="#010617" opacity="0.4" filter="url(#za-glass-shadow)" />

      <g class="za-kuro-body za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 41px;">
        <image href="${base64Uri}" x="31.0" y="28.5" width="28.0" height="24.5" preserveAspectRatio="xMidYMid meet" class="za-kuro-img" />
      </g>

      <!-- Glowing Stadium Capsule Eyes -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: 45.0px 41.0px;">
        <g class="za-kuro-eye-left">
          <rect x="41.2" y="38.0" width="2.4" height="5.8" rx="1.2" fill="#ffffff" filter="url(#za-kuro-glow-a)" />
          <rect x="41.6" y="38.4" width="1.1" height="5.0" rx="0.55" fill="#f8fafc" opacity="0.95" />
        </g>
        <g class="za-kuro-eye-right">
          <rect x="46.4" y="38.0" width="2.4" height="5.8" rx="1.2" fill="#ffffff" filter="url(#za-kuro-glow-a)" />
          <rect x="46.8" y="38.4" width="1.1" height="5.0" rx="0.55" fill="#f8fafc" opacity="0.95" />
        </g>
      </g>

      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z"
            fill="url(#za-nd-core)" stroke="url(#za-nd-rim)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"
            filter="url(#za-glass-shadow)" />
    </svg>
  `;

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 40px; background: #0b0f19; display: flex; gap: 40px; justify-content: center; align-items: center; min-height: 100vh;">
        <div style="background: #111827; border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <div style="color: #94a3b8; font-family: sans-serif; font-size: 14px; margin-bottom: 12px; font-weight: 600;">NEW KURO STAR CELESTIAL</div>
          ${svgA}
        </div>
      </body>
    </html>
  `);

  const previewPath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/kuro_star_new_composite_test.png';
  await page.screenshot({ path: previewPath });
  console.log('Saved test screenshot to:', previewPath);

  await browser.close();
}

main().catch(console.error);
