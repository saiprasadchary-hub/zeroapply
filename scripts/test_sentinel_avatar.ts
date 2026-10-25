import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });

  const sentinelSvg = (themeMode = 'dark') => `
    <svg width="240" height="240" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Ceramic White Shell Gradient -->
        <linearGradient id="st-shell" x1="38" y1="31" x2="52" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>

        <!-- Deep Obsidian Visor Gradient -->
        <linearGradient id="st-visor" x1="45" y1="36" x2="45" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#090d16" />
          <stop offset="50%" stop-color="#050811" />
          <stop offset="100%" stop-color="#02040a" />
        </linearGradient>

        <!-- Titanium Ear Nodes -->
        <linearGradient id="st-node" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>

        <!-- Glowing Eye Neon Filter -->
        <filter id="st-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="st-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.0" result="blur" />
        </filter>

        <!-- Neon Aurora Delta Pointer for Combined Rig Preview -->
        <linearGradient id="st-nd-rim" x1="16" y1="29" x2="31" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="25%" stop-color="#4f46e5" />
          <stop offset="65%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
        <linearGradient id="st-nd-core" x1="17" y1="9" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0a0c16" />
          <stop offset="50%" stop-color="#121424" />
          <stop offset="100%" stop-color="#1a1835" />
        </linearGradient>
        <linearGradient id="st-nd-dish" x1="21" y1="18" x2="29" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#18152e" stop-opacity="0.3" />
          <stop offset="60%" stop-color="#2d1c52" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#4a2574" stop-opacity="0.95" />
        </linearGradient>
        <filter id="st-nd-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- 1. TAILLESS DELTA POINTER (Near-Triangle Shape) -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            stroke="url(#st-nd-rim)" stroke-width="3.8" stroke-linejoin="round" stroke-linecap="round" 
            filter="url(#st-nd-glow)" opacity="0.65" />
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            fill="url(#st-nd-core)" stroke="url(#st-nd-rim)" stroke-width="2.2" 
            stroke-linejoin="round" stroke-linecap="round" />
      <path d="M 17 11.5 L 29.5 19.5 C 27.5 20.5, 25.5 22, 24.5 22 C 23.2 22, 22.2 24.5, 21.2 27 Z" 
            fill="url(#st-nd-dish)" />
      <path d="M 16 8.5 L 20 27" stroke="#93c5fd" stroke-width="0.75" stroke-linecap="round" opacity="0.85" />
      <path d="M 16.5 8.5 L 30 19.5" stroke="#f0abfc" stroke-width="0.75" stroke-linecap="round" opacity="0.9" />
      <circle cx="16" cy="8" r="0.65" fill="#ffffff" />

      <!-- 2. AERO SENTINEL COMPANION AVATAR (NEW 3RD FLAGSHIP AVATAR) -->
      <!-- Ground Contact Ambient Drop-Shadow -->
      <ellipse cx="45" cy="49" rx="10" ry="3.5" fill="#020617" opacity="0.32" filter="url(#st-shadow)" />

      <!-- Floating Left Magnetic Anti-Gravity Thruster Fin -->
      <g>
        <path d="M 30.5 37 L 33.5 38.5 L 32.5 43.5 L 29.5 41 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="0.7" stroke-linejoin="round" />
        <line x1="31" y1="39" x2="32" y2="42" stroke="#38bdf8" stroke-width="0.75" stroke-linecap="round" />
      </g>

      <!-- Floating Right Magnetic Anti-Gravity Thruster Fin -->
      <g>
        <path d="M 59.5 37 L 56.5 38.5 L 57.5 43.5 L 60.5 41 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="0.7" stroke-linejoin="round" />
        <line x1="59" y1="39" x2="58" y2="42" stroke="#38bdf8" stroke-width="0.75" stroke-linecap="round" />
      </g>

      <!-- Main Sculpted Aerodynamic Porcelain Droid Head Dome -->
      <ellipse cx="45" cy="41" rx="10.8" ry="9.2" fill="url(#st-shell)" stroke="#cbd5e1" stroke-width="1.1" stroke-linejoin="round" />
      <!-- Titanium Forehead Ridge Brow -->
      <path d="M 39 34 C 42 32.5 48 32.5 51 34" stroke="#64748b" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.85" />

      <!-- Ear Audio Nodes / Side Pivot Rings -->
      <circle cx="34.8" cy="41.2" r="1.9" fill="url(#st-node)" stroke="#38bdf8" stroke-width="0.6" />
      <circle cx="34.8" cy="41.2" r="0.6" fill="#38bdf8" />
      <circle cx="55.2" cy="41.2" r="1.9" fill="url(#st-node)" stroke="#38bdf8" stroke-width="0.6" />
      <circle cx="55.2" cy="41.2" r="0.6" fill="#38bdf8" />

      <!-- Panoramic Curved Obsidian Glass Visor -->
      <rect x="37" y="36.8" width="16" height="9.2" rx="4.6" fill="url(#st-visor)" stroke="#09090b" stroke-width="0.8" />
      <!-- Visor Specular Glass Glint -->
      <path d="M 39 38.2 C 42 37.4 48 37.4 51 38.2" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.75" />

      <!-- Expressive Animated Glowing Cyan LED Visor Eyes -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: center;">
        <!-- Left Cyan LED Crescent Eye -->
        <path d="M 40.2 41.2 C 40.2 39.2 42.8 39.2 42.8 41.2" stroke="#00f0ff" stroke-width="1.6" stroke-linecap="round" fill="none" filter="url(#st-eye-glow)" />
        <circle cx="41.5" cy="40.2" r="0.5" fill="#ffffff" />

        <!-- Right Cyan LED Crescent Eye -->
        <path d="M 47.2 41.2 C 47.2 39.2 49.8 39.2 49.8 41.2" stroke="#00f0ff" stroke-width="1.6" stroke-linecap="round" fill="none" filter="url(#st-eye-glow)" />
        <circle cx="48.5" cy="40.2" r="0.5" fill="#ffffff" />
      </g>
    </svg>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New 3rd Companion Avatar: Aero Sentinel Droid</title>
      <style>
        body {
          margin: 0;
          padding: 40px;
          background: #090d16;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .header {
          text-align: center;
          max-width: 700px;
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 26px;
          background: linear-gradient(135deg, #ffffff 0%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header p {
          margin: 0;
          color: #94a3b8;
          font-size: 14.5px;
        }
        .row {
          display: flex;
          gap: 32px;
          align-items: center;
        }
        .card {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .stage-dark {
          width: 240px;
          height: 240px;
          background: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .stage-light {
          width: 240px;
          height: 240px;
          background: #ffffff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.04);
        }
        .badge {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 9999px;
          background: rgba(0, 240, 255, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(0, 240, 255, 0.25);
        }
        .title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
        }
        .desc {
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
          max-width: 220px;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Brand-New Companion Avatar: Aero Sentinel Droid</h1>
        <p>Combining aerodynamic sculpted white porcelain, deep panoramic obsidian glass visor, glowing cyan LED crescent eyes, and floating magnetic anti-gravity thruster fins.</p>
      </div>

      <div class="row">
        <div class="card">
          <div class="stage-dark">${sentinelSvg('dark')}</div>
          <span class="badge">AERO SENTINEL • DARK VIEWPORT</span>
          <span class="title">Cyber Neon Delta + Aero Sentinel</span>
          <span class="desc">High-contrast futuristic pair with zero stem delta & floating droid familiar.</span>
        </div>

        <div class="card">
          <div class="stage-light">${sentinelSvg('light')}</div>
          <span class="badge" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">AERO SENTINEL • LIGHT VIEWPORT</span>
          <span class="title">Crisp Light Mode Performance</span>
          <span class="desc">Flawless visibility against bright white browser pages and documents.</span>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/test_sentinel_avatar_preview.png';
  await page.screenshot({ path: outPath });
  console.log('Saved preview to:', outPath);
  await browser.close();
}

main().catch(console.error);
