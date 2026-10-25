import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadStoredSettings,
  saveStoredSettings,
  isLiveAgentInspectorEnabled,
  isLiveAgentActivityEnabled,
  type AppSettings,
} from '../src/settings/settingsManager';

console.log('=== TEST SUITE: Live Agent Inspector & Activity Settings ===');

// --- TEST 1: Default Settings Verification ---
console.log('--- TEST 1: Verify Default Settings ---');
assert.equal(DEFAULT_SETTINGS.liveAgentInspectorVisible, true, 'Live Agent Inspector must default to true (SHOW)');
assert.equal(DEFAULT_SETTINGS.liveAgentActivityVisible, true, 'Live Agent Activity must default to true (SHOW)');
console.log('✅ Defaults verified: Both Live Agent Inspector and Activity are enabled by default.');

// --- TEST 2: Turn Off Live Agent Inspector ---
console.log('--- TEST 2: Turn Off Live Agent Inspector ---');
const mockSettings1: AppSettings = {
  ...DEFAULT_SETTINGS,
  liveAgentInspectorVisible: false,
};
saveStoredSettings(mockSettings1);
assert.equal(isLiveAgentInspectorEnabled(), false, 'isLiveAgentInspectorEnabled should return false when turned off');
assert.equal(isLiveAgentActivityEnabled(), true, 'Live Agent Activity should remain unaffected');
console.log('✅ Turning off Live Agent Inspector works as expected.');

// --- TEST 3: Turn Off Live Agent Activity ---
console.log('--- TEST 3: Turn Off Live Agent Activity ---');
const mockSettings2: AppSettings = {
  ...DEFAULT_SETTINGS,
  liveAgentInspectorVisible: true,
  liveAgentActivityVisible: false,
};
saveStoredSettings(mockSettings2);
assert.equal(isLiveAgentInspectorEnabled(), true, 'Live Agent Inspector should remain enabled');
assert.equal(isLiveAgentActivityEnabled(), false, 'isLiveAgentActivityEnabled should return false when turned off');
console.log('✅ Turning off Live Agent Activity works as expected.');

// --- TEST 4: Turn Off Both Inspector and Activity ---
console.log('--- TEST 4: Turn Off Both ---');
const mockSettings3: AppSettings = {
  ...DEFAULT_SETTINGS,
  liveAgentInspectorVisible: false,
  liveAgentActivityVisible: false,
};
saveStoredSettings(mockSettings3);
assert.equal(isLiveAgentInspectorEnabled(), false, 'Inspector should be off');
assert.equal(isLiveAgentActivityEnabled(), false, 'Activity should be off');
console.log('✅ Both can be turned off simultaneously.');

// --- TEST 5: Restore to Defaults ---
console.log('--- TEST 5: Restore to Defaults ---');
saveStoredSettings(DEFAULT_SETTINGS);
assert.equal(isLiveAgentInspectorEnabled(), true, 'Inspector restored to true');
assert.equal(isLiveAgentActivityEnabled(), true, 'Activity restored to true');
console.log('✅ Both restored to true.');

console.log('\n🎉 ALL LIVE AGENT INSPECTOR & ACTIVITY SETTINGS TESTS PASSED! 🎉\n');
