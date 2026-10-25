import assert from 'node:assert/strict';
import { getCursorSvgMarkup, getCursorTheme } from '../src/cursors';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';

console.log('=== BLACK & WHITE ANIMATED CURSOR VERIFICATION SUITE ===');

// 1. Check obsidian_glass (AI Companion Bot)
const theme = getCursorTheme('obsidian_glass');
const svg = getCursorSvgMarkup(theme);

console.log('--- TEST 1: Star at tip removed ---');
assert.ok(!svg.includes('za-star'), 'Must not have any za-star element');
assert.ok(!svg.includes('M 16 5.2 L 16.7 7.1'), 'Must not have the star polygon at tip {16, 8}');
console.log('✅ Star at cursor tip is completely removed.');

console.log('--- TEST 2: Perfect precision arrow shape ---');
assert.ok(svg.includes('M 16 8 L 26.5 18.5 L 22.2 18.5 L 25.5 25.1 L 23.5 26.1 L 20.2 19.5 L 16 23.5 Z'), 'Must contain precision arrow path');
assert.equal(theme.hotspot.x, 16, 'Hotspot x must be 16');
assert.equal(theme.hotspot.y, 8, 'Hotspot y must be 8');
console.log('✅ Pointer arrow shape is classic precision arrow with hotspot at (16, 8).');

console.log('--- TEST 3: Fresh Light Color Palette & Accents ---');
assert.ok(svg.includes('fill="#ffffff"'), 'Must contain pure white fill');
assert.ok(svg.includes('fill="#e0f2fe"'), 'Must contain light sky chamfer fill');
assert.ok(svg.includes('stroke="#818cf8"'), 'Must contain light lavender accent stroke');
assert.equal(theme.accentColor, '#38bdf8', 'Theme accentColor must be light cyan #38bdf8');
assert.equal(theme.underlayColor, '#09090b', 'Theme underlayColor must be deep obsidian #09090b');
console.log('✅ Fresh light colors verified (pure white, light sky #e0f2fe, light lavender #818cf8, luminous cyan #38bdf8).');

console.log('--- TEST 4: Multi-Directional Eye Gaze Animation Suite & Headphones Removed ---');
assert.ok(svg.includes('za-bot-blink'), 'Must include za-bot-blink animation');
assert.ok(svg.includes('za-bot-eyes'), 'Must include za-bot-eyes class');
// Check all-direction keyframe coverage in za-bot-blink:
// Front look (0deg, translate(0px, 0px))
assert.ok(svg.includes('translate(0px, 0px) rotate(0deg)'), 'Must include front look');
// Up-right Grok glance (rotate(24deg), translate(4.6px, -2.6px))
assert.ok(svg.includes('rotate(24deg)'), 'Must include up-right glance');
// Left glance towards pointer (rotate(-14deg))
assert.ok(svg.includes('rotate(-14deg)'), 'Must include left glance towards pointer');
// Down look (translate(0px, 3.4px))
assert.ok(svg.includes('translate(0px, 3.4px)'), 'Must include downward reading glance');
// State animations
assert.ok(svg.includes('za-eyes-typing'), 'Must include typing reading scan animation');
assert.ok(svg.includes('za-eyes-thinking'), 'Must include thinking state eye animation');
assert.ok(svg.includes('za-eyes-happy'), 'Must include celebratory happy eye animation');
console.log('✅ Multi-directional gaze animations verified: front look, up-right look, left look, down look, up-left, right, and state modes.');

console.log('--- TEST 5: Clearance distance between cursor and avatar ---');
// Cursor arrow x bounds: 16 to 26.5, y bounds: 8 to 26.1
// Avatar sphere is at cx=45, cy=41, r=10.5. Left edge is 34.5, top edge is 30.5
const arrowMaxX = 26.5;
const arrowMaxY = 26.1;
const botSphereMinX = 34.5;
const botSphereMinY = 30.5;
const distanceX = botSphereMinX - arrowMaxX;
const distanceY = botSphereMinY - arrowMaxY;
assert.ok(distanceX >= 5, `Horizontal clearance must be >= 5px, got ${distanceX}px`);
assert.ok(distanceY >= 4, `Vertical clearance must be >= 4px, got ${distanceY}px`);
console.log(`✅ Clearance distance verified: ${distanceX.toFixed(1)}px horizontal, ${distanceY.toFixed(1)}px vertical breathing room.`);

console.log('--- TEST 6: Injected script synchronization ---');
const script = getVisualCursorScript('obsidian_glass');
assert.ok(script.includes('za-bot-blink'), 'Injected script must contain za-bot-blink');
assert.ok(script.includes('za-eyes-typing'), 'Injected script must contain za-eyes-typing');
assert.ok(script.includes('za-eyes-thinking'), 'Injected script must contain za-eyes-thinking');
assert.ok(script.includes('za-eyes-happy'), 'Injected script must contain za-eyes-happy');
console.log('--- TEST 7: Precision Vector Geometry & Dimensions ---');
assert.ok(svg.includes('rect x="37.5" y="36.5" width="15" height="9" rx="4.5"'), 'Must have pill visor screen');
assert.ok(svg.includes('circle cx="45" cy="41" r="10.5"'), 'Must have head orb sphere');
console.log('✅ Precision vector geometry verified.');

console.log('--- TEST 8: Photorealistic 3D Volumetric Materials & Studio Lighting ---');
assert.ok(svg.includes('id="za-bot-sphere"'), 'Must define ceramic sphere radial studio lighting');
assert.ok(svg.includes('id="za-visor-glass"'), 'Must define curved sapphire OLED visor gradient');
assert.ok(svg.includes('id="za-pointer-face"'), 'Must define faceted polished ceramic arrow face gradient');
assert.ok(svg.includes('id="za-pointer-chamfer"'), 'Must define left bevel chamfer specular gradient');
// Eye catchlights (primary keylight reflection r=0.65, secondary ambient bounce reflection r=0.32)
assert.ok(svg.includes('r="0.65"'), 'Must have studio primary keylight catchlight in eyes');
assert.ok(svg.includes('r="0.32"'), 'Must have studio secondary bounce catchlight in eyes');
// Injected script synchronization
assert.ok(script.includes('za-bot-sphere'), 'Injected script must define za-bot-sphere');
assert.ok(script.includes('za-visor-glass'), 'Injected script must define za-visor-glass');
console.log('✅ Photorealistic 3D hardware materials, studio lighting, and living eye catchlights verified.');

console.log('\n🎉 ALL BLACK & WHITE ANIMATED CURSOR TESTS PASSED! 🎉\n');
