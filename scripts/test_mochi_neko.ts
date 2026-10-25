import fs from 'node:fs';
import path from 'node:path';
import {
  getCustomCombinedCursorMarkup,
  getAvatarOption,
  CURSOR_AVATAR_OPTIONS,
  CURSOR_POINTER_OPTIONS,
} from '../src/cursors';

const nekoOption = getAvatarOption('avatar_mochi_neko');
const soloAvatarSvg = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_mochi_neko', 'solo-neko', 'avatar');
const combinedNeonDeltaSvg = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_mochi_neko', 'comb-neon-neko', 'combined');
const combinedCeramicSvg = getCustomCombinedCursorMarkup('pointer_orbital_ceramic', 'avatar_mochi_neko', 'comb-ceramic-neko', 'combined');
const combinedStarlightSvg = getCustomCombinedCursorMarkup('pointer_obsidian_starlight', 'avatar_mochi_neko', 'comb-star-neko', 'combined');
const combinedAeroSvg = getCustomCombinedCursorMarkup('pointer_sky_aero', 'avatar_mochi_neko', 'comb-aero-neko', 'combined');

const paintedNekoSvg = (prefix = 'pn') => `
<svg width="240" height="240" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 1. Rich Painted Anime Twilight Body Gradient -->
    <radialGradient id="${prefix}-body" cx="42%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#52317c" />
      <stop offset="38%" stop-color="#3b1d5d" />
      <stop offset="72%" stop-color="#24103e" />
      <stop offset="92%" stop-color="#160829" />
      <stop offset="100%" stop-color="#0c0317" />
    </radialGradient>

    <!-- 2. Luminous Painted Anime Rim Light (Sakura to Sky Cyan) -->
    <linearGradient id="${prefix}-rim" x1="32" y1="22" x2="58" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f472b6" />
      <stop offset="45%" stop-color="#c084fc" />
      <stop offset="80%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <!-- 3. Painted Inner Ear: Warm Peach-Blossom to Vivid Rose -->
    <linearGradient id="${prefix}-ear-inner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbcfe8" />
      <stop offset="35%" stop-color="#f472b6" />
      <stop offset="75%" stop-color="#e11d48" />
      <stop offset="100%" stop-color="#9f1239" />
    </linearGradient>

    <!-- 4. Jewel Anime Eye Iris: Makoto Shinkai / Kyoto Animation Starry Gradient -->
    <linearGradient id="${prefix}-eye-iris" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#120626" />
      <stop offset="35%" stop-color="#3b0764" />
      <stop offset="60%" stop-color="#a21caf" />
      <stop offset="80%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <!-- 5. Watercolor Airbrushed Cheek Blush -->
    <radialGradient id="${prefix}-blush" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fb7185" stop-opacity="0.85" />
      <stop offset="55%" stop-color="#fda4af" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#fda4af" stop-opacity="0" />
    </radialGradient>

    <!-- 6. Golden Bell / Forehead Star -->
    <linearGradient id="${prefix}-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>

    <!-- 7. Crimson Silk Mascot Ribbon -->
    <linearGradient id="${prefix}-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e11d48" />
      <stop offset="50%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#be123c" />
    </linearGradient>

    <!-- Whisker Glow Gradients -->
    <linearGradient id="${prefix}-whisk-l" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f472b6" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#f472b6" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="${prefix}-whisk-r" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#f472b6" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#f472b6" stop-opacity="0.95" />
    </linearGradient>

    <filter id="${prefix}-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="0.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="${prefix}-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.0" result="blur" />
    </filter>
  </defs>

  <!-- Ambient Ground Shadow -->
  <ellipse cx="45" cy="49" rx="11" ry="3.5" fill="#150826" opacity="0.35" filter="url(#${prefix}-shadow)" />

  <!-- Left Sculpted Mochi Cat Ear (Interactive Living Animated Ear) -->
  <g class="za-neko-ear za-neko-ear-left za-avatar-part">
    <!-- Outer Painted Ear Shell with Rim Light -->
    <path d="M 37.5 35.5 L 33.2 23.5 C 32.8 22.4 34.0 21.6 34.9 22.3 L 41.5 30.5 Z" 
          fill="url(#${prefix}-body)" stroke="url(#${prefix}-rim)" stroke-width="0.9" stroke-linejoin="round" />
    <!-- Inner Ear Warm Peach Blossom Layer -->
    <path d="M 37.0 34.0 L 34.5 25.2 C 34.3 24.6 35.1 24.1 35.6 24.5 L 40.0 30.8 Z" 
          fill="url(#${prefix}-ear-inner)" opacity="0.95" />
    <!-- Painted Fluffy Anime Inner Fur Tufts -->
    <path d="M 35.8 33.0 Q 36.6 29.5 37.8 31.8 Q 38.6 28.5 39.5 31.0 Q 39.8 32.5 38.5 33.8 Z" 
          fill="#fff5f8" opacity="0.95" />
  </g>

  <!-- Right Sculpted Mochi Cat Ear (Interactive Living Animated Ear) -->
  <g class="za-neko-ear za-neko-ear-right za-avatar-part">
    <!-- Outer Painted Ear Shell with Rim Light -->
    <path d="M 52.5 35.5 L 56.8 23.5 C 57.2 22.4 56.0 21.6 55.1 22.3 L 48.5 30.5 Z" 
          fill="url(#${prefix}-body)" stroke="url(#${prefix}-rim)" stroke-width="0.9" stroke-linejoin="round" />
    <!-- Inner Ear Warm Peach Blossom Layer -->
    <path d="M 53.0 34.0 L 55.5 25.2 C 55.7 24.6 54.9 24.1 54.4 24.5 L 50.0 30.8 Z" 
          fill="url(#${prefix}-ear-inner)" opacity="0.95" />
    <!-- Painted Fluffy Anime Inner Fur Tufts -->
    <path d="M 54.2 33.0 Q 53.4 29.5 52.2 31.8 Q 51.4 28.5 50.5 31.0 Q 50.2 32.5 51.5 33.8 Z" 
          fill="#fff5f8" opacity="0.95" />
  </g>

  <!-- Main Painted Mochi Head Dome -->
  <ellipse cx="45" cy="40.8" rx="11.4" ry="9.6" 
           fill="url(#${prefix}-body)" stroke="url(#${prefix}-rim)" stroke-width="1.1" stroke-linejoin="round" />

  <!-- Soft Painted Gouache Forehead Sheen -->
  <path d="M 38 34.2 C 41.5 32.0 48.5 32.0 52 34.2 C 48.5 33.0 41.5 33.0 38 34.2 Z" 
        fill="#ffffff" opacity="0.5" />
  <circle cx="45" cy="33.8" r="0.8" fill="#ffffff" opacity="0.75" />

  <!-- Whisker Neon Light Guides (Tapered painted curves) -->
  <path d="M 30.0 39.5 Q 33.5 40.2 36.5 40.6" stroke="url(#${prefix}-whisk-l)" stroke-width="0.8" stroke-linecap="round" fill="none" />
  <path d="M 30.5 42.2 Q 33.8 42.4 36.8 42.0" stroke="url(#${prefix}-whisk-l)" stroke-width="0.8" stroke-linecap="round" fill="none" />
  <path d="M 60.0 39.5 Q 56.5 40.2 53.5 40.6" stroke="url(#${prefix}-whisk-r)" stroke-width="0.8" stroke-linecap="round" fill="none" />
  <path d="M 59.5 42.2 Q 56.2 42.4 53.2 42.0" stroke="url(#${prefix}-whisk-r)" stroke-width="0.8" stroke-linecap="round" fill="none" />

  <!-- Watercolor Airbrushed Cheek Blush (Radial Gradient + Kawaii Blush Dashes) -->
  <circle cx="36.5" cy="42.5" r="3.0" fill="url(#${prefix}-blush)" />
  <line x1="35.2" y1="41.8" x2="37.0" y2="43.4" stroke="#f43f5e" stroke-width="0.6" stroke-linecap="round" opacity="0.85" />
  <line x1="37.0" y1="41.8" x2="38.8" y2="43.4" stroke="#f43f5e" stroke-width="0.6" stroke-linecap="round" opacity="0.85" />

  <circle cx="53.5" cy="42.5" r="3.0" fill="url(#${prefix}-blush)" />
  <line x1="51.2" y1="41.8" x2="53.0" y2="43.4" stroke="#f43f5e" stroke-width="0.6" stroke-linecap="round" opacity="0.85" />
  <line x1="53.0" y1="41.8" x2="54.8" y2="43.4" stroke="#f43f5e" stroke-width="0.6" stroke-linecap="round" opacity="0.85" />

  <!-- Tiny Painted Heart Nose with Gloss Catchlight -->
  <polygon points="44.3,41.6 45.7,41.6 45.0,42.5" fill="#f43f5e" />
  <circle cx="44.8" cy="41.7" r="0.3" fill="#ffffff" />

  <!-- Adorable ω Cat Smile -->
  <path d="M 43.6 43.0 Q 44.3 43.8 45.0 43.2 Q 45.7 43.8 46.4 43.0" 
        stroke="#f472b6" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.95" />

  <!-- Forehead Luminous Anime Talisman Star Gem -->
  <g filter="url(#${prefix}-glow)">
    <path d="M 45 31.8 Q 45 33.2 46.4 33.2 Q 45 33.2 45 34.6 Q 45 33.2 43.6 33.2 Q 45 33.2 45 31.8 Z" 
          fill="url(#${prefix}-gold)" />
    <circle cx="45" cy="33.2" r="0.6" fill="#ffffff" />
  </g>

  <!-- Cute Crimson Mascot Ribbon Collar & Golden Bell -->
  <path d="M 39.5 48.0 Q 45.0 49.8 50.5 48.0 Q 45.0 51.0 39.5 48.0 Z" 
        fill="url(#${prefix}-ribbon)" stroke="#9f1239" stroke-width="0.4" />
  <circle cx="45.0" cy="49.8" r="1.6" fill="url(#${prefix}-gold)" stroke="#78350f" stroke-width="0.35" />
  <circle cx="44.6" cy="49.3" r="0.4" fill="#ffffff" />
  <line x1="43.8" y1="50.2" x2="46.2" y2="50.2" stroke="#78350f" stroke-width="0.3" />

  <!-- Expressive Living Anime Starry Eyes (Blinks, Tracks & Glances) -->
  <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: center;">
    <!-- LEFT EYE: Painted Starry Anime Jewel Lens -->
    <!-- Base Iris -->
    <ellipse cx="40.5" cy="38.5" rx="2.5" ry="3.3" fill="url(#${prefix}-eye-iris)" stroke="#f472b6" stroke-width="0.4" />
    <!-- Upper Anime Eyelash Line -->
    <path d="M 37.8 36.4 C 39.2 35.0 42.0 35.0 43.2 36.4" stroke="#120626" stroke-width="1.1" stroke-linecap="round" fill="none" />
    <!-- Primary Bright Anime Catchlight -->
    <circle cx="39.6" cy="37.0" r="1.1" fill="#ffffff" />
    <!-- Secondary Bottom Cyan Horizon Light Arc -->
    <path d="M 39.2 40.2 C 40.0 40.8 41.2 40.8 42.0 40.2" stroke="#38bdf8" stroke-width="0.6" stroke-linecap="round" fill="none" opacity="0.9" />
    <!-- Star Sparkle Glint -->
    <path d="M 41.6 39.2 L 41.9 39.7 L 42.4 39.9 L 41.9 40.1 L 41.6 40.6 L 41.3 40.1 L 40.8 39.9 L 41.3 39.7 Z" fill="#ffffff" opacity="0.95" />
    <circle cx="42.2" cy="37.2" r="0.38" fill="#ffffff" opacity="0.85" />

    <!-- RIGHT EYE: Painted Starry Anime Jewel Lens -->
    <!-- Base Iris -->
    <ellipse cx="49.5" cy="38.5" rx="2.5" ry="3.3" fill="url(#${prefix}-eye-iris)" stroke="#f472b6" stroke-width="0.4" />
    <!-- Upper Anime Eyelash Line -->
    <path d="M 46.8 36.4 C 48.0 35.0 50.8 35.0 52.2 36.4" stroke="#120626" stroke-width="1.1" stroke-linecap="round" fill="none" />
    <!-- Primary Bright Anime Catchlight -->
    <circle cx="48.6" cy="37.0" r="1.1" fill="#ffffff" />
    <!-- Secondary Bottom Cyan Horizon Light Arc -->
    <path d="M 48.2 40.2 C 49.0 40.8 50.2 40.8 51.0 40.2" stroke="#38bdf8" stroke-width="0.6" stroke-linecap="round" fill="none" opacity="0.9" />
    <!-- Star Sparkle Glint -->
    <path d="M 50.6 39.2 L 50.9 39.7 L 51.4 39.9 L 50.9 40.1 L 50.6 40.6 L 50.3 40.1 L 49.8 39.9 L 50.3 39.7 Z" fill="#ffffff" opacity="0.95" />
    <circle cx="51.2" cy="37.2" r="0.38" fill="#ffffff" opacity="0.85" />
  </g>
</svg>
`;


const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Companion Avatar: Mochi Cyber Neko</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: #090a0f;
      color: #f1f5f9;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(244, 114, 182, 0.15);
      border: 1px solid rgba(244, 114, 182, 0.4);
      color: #f472b6;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #f472b6 60%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    p.desc {
      color: #94a3b8;
      font-size: 15px;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .showcase {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    .card {
      background: #12141c;
      border: 1px solid #1e2230;
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: #f472b6;
    }
    .card-preview {
      width: 140px;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle, #1a162b 0%, #0d0e15 100%);
      border: 1px solid #282a3a;
      border-radius: 16px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .card-preview.light {
      background: radial-gradient(circle, #ffffff 0%, #f1f5f9 100%);
      border-color: #cbd5e1;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 4px;
    }
    .card-sub {
      font-size: 12px;
      color: #f472b6;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }
    .feature-chip {
      font-size: 10px;
      background: #1e1b2e;
      border: 1px solid #35294a;
      color: #e2e8f0;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 24px;
    }
    @media (max-width: 768px) {
      .comparison-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .mini-card {
      background: #12141c;
      border: 1px solid #1e2230;
      border-radius: 14px;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .mini-preview {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .mini-name {
      font-size: 12px;
      font-weight: 700;
      color: #f8fafc;
    }
    .mini-tag {
      font-size: 9px;
      color: #94a3b8;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">New 4th Companion Bot</div>
      <h1>Mochi Cyber Neko</h1>
      <p class="desc">${nekoOption.description}</p>
    </div>

    <div class="showcase">
      <!-- Solo Avatar (Dark Glass) -->
      <div class="card">
        <div class="card-preview">
          <div style="transform: scale(1.6);">${paintedNekoSvg('demo')}</div>
        </div>
        <div class="card-title">Mochi Cyber Neko</div>
        <div class="card-sub">Autonomous Kawaii Companion</div>
        <div class="features">
          ${nekoOption.features.map(f => `<span class="feature-chip">${f}</span>`).join('')}
        </div>
      </div>

      <!-- Combined: Cyber Neon Aurora Delta + Mochi Neko -->
      <div class="card">
        <div class="card-preview">
          <div style="transform: scale(1.6);">${combinedNeonDeltaSvg}</div>
        </div>
        <div class="card-title">Neon Aurora + Mochi Neko</div>
        <div class="card-sub">Flagship Tailless Cyber Rig</div>
        <div class="features">
          <span class="feature-chip">Electric Neon Rim</span>
          <span class="feature-chip">Living Starry Eyes</span>
          <span class="feature-chip">Interactive Blinks</span>
        </div>
      </div>

      <!-- Combined: Orbital Nova Ceramic + Mochi Neko -->
      <div class="card">
        <div class="card-preview light">
          <div style="transform: scale(1.6);">${combinedCeramicSvg}</div>
        </div>
        <div class="card-title">Nova Ceramic + Mochi Neko</div>
        <div class="card-sub">High-Contrast Light Rig</div>
        <div class="features">
          <span class="feature-chip">White Ceramic Shell</span>
          <span class="feature-chip">Pearlescent Neko</span>
          <span class="feature-chip">Blush Cheeks</span>
        </div>
      </div>
    </div>

    <!-- All 4 Avatars Comparison -->
    <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #cbd5e1; text-align: center;">ZeroApply Avatar Family (4 Distinct Personas)</h2>
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-bottom: 16px;">Each companion has a completely distinct silhouette, aesthetic identity, and visual charm.</p>
    <div class="comparison-grid">
      ${CURSOR_AVATAR_OPTIONS.map((avt) => {
        const svg = getCustomCombinedCursorMarkup('pointer_stealth', avt.id, 'comp-' + avt.id, 'avatar');
        return `
          <div class="mini-card" style="${avt.id === 'avatar_mochi_neko' ? 'border-color: #f472b6; background: #1a1322;' : ''}">
            <div class="mini-preview" style="transform: scale(1.15);">
              ${svg}
            </div>
            <div class="mini-name">${avt.name}</div>
            <div class="mini-tag">${avt.tag}</div>
          </div>
        `;
      }).join('')}
    </div>
  </div>
</body>
</html>
`;

const outPath = path.join(process.cwd(), 'scripts', 'mochi_neko_preview.html');
fs.writeFileSync(outPath, html, 'utf-8');
console.log('✅ Generated preview at:', outPath);

async function capture() {
  try {
    const { chromium } = await import('playwright-core');
    const CHROME_PATHS = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
    if (chromePath) {
      const browser = await chromium.launch({ executablePath: chromePath, headless: true });
      const page = await browser.newPage({ viewport: { width: 950, height: 750 } });
      await page.goto('file://' + outPath);
      await page.screenshot({ path: path.join(process.cwd(), 'scripts', 'mochi_neko_preview.png') });
      await browser.close();
      console.log('✅ Captured preview PNG at scripts/mochi_neko_preview.png');
    }
  } catch (err) {
    console.log('Screenshot skip:', (err as Error).message);
  }
}
capture();

