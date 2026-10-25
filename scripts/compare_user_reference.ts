import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME_PATHS = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });

  const userRefPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/.user_uploaded/media_1790924840854.png';
  const userRefBase64 = fs.readFileSync(userRefPath).toString('base64');

  // Option A: Direct proportional match to the reference image (apex at top-left, 40-deg angle)
  // Apex: (16, 8), Bottom-Left: (20.5, 28.5), Right-Tip: (31.5, 20), Notch: (24.5, 22.5)
  const svgOptionA = `
    <svg width="240" height="240" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="neon-rim-a" x1="16" y1="29" x2="31" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="25%" stop-color="#4f46e5" />
          <stop offset="65%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
        <linearGradient id="dark-core-a" x1="17" y1="9" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0a0c16" />
          <stop offset="50%" stop-color="#121424" />
          <stop offset="100%" stop-color="#1a1835" />
        </linearGradient>
        <linearGradient id="dish-shade-a" x1="21" y1="18" x2="29" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#18152e" stop-opacity="0.3" />
          <stop offset="60%" stop-color="#2d1c52" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#4a2574" stop-opacity="0.95" />
        </linearGradient>
        <filter id="soft-glow-a" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="shadow-a" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#090b14" flood-opacity="0.4" />
        </filter>
      </defs>

      <!-- Outer Glow -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            stroke="url(#neon-rim-a)" stroke-width="3.8" stroke-linejoin="round" stroke-linecap="round" 
            filter="url(#soft-glow-a)" opacity="0.65" />

      <!-- Main Body + Rim -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            fill="url(#dark-core-a)" stroke="url(#neon-rim-a)" stroke-width="2.2" 
            stroke-linejoin="round" stroke-linecap="round" filter="url(#shadow-a)" />

      <!-- 3D Scooped Inner Dish Facet -->
      <path d="M 17 11.5 L 29.5 19.5 C 27.5 20.5, 25.5 22, 24.5 22 C 23.2 22, 22.2 24.5, 21.2 27 Z" 
            fill="url(#dish-shade-a)" />

      <!-- Specular Highlights -->
      <path d="M 16 8.5 L 20 27" stroke="#93c5fd" stroke-width="0.75" stroke-linecap="round" opacity="0.85" />
      <path d="M 16.5 8.5 L 30 19.5" stroke="#f0abfc" stroke-width="0.75" stroke-linecap="round" opacity="0.9" />
      <circle cx="16" cy="8" r="0.6" fill="#ffffff" />
    </svg>
  `;

  // Option B: Traditional OS-aligned delta (vertical left edge, rotated ~15 deg so tip is strictly {16,8})
  // Apex: (16, 8), Left-Tip: (14, 27.5), Right-Tip: (29.5, 21.5), Notch: (21, 20)
  const svgOptionB = `
    <svg width="240" height="240" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="neon-rim-b" x1="13" y1="28" x2="30" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="30%" stop-color="#4f46e5" />
          <stop offset="70%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
        <linearGradient id="dark-core-b" x1="15" y1="9" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0a0c16" />
          <stop offset="50%" stop-color="#121424" />
          <stop offset="100%" stop-color="#1a1835" />
        </linearGradient>
        <linearGradient id="dish-shade-b" x1="19" y1="18" x2="27" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#18152e" stop-opacity="0.3" />
          <stop offset="60%" stop-color="#2d1c52" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#4a2574" stop-opacity="0.95" />
        </linearGradient>
        <filter id="soft-glow-b" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="shadow-b" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#090b14" flood-opacity="0.4" />
        </filter>
      </defs>

      <!-- Outer Glow -->
      <path d="M 16 8 L 29.5 21 C 26.8 20.8, 23.5 19.8, 21.2 19.8 C 18.5 20.2, 15.8 23.8, 14.2 27.5 Z" 
            stroke="url(#neon-rim-b)" stroke-width="3.8" stroke-linejoin="round" stroke-linecap="round" 
            filter="url(#soft-glow-b)" opacity="0.65" />

      <!-- Main Body + Rim -->
      <path d="M 16 8 L 29.5 21 C 26.8 20.8, 23.5 19.8, 21.2 19.8 C 18.5 20.2, 15.8 23.8, 14.2 27.5 Z" 
            fill="url(#dark-core-b)" stroke="url(#neon-rim-b)" stroke-width="2.2" 
            stroke-linejoin="round" stroke-linecap="round" filter="url(#shadow-b)" />

      <!-- 3D Scooped Inner Dish Facet -->
      <path d="M 16.8 11 L 27.8 20.2 C 25.5 20.2, 23 19.8, 21.2 19.8 C 18.8 20.2, 16.5 23.5, 15.2 26.2 Z" 
            fill="url(#dish-shade-b)" />

      <!-- Specular Highlights -->
      <path d="M 16 8.5 L 14.5 26" stroke="#93c5fd" stroke-width="0.75" stroke-linecap="round" opacity="0.85" />
      <path d="M 16.5 8.5 L 28.5 20.5" stroke="#f0abfc" stroke-width="0.75" stroke-linecap="round" opacity="0.9" />
      <circle cx="16" cy="8" r="0.6" fill="#ffffff" />
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
          padding: 30px;
          background: #0d1117;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          color: #f0f6fc;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .row {
          display: flex;
          gap: 30px;
          align-items: center;
        }
        .card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          background: #161b22;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid #30363d;
        }
        .box {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border-radius: 12px;
        }
        .title {
          font-size: 14px;
          font-weight: 600;
          color: #e6edf3;
        }
        .desc {
          font-size: 12px;
          color: #8b949e;
          text-align: center;
          max-width: 200px;
        }
      </style>
    </head>
    <body>
      <h2 style="margin: 0;">Precision Geometric Tuning</h2>
      <div class="row">
        <div class="card">
          <div class="box">
            <img src="data:image/png;base64,${userRefBase64}" style="width: 170px; height: 170px; object-fit: contain;" />
          </div>
          <span class="title">User Reference</span>
          <span class="desc">Original pure tailless delta figure</span>
        </div>

        <div class="card">
          <div class="box">
            ${svgOptionA}
          </div>
          <span class="title">Option A: 100% Proportional Tilt</span>
          <span class="desc">Direct reference angle & 40° apex</span>
        </div>

        <div class="card">
          <div class="box">
            ${svgOptionB}
          </div>
          <span class="title">Option B: OS Screen-Aligned Delta</span>
          <span class="desc">Optimized for standard mouse cursor feel</span>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/tuning_comparison.png';
  await page.screenshot({ path: outPath });
  console.log('Saved tuning comparison to:', outPath);
  await browser.close();
}

main().catch(console.error);
