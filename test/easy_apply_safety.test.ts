import assert from 'node:assert/strict';
import { runEasyApplyWorkflow } from '../src/agent/easyApply/workflow';
import { EASY_APPLY_MODAL_STATE_SCRIPT, FORM_VALIDATION_SCRIPT } from '../src/agent/easyApply/scripts';

function workflowOptions(allowSubmit: boolean, confirmation: boolean) {
  return {
    maxSteps: 2,
    allowSubmit,
    isActive: () => true,
    wait: async () => true,
    fillCurrentStep: async () => ({ success: true, detectedCount: 1, filledCount: 1, message: 'filled' }),
    advanceStep: async () => allowSubmit
      ? { success: true, action: 'submit' as const }
      : { success: false, action: 'submit' as const, requiresConfirmation: true },
    executeScript: async <T>(script: string): Promise<T> => {
      if (script === EASY_APPLY_MODAL_STATE_SCRIPT) return { isOpen: true, hasForm: true } as T;
      if (script === FORM_VALIDATION_SCRIPT) return { isValid: true, emptyCount: 0, errorCount: 0 } as T;
      return confirmation as T;
    },
    onStatus: () => undefined,
  };
}

const withoutConsent = await runEasyApplyWorkflow(workflowOptions(false, false));
assert.equal(withoutConsent.outcome, 'paused');

const unconfirmed = await runEasyApplyWorkflow(workflowOptions(true, false));
assert.equal(unconfirmed.outcome, 'paused');

const confirmed = await runEasyApplyWorkflow(workflowOptions(true, true));
assert.equal(confirmed.outcome, 'submitted');

console.log('Easy Apply safety tests passed (3/3).');
