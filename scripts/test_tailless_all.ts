import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) process.exit(1);

  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });

  // 1. Pure Neon Delta (From user's latest figure)
  // Tailless: Apex (16, 7.5), Right Wing (30.5, 20.5), Left Wing (13.5, 27.5), Notch (20.5, 18.5)
  const neonDeltaSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="nd-rim" x1="13.5" y1="27" x2="30.5" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="35%" stop-color="#3b82f6" />
          <stop offset="70%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
        <linearGradient id="nd-core" x1="16" y1="8" x2="25" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#090c17" />
          <stop offset="50%" stop-color="#0e1326" />
          <stop offset="100%" stop-color="#181735" />
        </linearGradient>
        <linearGradient id="nd-bevel" x1="16.5" y1="12" x2="21" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.8" />
          <stop offset="55%" stop-color="#1e1b4b" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#c084fc" stop-opacity="0.12" />
        </linearGradient>
        <filter id="nd-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.5" />
        </filter>
        <filter id="nd-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
        </filter>
      </defs>

      <!-- Soft Neon Ambient Glow Under Rim -->
      <path d="M 16 7.5 L 30.5 20.5 C 27.5 19.8, 23.5 18.5, 20.5 18.5 C 17.5 18.8, 15 22.5, 13.5 27.5 Z" 
            stroke="url(#nd-rim)" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" filter="url(#nd-glow)" opacity="0.65" />

      <!-- Main Tailless Delta Body with Vibrant Glowing Rim -->
      <path d="M 16 7.5 L 30.5 20.5 C 27.5 19.8, 23.5 18.5, 20.5 18.5 C 17.5 18.8, 15 22.5, 13.5 27.5 Z" 
            fill="url(#nd-core)" stroke="url(#nd-rim)" stroke-width="1.85" stroke-linejoin="round" filter="url(#nd-shadow)" />

      <!-- 3D Scooped Inner Cleft Bevel (Matches figure dish depth) -->
      <path d="M 16.5 10 L 28.5 19.8 C 26 19.3, 23 18.5, 20.5 18.5 C 17.8 18.8, 15.6 22, 14.5 25.8 Z" 
            fill="url(#nd-bevel)" />

      <!-- Leading Edge Specular Highlights -->
      <path d="M 16 8 L 13.8 26" stroke="#93c5fd" stroke-width="0.8" stroke-linecap="round" opacity="0.9" />
      <path d="M 16.2 8 L 29.5 19.8" stroke="#f5d0fe" stroke-width="0.8" stroke-linecap="round" opacity="0.95" />

      <!-- Sub-pixel Razor Tip Catchlight at {16, 8} -->
      <circle cx="16" cy="8" r="0.75" fill="#ffffff" />
    </svg>
  `;

  // 2. Orbital Nova Ceramic (Tailless Delta Body + 3D Orbit Ring & Pearl)
  const orbitalCeramicSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="oc-orbit" x1="12" y1="12" x2="36" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="35%" stop-color="#ffffff" />
          <stop offset="70%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#64748b" />
        </linearGradient>
        <radialGradient id="oc-pearl" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="45%" stop-color="#f1f5f9" />
          <stop offset="75%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#64748b" />
        </radialGradient>
        <linearGradient id="oc-shell" x1="16" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
        <linearGradient id="oc-cavity" x1="17" y1="12" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="55%" stop-color="#09090b" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
        <filter id="oc-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.45" />
        </filter>
        <filter id="oc-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.0" result="blur" />
        </filter>
      </defs>

      <!-- Back Arc of 3D Metallic Orbit Ring -->
      <path d="M 12 21 C 13 13 25 10 33 14 C 36 15.5 37 18 36.5 20.5" stroke="url(#oc-orbit)" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.9" />
      <circle cx="34" cy="15" r="3.2" fill="#0f172a" opacity="0.35" filter="url(#oc-blur)" />
      <circle cx="34" cy="15" r="2.5" fill="url(#oc-pearl)" stroke="#cbd5e1" stroke-width="0.5" />
      <circle cx="33.2" cy="14.2" r="0.8" fill="#ffffff" opacity="0.95" />

      <!-- Main Tailless White Ceramic Delta Shell -->
      <path d="M 16 7.5 L 30.5 20.5 C 27.5 19.8, 23.5 18.5, 20.5 18.5 C 17.5 18.8, 15 22.5, 13.5 27.5 Z" 
            fill="url(#oc-shell)" stroke="#cbd5e1" stroke-width="0.95" stroke-linejoin="round" filter="url(#oc-shadow)" />

      <!-- Deep Scooped Obsidian Core Cavity -->
      <path d="M 17 11.5 L 21 17.5 C 20 18.2, 18.5 18.8, 17 21 C 16.2 19, 15.5 14.5, 17 11.5 Z" 
            fill="url(#oc-cavity)" stroke="#09090b" stroke-width="0.6" stroke-linejoin="round" />

      <!-- Front Arc of 3D Orbit Ring (Loops Over Delta Body) -->
      <path d="M 11 22.5 C 13.5 27 23 28.5 31.5 23.5" stroke="url(#oc-orbit)" stroke-width="1.5" stroke-linecap="round" fill="none" />
      <path d="M 13 23.5 C 16 27 23 27.8 29.5 24.2" stroke="#ffffff" stroke-width="0.75" stroke-linecap="round" fill="none" opacity="0.95" />

      <!-- Specular Spine & Razor Apex Glint -->
      <circle cx="16" cy="8" r="0.75" fill="#ffffff" />
    </svg>
  `;

  // 3. Obsidian Celestial Starlight (Tailless Delta Body + 4-Point Starlight + Violet Halo + Celestial Orb)
  const celestialStarlightSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="cs-core" x1="16" y1="8" x2="25" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#030308" />
          <stop offset="50%" stop-color="#0d0d18" />
          <stop offset="100%" stop-color="#18152e" />
        </linearGradient>
        <linearGradient id="cs-halo" x1="13.5" y1="27" x2="30.5" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#c084fc" />
          <stop offset="35%" stop-color="#a855f7" />
          <stop offset="70%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>
        <linearGradient id="cs-arc" x1="15" y1="12" x2="35" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#c084fc" />
          <stop offset="50%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#c084fc" />
        </linearGradient>
        <radialGradient id="cs-orb" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#e9d5ff" />
          <stop offset="70%" stop-color="#c084fc" />
          <stop offset="100%" stop-color="#7e22ce" />
        </radialGradient>
        <radialGradient id="cs-nova" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="35%" stop-color="#c084fc" stop-opacity="0.8" />
          <stop offset="70%" stop-color="#818cf8" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#818cf8" stop-opacity="0" />
        </radialGradient>
        <filter id="cs-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" flood-color="#1e1b4b" flood-opacity="0.5" />
        </filter>
        <filter id="cs-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.0" result="blur" />
        </filter>
      </defs>

      <!-- Back Celestial Orbit Arc & Planetary Bead -->
      <path d="M 23.5 12 C 29 11 35 14.5 35 20.5 C 35 23.5 33 26 27.5 27.5" stroke="url(#cs-arc)" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.9" />
      <circle cx="34" cy="17" r="2.8" fill="#581c87" opacity="0.4" filter="url(#cs-blur)" />
      <circle cx="34" cy="17" r="2.2" fill="url(#cs-orb)" stroke="#e9d5ff" stroke-width="0.5" />
      <circle cx="33.3" cy="16.3" r="0.65" fill="#ffffff" opacity="0.95" />

      <!-- Main Tailless Obsidian Dark Glass Delta Shell with Violet Halo Rim -->
      <path d="M 16 7.5 L 30.5 20.5 C 27.5 19.8, 23.5 18.5, 20.5 18.5 C 17.5 18.8, 15 22.5, 13.5 27.5 Z" 
            fill="url(#cs-core)" stroke="url(#cs-halo)" stroke-width="1.6" stroke-linejoin="round" filter="url(#cs-shadow)" />

      <!-- Leading Edge Specular Highlights -->
      <path d="M 16 8 L 13.8 26" stroke="#e9d5ff" stroke-width="0.8" opacity="0.85" stroke-linecap="round" />
      <path d="M 16.2 8 L 29.5 19.8" stroke="#ffffff" stroke-width="0.8" opacity="0.95" stroke-linecap="round" />

      <!-- Central Luminous 4-Point Starlight Flare -->
      <circle cx="20.5" cy="16.5" r="4.5" fill="url(#cs-nova)" opacity="0.85" />
      <path d="M 20.5 12 Q 20.5 16.5 25 16.5 Q 20.5 16.5 20.5 21 Q 20.5 16.5 16 16.5 Q 20.5 16.5 20.5 12 Z" fill="#ffffff" />
      <line x1="18.5" y1="14.5" x2="22.5" y2="18.5" stroke="#ffffff" stroke-width="0.5" opacity="0.75" />
      <line x1="22.5" y1="14.5" x2="18.5" y2="18.5" stroke="#ffffff" stroke-width="0.5" opacity="0.75" />
      <circle cx="20.5" cy="16.5" r="1.1" fill="#ffffff" />

      <!-- Front Celestial Orbit Arc -->
      <path d="M 23 27 C 19.5 28 16 26.5 14 24" stroke="url(#cs-arc)" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.95" />
      <circle cx="16" cy="8" r="0.75" fill="#ffffff" />
    </svg>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          padding: 40px;
          background: #090d16;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }
        .title {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
        }
        .subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin-top: -16px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 320px);
          gap: 24px;
        }
        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .preview-box {
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-title {
          font-size: 15px;
          font-weight: 600;
          text-align: center;
        }
        .card-tag {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 999px;
          background: #1e293b;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="title">Tailless Delta Vector Cursors (100% Matching User References)</div>
      <div class="subtitle">No stem / No tail • Pure aerodynamic 3-corner delta arrowhead</div>
      <div class="grid">
        <div class="card">
          <div class="preview-box">
            <div style="transform: scale(2.6);">${neonDeltaSvg}</div>
          </div>
          <div class="card-title">Cyber Neon Aurora Delta</div>
          <div class="card-tag">NEW • Simple Tailless Delta Arrow</div>
        </div>

        <div class="card">
          <div class="preview-box">
            <div style="transform: scale(2.6);">${orbitalCeramicSvg}</div>
          </div>
          <div class="card-title">Orbital Nova Ceramic (Tailless)</div>
          <div class="card-tag">3D Metallic Orbit & Pearl Satellite</div>
        </div>

        <div class="card">
          <div class="preview-box">
            <div style="transform: scale(2.6);">${celestialStarlightSvg}</div>
          </div>
          <div class="card-title">Obsidian Celestial Starlight (Tailless)</div>
          <div class="card-tag">4-Point Starlight Core & Violet Halo</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/tailless_all_cursors_preview.png';
  await page.screenshot({ path: outPath });
  console.log('Saved to:', outPath);
  await browser.close();
}

main().catch(console.error);
