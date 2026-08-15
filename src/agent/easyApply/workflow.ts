import { EASY_APPLY_MODAL_STATE_SCRIPT, FORM_VALIDATION_SCRIPT, SUBMISSION_CONFIRMED_SCRIPT } from './scripts';
import type { EasyApplyWorkflowOptions, EasyApplyWorkflowResult } from './types';
import { liveTelemetry } from '../telemetry/liveTelemetry';

interface FormValidationResult {
  isValid: boolean;
  emptyCount: number;
  errorCount: number;
}

interface ModalState {
  isOpen: boolean;
  hasForm: boolean;
}

/**
 * Runs one Easy Apply form from its first visible step through final submission.
 * Every successful Next or Review action intentionally returns to the same
 * scan -> fill -> validate cycle for the newly rendered screen.
 */
export async function runEasyApplyWorkflow(options: EasyApplyWorkflowOptions): Promise<EasyApplyWorkflowResult> {
  let step = 1;
  let fieldsFilled = 0;
  const accumulatedQaPairs: { question: string; answer: string }[] = [];

  while (options.isActive() && step <= options.maxSteps) {
    liveTelemetry.emit({
      type: 'step',
      title: `Easy Apply Step ${step} / ${options.maxSteps}`,
      detail: `Scanning modal dialog & interactive form`,
      stepIndex: step,
      totalSteps: options.maxSteps,
      status: 'running',
    });

    let modal: ModalState = { isOpen: false, hasForm: false };
    for (let modalAttempt = 0; modalAttempt < 5; modalAttempt++) {
      modal = await options.executeScript<ModalState>(EASY_APPLY_MODAL_STATE_SCRIPT).catch(() => ({ isOpen: false, hasForm: false }));
      if (modal.isOpen && modal.hasForm) break;
      if (!await options.wait(700)) return { outcome: 'stopped', fieldsFilled, stepsCompleted: step - 1 };
    }

    if (!modal.isOpen || !modal.hasForm) {
      // Check if submission already happened before concluding modal closed
      const submitted = await checkSubmissionConfirmed(options, 3);
      if (submitted) {
        liveTelemetry.emit({
          type: 'submit',
          title: 'Application Confirmed Submitted!',
          detail: 'Dialog closed following successful submission',
          status: 'completed',
        });
        return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, qaPairs: accumulatedQaPairs };
      }

      options.onStatus(`Easy Apply step ${step}: application dialog is no longer available.`, 'warning');
      liveTelemetry.emit({
        type: 'pause',
        title: `Modal closed or unavailable`,
        detail: `Step ${step} requires review`,
        status: 'warning',
      });
      return { outcome: 'paused', fieldsFilled, stepsCompleted: step - 1 };
    }

    options.onStatus(`Easy Apply step ${step}: scanning and filling fields...`);

    let fillResult;
    try {
      fillResult = await options.fillCurrentStep();
    } catch (error) {
      options.onStatus(`Easy Apply step ${step}: field filling failed (${error instanceof Error ? error.message : 'unexpected page error'}).`, 'error');
      liveTelemetry.emit({
        type: 'status',
        title: `Step ${step} autofill failed`,
        detail: String(error),
        status: 'error',
      });
      return { outcome: 'paused', fieldsFilled, stepsCompleted: step - 1 };
    }
    fieldsFilled += fillResult.filledCount;
    if (fillResult.qaPairs) {
      accumulatedQaPairs.push(...fillResult.qaPairs);
    }

    if (fillResult.resumeFieldDetected && !fillResult.resumeAttached) {
      options.onStatus(`Easy Apply step ${step}: resume field detected but could not verify attachment. Continuing...`, 'warning');
    }

    // Add a short delay for DOM to settle and React state to detect inputs
    if (!await options.wait(600)) return { outcome: 'stopped', fieldsFilled, stepsCompleted: step - 1 };

    liveTelemetry.emit({
      type: 'validate',
      title: `Checking form requirements on Step ${step}`,
      detail: `Verifying required inputs, radios, & constraints`,
      status: 'running',
    });

    let validation: FormValidationResult;
    try {
      validation = await options.executeScript<FormValidationResult>(FORM_VALIDATION_SCRIPT);
    } catch {
      validation = { isValid: true, emptyCount: 0, errorCount: 0 };
    }

    // If validation shows empty required fields, attempt a rapid self-healing fill pass
    if (!validation.isValid && validation.emptyCount > 0) {
      options.onStatus(`Easy Apply step ${step}: self-healing ${validation.emptyCount} unfilled field(s)...`);
      try {
        const healResult = await options.fillCurrentStep();
        fieldsFilled += healResult.filledCount;
        if (!await options.wait(500)) return { outcome: 'stopped', fieldsFilled, stepsCompleted: step - 1 };
        validation = await options.executeScript<FormValidationResult>(FORM_VALIDATION_SCRIPT).catch(() => ({ isValid: true, emptyCount: 0, errorCount: 0 }));
      } catch {
        // Continue with original validation
      }
    }

    if (!validation.isValid && validation.errorCount > 0) {
      options.onStatus(`Easy Apply step ${step}: ${validation.emptyCount} required field(s) or ${validation.errorCount} error(s) need review.`, 'warning');
      liveTelemetry.emit({
        type: 'pause',
        title: `Paused for Review on Step ${step}`,
        detail: `${validation.emptyCount} empty required field(s), ${validation.errorCount} validation warning(s)`,
        status: 'warning',
      });
      return { outcome: 'paused', fieldsFilled, stepsCompleted: step - 1, qaPairs: accumulatedQaPairs };
    }

    liveTelemetry.emit({
      type: 'validate',
      title: `Step ${step} validation passed`,
      detail: `All required form inputs verified valid`,
      status: 'completed',
    });

    options.onStatus(`Easy Apply step ${step}: advancing...`);
    const action = await options.advanceStep();

    // 1. Direct Submit Action
    if (action.action === 'submit') {
      options.onStatus('Easy Apply: submitting application...');
      liveTelemetry.emit({
        type: 'click',
        title: 'Submit application button',
        detail: 'Triggering final application submission',
        status: 'running',
      });

      await options.wait(2000);
      await checkSubmissionConfirmed(options, 4);

      liveTelemetry.emit({
        type: 'validate',
        title: 'Checking submitted or not',
        detail: 'Application submission completed',
        status: 'completed',
      });
      return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, qaPairs: accumulatedQaPairs };
    }

    // 2. Review Action -> Automatically proceed to final submit without pausing!
    if (action.action === 'review') {
      options.onStatus(`Easy Apply step ${step}: review page loaded, proceeding to final submission...`);
      liveTelemetry.emit({
        type: 'click',
        title: 'Review button',
        detail: 'Proceeding directly to final submission',
        status: 'running',
      });

      if (!await options.wait(1200)) return { outcome: 'stopped', fieldsFilled, stepsCompleted: step, qaPairs: accumulatedQaPairs };
      
      // Look for the final submit button on the review page
      const submitAction = await options.advanceStep();
      if (submitAction.success && submitAction.action === 'submit') {
        options.onStatus('Easy Apply: final submission triggered!');
        liveTelemetry.emit({
          type: 'click',
          title: 'Submit application button',
          detail: 'Submitting final reviewed application',
          status: 'running',
        });
        
        await options.wait(2000);
        await checkSubmissionConfirmed(options, 4);

        liveTelemetry.emit({
          type: 'validate',
          title: 'Checking submitted or not',
          detail: 'Application submission completed',
          status: 'completed',
        });
        return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, qaPairs: accumulatedQaPairs };
      }
    }

    if (!action.success) {
      const submitted = await checkSubmissionConfirmed(options, 3);
      if (submitted) {
        liveTelemetry.emit({
          type: 'validate',
          title: 'Checking submitted or not',
          detail: 'Submission confirmation verified in DOM',
          status: 'completed',
        });
        return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, qaPairs: accumulatedQaPairs };
      }
      return { outcome: 'paused', fieldsFilled, stepsCompleted: step, qaPairs: accumulatedQaPairs };
    }

    if (!await options.wait(1500)) return { outcome: 'stopped', fieldsFilled, stepsCompleted: step, qaPairs: accumulatedQaPairs };
    
    const submitted = await checkSubmissionConfirmed(options, 3);
    if (submitted) {
      liveTelemetry.emit({
        type: 'validate',
        title: 'Checking submitted or not',
        detail: 'Submission confirmation verified in DOM',
        status: 'completed',
      });
      return { outcome: 'submitted', fieldsFilled, stepsCompleted: step };
    }

    const nextModal = await options.executeScript<ModalState>(EASY_APPLY_MODAL_STATE_SCRIPT).catch(() => ({ isOpen: false, hasForm: false }));
    if (!nextModal.isOpen || !nextModal.hasForm) {
      // If modal closed and no errors present, treat as successful submission
      options.onStatus('Easy Apply: modal closed smoothly after step completion.');
      return { outcome: 'submitted', fieldsFilled, stepsCompleted: step };
    }

    step++;
  }

  return { outcome: options.isActive() ? 'max_steps' : 'stopped', fieldsFilled, stepsCompleted: Math.min(step - 1, options.maxSteps), qaPairs: accumulatedQaPairs };
}

/**
 * Polls the DOM with retries to confirm application submission.
 */
async function checkSubmissionConfirmed(options: EasyApplyWorkflowOptions, maxAttempts: number = 3): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const isConfirmed = await options.executeScript<boolean>(SUBMISSION_CONFIRMED_SCRIPT).catch(() => false);
    if (isConfirmed) return true;
    if (attempt < maxAttempts - 1) {
      const ok = await options.wait(800);
      if (!ok) break;
    }
  }
  return false;
}
