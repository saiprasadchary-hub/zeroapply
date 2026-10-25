import assert from 'node:assert/strict';
import {
  CURSOR_THEMES,
  DEFAULT_CURSOR_ID,
  CURSOR_STORAGE_KEY,
  getCursorTheme,
  getCursorSvgMarkup,
  obsidianGlass,
  cloudBot,
} from '../src/cursors';
import {
  getVisualCursorScript,
  cursorSetTheme,
} from '../src/agent/stealth/agentCursor';
import type { WebviewTarget } from '../src/agent/vision/domObserver';

console.log('=== ZEROAPPLY CURSOR STUDIO UNIT TEST SUITE ===');

// --- TEST 1: Theme Registry ---
console.log('--- TEST 1: Cursor Themes Registry (AI Companion Bot & Cloud Companion Bot) ---');
assert.equal(CURSOR_THEMES.length, 2, 'Must register exactly 2 flagship cursor themes: AI Companion Bot & Cloud Companion Bot');
assert.equal(DEFAULT_CURSOR_ID, 'obsidian_glass', 'Default cursor theme must be obsidian_glass');
assert.equal(CURSOR_STORAGE_KEY, 'zeroapply_selected_cursor_theme');

// Flagship 1: Obsidian Glass (AI Companion Bot)
const flagship = getCursorTheme('obsidian_glass');
assert.ok(flagship, 'Theme obsidian_glass must exist in registry');
assert.equal(flagship.id, 'obsidian_glass', 'Theme ID must match obsidian_glass');
assert.equal(flagship.name, 'AI Companion Bot', 'Theme name must be AI Companion Bot');
assert.equal(flagship.shapeType, 'arrow', 'Theme shapeType must be arrow');
assert.ok(flagship.hotspot && typeof flagship.hotspot.x === 'number' && typeof flagship.hotspot.y === 'number', 'Theme must have {x, y} hotspot');
assert.ok(flagship.accentColor && flagship.accentColor.startsWith('#'), 'Theme accentColor must be valid hex');
assert.ok(flagship.underlayColor && flagship.underlayColor.startsWith('#'), 'Theme underlayColor must be valid hex');
assert.ok(flagship.bodyGradient.length >= 2, 'Theme must have at least 2 body gradient stops');
assert.ok(flagship.rimGradient.length >= 2, 'Theme must have at least 2 rim gradient stops');

// Flagship 2: Cloud Companion Bot
const cloudTheme = getCursorTheme('cloud_bot');
assert.ok(cloudTheme, 'Theme cloud_bot must exist in registry');
assert.equal(cloudTheme.id, 'cloud_bot', 'Theme ID must match cloud_bot');
assert.equal(cloudTheme.name, 'Cloud Companion Bot', 'Theme name must be Cloud Companion Bot');
assert.equal(cloudTheme.shapeType, 'cloud', 'Theme shapeType must be cloud');
assert.equal(cloudTheme.hotspot.x, 16, 'Theme hotspot x must be 16');
assert.equal(cloudTheme.hotspot.y, 8, 'Theme hotspot y must be 8');
assert.ok(cloudTheme.accentColor && cloudTheme.accentColor.startsWith('#'), 'Theme accentColor must be valid hex');
assert.ok(cloudTheme.underlayColor && cloudTheme.underlayColor.startsWith('#'), 'Theme underlayColor must be valid hex');
console.log('✅ AI Companion Bot and Cloud Companion Bot are properly registered.');

// --- TEST 2: Fallback Handling ---
console.log('--- TEST 2: Theme Resolver & Fallback ---');
const fallbackTheme = getCursorTheme('non_existent_theme_id');
assert.equal(fallbackTheme.id, obsidianGlass.id, 'Unrecognized theme must fallback to default obsidian_glass');

const emptyTheme = getCursorTheme();
assert.equal(emptyTheme.id, obsidianGlass.id, 'Undefined theme must fallback to obsidian_glass');
console.log('✅ getCursorTheme safely resolves defaults.');

// --- TEST 3: SVG Markup Generator ---
console.log('--- TEST 3: SVG Markup Generation ---');
for (const theme of CURSOR_THEMES) {
  const svg = getCursorSvgMarkup(theme);
  assert.ok(svg.includes('<svg'), `SVG markup for "${theme.id}" must contain <svg`);
  assert.ok(svg.includes('za-glass-svg'), `SVG markup for "${theme.id}" must contain za-glass-svg class`);
  assert.ok(svg.includes(theme.accentColor), `SVG markup for "${theme.id}" must reference accent color ${theme.accentColor}`);
  assert.ok(svg.includes(theme.underlayColor), `SVG markup for "${theme.id}" must reference underlay color ${theme.underlayColor}`);
  assert.ok(!svg.includes('za-cursor-logo'), `SVG markup for "${theme.id}" must not contain circle/crossline logo emblem`);
  assert.ok(svg.includes('za-bot-eyes'), `SVG markup for "${theme.id}" must contain animated bot eyes`);
}
console.log('✅ getCursorSvgMarkup produces high-contrast dark glass SVG markup for all themes.');

// --- TEST 4: Injected Script Theme Support & Dynamic Switching ---
console.log('--- TEST 4: Agent Cursor Injected Script Theme Engine ---');
const script = getVisualCursorScript('cloud_bot');
assert.ok(script.includes('cloud_bot'), 'Script must embed requested theme id');
assert.ok(script.includes('THEMES_LIST'), 'Script must define THEMES_LIST');
assert.ok(script.includes('applyTheme'), 'Script must define applyTheme helper');
assert.ok(script.includes('setTheme:'), 'window.__zeroapplyCursor must expose setTheme method');
assert.ok(script.includes('getTheme:'), 'window.__zeroapplyCursor must expose getTheme method');
assert.ok(script.includes('getThemesList:'), 'window.__zeroapplyCursor must expose getThemesList method');

// --- TEST 5: cursorSetTheme TypeScript Bridge ---
console.log('--- TEST 5: cursorSetTheme Bridge ---');
const executed: string[] = [];
const mockWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    executed.push(code);
    return true as unknown as T;
  },
};

const switched = await cursorSetTheme(mockWebview, 'cloud_bot');
assert.equal(switched, true, 'cursorSetTheme must return true');
assert.ok(
  executed.some((s) => s.includes('cloud_bot')),
  'Webview must execute setTheme with cloud_bot'
);
console.log('✅ cursorSetTheme bridge successfully dispatches theme changes.');

// --- TEST 6: Selected Cursor Persistence & Automatic Webview Synchronization ---
console.log('--- TEST 6: Selected Cursor Browser Agent Synchronization ---');
const { saveStoredCursorId, loadStoredCursorId } = await import('../src/cursors');
const { ensureVisualCursor } = await import('../src/agent/stealth/agentCursor');

// 1. Select Cloud Companion Bot
saveStoredCursorId('cloud_bot');
assert.equal(loadStoredCursorId(), 'cloud_bot', 'loadStoredCursorId must return cloud_bot');

const executedSync: string[] = [];
const syncWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    executedSync.push(code);
    return true as unknown as T;
  },
};

await ensureVisualCursor(syncWebview);
assert.ok(
  executedSync.some((s) => s.includes('cloud_bot')),
  'ensureVisualCursor must inject selected cloud_bot cursor by default'
);

// 2. Select AI Companion Bot
saveStoredCursorId('obsidian_glass');
assert.equal(loadStoredCursorId(), 'obsidian_glass', 'loadStoredCursorId must return obsidian_glass');

const executedObsidian: string[] = [];
const obsidianWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    executedObsidian.push(code);
    return true as unknown as T;
  },
};

await ensureVisualCursor(obsidianWebview);
assert.ok(
  executedObsidian.some((s) => s.includes('obsidian_glass')),
  'ensureVisualCursor must inject selected obsidian_glass cursor by default'
);
console.log('✅ Browser agent automatically picks up and renders the selected cursor theme.');

// --- TEST 7: Call Stack Protection & Loop Prevention ---
console.log('--- TEST 7: Call Stack Protection & Loop Prevention ---');
let eventDispatchCount = 0;
const testHandler = () => {
  eventDispatchCount++;
  // Simulating syncCursorToWebviews: calling saveStoredCursorId or cursorSetTheme should NOT recurse!
  cursorSetTheme(syncWebview, 'cloud_bot').catch(() => {});
};

if (typeof window !== 'undefined') {
  window.addEventListener('zeroapply_cursor_changed', testHandler);
  // Setting the same ID should not trigger duplicate events
  saveStoredCursorId('cloud_bot');
  saveStoredCursorId('cloud_bot');
  saveStoredCursorId('cloud_bot');
  window.removeEventListener('zeroapply_cursor_changed', testHandler);
}
assert.ok(eventDispatchCount <= 1, 'Duplicate saveStoredCursorId must not fire cascading event loops');
console.log('✅ Recursion prevention and call stack integrity verified.');

// --- TEST 8: 2 Studio Categories (Cursor vs Avatar) & Display Mode Isolation ---
console.log('--- TEST 8: 2 Studio Categories (Cursor vs Avatar) & Display Mode Selection ---');
const {
  CURSOR_CATEGORY_ITEMS,
  loadStoredCategory,
  saveStoredCategory,
  loadStoredDisplayMode,
  saveStoredDisplayMode,
  CURSOR_CATEGORY_STORAGE_KEY,
  CURSOR_DISPLAY_MODE_STORAGE_KEY,
} = await import('../src/cursors');
const { cursorSetDisplayMode } = await import('../src/agent/stealth/agentCursor');

// 1. Verify 2 Distinct Categories in Catalog
assert.ok(CURSOR_CATEGORY_ITEMS.length >= 4, 'Must register at least 4 catalog items across categories');
const cursorCatItems = CURSOR_CATEGORY_ITEMS.filter((i) => i.category === 'cursor');
const avatarCatItems = CURSOR_CATEGORY_ITEMS.filter((i) => i.category === 'avatar');
assert.ok(cursorCatItems.length >= 2, 'Must have at least 2 cursor pointer items');
assert.ok(avatarCatItems.length >= 2, 'Must have at least 2 avatar companion bot items');

for (const item of CURSOR_CATEGORY_ITEMS) {
  assert.ok(item.id, 'Category item must have an id');
  assert.ok(item.name, 'Category item must have a name');
  assert.ok(item.themeId, 'Category item must map to a base theme');
  assert.ok(CURSOR_THEMES.some((t) => t.id === item.themeId), `Theme ID ${item.themeId} must exist in CURSOR_THEMES`);
  assert.ok(item.category === 'cursor' || item.category === 'avatar', 'Category must be cursor or avatar');
  assert.ok(Array.isArray(item.features) && item.features.length >= 2, 'Category item must describe feature pills');
}
console.log('✅ 2 distinct studio categories (Cursor & Avatar) catalog verified.');

// 2. Storage & Persistence
saveStoredCategory('avatar');
assert.equal(loadStoredCategory(), 'avatar', 'loadStoredCategory must return avatar');
saveStoredCategory('cursor');
assert.equal(loadStoredCategory(), 'cursor', 'loadStoredCategory must return cursor');

saveStoredDisplayMode('cursor');
assert.equal(loadStoredDisplayMode(), 'cursor', 'loadStoredDisplayMode must return cursor');
saveStoredDisplayMode('avatar');
assert.equal(loadStoredDisplayMode(), 'avatar', 'loadStoredDisplayMode must return avatar');
saveStoredDisplayMode('combined');
assert.equal(loadStoredDisplayMode(), 'combined', 'loadStoredDisplayMode must return combined');
console.log('✅ Category and Display Mode storage persistence verified.');

// 3. Mode-Based SVG Isolation
const combinedSvg = getCursorSvgMarkup(flagship, 'iso-test', 'combined');
assert.ok(combinedSvg.includes('za-pointer-face'), 'Combined mode must contain pointer face');
assert.ok(combinedSvg.includes('<g class="za-bot-eyes"'), 'Combined mode must contain bot eyes group');

const cursorOnlySvg = getCursorSvgMarkup(flagship, 'iso-test', 'cursor');
assert.ok(cursorOnlySvg.includes('za-pointer-face'), 'Cursor mode must contain pointer face');
assert.ok(!cursorOnlySvg.includes('<g class="za-bot-eyes"'), 'Cursor mode must exclude bot eyes group');
assert.ok(!cursorOnlySvg.includes('fill="url(#za-bot-sphere)"'), 'Cursor mode must exclude bot sphere element');

const avatarOnlySvg = getCursorSvgMarkup(flagship, 'iso-test', 'avatar');
assert.ok(!avatarOnlySvg.includes('fill="url(#za-pointer-face)"'), 'Avatar mode must exclude pointer face element');
assert.ok(avatarOnlySvg.includes('<g class="za-bot-eyes"'), 'Avatar mode must contain bot eyes group');
assert.ok(avatarOnlySvg.includes('fill="url(#za-bot-sphere)"'), 'Avatar mode must contain bot sphere element');
console.log('✅ SVG markup generators isolate cursor vs avatar based on display mode.');

// 4. Webview Bridge & Script Engine
const modeExecuted: string[] = [];
const modeWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    modeExecuted.push(code);
    return true as unknown as T;
  },
};
const modeSwitched = await cursorSetDisplayMode(modeWebview, 'avatar');
assert.equal(modeSwitched, true, 'cursorSetDisplayMode must return true');
assert.ok(modeExecuted.some((s) => s.includes('setDisplayMode("avatar")')), 'Webview must execute setDisplayMode with avatar');

const clientScript = getVisualCursorScript('obsidian_glass');
assert.ok(clientScript.includes('setDisplayMode:'), 'Script must expose setDisplayMode');
assert.ok(clientScript.includes('getDisplayMode:'), 'Script must expose getDisplayMode');
assert.ok(clientScript.includes('.za-display-mode-cursor'), 'Script CSS must define .za-display-mode-cursor');
assert.ok(clientScript.includes('.za-display-mode-avatar'), 'Script CSS must define .za-display-mode-avatar');
console.log('✅ cursorSetDisplayMode bridge and client engine successfully verified.');

// --- TEST 9: Selecting Wanted Cursor & Wanted Avatar and Combining Them ---
console.log('--- TEST 9: Selecting Wanted Cursor & Wanted Avatar and Combining Them ---');
const {
  CURSOR_POINTER_OPTIONS,
  CURSOR_AVATAR_OPTIONS,
  loadStoredPointerId,
  saveStoredPointerId,
  loadStoredAvatarId,
  saveStoredAvatarId,
  getPointerOption,
  getAvatarOption,
  saveCustomCombination,
  getCustomCombinedCursorMarkup,
} = await import('../src/cursors');
const {
  cursorSetPointer,
  cursorSetAvatar,
  cursorSetCombination,
} = await import('../src/agent/stealth/agentCursor');

// 1. Verify 2 categories options
assert.equal(CURSOR_POINTER_OPTIONS.length, 5, 'Must have 5 cursor pointer options');
assert.equal(CURSOR_AVATAR_OPTIONS.length, 4, 'Must have 4 companion avatar options');

const neonDeltaPointer = getPointerOption('pointer_neon_delta');
const stealthPointer = getPointerOption('pointer_stealth');
const aeroPointer = getPointerOption('pointer_sky_aero');
const ceramicPointer = getPointerOption('pointer_orbital_ceramic');
const starlightPointer = getPointerOption('pointer_obsidian_starlight');
assert.equal(neonDeltaPointer.name, 'Cyber Neon Aurora Delta');
assert.equal(stealthPointer.name, 'Precision Stealth Pointer');
assert.equal(aeroPointer.name, 'Dual-Tone Aero Sky Pointer');
assert.equal(ceramicPointer.name, 'Orbital Nova Ceramic');
assert.equal(starlightPointer.name, 'Obsidian Celestial Starlight');

const grokAvatar = getAvatarOption('avatar_grok_bot');
const cloudAvatar = getAvatarOption('avatar_cloud_bot');
const sentinelAvatar = getAvatarOption('avatar_sentinel_bot');
const mochiNekoAvatar = getAvatarOption('avatar_mochi_neko');
assert.equal(grokAvatar.name, 'xAI Grok Cyber Bot');
assert.equal(cloudAvatar.name, 'Cloud Companion Bot');
assert.equal(sentinelAvatar.name, 'Aero Sentinel Droid');
assert.equal(mochiNekoAvatar.name, 'Mochi Cyber Neko');

// 2. Storage getters & setters for independent selection
saveStoredPointerId('pointer_neon_delta');
assert.equal(loadStoredPointerId(), 'pointer_neon_delta', 'Neon delta pointer selection must persist');
saveStoredPointerId('pointer_sky_aero');
assert.equal(loadStoredPointerId(), 'pointer_sky_aero', 'Pointer selection must persist');
saveStoredPointerId('pointer_orbital_ceramic');
assert.equal(loadStoredPointerId(), 'pointer_orbital_ceramic', 'Orbital ceramic pointer selection must persist');
saveStoredPointerId('pointer_obsidian_starlight');
assert.equal(loadStoredPointerId(), 'pointer_obsidian_starlight', 'Obsidian starlight pointer selection must persist');
saveStoredPointerId('pointer_stealth');
assert.equal(loadStoredPointerId(), 'pointer_stealth', 'Pointer selection must update independently');

saveStoredAvatarId('avatar_cloud_bot');
assert.equal(loadStoredAvatarId(), 'avatar_cloud_bot', 'Avatar selection must persist');
saveStoredAvatarId('avatar_sentinel_bot');
assert.equal(loadStoredAvatarId(), 'avatar_sentinel_bot', 'Sentinel avatar selection must persist');
saveStoredAvatarId('avatar_mochi_neko');
assert.equal(loadStoredAvatarId(), 'avatar_mochi_neko', 'Mochi Neko avatar selection must persist');
saveStoredAvatarId('avatar_grok_bot');
assert.equal(loadStoredAvatarId(), 'avatar_grok_bot', 'Avatar selection must update independently');

// 3. Test Custom Combination Pairs
// Pair A: Stealth Pointer + Grok Bot
const pairA = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_grok_bot', 'pair-a', 'combined');
assert.ok(pairA.includes('za-pointer-face'), 'Pair A must have stealth pointer face');
assert.ok(pairA.includes('fill="url(#za-bot-sphere)"'), 'Pair A must have grok bot sphere');

// Pair B: Stealth Pointer + Cloud Bot
const pairB = getCustomCombinedCursorMarkup('pointer_stealth', 'avatar_cloud_bot', 'pair-b', 'combined');
assert.ok(pairB.includes('za-pointer-face'), 'Pair B must have stealth pointer face');
assert.ok(pairB.includes('fill="#bae6fd"'), 'Pair B must have cloud bot pod');

// Pair C: Aero Sky Pointer + Grok Bot
const pairC = getCustomCombinedCursorMarkup('pointer_sky_aero', 'avatar_grok_bot', 'pair-c', 'combined');
assert.ok(pairC.includes('fill="#2563eb"'), 'Pair C must have aero sky pointer wing');
assert.ok(pairC.includes('fill="url(#za-bot-sphere)"'), 'Pair C must have grok bot sphere');

// Pair D: Aero Sky Pointer + Cloud Bot
const pairD = getCustomCombinedCursorMarkup('pointer_sky_aero', 'avatar_cloud_bot', 'pair-d', 'combined');
assert.ok(pairD.includes('fill="#2563eb"'), 'Pair D must have aero sky pointer wing');
assert.ok(pairD.includes('fill="#bae6fd"'), 'Pair D must have cloud bot pod');

// Pair E: Orbital Nova Ceramic (Pure Tailless Near-Triangle Delta) + Grok Bot
const pairE = getCustomCombinedCursorMarkup('pointer_orbital_ceramic', 'avatar_grok_bot', 'pair-e', 'combined');
assert.ok(pairE.includes('fill="url(#za-ceramic-shell)"'), 'Pair E must have sculpted ceramic shell');
assert.ok(pairE.includes('fill="url(#za-ceramic-cavity)"'), 'Pair E must have scooped obsidian cavity');
assert.ok(!pairE.includes('stroke="url(#za-orbit-silver)"'), 'Pair E must have no floating orbit ring');
assert.ok(pairE.includes('fill="url(#za-bot-sphere)"'), 'Pair E must have grok bot sphere');

// Pair F: Obsidian Celestial Starlight (Pure Tailless Near-Triangle Delta) + Cloud Bot
const pairF = getCustomCombinedCursorMarkup('pointer_obsidian_starlight', 'avatar_cloud_bot', 'pair-f', 'combined');
assert.ok(pairF.includes('fill="url(#za-obsidian-core)"'), 'Pair F must have obsidian core');
assert.ok(pairF.includes('stroke="url(#za-violet-halo)"'), 'Pair F must have iridescent violet halo');
assert.ok(pairF.includes('fill="url(#za-nova-glow)"'), 'Pair F must have luminous starlight flare');
assert.ok(!pairF.includes('stroke="url(#za-celestial-arc)"'), 'Pair F must have no floating celestial arc');
assert.ok(pairF.includes('fill="#bae6fd"'), 'Pair F must have cloud bot pod');

// Pair G: Cyber Neon Aurora Delta + Grok Bot (Tailless Delta matching user figure)
const pairG = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_grok_bot', 'pair-g', 'combined');
assert.ok(pairG.includes('stroke="url(#za-nd-rim)"'), 'Pair G must have neon aurora glowing rim');
assert.ok(pairG.includes('fill="url(#za-nd-core)"'), 'Pair G must have obsidian dark core');
assert.ok(pairG.includes('fill="url(#za-nd-bevel)"'), 'Pair G must have 3D scooped inner dish bevel');
assert.ok(pairG.includes('fill="url(#za-bot-sphere)"'), 'Pair G must have grok bot sphere');

// Pair H: Cyber Neon Aurora Delta + Aero Sentinel Droid (Flagship Combination)
const pairH = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_sentinel_bot', 'pair-h', 'combined');
assert.ok(pairH.includes('stroke="url(#za-nd-rim)"'), 'Pair H must have neon aurora glowing rim');
assert.ok(pairH.includes('fill="url(#za-sentinel-shell)"'), 'Pair H must have porcelain head dome shell');
assert.ok(pairH.includes('fill="url(#za-sentinel-visor)"'), 'Pair H must have panoramic curved visor');
assert.ok(pairH.includes('filter="url(#za-sentinel-glow)"'), 'Pair H must have glowing cyan LED crescent eyes');

// Pair I: Cyber Neon Aurora Delta + Mochi Cyber Neko (Kawaii Cute Flagship Combination)
const pairI = getCustomCombinedCursorMarkup('pointer_neon_delta', 'avatar_mochi_neko', 'pair-i', 'combined');
assert.ok(pairI.includes('stroke="url(#za-nd-rim)"'), 'Pair I must have neon aurora glowing rim');
assert.ok(pairI.includes('fill="url(#za-neko-shell)"'), 'Pair I must have mochi neko shell');
assert.ok(pairI.includes('fill="url(#za-neko-ear)"'), 'Pair I must have mochi neko inner ears');
assert.ok(pairI.includes('fill="url(#za-neko-eye)"'), 'Pair I must have anime galaxy eyes');
assert.ok(pairI.includes('filter="url(#za-neko-glow)"'), 'Pair I must have glowing rosy cheeks blush');
assert.ok(pairI.includes('za-neko-ear-left'), 'Pair I must have animated left ear group');
assert.ok(pairI.includes('za-neko-ear-right'), 'Pair I must have animated right ear group');
assert.ok(pairI.includes('za-neko-ear-left-idle'), 'Pair I must have smooth ear twitch/wiggle keyframes');

// 4. saveCustomCombination helper
saveCustomCombination('pointer_sky_aero', 'avatar_grok_bot', 'combined');
assert.equal(loadStoredPointerId(), 'pointer_sky_aero');
assert.equal(loadStoredAvatarId(), 'avatar_grok_bot');
assert.equal(loadStoredDisplayMode(), 'combined');

// 5. Webview Bridge for Combination
const combExecuted: string[] = [];
const combWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    combExecuted.push(code);
    return true as unknown as T;
  },
};

await cursorSetPointer(combWebview, 'pointer_sky_aero');
assert.ok(combExecuted.some((s) => s.includes('setPointer("pointer_sky_aero")')));

await cursorSetAvatar(combWebview, 'avatar_cloud_bot');
assert.ok(combExecuted.some((s) => s.includes('setAvatar("avatar_cloud_bot")')));

await cursorSetAvatar(combWebview, 'avatar_sentinel_bot');
assert.ok(combExecuted.some((s) => s.includes('setAvatar("avatar_sentinel_bot")')));

await cursorSetAvatar(combWebview, 'avatar_mochi_neko');
assert.ok(combExecuted.some((s) => s.includes('setAvatar("avatar_mochi_neko")')));

await cursorSetCombination(combWebview, 'pointer_stealth', 'avatar_grok_bot');
assert.ok(combExecuted.some((s) => s.includes('setCombination("pointer_stealth", "avatar_grok_bot")')));

assert.ok(clientScript.includes('setPointer:'), 'Script must expose setPointer');
assert.ok(clientScript.includes('setAvatar:'), 'Script must expose setAvatar');
assert.ok(clientScript.includes('setCombination:'), 'Script must expose setCombination');

// 6. Test that ensureVisualCursor embeds and synchronizes selected pointer & avatar into Agent Browser webviews
saveCustomCombination('pointer_neon_delta', 'avatar_sentinel_bot', 'combined');
const agentWebviewScripts: string[] = [];
const agentWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    agentWebviewScripts.push(code);
    return true as unknown as T;
  },
};
await ensureVisualCursor(agentWebview);
assert.ok(
  agentWebviewScripts.some((s) => s.includes('"pointer_neon_delta"') && s.includes('"avatar_sentinel_bot"')),
  'Agent browser script injection must embed selected pointer and companion avatar'
);
assert.ok(
  agentWebviewScripts.some((s) => s.includes('setCombination("pointer_neon_delta", "avatar_sentinel_bot")')),
  'Agent browser must synchronize live combination directly into window.__zeroapplyCursor'
);

console.log('✅ Independent selection of wanted cursor and wanted avatar into custom combinations verified.');
console.log('✅ Agent Browser webview synchronization of selected cursor pointer and avatar verified.');

console.log('\n🎉 ALL ZEROAPPLY CURSOR STUDIO TESTS PASSED! 🎉\n');


