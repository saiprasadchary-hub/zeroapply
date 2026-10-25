import assert from 'node:assert/strict';

// Mock localStorage for test environment
const mockStorage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

import {
  hasBlockingDialog,
  DISMISS_INTERRUPTING_MODALS_SCRIPT,
  saveCheckpoint,
  loadCheckpoint,
  hasPendingCheckpoint,
  clearCheckpoint,
  type AutoApplyCheckpoint,
} from '../src/agent/recovery';

console.log('=== TEST 1: Blocking Modal Detection ===');
assert.equal(hasBlockingDialog('<div role="alertdialog"><h3>Discard application?</h3></div>'), true);
assert.equal(hasBlockingDialog('<div class="modal">Save your changes before leaving</div>'), true);
assert.equal(hasBlockingDialog('<div>Normal form content</div>'), false);
console.log('✓ hasBlockingDialog accurately flags modal interruptions.');

console.log('=== TEST 2: In-browser Dismiss Script Validation ===');
assert.ok(DISMISS_INTERRUPTING_MODALS_SCRIPT.includes('discard'));
assert.ok(DISMISS_INTERRUPTING_MODALS_SCRIPT.includes('cookie'));
assert.doesNotThrow(() => {
  new Function(DISMISS_INTERRUPTING_MODALS_SCRIPT);
});
console.log('✓ DISMISS_INTERRUPTING_MODALS_SCRIPT compiled and validated successfully.');

console.log('=== TEST 3: Checkpoint Persistence & Resumption ===');
clearCheckpoint();
assert.equal(hasPendingCheckpoint(), false);

const checkpoint: AutoApplyCheckpoint = {
  portal: 'linkedin',
  roleKeyword: 'Frontend Engineer',
  location: 'Remote',
  currentCardIndex: 4,
  appliedJobIds: ['101', '103'],
  skippedJobIds: ['102'],
  successfulCount: 2,
  timestamp: Date.now(),
};

saveCheckpoint(checkpoint);
assert.equal(hasPendingCheckpoint(), true);

const loaded = loadCheckpoint();
assert.ok(loaded);
assert.equal(loaded?.portal, 'linkedin');
assert.equal(loaded?.currentCardIndex, 4);
assert.equal(loaded?.successfulCount, 2);
assert.deepEqual(loaded?.appliedJobIds, ['101', '103']);

clearCheckpoint();
assert.equal(hasPendingCheckpoint(), false);
assert.equal(loadCheckpoint(), null);
console.log('✓ Checkpoint save, load, and clear cycle verified seamlessly.');

console.log('\n🎉 ALL MODAL RECOVERY & CHECKPOINT TESTS PASSED (100%)!');
