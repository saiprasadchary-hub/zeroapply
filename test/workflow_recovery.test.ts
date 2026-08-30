import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runEasyApplyWorkflow } from '../src/agent/easyApply/workflow';
import { EASY_APPLY_MODAL_STATE_SCRIPT, FORM_VALIDATION_SCRIPT, SUBMISSION_CONFIRMED_SCRIPT } from '../src/agent/easyApply/scripts';
import { runStandardFormWorkflow } from '../src/agent/All supported forms/workflow';
import { STANDARD_FORM_VALIDATION_SCRIPT, STANDARD_SUBMISSION_CONFIRMATION_SCRIPT } from '../src/agent/All supported forms/scripts';
import { isRecoverableWorkflowError, runRecoverableOperation } from '../src/agent/recovery/workflowRecovery';
import type { WorkflowCheckpoint } from '../src/agent/recovery/workflowRecovery';

assert.equal(isRecoverableWorkflowError(new Error('Execution context was destroyed during navigation')), true);
assert.equal(isRecoverableWorkflowError(new Error('CAPTCHA security checkpoint')), false);

let genericAttempts = 0;
const genericResult = await runRecoverableOperation(
  async () => {
    genericAttempts++;
    if (genericAttempts < 3) throw new Error('ERR_ABORTED during navigation');
    return 'recovered';
  },
  {
    label: 'test operation',
    maxAttempts: 4,
    isActive: () => true,
    wait: async () => true,
  },
);
assert.equal(genericResult, 'recovered');
assert.equal(genericAttempts, 3);

let fillAttempts = 0;
let validationAttempts = 0;
let submitClicked = false;
const statuses: string[] = [];
const recoveredWorkflow = await runEasyApplyWorkflow({
  maxSteps: 3,
  allowSubmit: true,
  isActive: () => true,
  wait: async () => true,
  checkpointKey: 'test:easy:recover',
  fillCurrentStep: async () => {
    fillAttempts++;
    if (fillAttempts < 3) throw new Error('Execution context destroyed while the LLM was filling');
    return { success: true, detectedCount: 2, filledCount: 2, message: 'filled' };
  },
  advanceStep: async () => {
    submitClicked = true;
    return { success: true, action: 'submit' as const };
  },
  executeScript: async <T>(script: string): Promise<T> => {
    if (script === EASY_APPLY_MODAL_STATE_SCRIPT) return { isOpen: true, hasForm: true } as T;
    if (script === FORM_VALIDATION_SCRIPT) {
      validationAttempts++;
      if (validationAttempts < 3) throw new Error('Frame detached during validation');
      return { isValid: true, emptyCount: 0, errorCount: 0 } as T;
    }
    if (script === SUBMISSION_CONFIRMED_SCRIPT) return submitClicked as T;
    throw new Error('Unexpected script');
  },
  onStatus: (message) => statuses.push(message),
});
assert.equal(recoveredWorkflow.outcome, 'submitted');
assert.equal(fillAttempts, 3);
assert.equal(validationAttempts, 3);
assert.equal(recoveredWorkflow.recoveryCount, 4);
assert.ok(statuses.some((message) => message.includes('resuming from the saved step')));
assert.ok(statuses.some((message) => message.includes('reconnecting to validation')));

let ambiguousClickAttempts = 0;
const ambiguousSubmission = await runEasyApplyWorkflow({
  maxSteps: 2,
  allowSubmit: true,
  isActive: () => true,
  wait: async () => true,
  checkpointKey: 'test:easy:ambiguous-submit',
  fillCurrentStep: async () => ({ success: true, detectedCount: 1, filledCount: 1, message: 'filled' }),
  advanceStep: async () => {
    ambiguousClickAttempts++;
    throw new Error('Execution context destroyed during click');
  },
  executeScript: async <T>(script: string): Promise<T> => {
    if (script === EASY_APPLY_MODAL_STATE_SCRIPT) return { isOpen: true, hasForm: true } as T;
    if (script === FORM_VALIDATION_SCRIPT) return { isValid: true, emptyCount: 0, errorCount: 0 } as T;
    if (script === SUBMISSION_CONFIRMED_SCRIPT) return false as T;
    throw new Error('Unexpected script');
  },
  onStatus: () => undefined,
});
assert.equal(ambiguousSubmission.outcome, 'paused');
assert.equal(ambiguousSubmission.haltBatch, true);
assert.equal(ambiguousClickAttempts, 1, 'an ambiguous submit-capable click must never be repeated');

const interruptedSubmit: WorkflowCheckpoint = {
  workflow: 'standard_form',
  key: 'test:standard:interrupted-submit',
  step: 3,
  phase: 'confirming',
  fieldsFilled: 6,
  recoveryCount: 2,
  updatedAt: Date.now(),
};
let resumedFillCalls = 0;
let resumedActionCalls = 0;
const confirmedResume = await runStandardFormWorkflow({
  maxSteps: 5,
  allowSubmit: true,
  isActive: () => true,
  wait: async () => true,
  checkpointKey: interruptedSubmit.key,
  resumeCheckpoint: interruptedSubmit,
  fillCurrentStep: async () => {
    resumedFillCalls++;
    return { success: true, detectedCount: 1, filledCount: 1, message: 'filled' };
  },
  advanceStep: async () => {
    resumedActionCalls++;
    return { success: true, action: 'submit' as const };
  },
  executeScript: async <T>(script: string): Promise<T> => {
    if (script === STANDARD_SUBMISSION_CONFIRMATION_SCRIPT) return { confirmed: true, evidence: 'already submitted' } as T;
    if (script === STANDARD_FORM_VALIDATION_SCRIPT) return { isValid: true, emptyCount: 0, errorCount: 0 } as T;
    throw new Error('Unexpected script');
  },
  onStatus: () => undefined,
});
assert.equal(confirmedResume.outcome, 'submitted');
assert.equal(confirmedResume.stepsCompleted, 3);
assert.equal(confirmedResume.fieldsFilled, 6);
assert.equal(resumedFillCalls, 0);
assert.equal(resumedActionCalls, 0, 'resume must verify an interrupted submit instead of clicking it again');

const easyBatchSource = readFileSync('src/agent/autoApply/autoApplyEngine.ts', 'utf8');
const standardBatchSource = readFileSync('src/agent/All supported forms/standardFormsEngine.ts', 'utf8');
const agentBrowserSource = readFileSync('AgentBrowser/AgentBrowser.tsx', 'utf8');
assert.match(easyBatchSource, /allowSubmit\s*&&\s*!workflow\.haltBatch/);
assert.match(standardBatchSource, /allowSubmit\s*&&\s*!workflow\.haltBatch/);
assert.match(agentBrowserSource, /Browser interruption detected\. Auto-restarting/);
assert.match(agentBrowserSource, /Chrome connection interrupted\. Auto-restarting/);

console.log('Workflow recovery tests passed (22/22).');
