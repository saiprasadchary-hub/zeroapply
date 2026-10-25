import assert from 'node:assert/strict';
import {
  loadStoredSettings,
  saveStoredSettings,
  isAgentControlBarEnabled,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '../src/settings/settingsManager';

console.log('=== TEST: Agent Control Bar Real-Time Toggle Verification ===\n');

// 1. Initial State
console.log('--- TEST 1: Default configuration has agentControlBarVisible = true ---');
assert.equal(DEFAULT_SETTINGS.agentControlBarVisible, true, 'DEFAULT_SETTINGS must have agentControlBarVisible = true');
const initial = loadStoredSettings();
assert.equal(typeof initial.agentControlBarVisible, 'boolean', 'agentControlBarVisible must be a boolean');
console.log(`✅ Default agentControlBarVisible: ${initial.agentControlBarVisible}`);

// 2. Toggle to false
console.log('--- TEST 2: Toggle agentControlBarVisible to false ---');
const modified: AppSettings = {
  ...initial,
  agentControlBarVisible: false,
};
saveStoredSettings(modified);
assert.equal(isAgentControlBarEnabled(), false, 'isAgentControlBarEnabled must return false when disabled');
const loadedAfterHide = loadStoredSettings();
assert.equal(loadedAfterHide.agentControlBarVisible, false, 'Saved settings must retain agentControlBarVisible = false');
console.log('✅ Successfully hid Agent Control Bar in settings.');

// 3. Toggle to true
console.log('--- TEST 3: Toggle agentControlBarVisible to true ---');
const restored: AppSettings = {
  ...loadedAfterHide,
  agentControlBarVisible: true,
};
saveStoredSettings(restored);
assert.equal(isAgentControlBarEnabled(), true, 'isAgentControlBarEnabled must return true when enabled');
const loadedAfterShow = loadStoredSettings();
assert.equal(loadedAfterShow.agentControlBarVisible, true, 'Saved settings must retain agentControlBarVisible = true');
console.log('✅ Successfully showed Agent Control Bar in settings.');

console.log('\n🎉 ALL AGENT CONTROL BAR TOGGLE TESTS PASSED PERFECTLY!\n');
