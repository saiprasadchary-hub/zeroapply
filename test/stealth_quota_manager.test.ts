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
  DailyQuotaManager,
  DAILY_QUOTA_STORAGE_KEY,
  stealthEngine,
} from '../src/agent/stealth';

console.log('=== TEST 1: Daily Quota Enforcement & Tracking ===');
mockStorage.clear();
const quotaMgr = new DailyQuotaManager();
quotaMgr.resetQuota();
quotaMgr.setMaxDaily(3);

assert.equal(quotaMgr.canApply(), true);
assert.equal(quotaMgr.getRemainingQuota(), 3);

quotaMgr.recordApplication();
quotaMgr.recordApplication();
assert.equal(quotaMgr.canApply(), true);
assert.equal(quotaMgr.getRemainingQuota(), 1);

quotaMgr.recordApplication();
assert.equal(quotaMgr.canApply(), false);
assert.equal(quotaMgr.getRemainingQuota(), 0);
console.log('✓ Daily application limit (3/3) enforced: further auto-applies paused');

console.log('=== TEST 2: Quota Persistence & Storage Hydration ===');
assert.ok(mockStorage.has(DAILY_QUOTA_STORAGE_KEY));
const quotaMgr2 = new DailyQuotaManager();
assert.equal(quotaMgr2.canApply(), false);
assert.equal(quotaMgr2.getRemainingQuota(), 0);
console.log('✓ Quota state preserved across sessions via storage: ' + quotaMgr2.getDailyStats().count + ' applied today');

console.log('=== TEST 3: Human Gaussian Inter-Application Pacing ===');
stealthEngine.updateConfig({ enabled: true, mode: 'natural' });
const delays: number[] = [];
for (let i = 0; i < 25; i++) {
  const d = stealthEngine.getHumanInterApplicationDelay(4500, 11000);
  assert.ok(d >= 4500 && d <= 11000, `Delay ${d} out of range [4500, 11000]`);
  delays.push(d);
}

// Verify non-deterministic variation (not a robotic fixed sleep)
const uniqueDelays = new Set(delays);
assert.ok(uniqueDelays.size > 15, 'Delays lack natural variation');
const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
console.log(`✓ Gaussian inter-application delays verified (avg: ${Math.round(avgDelay)}ms across 25 samples)`);

console.log('=== TEST 4: Micro-Delay Generation ===');
const micro = stealthEngine.getMicroDelay(180, 450);
assert.ok(micro >= 180 && micro <= 450);
console.log(`✓ Micro-delay generated: ${micro}ms`);

console.log('\n🎉 ALL STEALTH PACING & DAILY QUOTA TESTS PASSED (100%)!');
