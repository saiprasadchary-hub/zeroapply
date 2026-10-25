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
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });

  // Tailless Delta Arrowhead SVG path
  // Apex at (16, 8), Right tip at (29, 20.5), Left tip at (13.5, 26.5), Cleft at (19.8, 19)
  const deltaArrowSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 64 64" fill="none">
      <defs>
        <!-- Neon Violet to Cyan Rim Gradient -->
        <linearGradient id="neon-rim" x1="13" y1="26" x2="29" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="30%" stop-color="#3b82f6" />
          <stop offset="70%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
        <!-- Deep Obsidian Dark Core -->
        <linearGradient id="obsidian-core" x1="16" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0a0c16" />
          <stop offset="60%" stop-color="#0d1124" />
          <stop offset="100%" stop-color="#171630" />
        </linearGradient>
        <!-- Inner Dish Bevel Shadow -->
        <linearGradient id="dish-bevel" x1="16" y1="12" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.7" />
          <stop offset="50%" stop-color="#1e1b4b" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#c084fc" stop-opacity="0.15" />
        </linearGradient>
        <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
        </filter>
        <filter id="outer-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>

      <!-- Soft Ambient Glow Under Rim -->
      <path d="M 16 8 L 29.5 20 C 26.5 19.5, 22.5 18.5, 19.8 19 C 17.5 19.4, 15 22, 13.5 26.5 Z" 
            stroke="url(#neon-rim)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#soft-glow)" opacity="0.6" />

      <!-- Main Tailless Delta Arrowhead (With Outer Glow Rim) -->
      <path d="M 16 8 L 29.5 20 C 26.5 19.5, 22.5 18.5, 19.8 19 C 17.5 19.4, 15 22, 13.5 26.5 Z" 
            fill="url(#obsidian-core)" stroke="url(#neon-rim)" stroke-width="1.8" stroke-linejoin="round" filter="url(#outer-shadow)" />

      <!-- Inner Scooped Dish Facet -->
      <path d="M 16.5 10 L 27.8 19.5 C 25.2 19.2, 22 18.5, 19.8 19 C 17.8 19.4, 15.5 21.5, 14.5 24.8 Z" 
            fill="url(#dish-bevel)" />

      <!-- Specular Leading Edge Highlights -->
      <path d="M 16 8.5 L 13.8 25" stroke="#93c5fd" stroke-width="0.75" stroke-linecap="round" opacity="0.9" />
      <path d="M 16.2 8.5 L 28.5 19.5" stroke="#f5d0fe" stroke-width="0.75" stroke-linecap="round" opacity="0.9" />
      
      <!-- Razor Tip Specular Catchlight at {16, 8} -->
      <circle cx="16" cy="8" r="0.75" fill="#ffffff" />
    </svg>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:40px; background:#0b0f19; color:white; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; gap:20px;">
      <h2 style="margin:0;">Tailless Real Delta Cursor Preview (No Stem / No Tail)</h2>
      <div style="display:flex; gap:40px; align-items:center;">
        <div style="background:#131826; padding:30px; border-radius:20px; border:1px solid #1f293d; text-align:center;">
          <div style="font-size:12px; color:#94a3b8; margin-bottom:10px;">Magnified 3x Vector</div>
          ${deltaArrowSvg}
        </div>
        <div style="background:#ffffff; padding:30px; border-radius:20px; text-align:center;">
          <div style="font-size:12px; color:#475569; margin-bottom:10px;">On Light Surface</div>
          ${deltaArrowSvg}
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/test_tailless_cursor.png';
  await page.screenshot({ path: outPath });
  console.log('Saved to:', outPath);
  await browser.close();
}

main().catch(console.error);
