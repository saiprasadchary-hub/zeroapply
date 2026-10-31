import assert from 'node:assert/strict';
import {
  getCustomCombinedCursorMarkup,
  getCursorSvgMarkup,
  getCursorTheme,
  CURSOR_THEMES,
} from '../src/cursors';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';

console.log('=== TYPING HANDS ANIMATION UNIFICATION VERIFICATION SUITE ===');

// 1. Verify getCustomCombinedCursorMarkup contains typing hands markup and keyframes
console.log('\n--- TEST 1: Combined Cursor Markup Typing Hands ---');
const comboSvg = getCustomCombinedCursorMarkup('pointer_obsidian_pure', 'avatar_grok_bot');
assert.ok(comboSvg.includes('za-typing-hands'), 'Combined SVG must contain za-typing-hands group');
assert.ok(comboSvg.includes('za-typing-hand-left'), 'Combined SVG must contain za-typing-hand-left');
assert.ok(comboSvg.includes('za-typing-hand-right'), 'Combined SVG must contain za-typing-hand-right');
assert.ok(comboSvg.includes('za-typing-keyboard'), 'Combined SVG must contain holographic cyber keyboard');
assert.ok(comboSvg.includes('@keyframes za-hand-type-left'), 'Combined SVG must define za-hand-type-left keyframe');
assert.ok(comboSvg.includes('@keyframes za-hand-type-right'), 'Combined SVG must define za-hand-type-right keyframe');
assert.ok(comboSvg.includes('za-key-hit-left'), 'Combined SVG must define za-key-hit-left keyframe');
assert.ok(comboSvg.includes('za-key-hit-right'), 'Combined SVG must define za-key-hit-right keyframe');
assert.ok(comboSvg.includes('y="53.4"'), 'Combined SVG must position keyboard lower at y=53.4');
assert.ok(comboSvg.includes('cy="50.0"'), 'Combined SVG must position hands lower at cy=50.0');
assert.ok(comboSvg.includes('49.8px'), 'Combined SVG must use lowered 49.8px transform origin');
console.log('✅ Combined SVG typing hands and keyframes verified.');

// 2. Verify getCursorSvgMarkup contains typing hands
console.log('\n--- TEST 2: Base Theme Cursor Markup Typing Hands ---');
const baseSvg = getCursorSvgMarkup(getCursorTheme('obsidian_glass'));
assert.ok(baseSvg.includes('za-typing-hands'), 'Base SVG must contain za-typing-hands group');
assert.ok(baseSvg.includes('za-typing-hand-left'), 'Base SVG must contain za-typing-hand-left');
assert.ok(baseSvg.includes('za-typing-hand-right'), 'Base SVG must contain za-typing-hand-right');
assert.ok(baseSvg.includes('@keyframes za-hand-type-left'), 'Base SVG must define za-hand-type-left');
assert.ok(baseSvg.includes('@keyframes za-hand-type-right'), 'Base SVG must define za-hand-type-right');
assert.ok(baseSvg.includes('y="53.4"'), 'Base SVG must position keyboard lower at y=53.4');
assert.ok(baseSvg.includes('cy="50.0"'), 'Base SVG must position hands lower at cy=50.0');
assert.ok(baseSvg.includes('49.8px'), 'Base SVG must use lowered 49.8px transform origin');
console.log('✅ Base theme SVG typing hands and keyframes verified.');

// 3. Verify getVisualCursorScript injected script contains typing hands and mode synchronization
console.log('\n--- TEST 3: Injected Stealth Script Synchronization ---');
const script = getVisualCursorScript('obsidian_glass');
assert.ok(script.includes('za-typing-hands'), 'Injected script must create or contain za-typing-hands');
assert.ok(script.includes('za-typing-hand-left'), 'Injected script must contain za-typing-hand-left');
assert.ok(script.includes('za-typing-hand-right'), 'Injected script must contain za-typing-hand-right');
assert.ok(script.includes('za-hand-type-left'), 'Injected script must define za-hand-type-left');
assert.ok(script.includes('za-hand-type-right'), 'Injected script must define za-hand-type-right');
assert.ok(script.includes("pointer.classList.add('za-typing')"), 'Injected script must toggle za-typing on pointer');
assert.ok(script.includes("root.classList.add('za-typing')"), 'Injected script must toggle za-typing on root');
assert.ok(script.includes("layerVersion === '4'"), 'Injected script must check layerVersion 4');
assert.ok(script.includes("layerVersion = '4'"), 'Injected script must set layerVersion 4');
assert.ok(script.includes('53.4'), 'Injected script must position keyboard lower at 53.4');
assert.ok(script.includes('50.0'), 'Injected script must position hands lower at 50.0');
assert.ok(script.includes('49.8px'), 'Injected script must use lowered 49.8px transform origin');
console.log('✅ Injected script typing hands and mode synchronization verified.');

console.log('\n🎉 ALL TYPING HANDS ANIMATION TESTS PASSED 100%! 🎉\n');
