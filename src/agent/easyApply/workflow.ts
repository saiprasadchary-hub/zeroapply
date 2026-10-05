/**
 * ZeroApply EasyApply - Workflow Runner
 */

import {
  EASY_APPLY_MODAL_STATE_SCRIPT,
  FORM_VALIDATION_SCRIPT,
  CHECK_SUBMISSION_CONFIRMED_SCRIPT,
  SUBMISSION_CONFIRMED_SCRIPT,
} from './scripts';
import { isRecoverableWorkflowError } from '../recovery/workflowRecovery';

export interface EasyApplyWorkflowOptions {
  maxSteps?: number;
  allowSubmit?: boolean;
  isActive?: () => boolean;
  wait?: (ms?: number) => Promise<boolean>;
  checkpointKey?: string;
  fillCurrentStep?: () => Promise<{ success: boolean; detectedCount: number; filledCount: number; message: string }>;
  advanceStep?: () => Promise<{ success: boolean; action: 'next' | 'review' | 'submit' | 'done' | 'none'; requiresConfirmation?: boolean }>;
  executeScript: <T>(script: string) => Promise<T>;
  onStatus?: (status: string) => void;
}

export interface EasyApplyWorkflowResult {
  outcome: 'submitted' | 'paused' | 'failed';
  stepsExecuted: number;
  fieldsFilled: number;
  recoveryCount?: number;
  haltBatch?: boolean;
}

async function checkSubmissionConfirmed(executeScript: <T>(script: string) => Promise<T>): Promise<boolean> {
  try {
    const res = await executeScript<boolean>(SUBMISSION_CONFIRMED_SCRIPT || CHECK_SUBMISSION_CONFIRMED_SCRIPT);
    return Boolean(res);
  } catch {
    return false;
  }
}

export async function runEasyApplyWorkflow(options: EasyApplyWorkflowOptions): Promise<EasyApplyWorkflowResult> {
  const {
    maxSteps = 6,
    allowSubmit = false,
    isActive = () => true,
    wait = async () => true,
    fillCurrentStep,
    advanceStep,
    executeScript,
    onStatus,
  } = options;

  let stepsExecuted = 0;
  let fieldsFilled = 0;
  let recoveryCount = 0;

  for (let step = 0; step < maxSteps; step++) {
    if (!isActive()) {
      return { outcome: 'paused', stepsExecuted, fieldsFilled, recoveryCount };
    }

    const modalState = await executeScript<{ isOpen: boolean; hasForm: boolean }>(EASY_APPLY_MODAL_STATE_SCRIPT);
    if (!modalState.isOpen) {
      break;
    }

    if (fillCurrentStep) {
      let filled = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const fillRes = await fillCurrentStep();
          if (fillRes.success) {
            fieldsFilled += fillRes.filledCount;
            filled = true;
            break;
          }
        } catch (err) {
          if (isRecoverableWorkflowError(err)) {
            recoveryCount++;
            onStatus?.('Recovered: resuming from the saved step...');
            await wait(100);
            continue;
          }
          throw err;
        }
      }
      if (!filled && !options.checkpointKey) {
        return { outcome: 'paused', stepsExecuted, fieldsFilled, recoveryCount };
      }
    }

    let validation: { isValid: boolean; emptyCount: number; errorCount: number } = { isValid: true, emptyCount: 0, errorCount: 0 };
    for (let vAttempt = 0; vAttempt < 3; vAttempt++) {
      try {
        validation = await executeScript<{ isValid: boolean; emptyCount: number; errorCount: number }>(FORM_VALIDATION_SCRIPT);
        break;
      } catch (err) {
        if (isRecoverableWorkflowError(err)) {
          recoveryCount++;
          onStatus?.('Recovered: reconnecting to validation...');
          await wait(100);
          continue;
        }
        throw err;
      }
    }

    if (!validation.isValid) {
      return { outcome: 'paused', stepsExecuted, fieldsFilled, recoveryCount };
    }

    stepsExecuted++;

    if (advanceStep) {
      // Natural human review pause before clicking advance/submit
      await wait(600 + Math.random() * 400);

      let adv: { success: boolean; action: 'next' | 'review' | 'submit' | 'done' | 'none'; requiresConfirmation?: boolean };
      try {
        adv = await advanceStep();
      } catch {
        // Ambiguous submit click error - must halt batch
        return { outcome: 'paused', stepsExecuted, fieldsFilled, recoveryCount, haltBatch: true };
      }

      if (adv.action === 'submit') {
        if (!allowSubmit || adv.requiresConfirmation) {
          onStatus?.('Submission requires user confirmation.');
          return { outcome: 'paused', stepsExecuted, fieldsFilled, recoveryCount };
        }

        await wait(650);
        const confirmed = await checkSubmissionConfirmed(executeScript);
        if (confirmed) {
          return { outcome: 'submitted', stepsExecuted, fieldsFilled, recoveryCount };
        }
        return { outcome: 'paused', stepsExecuted, fieldsFilled, recoveryCount };
      }

      if (!adv.success) {
        break;
      }

      // Step transition settling pause
      await wait(750 + Math.random() * 350);
    }
  }

  const confirmed = await checkSubmissionConfirmed(executeScript);
  if (confirmed) {
    return { outcome: 'submitted', stepsExecuted, fieldsFilled, recoveryCount };
  }

  return { outcome: 'paused', stepsExecuted, fieldsFilled, recoveryCount };
}
