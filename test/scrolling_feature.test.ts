import assert from 'node:assert/strict';
import {
  getVisualCursorScript,
  cursorScrollPage,
  cursorScrollContainer,
  cursorScrollElementIntoView,
} from '../src/agent/stealth/agentCursor';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';

console.log('=== SCROLLING FEATURE UNIT TEST SUITE ===');

// --- TEST 1: Script Integrity Guarantees for Scrolling ---
console.log('--- TEST 1: Script Integrity Guarantees for Scrolling ---');
const script = getVisualCursorScript();
assert.ok(typeof script === 'string' && script.length > 500, 'Script must be non-empty');
assert.ok(script.includes('scrollPage'), 'Cursor client script must declare scrollPage');
assert.ok(script.includes('scrollContainer'), 'Cursor client script must declare scrollContainer');
assert.ok(script.includes('scrollElementIntoView'), 'Cursor client script must declare scrollElementIntoView');
assert.ok(script.includes('WheelEvent'), 'Cursor script must dispatch WheelEvent for virtual scrollers');
console.log('✅ Script integrity verifies all scroll methods and WheelEvent dispatch.');

// --- TEST 2: Cursor Helper Dispatch Tests ---
console.log('--- TEST 2: Cursor Helper Dispatch Tests ---');
const executedScripts: string[] = [];

const mockWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    executedScripts.push(code);
    if (code.includes('window.__zeroapplyCursor.scrollPage')) {
      return true as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.scrollContainer')) {
      return true as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.scrollElementIntoView')) {
      return true as unknown as T;
    }
    return true as unknown as T;
  },
};

(async () => {
  const scrollPageRes = await cursorScrollPage(mockWebview, 350, 'AI: Scrolling down');
  assert.equal(scrollPageRes, true, 'cursorScrollPage should return true on success');
  assert.ok(
    executedScripts.some((s) => s.includes('scrollPage(350')),
    'Must execute window.__zeroapplyCursor.scrollPage with delta'
  );

  const scrollContainerRes = await cursorScrollContainer(mockWebview, '.jobs-search-results-list', 400, 'AI: Scrolling list');
  assert.equal(scrollContainerRes, true, 'cursorScrollContainer should return true on success');
  assert.ok(
    executedScripts.some((s) => s.includes('scrollContainer') && s.includes('.jobs-search-results-list')),
    'Must execute window.__zeroapplyCursor.scrollContainer with selector and delta'
  );

  const scrollIntoViewRes = await cursorScrollElementIntoView(mockWebview, '#job-card-5', 'AI: Viewing job');
  assert.equal(scrollIntoViewRes, true, 'cursorScrollElementIntoView should return true on success');
  assert.ok(
    executedScripts.some((s) => s.includes('scrollElementIntoView') && s.includes('#job-card-5')),
    'Must execute window.__zeroapplyCursor.scrollElementIntoView with selector'
  );

  console.log('✅ All cursor scrolling helper functions executed correctly!');
  console.log('🎉 ALL SCROLLING FEATURE TESTS PASSED!');
})();
