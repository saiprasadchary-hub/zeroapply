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
  const cleanImgPath = path.join(process.cwd(), 'src/assets/grok_bot_clean.png');
  const imgBuffer = fs.readFileSync(cleanImgPath);
  const base64Uri = `data:image/png;base64,${imgBuffer.toString('base64')}`;

  const browser = await chromium.launch({ executablePath: chromePath!, headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="360" height="360">
      <defs>
        <filter id="za-glass-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" />
          <feOffset dx="0" dy="1.6" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="za-grok-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
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

      <ellipse class="za-avatar-shadow" cx="45" cy="52.8" rx="10.2" ry="2.6" fill="#010617" opacity="0.38" filter="url(#za-glass-shadow)" />

      <!-- Photorealistic 3D Obsidian Sphere -->
      <g class="za-grok-sphere za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 41px;">
        <image href="${base64Uri}" x="33.8" y="29.8" width="22.4" height="22.4" preserveAspectRatio="xMidYMid meet" class="za-grok-img" />
      </g>

      <!-- Living Capsule Eyes with Gaze Shift & Blinks -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: 45.0px 41.0px;">
        <!-- Left Grok Eye -->
        <rect x="42.1" y="38.4" width="2.3" height="5.2" rx="1.15" fill="#ffffff" filter="url(#za-grok-eye-glow)" />
        <rect x="42.5" y="38.8" width="1.1" height="4.4" rx="0.55" fill="#f8fafc" opacity="0.95" />

        <!-- Right Grok Eye -->
        <rect x="45.6" y="38.4" width="2.3" height="5.2" rx="1.15" fill="#ffffff" filter="url(#za-grok-eye-glow)" />
        <rect x="46.0" y="38.8" width="1.1" height="4.4" rx="0.55" fill="#f8fafc" opacity="0.95" />
      </g>

      <!-- Pointer for showcase -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z"
            fill="url(#za-nd-core)" stroke="url(#za-nd-rim)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"
            filter="url(#za-glass-shadow)" />
    </svg>
  `;

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 40px; background: #0b0f19; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
        <div style="background: #111827; border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <div style="color: #94a3b8; font-family: sans-serif; font-size: 14px; margin-bottom: 12px; font-weight: 600;">NEW xAI GROK CYBER BOT (PHOTOREALISTIC 3D OBSIDIAN SPHERE)</div>
          ${svg}
        </div>
      </body>
    </html>
  `);

  const previewPath = '/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/grok_composite_test.png';
  await page.screenshot({ path: previewPath });
  console.log('Saved test screenshot to:', previewPath);

  await browser.close();
}

main().catch(console.error);
