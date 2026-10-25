import assert from 'node:assert/strict';
import {
  CURSOR_AVATAR_OPTIONS,
  getCustomCombinedCursorMarkup,
  getCursorSvgMarkup,
  getCursorTheme,
  CURSOR_THEMES,
} from '../src/cursors';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';

console.log('=== ALL AVATARS LONG ANIMATION VERIFICATION SUITE (18.0s LIVING SUITE) ===');

// 1. Verify all 4 avatars in CURSOR_AVATAR_OPTIONS
const avatarKeys = CURSOR_AVATAR_OPTIONS.map((opt) => opt.id);
console.log('Detected Avatars:', avatarKeys);
assert.ok(avatarKeys.includes('avatar_grok_bot'), 'Must have avatar_grok_bot');
assert.ok(avatarKeys.includes('avatar_cloud_bot'), 'Must have avatar_cloud_bot');
assert.ok(avatarKeys.includes('avatar_sentinel_bot'), 'Must have avatar_sentinel_bot');
assert.ok(avatarKeys.includes('avatar_mochi_neko'), 'Must have avatar_mochi_neko');

// 2. Test getCustomCombinedCursorMarkup for all 4 avatars
for (const avatarKey of avatarKeys) {
  console.log(`\n--- Testing Avatar: ${avatarKey} ---`);
  const svg = getCustomCombinedCursorMarkup('pointer_obsidian_pure', avatarKey);

  // Must contain 18.0s animation cycle
  assert.ok(svg.includes('18.0s'), `${avatarKey} SVG must contain 18.0s animation timing`);
  assert.ok(svg.includes('za-bot-blink'), `${avatarKey} SVG must contain za-bot-blink`);
  assert.ok(svg.includes('za-avatar-shadow-breathe'), `${avatarKey} SVG must contain za-avatar-shadow-breathe`);
  assert.ok(svg.includes('za-avatar-shadow'), `${avatarKey} SVG must contain shadow element`);

  // Avatar-specific structural classes and keyframe tests
  if (avatarKey === 'avatar_grok_bot') {
    assert.ok(svg.includes('za-grok-sphere'), 'Grok bot must have za-grok-sphere group');
    assert.ok(svg.includes('@keyframes za-grok-float'), 'Grok bot must have za-grok-float keyframes');
    assert.ok(svg.includes('animation: za-grok-float 18.0s'), 'Grok bot body must animate for 18.0s');
    console.log('✅ Grok Bot 18.0s anti-gravity elevation & multi-phase gaze verified');
  }

  if (avatarKey === 'avatar_cloud_bot') {
    assert.ok(svg.includes('za-cloud-pod'), 'Cloud bot must have za-cloud-pod group');
    assert.ok(svg.includes('za-cloud-pillow'), 'Cloud bot must have za-cloud-pillow group');
    assert.ok(svg.includes('@keyframes za-cloud-drift'), 'Cloud bot must have za-cloud-drift keyframes');
    assert.ok(svg.includes('@keyframes za-cloud-puff'), 'Cloud bot must have za-cloud-puff keyframes');
    assert.ok(svg.includes('animation: za-cloud-drift 18.0s'), 'Cloud bot body must animate for 18.0s');
    console.log('✅ Cloud Bot 18.0s buoyant cumulus drift & puff oscillation verified');
  }

  if (avatarKey === 'avatar_sentinel_bot') {
    assert.ok(svg.includes('za-sentinel-head'), 'Sentinel bot must have za-sentinel-head group');
    assert.ok(svg.includes('za-sentinel-fin-left'), 'Sentinel bot must have left fin group');
    assert.ok(svg.includes('za-sentinel-fin-right'), 'Sentinel bot must have right fin group');
    assert.ok(svg.includes('@keyframes za-sentinel-hover'), 'Sentinel bot must have za-sentinel-hover keyframes');
    assert.ok(svg.includes('@keyframes za-sentinel-fin-left'), 'Sentinel bot must have fin left keyframes');
    assert.ok(svg.includes('@keyframes za-sentinel-fin-right'), 'Sentinel bot must have fin right keyframes');
    assert.ok(svg.includes('@keyframes za-sentinel-visor-sweep'), 'Sentinel bot must have visor sweep keyframes');
    assert.ok(svg.includes('animation: za-sentinel-hover 18.0s'), 'Sentinel bot body must animate for 18.0s');
    console.log('✅ Sentinel Bot 18.0s magnetic hover, wing fins & visor sweep verified');
  }

  if (avatarKey === 'avatar_mochi_neko') {
    assert.ok(svg.includes('za-neko-head'), 'Mochi Neko must have za-neko-head group');
    assert.ok(svg.includes('za-neko-ear-left'), 'Mochi Neko must have left ear group');
    assert.ok(svg.includes('za-neko-ear-right'), 'Mochi Neko must have right ear group');
    assert.ok(svg.includes('za-neko-bell'), 'Mochi Neko must have bell group');
    assert.ok(svg.includes('@keyframes za-neko-head-float'), 'Mochi Neko must have head float keyframes');
    assert.ok(svg.includes('@keyframes za-neko-ear-left-idle'), 'Mochi Neko must have ear left keyframes');
    assert.ok(svg.includes('@keyframes za-neko-ear-right-idle'), 'Mochi Neko must have ear right keyframes');
    assert.ok(svg.includes('@keyframes za-neko-bell-jingle'), 'Mochi Neko must have bell jingle keyframes');
    assert.ok(svg.includes('animation: za-neko-head-float 18.0s'), 'Mochi Neko head must animate for 18.0s');
    console.log('✅ Mochi Neko 18.0s head float, ear perks & bell jingle verified');
  }
}

// 3. Test Base Themes in CURSOR_THEMES
console.log('\n--- Testing Base Themes (getCursorSvgMarkup) ---');
const themedAvatars = [
  { themeId: 'obsidian_glass', expectedBodyAnim: 'za-grok-float 18.0s' },
  { themeId: 'cloud_companion', expectedBodyAnim: 'za-cloud-drift 18.0s' },
  { themeId: 'aero_sentinel', expectedBodyAnim: 'za-sentinel-hover 18.0s' },
  { themeId: 'mochi_neko', expectedBodyAnim: 'za-neko-head-float 18.0s' },
];

for (const { themeId, expectedBodyAnim } of themedAvatars) {
  const theme = getCursorTheme(themeId);
  assert.ok(theme, `Theme ${themeId} should exist`);
  const svg = getCursorSvgMarkup(theme);
  assert.ok(svg.includes('18.0s'), `${themeId} SVG must use 18.0s animation`);
  assert.ok(svg.includes(expectedBodyAnim), `${themeId} SVG must include ${expectedBodyAnim}`);
  console.log(`✅ Base theme ${themeId} verified with 18.0s long animation suite`);
}

// 4. Test agentCursor.ts injected script
console.log('\n--- Testing Agent Stealth Visual Cursor Script ---');
const injectedScript = getVisualCursorScript('obsidian_glass');
assert.ok(injectedScript.includes('za-bot-blink 18.0s'), 'Injected script must have 18.0s eye cycle');
assert.ok(injectedScript.includes('za-grok-float 18.0s'), 'Injected script must have 18.0s grok float cycle');
assert.ok(injectedScript.includes('za-cloud-drift 18.0s'), 'Injected script must have 18.0s cloud drift cycle');
assert.ok(injectedScript.includes('za-sentinel-hover 18.0s'), 'Injected script must have 18.0s sentinel hover cycle');
assert.ok(injectedScript.includes('za-neko-head-float 18.0s'), 'Injected script must have 18.0s neko head float cycle');
console.log('✅ Agent cursor injection script verified');

console.log('\n🌟 ALL 4 AVATARS 18.0s LONG CONTINUOUS DEFAULT ANIMATIONS VERIFIED 100%! 🌟\n');
