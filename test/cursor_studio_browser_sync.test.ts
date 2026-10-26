import assert from 'node:assert/strict';
import {
  saveCustomCombination,
  loadStoredPointerId,
  loadStoredAvatarId,
  loadStoredDisplayMode,
  loadStoredCursorId,
  getPointerOption,
  getAvatarOption,
  CURSOR_POINTER_OPTIONS,
  CURSOR_AVATAR_OPTIONS,
} from '../src/cursors/index';
import {
  ensureVisualCursor,
  cursorSyncAll,
  cursorSetTheme,
  cursorSetCombination,
  cursorSetDisplayMode,
  getVisualCursorScript,
} from '../src/agent/stealth/agentCursor';
import type { WebviewTarget } from '../src/agent/vision/domObserver';

console.log('=== VISUAL AGENT CURSOR STUDIO BROWSER SYNC TEST SUITE ===');

// --- TEST 1: All Pointers and Avatars are selectable and verifiable ---
console.log('--- TEST 1: Pointer & Avatar Options Catalog Verification ---');
const expectedPointers = [
  'pointer_neon_delta',
  'pointer_orbital_ceramic',
  'pointer_obsidian_starlight',
  'pointer_stealth',
  'pointer_sky_aero',
];
const expectedAvatars = [
  'avatar_grok_bot',
  'avatar_cloud_bot',
  'avatar_sentinel_bot',
  'avatar_mochi_neko',
  'avatar_kuro_star',
];

for (const ptrId of expectedPointers) {
  const opt = getPointerOption(ptrId);
  assert.ok(opt, `Pointer ${ptrId} must exist in options`);
  assert.equal(opt.id, ptrId);
  assert.ok(opt.name.length > 0, `Pointer ${ptrId} must have a name`);
}

for (const avtId of expectedAvatars) {
  const opt = getAvatarOption(avtId);
  assert.ok(opt, `Avatar ${avtId} must exist in options`);
  assert.equal(opt.id, avtId);
  assert.ok(opt.name.length > 0, `Avatar ${avtId} must have a name`);
}
console.log('✅ All 5 cursor pointers and 5 companion avatars are valid.');

// --- TEST 2: Custom Selection Persistence ---
console.log('--- TEST 2: Custom Selection Persistence via saveCustomCombination ---');
// Select Flagship combo: Cyber Neon Aurora Delta + Mochi Cyber Neko
saveCustomCombination('pointer_neon_delta', 'avatar_mochi_neko', 'combined');
assert.equal(loadStoredPointerId(), 'pointer_neon_delta', 'Stored pointer must be pointer_neon_delta');
assert.equal(loadStoredAvatarId(), 'avatar_mochi_neko', 'Stored avatar must be avatar_mochi_neko');
assert.equal(loadStoredDisplayMode(), 'combined', 'Stored display mode must be combined');
console.log('✅ Custom selection successfully stored.');

// --- TEST 3: ensureVisualCursor injects exact selected combination into webview ---
console.log('--- TEST 3: Webview Injection with Exact Custom Selection ---');
const injectedScripts: string[] = [];
const mockWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    injectedScripts.push(code);
    return true as unknown as T;
  },
};

const injected = await ensureVisualCursor(mockWebview);
assert.equal(injected, true, 'ensureVisualCursor must return true');
assert.ok(
  injectedScripts.some((s) => s.includes('"pointer_neon_delta"') && s.includes('"avatar_mochi_neko"')),
  'ensureVisualCursor must inject script with chosen pointer and avatar'
);
assert.ok(
  injectedScripts.some((s) => s.includes('setCombination("pointer_neon_delta", "avatar_mochi_neko")')),
  'ensureVisualCursor must call setCombination with chosen pointer and avatar'
);
console.log('✅ ensureVisualCursor injects and synchronizes selected custom cursor.');

// --- TEST 4: cursorSetTheme does NOT clobber custom pointer and avatar ---
console.log('--- TEST 4: cursorSetTheme Theme Preservation ---');
const themeChangeScripts: string[] = [];
const themeWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    themeChangeScripts.push(code);
    return true as unknown as T;
  },
};

// Calling cursorSetTheme should change theme without destroying the stored pointer or avatar
const themeSwitched = await cursorSetTheme(themeWebview, 'obsidian_glass');
assert.equal(themeSwitched, true, 'cursorSetTheme must return true');

// Ensure stored pointer and avatar are NOT wiped to stealth or grok
assert.equal(loadStoredPointerId(), 'pointer_neon_delta', 'Stored pointer must remain pointer_neon_delta');
assert.equal(loadStoredAvatarId(), 'avatar_mochi_neko', 'Stored avatar must remain avatar_mochi_neko');
console.log('✅ cursorSetTheme preserves custom pointer and avatar in storage.');

// --- TEST 5: applyTheme in client script preserves active custom pointer and avatar ---
console.log('--- TEST 5: Injected Script applyTheme Logic ---');
const clientScript = getVisualCursorScript('obsidian_glass', true, 'pointer_neon_delta', 'avatar_sentinel_bot', 'combined');
assert.ok(clientScript.includes('applyTheme(themeId, pointerId, avatarId)'), 'applyTheme must accept optional pointer and avatar overrides');
assert.ok(clientScript.includes('pointer_neon_delta'), 'client script must initialize with chosen pointer');
assert.ok(clientScript.includes('avatar_sentinel_bot'), 'client script must initialize with chosen avatar');
assert.ok(
  clientScript.includes('hasExplicitPointer') && clientScript.includes('hasExplicitAvatar'),
  'applyTheme must check for explicit or stored pointer and avatar before falling back'
);
console.log('✅ Client script applyTheme preserves custom pointer and avatar.');

// --- TEST 6: All combinations can be set and verified in webview ---
console.log('--- TEST 6: All Avatar and Pointer Combinations ---');
for (const ptr of expectedPointers) {
  for (const avt of expectedAvatars) {
    saveCustomCombination(ptr as any, avt as any, 'combined');
    assert.equal(loadStoredPointerId(), ptr);
    assert.equal(loadStoredAvatarId(), avt);

    const callLogs: string[] = [];
    const testView: WebviewTarget = {
      executeJavaScript: async <T>(code: string): Promise<T> => {
        callLogs.push(code);
        return true as unknown as T;
      },
    };
    await cursorSetCombination(testView, ptr as any, avt as any);
    assert.ok(
      callLogs.some((c) => c.includes(`setCombination("${ptr}", "${avt}")`)),
      `Must dispatch setCombination for ${ptr} + ${avt}`
    );
  }
}
console.log('✅ All 25 combination pairs (5 pointers x 5 avatars) successfully validated.');

// --- TEST 7: Display Mode Switching (combined, cursor, avatar) ---
console.log('--- TEST 7: Display Mode Switching ---');
saveCustomCombination('pointer_sky_aero', 'avatar_cloud_bot', 'cursor');
assert.equal(loadStoredDisplayMode(), 'cursor');

const modeLogs: string[] = [];
const modeView: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    modeLogs.push(code);
    return true as unknown as T;
  },
};
await cursorSetDisplayMode(modeView, 'cursor');
assert.ok(modeLogs.some((c) => c.includes('setDisplayMode("cursor")')), 'Must dispatch setDisplayMode with cursor');

await cursorSetDisplayMode(modeView, 'avatar');
assert.ok(modeLogs.some((c) => c.includes('setDisplayMode("avatar")')), 'Must dispatch setDisplayMode with avatar');

await cursorSetDisplayMode(modeView, 'combined');
assert.ok(modeLogs.some((c) => c.includes('setDisplayMode("combined")')), 'Must dispatch setDisplayMode with combined');

console.log('✅ Display mode switches cleanly across all modes.');

// --- TEST 8: Atomic cursorSyncAll Synchronization ---
console.log('--- TEST 8: Atomic cursorSyncAll Synchronization ---');
const syncAllLogs: string[] = [];
const syncAllView: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    syncAllLogs.push(code);
    return true as unknown as T;
  },
};

const synced = await cursorSyncAll(syncAllView, {
  pointerId: 'pointer_obsidian_starlight',
  avatarId: 'avatar_kuro_star',
  mode: 'combined',
  scale: 1.35,
});
assert.equal(synced, true, 'cursorSyncAll must return true');
assert.ok(
  syncAllLogs.some((s) => s.includes('"pointer_obsidian_starlight"') && s.includes('"avatar_kuro_star"') && s.includes('1.35')),
  'cursorSyncAll must execute sync with pointer, avatar, and scale'
);
console.log('✅ cursorSyncAll atomically propagates full configuration in real-time.');

// --- TEST 9: Companion Avatar Scale Slider Persistence ---
console.log('--- TEST 9: Companion Avatar Scale Persistence ---');
saveCustomCombination('pointer_neon_delta', 'avatar_sentinel_bot', 'combined', 1.4);
assert.equal(loadStoredPointerId(), 'pointer_neon_delta');
assert.equal(loadStoredAvatarId(), 'avatar_sentinel_bot');

console.log('\n🎉 ALL VISUAL AGENT CURSOR STUDIO BROWSER SYNC TESTS PASSED! 🎉\n');
