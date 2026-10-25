import assert from 'node:assert/strict';
import { handleLinkedInJobSafetyReminder, ensureLinkedInSafeSession } from '../src/agent/stealth/linkedinSafetyGuard';
import { dismissInterruptingModals } from '../src/agent/recovery/modalDismissGuard';
import { DETECT_FORWARD_BUTTON_SCRIPT } from '../src/agent/navigation/wizardStepNavigator';

console.log('=== TEST: Job Search Safety Reminder Auto-Continue Verification ===');

// Mock Webview target that simulates LinkedIn DOM containing "Job search safety reminder"
function createMockWebviewWithReminder() {
  const actions: string[] = [];
  const webview = {
    executeJavaScript: async <T>(script: string): Promise<T> => {
      // Simulate DOM execution
      if (script.includes('continue\\s*applying') || script.includes('job\\s*search\\s*safety\\s*reminder')) {
        actions.push('clicked_continue_applying');
        return true as unknown as T;
      }
      return false as unknown as T;
    },
  };
  return { webview, actions };
}

// 1. Test handleLinkedInJobSafetyReminder bridge
console.log('--- TEST 1: handleLinkedInJobSafetyReminder detects & clicks Continue applying ---');
const { webview: mockView, actions } = createMockWebviewWithReminder();
const reminderBypassed = await handleLinkedInJobSafetyReminder(mockView);
assert.equal(reminderBypassed, true, 'handleLinkedInJobSafetyReminder must return true');
assert.ok(actions.includes('clicked_continue_applying'), 'Must have executed click on Continue applying');
console.log('✅ handleLinkedInJobSafetyReminder successfully auto-clicks Continue applying.');

// 2. Test ensureLinkedInSafeSession integration
console.log('--- TEST 2: ensureLinkedInSafeSession includes safety reminder check ---');
let safeSessionScriptCalls = 0;
const safeSessionView = {
  executeJavaScript: async <T>(script: string): Promise<T> => {
    safeSessionScriptCalls++;
    if (script.includes('job\\s*search\\s*safety\\s*reminder')) {
      return true as unknown as T;
    }
    if (script.includes('auditScript') || script.includes('account health')) {
      return { isSafe: true, status: 'clean' } as unknown as T;
    }
    return false as unknown as T;
  },
};
const sessionStatus = await ensureLinkedInSafeSession(safeSessionView);
assert.equal(sessionStatus.isSafe, true, 'Session must be reported safe');
assert.equal(sessionStatus.status, 'reminder_continued', 'Status must reflect reminder_continued');
console.log('✅ ensureLinkedInSafeSession seamlessly handles Job search safety reminder.');

// 3. Test DETECT_FORWARD_BUTTON_SCRIPT regex
console.log('--- TEST 3: wizardStepNavigator DETECT_FORWARD_BUTTON_SCRIPT pattern ---');
assert.ok(
  DETECT_FORWARD_BUTTON_SCRIPT.includes('continue\\s*applying'),
  'DETECT_FORWARD_BUTTON_SCRIPT must contain pattern for Continue applying'
);
assert.ok(
  DETECT_FORWARD_BUTTON_SCRIPT.includes('Job Search Safety Reminder'),
  'DETECT_FORWARD_BUTTON_SCRIPT must have safety reminder priority check'
);
console.log('✅ wizardStepNavigator DETECT_FORWARD_BUTTON_SCRIPT includes Continue applying handler.');

// 4. Test modalDismissGuard DISMISS_INTERRUPTING_MODALS_SCRIPT
console.log('--- TEST 4: modalDismissGuard includes Continue applying ---');
const { DISMISS_INTERRUPTING_MODALS_SCRIPT } = await import('../src/agent/recovery/modalDismissGuard');
assert.ok(
  DISMISS_INTERRUPTING_MODALS_SCRIPT.includes('continue\\s*applying'),
  'DISMISS_INTERRUPTING_MODALS_SCRIPT must include continue applying detection'
);
console.log('✅ modalDismissGuard DISMISS_INTERRUPTING_MODALS_SCRIPT includes Continue applying handler.');

console.log('\n🎉 ALL JOB SEARCH SAFETY REMINDER AUTO-CONTINUE TESTS PASSED! 🎉\n');
