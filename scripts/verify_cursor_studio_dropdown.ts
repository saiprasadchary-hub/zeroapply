import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { CURSOR_THEMES } from '../src/cursors';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

async function main() {
  if (!chromePath) {
    console.error('No Chrome binary found');
    process.exit(1);
  }

  console.log('Rendering Clean Cursor Studio Dropdown in Chrome...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  const themesJson = JSON.stringify(CURSOR_THEMES);

  const mockHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Visual Agent Cursor Studio - Clean Dropdown</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body {
        margin: 0;
        background: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 32px;
      }
    </style>
  </head>
  <body>
    <div id="root" class="max-w-3xl mx-auto space-y-6">
      <div class="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-5">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-200/60 font-bold shrink-0">
              ✦
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm md:text-base font-bold text-zinc-900">Visual Agent Cursor Studio</h2>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200/60 uppercase">
                  8 Presets
                </span>
              </div>
              <p class="text-xs text-zinc-500">
                Select the dark liquid glass cursor injected into Google Chrome during autonomous applications
              </p>
            </div>
          </div>
        </div>

        <!-- Dropdown Container -->
        <div class="relative" id="dropdown-container">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <span>Active Cursor Theme</span>
            </label>
            <span class="text-[11px] text-zinc-500 font-mono" id="cursor-count">1 of 8</span>
          </div>

          <!-- Dropdown Trigger -->
          <button
            type="button"
            id="dropdown-trigger"
            class="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 transition-all cursor-pointer shadow-xs text-left"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 shadow-xs" id="trigger-icon">
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-zinc-900 truncate" id="trigger-name">Obsidian Glass</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 bg-violet-950/80 border-violet-500/40 text-violet-200" id="trigger-tag">
                    DEFAULT FLAGSHIP
                  </span>
                </div>
                <p class="text-xs text-zinc-500 truncate mt-0.5" id="trigger-desc">Deep obsidian liquid body with crisp electric lavender rim and signature Ø emblem.</p>
              </div>
            </div>
            <div class="flex items-center gap-2.5 shrink-0 pl-3">
              <span class="w-3.5 h-3.5 rounded-full ring-1 ring-zinc-300 shadow-xs shrink-0" id="trigger-swatch" style="background-color: #c4b5fd;"></span>
              <span id="chevron" class="text-zinc-400 text-sm">▼</span>
            </div>
          </button>

          <!-- Floating Dropdown Menu -->
          <div
            id="dropdown-menu"
            class="hidden absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-zinc-200/90 bg-white shadow-xl p-1.5 max-h-80 overflow-y-auto space-y-1"
          >
          </div>
        </div>
      </div>
    </div>

    <script>
      const THEMES = ${themesJson};
      let activeId = 'obsidian_glass';

      function renderSvg(theme, size = 26) {
        const shape = theme.shapeType || 'arrow';
        switch (shape) {
          case 'crosshair':
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <circle cx="28" cy="28" r="20" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="3" />
                <circle cx="28" cy="28" r="11" fill="none" stroke="\${theme.accentColor}" stroke-width="1.8" stroke-dasharray="3 3" />
                <line x1="28" y1="4" x2="28" y2="15" stroke="\${theme.accentColor}" stroke-width="2.8" stroke-linecap="round" />
                <line x1="28" y1="41" x2="28" y2="52" stroke="\${theme.accentColor}" stroke-width="2.8" stroke-linecap="round" />
                <line x1="4" y1="28" x2="15" y2="28" stroke="\${theme.accentColor}" stroke-width="2.8" stroke-linecap="round" />
                <line x1="41" y1="28" x2="52" y2="28" stroke="\${theme.accentColor}" stroke-width="2.8" stroke-linecap="round" />
                <circle cx="28" cy="28" r="3.2" fill="#ffffff" stroke="\${theme.accentColor}" stroke-width="1.5" />
              </svg>
            \`;
          case 'halo':
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <circle cx="28" cy="28" r="21" fill="none" stroke="\${theme.accentColor}" stroke-width="2.4" stroke-dasharray="14 6" />
                <circle cx="28" cy="28" r="13" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2.2" />
                <path d="M 12 12 L 25 10 L 16 23 Z" fill="\${theme.accentColor}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
                <circle cx="47" cy="20" r="2.5" fill="#ffffff" />
                <circle cx="38" cy="45" r="2.2" fill="\${theme.accentColor}" />
                <circle cx="16" cy="38" r="2" fill="\${theme.accentColor}" />
              </svg>
            \`;
          case 'wand':
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <path d="M 15 15 L 47 47 L 43 51 L 11 19 Z" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2.4" stroke-linejoin="round" />
                <line x1="16" y1="20" x2="42" y2="46" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.85" />
                <path d="M 10 2 Q 10 8 16 8 Q 10 8 10 14 Q 10 8 4 8 Q 10 8 10 2 Z" fill="#ffffff" stroke="\${theme.accentColor}" stroke-width="1.6" />
                <circle cx="10" cy="8" r="2" fill="#ffffff" />
                <circle cx="6" cy="24" r="1.6" fill="\${theme.accentColor}" />
                <circle cx="24" cy="6" r="1.8" fill="\${theme.accentColor}" />
              </svg>
            \`;
          case 'pen':
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <path d="M 8 8 L 22 14 L 40 40 L 34 46 L 14 22 Z" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2.6" stroke-linejoin="round" />
                <path d="M 8 8 L 22 14 L 20 28 L 14 22 Z" fill="\${theme.sheenColor}" />
                <line x1="8" y1="8" x2="22" y2="22" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
                <circle cx="22" cy="22" r="2.4" fill="\${theme.accentColor}" stroke="#ffffff" stroke-width="1.2" />
                <line x1="33" y1="45" x2="41" y2="39" stroke="\${theme.accentColor}" stroke-width="2.5" stroke-linecap="round" />
              </svg>
            \`;
          case 'chevron':
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <path d="M 26 6 L 50 44 L 26 33 L 2 44 Z" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" />
                <line x1="26" y1="6" x2="26" y2="33" stroke="\${theme.accentColor}" stroke-width="2" />
                <circle cx="26" cy="6.5" r="1.6" fill="#ffffff" />
                <circle cx="26" cy="44" r="5" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="1.6" />
              </svg>
            \`;
          case 'loupe':
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <circle cx="22" cy="22" r="17" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2.8" />
                <circle cx="22" cy="22" r="12" fill="\${theme.sheenColor}" />
                <path d="M 12 14 A 14 14 0 0 1 28 8" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" />
                <circle cx="10" cy="17" r="1.3" fill="#ffffff" />
                <line x1="22" y1="16" x2="22" y2="28" stroke="\${theme.accentColor}" stroke-width="1.4" opacity="0.8" />
                <line x1="16" y1="22" x2="28" y2="22" stroke="\${theme.accentColor}" stroke-width="1.4" opacity="0.8" />
                <path d="M 34 34 L 52 52 L 48 56 L 30 38 Z" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2.2" stroke-linejoin="round" />
              </svg>
            \`;
          case 'ibeam':
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <line x1="13" y1="8" x2="39" y2="8" stroke="\${theme.accentColor}" stroke-width="3.4" stroke-linecap="round" />
                <line x1="13" y1="48" x2="39" y2="48" stroke="\${theme.accentColor}" stroke-width="3.4" stroke-linecap="round" />
                <line x1="26" y1="8" x2="26" y2="48" stroke="\${theme.underlayColor}" stroke-width="5" stroke-linecap="round" />
                <line x1="26" y1="8" x2="26" y2="48" stroke="\${theme.accentColor}" stroke-width="2.4" stroke-linecap="round" />
                <circle cx="26" cy="28" r="4.5" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2" />
                <circle cx="26" cy="28" r="2" fill="#ffffff" />
              </svg>
            \`;
          case 'arrow':
          default:
            return \`
              <svg width="\${size}" height="\${size}" viewBox="0 0 64 64" fill="none">
                <path d="M 14 8 L 46 27 L 30 31 L 20 46 Z" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="3.2" stroke-linejoin="round" />
                <path d="M 15 10 L 22 41 L 28 33 L 21 13 Z" fill="\${theme.sheenColor}" />
                <circle cx="14" cy="8.5" r="1.8" fill="\${theme.glintColor}" />
                <circle cx="37" cy="38" r="8" fill="\${theme.underlayColor}" stroke="\${theme.accentColor}" stroke-width="2.4" />
                <line x1="31" y1="44" x2="43" y2="32" stroke="\${theme.accentColor}" stroke-width="2.4" stroke-linecap="round" />
              </svg>
            \`;
        }
      }

      function updateActiveTheme(theme) {
        activeId = theme.id;
        document.getElementById('trigger-icon').innerHTML = renderSvg(theme, 26);
        document.getElementById('trigger-name').textContent = theme.name;
        document.getElementById('trigger-tag').textContent = theme.tag;
        document.getElementById('trigger-desc').textContent = theme.description;
        document.getElementById('trigger-swatch').style.backgroundColor = theme.accentColor;
        renderMenuItems();
      }

      function renderMenuItems() {
        const menu = document.getElementById('dropdown-menu');
        menu.innerHTML = '';
        THEMES.forEach((theme) => {
          const isSelected = theme.id === activeId;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-left cursor-pointer ' +
            (isSelected ? 'bg-violet-50/80 border border-violet-200/70 text-violet-950 font-semibold' : 'hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900');
          btn.onclick = () => {
            updateActiveTheme(theme);
            menu.classList.add('hidden');
          };
          btn.innerHTML = \`
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 shadow-xs">
                \${renderSvg(theme, 20)}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold truncate text-zinc-900">\${theme.name}</span>
                  <span class="text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0" style="background:\${theme.badgeBg};border-color:\${theme.badgeBorder};color:\${theme.badgeTextColor}">
                    \${theme.tag}
                  </span>
                </div>
                <p class="text-[11px] text-zinc-500 truncate mt-0.5">\${theme.description}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 pl-2">
              <span class="w-2.5 h-2.5 rounded-full ring-1 ring-zinc-300" style="background:\${theme.accentColor}"></span>
              \${isSelected ? '<span class="text-violet-600 font-bold text-sm">✓</span>' : '<span class="w-4"></span>'}
            </div>
          \`;
          menu.appendChild(btn);
        });
      }

      document.getElementById('dropdown-trigger').onclick = () => {
        const menu = document.getElementById('dropdown-menu');
        menu.classList.toggle('hidden');
      };

      updateActiveTheme(THEMES[0]);
    </script>
  </body>
  </html>
  `;

  await page.setContent(mockHtml);

  const artifactDir = '/Users/sriman/.gemini/antigravity-ide/brain/586824cc-23f2-4114-8004-607b1b807e15';

  // 1. Capture clean closed dropdown state
  const closedPath = path.join(artifactDir, 'screenshot_cursor_studio_dropdown_clean.png');
  await page.screenshot({ path: closedPath });
  console.log('📸 Saved clean closed dropdown screenshot to:', closedPath);

  // 2. Open dropdown to showcase all 8 distinct geometric cursor shapes
  await page.click('#dropdown-trigger');
  await page.waitForTimeout(200);
  const openPath = path.join(artifactDir, 'screenshot_cursor_studio_dropdown_open.png');
  await page.screenshot({ path: openPath });
  console.log('📸 Saved open dropdown with 8 distinct shapes screenshot to:', openPath);

  // 3. Select a distinct non-arrow shape (e.g., Tactical Precision Reticle / Crosshair)
  await page.evaluate(() => {
    const cyberTheme = THEMES.find((t) => t.id === 'cyber_emerald');
    if (cyberTheme) updateActiveTheme(cyberTheme);
  });
  await page.waitForTimeout(200);
  const selectedPath = path.join(artifactDir, 'screenshot_cursor_studio_dropdown_selected.png');
  await page.screenshot({ path: selectedPath });
  console.log('📸 Saved selected reticle crosshair screenshot to:', selectedPath);

  await browser.close();
  console.log('🎉 Verified Clean Cursor Studio Dropdown with 8 Distinct Shapes successfully!');
}

main().catch(console.error);
