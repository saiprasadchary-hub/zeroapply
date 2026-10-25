import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import {
  CURSOR_POINTER_OPTIONS,
  CURSOR_AVATAR_OPTIONS,
  getPointerOption,
  getAvatarOption,
  getCustomCombinedCursorMarkup,
} from '../src/cursors';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) {
    console.error('No Chrome binary found');
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1100, height: 1120 },
  });

  const neonDeltaPointer = getPointerOption('pointer_neon_delta');
  const stealthPointer = getPointerOption('pointer_stealth');
  const aeroPointer = getPointerOption('pointer_sky_aero');
  const ceramicPointer = getPointerOption('pointer_orbital_ceramic');
  const starlightPointer = getPointerOption('pointer_obsidian_starlight');
  const grokAvatar = getAvatarOption('avatar_grok_bot');
  const cloudAvatar = getAvatarOption('avatar_cloud_bot');
  const sentinelAvatar = getAvatarOption('avatar_sentinel_bot');

  // Trigger preview icons
  const neonDeltaPtrSvg = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_grok_bot', 'trig-p0', 'cursor');
  const stealthPtrSvg = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_grok_bot', 'trig-p1', 'cursor');
  const aeroPtrSvg = getCustomCombinedCursorMarkup('pointer_sky_aero', 'avatar_grok_bot', 'trig-p2', 'cursor');
  const ceramicPtrSvg = getCustomCombinedCursorMarkup('pointer_orbital_ceramic', 'avatar_grok_bot', 'trig-p3', 'cursor');
  const starlightPtrSvg = getCustomCombinedCursorMarkup('pointer_obsidian_starlight', 'avatar_grok_bot', 'trig-p4', 'cursor');
  const grokAvtSvg = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_grok_bot', 'trig-a1', 'avatar');
  const cloudAvtSvg = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_cloud_bot', 'trig-a2', 'avatar');
  const sentinelAvtSvg = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_sentinel_bot', 'trig-a3', 'avatar');

  // Live Stage Combined
  const neonSentinelLiveSvg = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_sentinel_bot', 'stage-neon-sentinel', 'combined');
  const ceramicGrokLiveSvg = getCustomCombinedCursorMarkup('pointer_orbital_ceramic', 'avatar_grok_bot', 'stage-ceramic-grok', 'combined');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Visual Agent Cursor Studio - Google & GitHub Style Dropdowns</title>
      <style>
        body {
          margin: 0;
          padding: 32px;
          background: #f6f8fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #202124;
          display: flex;
          justify-content: center;
        }
        .studio-card {
          width: 880px;
          background: #ffffff;
          border: 1px solid #d0d7de;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(140, 149, 159, 0.12);
          padding: 28px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 18px;
          border-bottom: 1px solid #eaeef2;
        }
        .header-left {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .sparkle-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ddf4ff;
          color: #0969da;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 1px solid #b6e3ff;
          flex-shrink: 0;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #1f2328;
          margin: 0 0 3px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 9px;
          border-radius: 999px;
          background: #ddf4ff;
          color: #0969da;
          border: 1px solid #b6e3ff;
        }
        .subtitle {
          font-size: 12.5px;
          color: #656d76;
          margin: 0;
        }
        .status-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 13px;
          border-radius: 999px;
          background: #dafbe1;
          color: #1a7f37;
          border: 1px solid #aceebb;
          font-size: 11.5px;
          font-weight: 600;
        }
        .pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #1a7f37;
        }

        /* Two Clean Dropdowns Grid */
        .dropdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .dropdown-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }
        .dropdown-label {
          font-size: 12px;
          font-weight: 700;
          color: #1f2328;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dropdown-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #ffffff;
          border: 1.5px solid #d0d7de;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(31, 35, 40, 0.04);
          cursor: pointer;
        }
        .dropdown-trigger.focused {
          border-color: #0969da;
          box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
        }
        .trigger-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tile-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #121417;
          border: 1px solid #2a2e36;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .trigger-name {
          font-size: 13px;
          font-weight: 700;
          color: #1f2328;
          line-height: 1.2;
        }
        .trigger-sub {
          font-size: 11px;
          color: #656d76;
          line-height: 1.2;
        }
        .chevron {
          font-size: 12px;
          color: #656d76;
        }

        /* Open Floating Dropdown Menu (Showing how GitHub & Google style dropdown looks) */
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 6px;
          background: #ffffff;
          border: 1px solid #d0d7de;
          border-radius: 14px;
          box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
          padding: 6px;
          z-index: 50;
        }
        .menu-header {
          font-size: 10px;
          font-weight: 700;
          color: #656d76;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 6px 10px;
          border-bottom: 1px solid #f6f8fa;
          margin-bottom: 4px;
        }
        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
        }
        .menu-item:hover {
          background: #f6f8fa;
        }
        .menu-item.selected {
          background: #ddf4ff;
          color: #0969da;
        }
        .item-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .item-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #1f2328;
        }
        .menu-item.selected .item-name {
          color: #0969da;
          font-weight: 700;
        }
        .item-tag {
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 999px;
          background: #f6f8fa;
          border: 1px solid #d0d7de;
          color: #656d76;
          margin-left: 6px;
        }
        .check-badge {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #0969da;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        }

        /* 3. Live Interactive Combination Stage & Movement Sandbox */
        .stage-box {
          background: #f6f8fa;
          border: 1px solid #d0d7de;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .stage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stage-title {
          font-size: 13px;
          font-weight: 700;
          color: #1f2328;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .stage-subtitle {
          font-size: 11.5px;
          color: #656d76;
          margin-top: 2px;
        }
        .stage-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mood-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          color: #656d76;
        }
        .mood-btn.active {
          background: #0969da;
          color: #ffffff;
          border-color: #0969da;
        }
        .element-toggle {
          display: flex;
          border: 1.5px solid #d0d7de;
          border-radius: 999px;
          padding: 2px;
          background: #ffffff;
          gap: 2px;
          box-shadow: 0 1px 2px rgba(31, 35, 40, 0.04);
        }
        .element-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 999px;
          color: #656d76;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .element-btn.active {
          background: #0969da;
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(9, 105, 218, 0.2);
        }
        .surface-toggle {
          display: flex;
          border: 1px solid #d0d7de;
          border-radius: 999px;
          padding: 2px;
          background: #ffffff;
        }
        .surface-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }
        .surface-icon.active {
          background: #1f2328;
          color: #ffffff;
        }
        .viewport-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 12px;
        }
        .viewport-panel {
          height: 150px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border: 1px solid #d0d7de;
          overflow: hidden;
        }
        .viewport-dark {
          background: #090b10;
          border-color: #1e2330;
        }
        .viewport-light {
          background: #ffffff;
          border-color: #d0d7de;
        }
        .hud-overlay {
          position: absolute;
          bottom: 8px;
          left: 12px;
          font-size: 10px;
          font-family: monospace;
          color: #8c959f;
        }
        .hud-badge {
          position: absolute;
          top: 8px;
          right: 12px;
          font-size: 10px;
          font-weight: 600;
          color: #1a7f37;
          background: #dafbe1;
          border: 1px solid #aceebb;
          padding: 2px 8px;
          border-radius: 999px;
        }
      </style>
    </head>
    <body>
      <div class="studio-card">
        <!-- 1. Header -->
        <div class="header">
          <div class="header-left">
            <div class="sparkle-icon">✦</div>
            <div>
              <div class="title">
                Visual Agent Cursor Studio
                <span class="badge">Google & GitHub Style</span>
              </div>
              <div class="subtitle">
                Select your wanted cursor pointer and companion avatar below to customize your live agent cursor.
              </div>
            </div>
          </div>
          <div class="status-chip">
            <div class="pulse-dot"></div>
            <span>Active on Agent: Precision Stealth + xAI Grok Bot</span>
          </div>
        </div>

        <!-- 2. The 2 Clean Dropdowns -->
        <div class="dropdown-grid">
          <!-- Dropdown 1: Select Cursor Pointer (Shown OPEN with 5 options including tailless delta pointers) -->
          <div class="dropdown-group">
            <div class="dropdown-label">
              <span>🖱️ Select Cursor Pointer</span>
              <span style="color: #656d76; font-size: 11px; font-weight: normal;">5 options</span>
            </div>
            <div class="dropdown-trigger focused">
              <div class="trigger-left">
                <div class="tile-icon">
                  <div style="transform: scale(0.75);">${neonDeltaPtrSvg}</div>
                </div>
                <div>
                  <div class="trigger-name">${neonDeltaPointer.name}</div>
                  <div class="trigger-sub">Pure Silhouette • TAILLESS DELTA</div>
                </div>
              </div>
              <div class="chevron">▲</div>
            </div>

            <!-- Open Dropdown Menu -->
            <div class="dropdown-menu">
              <div class="menu-header">Choose Pointer Arrow</div>
              <!-- Option 1: Cyber Neon Aurora Delta (Selected - 100% Matching Latest User Reference) -->
              <div class="menu-item selected">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${neonDeltaPtrSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${neonDeltaPointer.name} <span class="item-tag" style="background:#dafbe1; color:#1a7f37; border-color:#aceebb;">NEW • Active</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Pure Tailless Delta Arrow • Electric Cyan-Magenta Glowing Rim</div>
                  </div>
                </div>
                <div class="check-badge">✓</div>
              </div>

              <!-- Option 2: Orbital Nova Ceramic (Tailless Delta) -->
              <div class="menu-item">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${ceramicPtrSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${ceramicPointer.name} <span class="item-tag">Tailless Delta</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Near-Triangle Ceramic Shell • Deep Obsidian Cavity</div>
                  </div>
                </div>
              </div>

              <!-- Option 3: Obsidian Celestial Starlight (Tailless Delta) -->
              <div class="menu-item">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${starlightPtrSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${starlightPointer.name} <span class="item-tag" style="background:#fbefff; color:#8250df; border-color:#d8b4fe;">Tailless Delta</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Near-Triangle Obsidian Body • 4-Point Starlight Core</div>
                  </div>
                </div>
              </div>

              <!-- Option 4: Precision Stealth Pointer (Tailless Delta) -->
              <div class="menu-item">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${stealthPtrSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${stealthPointer.name} <span class="item-tag">Tailless Delta</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Near-Triangle Delta Shell • Faceted Ceramic Face</div>
                  </div>
                </div>
              </div>

              <!-- Option 5: Dual-Tone Aero Sky (Tailless Delta) -->
              <div class="menu-item">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${aeroPtrSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${aeroPointer.name} <span class="item-tag">Tailless Delta</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Near-Triangle Split Wing • Royal Sky Blue</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dropdown 2: Select Companion Avatar (Showing all 3 avatars with Aero Sentinel Droid) -->
          <div class="dropdown-group">
            <div class="dropdown-label">
              <span>🤖 Select Companion Avatar</span>
              <span style="color: #656d76; font-size: 11px; font-weight: normal;">3 options</span>
            </div>
            <div class="dropdown-trigger focused">
              <div class="trigger-left">
                <div class="tile-icon">
                  <div style="transform: scale(0.75);">${sentinelAvtSvg}</div>
                </div>
                <div>
                  <div class="trigger-name">${sentinelAvatar.name}</div>
                  <div class="trigger-sub">Aero Droid • CYBER DROID <span class="item-tag" style="background:#ddf4ff; color:#0969da; border-color:#b6e3ff;">NEW</span></div>
                </div>
              </div>
              <div class="chevron">▲</div>
            </div>

            <!-- Open Dropdown Menu -->
            <div class="dropdown-menu">
              <div class="menu-header">Choose Companion Avatar</div>
              <!-- Option 1: Aero Sentinel Droid (Selected - NEW Flagship) -->
              <div class="menu-item selected">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${sentinelAvtSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${sentinelAvatar.name} <span class="item-tag" style="background:#dafbe1; color:#1a7f37; border-color:#aceebb;">NEW • Active</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Sculpted Porcelain Dome • Visor Eyes • Anti-Gravity Thrusters</div>
                  </div>
                </div>
                <div class="check-badge">✓</div>
              </div>

              <!-- Option 2: xAI Grok Cyber Bot -->
              <div class="menu-item">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${grokAvtSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${grokAvatar.name} <span class="item-tag">Cyber Companion</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Pure Obsidian Sphere • 360° Saccadic Gaze Stadium Eyes</div>
                  </div>
                </div>
              </div>

              <!-- Option 3: Cloud Companion Bot -->
              <div class="menu-item">
                <div class="item-left">
                  <div class="tile-icon">
                    <div style="transform: scale(0.7);">${cloudAvtSvg}</div>
                  </div>
                  <div>
                    <div class="item-name">${cloudAvatar.name} <span class="item-tag">Nimbus Pod</span></div>
                    <div style="font-size: 10.5px; color: #656d76;">Cozy Cumulus Cloud Pod • Dark Bot Pebble Face • Cyan Ring Eyes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Live Interactive Combination Stage & Movement Sandbox (100% PRESERVED) -->
        <div class="stage-box" style="margin-top: 295px;">
          <div class="stage-header">
            <div>
              <div class="stage-title">⚡ Live Interactive Combination Stage & Movement Sandbox</div>
              <div class="stage-subtitle">
                Real-time preview of combined: <strong>Cyber Neon Aurora Delta (Tailless)</strong> + <strong>Aero Sentinel Droid</strong> (combined)
              </div>
            </div>

            <div class="stage-controls">
              <!-- Element Display Toggle (Combined vs Cursor vs Avatar) -->
              <div class="element-toggle">
                <div class="element-btn active">⚡ Combined</div>
                <div class="element-btn">🖱️ Cursor</div>
                <div class="element-btn">🤖 Avatar</div>
              </div>

              <!-- Surface Toggle -->
              <div class="surface-toggle">
                <div class="surface-icon active">🌙</div>
                <div class="surface-icon">☀️</div>
              </div>

              <!-- Mood Buttons -->
              <div class="mood-btn active">default</div>
              <div class="mood-btn">typing</div>
              <div class="mood-btn">thinking</div>
              <div class="mood-btn">success</div>
            </div>
          </div>

          <div class="viewport-grid">
            <div class="viewport-panel viewport-dark">
              <div style="transform: scale(1.4);">${neonSentinelLiveSvg}</div>
              <div class="hud-overlay">Apex: {16, 8} • NEON AURORA DELTA + AERO SENTINEL DROID</div>
              <div class="hud-badge">Flagship Rig • Porcelain Dome + Cyan Eyes</div>
            </div>

            <div class="viewport-panel viewport-light">
              <div style="transform: scale(1.3);">${ceramicGrokLiveSvg}</div>
              <div class="hud-overlay" style="color: #656d76;">NOVA CERAMIC (TAILLESS) + GROK BOT</div>
              <div class="hud-badge" style="background: #f1f5f9; color: #334155; border-color: #cbd5e1;">Pure Near-Triangle Delta</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);

  const outputPath = '/Users/sriman/.gemini/antigravity-ide/brain/520a751e-b601-4b80-bf3b-b9b39ff8073e/cursor_studio_2_categories_preview.png';
  await page.screenshot({ path: outputPath });
  console.log('📸 Saved preview screenshot to:', outputPath);

  await browser.close();
}

main().catch(console.error);
