import assert from 'node:assert/strict';

// Mock localStorage
const mockStorage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

import {
  QuestionMemoryBank,
  QUESTION_MEMORY_STORAGE_KEY,
} from '../src/agent/memory/questionMemoryBank';

console.log('=== TEST 1: Persistent Question Storage & Rehydration ===');
mockStorage.clear();
const bank1 = new QuestionMemoryBank();
bank1.addOrUpdateEntry('How many years of Python experience do you have?', '5', 'llm', 0.95);
bank1.addOrUpdateEntry('Are you willing to undergo a background check?', 'Yes', 'user', 1.0);

assert.equal(bank1.size(), 2);
assert.ok(mockStorage.has(QUESTION_MEMORY_STORAGE_KEY));
console.log('✓ Novel answers persisted to localStorage synchronously');

// Rehydrate fresh instance from storage
const bank2 = new QuestionMemoryBank();
assert.equal(bank2.size(), 2);

const pythonRes = bank2.lookup('years of Python exp?');
assert.equal(pythonRes.hit, true);
assert.equal(pythonRes.answer, '5');
assert.equal(pythonRes.source, 'llm');
console.log('✓ Fresh instance rehydrated from storage with 0ms lookup hit ("' + pythonRes.answer + '")');

console.log('=== TEST 2: Hit Count & Usage Tracking ===');
const initialHitCount = pythonRes.hitCount || 0;
bank2.lookup('years of Python exp?');
const secondLookup = bank2.lookup('years of Python exp?');
assert.ok((secondLookup.hitCount || 0) > initialHitCount);
console.log('✓ Hit count increments dynamically on recurring queries: ' + secondLookup.hitCount);

console.log('=== TEST 3: Portable JSON Export & Import ===');
const exported = bank2.exportToJson();
assert.ok(exported.includes('Python'));
assert.ok(exported.includes('background check'));

// Clear and restore from export
mockStorage.clear();
const bank3 = new QuestionMemoryBank();
assert.equal(bank3.size(), 0);

const importedCount = bank3.importFromJson(exported);
assert.equal(importedCount, 2);
assert.equal(bank3.size(), 2);

const bgCheckRes = bank3.lookup('background check');
assert.equal(bgCheckRes.hit, true);
assert.equal(bgCheckRes.answer, 'Yes');
console.log('✓ Export & Import verified: ' + importedCount + ' entries successfully restored');

console.log('\n🎉 ALL PERSISTENT SELF-LEARNING MEMORY BANK TESTS PASSED (100%)!');
