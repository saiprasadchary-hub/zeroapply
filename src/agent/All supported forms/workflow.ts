/**
 * ZeroApply Standard Forms - Workflow Runner
 */

import {
  STANDARD_FORM_VALIDATION_SCRIPT,
  STANDARD_SUBMISSION_CONFIRMATION_SCRIPT,
} from './scripts';
import type { WorkflowCheckpoint } from '../recovery/workflowRecovery';

export interface StandardFormWorkflowOptions {
  maxSteps?: number;
  allowSubmit?: boolean;
  isActive?: () => boolean;
  wait?: (ms?: number) => Promise<boolean>;
  checkpointKey?: string;
  resumeCheckpoint?: WorkflowCheckpoint;
  fillCurrentStep?: () => Promise<{ success: boolean; detectedCount: number; filledCount: number; message: string }>;
  advanceStep?: (allowSubmit: boolean) => Promise<{ success: boolean; action: 'next' | 'review' | 'submit' | 'done' | 'none'; requiresConfirmation?: boolean }>;
  executeScript: <T>(script: string) => Promise<T>;
  onStatus?: (status: string) => void;
}

export interface StandardFormWorkflowResult {
  outcome: 'submitted' | 'review_ready' | 'needs_human' | 'failed';
  stepsExecuted?: number;
  stepsCompleted?: number;
  fieldsFilled?: number;
  recoveryCount?: number;
}

export async function runStandardFormWorkflow(
  options: StandardFormWorkflowOptions
): Promise<StandardFormWorkflowResult> {
  const {
    maxSteps = 4,
    allowSubmit = false,
    isActive = () => true,
    resumeCheckpoint,
    fillCurrentStep,
    advanceStep,
    executeScript,
  } = options;

  // If resuming from confirming phase, verify without clicking again
  if (resumeCheckpoint && resumeCheckpoint.phase === 'confirming') {
    try {
      const conf = await executeScript<{ confirmed: boolean; evidence?: string }>(
        STANDARD_SUBMISSION_CONFIRMATION_SCRIPT
      );
      if (conf.confirmed) {
        return {
          outcome: 'submitted',
          stepsCompleted: resumeCheckpoint.step,
          stepsExecuted: resumeCheckpoint.step,
          fieldsFilled: resumeCheckpoint.fieldsFilled,
          recoveryCount: resumeCheckpoint.recoveryCount,
        };
      }
    } catch {
      return { outcome: 'needs_human', stepsCompleted: resumeCheckpoint.step, fieldsFilled: resumeCheckpoint.fieldsFilled };
    }
  }

  let stepsExecuted = 0;
  let fieldsFilled = 0;

  for (let step = 0; step < maxSteps; step++) {
    if (!isActive()) {
      return { outcome: 'needs_human', stepsExecuted, fieldsFilled };
    }

    // Fill step with retry for transient DOM scan failures
    if (fillCurrentStep) {
      let fillSuccess = false;
      for (let scanAttempt = 0; scanAttempt < 3; scanAttempt++) {
        try {
          const fillRes = await fillCurrentStep();
          if (fillRes.message && (fillRes.message.includes('Security') || fillRes.message.includes('CAPTCHA'))) {
            return { outcome: 'needs_human', stepsExecuted, fieldsFilled };
          }
          if (fillRes.success) {
            fillSuccess = true;
            fieldsFilled += fillRes.filledCount;
            break;
          }
        } catch {
          // retry
        }
      }
      if (!fillSuccess) {
        return { outcome: 'needs_human', stepsExecuted, fieldsFilled };
      }
    }

    // Validation check
    try {
      const validation = await executeScript<{ isValid: boolean; emptyCount: number; errorCount: number }>(
        STANDARD_FORM_VALIDATION_SCRIPT
      );
      if (!validation.isValid) {
        return { outcome: 'needs_human', stepsExecuted, fieldsFilled };
      }
    } catch {
      return { outcome: 'needs_human', stepsExecuted, fieldsFilled };
    }

    stepsExecuted++;

    // Advance step with retry for delayed action
    if (advanceStep) {
      let advResult: { success: boolean; action: 'next' | 'review' | 'submit' | 'done' | 'none'; requiresConfirmation?: boolean } | null = null;
      for (let advAttempt = 0; advAttempt < 3; advAttempt++) {
        try {
          const res = await advanceStep(allowSubmit);
          if (res.action === 'submit' && !allowSubmit) {
            return { outcome: 'review_ready', stepsExecuted, stepsCompleted: stepsExecuted, fieldsFilled };
          }
          if (res.action === 'submit') {
            advResult = res;
            break;
          }
          if (res.success) {
            advResult = res;
            break;
          }
        } catch {
          return { outcome: 'needs_human', stepsExecuted, stepsCompleted: stepsExecuted, fieldsFilled };
        }
      }

      if (advResult && advResult.action === 'submit') {
        try {
          const conf = await executeScript<{ confirmed: boolean; evidence?: string }>(
            STANDARD_SUBMISSION_CONFIRMATION_SCRIPT
          );
          if (conf.confirmed) {
            return { outcome: 'submitted', stepsExecuted, stepsCompleted: stepsExecuted, fieldsFilled };
          }
          return { outcome: 'needs_human', stepsExecuted, stepsCompleted: stepsExecuted, fieldsFilled };
        } catch {
          return { outcome: 'needs_human', stepsExecuted, stepsCompleted: stepsExecuted, fieldsFilled };
        }
      }
    }
  }

  return { outcome: 'needs_human', stepsExecuted, stepsCompleted: stepsExecuted, fieldsFilled };
}
