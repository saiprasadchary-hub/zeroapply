import { EASY_APPLY_MODAL_STATE_SCRIPT, FORM_VALIDATION_SCRIPT, SUBMISSION_CONFIRMED_SCRIPT } from './scripts';
import type { EasyApplyWorkflowOptions, EasyApplyWorkflowResult } from './types';
import { liveTelemetry } from '../telemetry/liveTelemetry';
import type { AgentRunResult } from '../orchestrator/agentEngine';
import { runRecoverableOperation, WorkflowCheckpointJournal } from '../recovery/workflowRecovery';

interface FormValidationResult {
  isValid: boolean;
  emptyCount: number;
  errorCount: number;
}

interface ModalState {
  isOpen: boolean;
  hasForm: boolean;
}

const SECURITY_MESSAGE = /security checkpoint|captcha|authentication session|not logged in|mfa|one-time password|two-factor|verify your identity/i;

async function fillWithAutomaticRecovery(
  options: EasyApplyWorkflowOptions,
  step: number,
  journal: WorkflowCheckpointJournal,
): Promise<AgentRunResult> {
  return runRecoverableOperation(
    async () => {
      const result = await options.fillCurrentStep();
      if (!result || typeof result.filledCount !== 'number') throw new Error('Autofill returned an invalid result.');
      return result;
    },
    {
      label: 'Easy Apply autofill',
      maxAttempts: 5,
      retryAllErrors: true,
      isActive: options.isActive,
      wait: options.wait,
      onRetry: (attempt, maxAttempts, error) => {
        journal.recovered('Autofill interrupted: ' + String(error));
        options.onStatus(`Easy Apply step ${step}: autofill interrupted; resuming from the saved step (${attempt}/${maxAttempts})...`, 'warning');
      },
    },
  );
}

async function readValidationWithRecovery(
  options: EasyApplyWorkflowOptions,
  step: number,
  journal: WorkflowCheckpointJournal,
): Promise<FormValidationResult> {
  return runRecoverableOperation(
    async () => {
      const result = await options.executeScript<FormValidationResult>(FORM_VALIDATION_SCRIPT);
      if (!result || typeof result.isValid !== 'boolean') throw new Error('Validation context was unavailable during navigation.');
      return result;
    },
    {
      label: 'Easy Apply validation',
      maxAttempts: 5,
      retryAllErrors: true,
      isActive: options.isActive,
      wait: options.wait,
      onRetry: (attempt, maxAttempts, error) => {
        journal.recovered('Validation interrupted: ' + String(error));
        options.onStatus(`Easy Apply step ${step}: reconnecting to validation (${attempt}/${maxAttempts})...`, 'warning');
      },
    },
  );
}

/**
 * Runs one Easy Apply form from its first visible step through final submission.
 * Every successful Next or Review action intentionally returns to the same
 * scan -> fill -> validate cycle for the newly rendered screen.
 */
export async function runEasyApplyWorkflow(options: EasyApplyWorkflowOptions): Promise<EasyApplyWorkflowResult> {
  const journal = new WorkflowCheckpointJournal('easy_apply', options.checkpointKey || 'easy_apply:active', options.resumeCheckpoint);
  const savedCheckpoint = journal.current();
  let step = Math.max(1, Math.min(options.maxSteps, savedCheckpoint.step || 1));
  let fieldsFilled = savedCheckpoint.fieldsFilled || 0;
  const accumulatedQaPairs: { question: string; answer: string }[] = [];

  const finish = (
    outcome: EasyApplyWorkflowResult['outcome'],
    stepsCompleted: number,
    haltBatch = false,
  ): EasyApplyWorkflowResult => {
    if (outcome === 'submitted') {
      journal.mark(Math.max(1, stepsCompleted), 'completed', fieldsFilled, 'Submission positively confirmed.');
    } else if (outcome === 'stopped') {
      journal.clear();
    }
    const checkpoint = journal.current();
    journal.clear();
    return {
      outcome,
      fieldsFilled,
      stepsCompleted,
      qaPairs: accumulatedQaPairs,
      checkpoint,
      recoveryCount: checkpoint.recoveryCount,
      haltBatch,
    };
  };

  if (savedCheckpoint.phase === 'advancing' || savedCheckpoint.phase === 'submitting' || savedCheckpoint.phase === 'confirming') {
    options.onStatus('Easy Apply recovered after a submission interruption. Verifying the previous click before doing anything else...', 'warning');
    const confirmed = await checkSubmissionConfirmed(options, 6);
    if (confirmed) return finish('submitted', savedCheckpoint.step);
    options.onStatus('The previous submission click cannot be proven safe to repeat. The draft is open for review.', 'warning');
    return finish('paused', Math.max(0, savedCheckpoint.step - 1), true);
  }

  while (options.isActive() && step <= options.maxSteps) {
    journal.mark(step, 'scanning', fieldsFilled, 'Scanning the current Easy Apply step.');
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
      if (!await options.wait(700)) return finish('stopped', step - 1);
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
        return finish('submitted', step);
      }

      options.onStatus(`Easy Apply step ${step}: application dialog is no longer available.`, 'warning');
      liveTelemetry.emit({
        type: 'pause',
        title: `Modal closed or unavailable`,
        detail: `Step ${step} requires review`,
        status: 'warning',
      });
      return finish('paused', step - 1);
    }

    options.onStatus(`Easy Apply step ${step}: scanning and filling fields...`);

    journal.mark(step, 'filling', fieldsFilled, 'Mapping persona and LLM answers to visible controls.');
    let fillResult: AgentRunResult;
    try {
      fillResult = await fillWithAutomaticRecovery(options, step, journal);
    } catch (error) {
      options.onStatus(`Easy Apply step ${step}: automatic recovery was exhausted (${error instanceof Error ? error.message : 'unexpected page error'}). Skipping this job safely.`, 'error');
      liveTelemetry.emit({
        type: 'status',
        title: `Step ${step} autofill failed`,
        detail: String(error),
        status: 'error',
      });
      return finish('paused', step - 1);
    }
    fieldsFilled += fillResult.filledCount;
    if (fillResult.qaPairs) {
      accumulatedQaPairs.push(...fillResult.qaPairs);
    }

    if (SECURITY_MESSAGE.test(fillResult.message)) {
      options.onStatus(fillResult.message + ' Complete the security or login step manually; no further applications will be opened.', 'warning');
      return finish('paused', step - 1, true);
    }

    if (fillResult.resumeFieldDetected && !fillResult.resumeAttached) {
      options.onStatus(`Easy Apply step ${step}: resume field detected but could not verify attachment. Continuing...`, 'warning');
    }

    // Add a short delay for DOM to settle and React state to detect inputs
    if (!await options.wait(600)) return finish('stopped', step - 1);

    liveTelemetry.emit({
      type: 'validate',
      title: `Checking form requirements on Step ${step}`,
      detail: `Verifying required inputs, radios, & constraints`,
      status: 'running',
    });

    journal.mark(step, 'validating', fieldsFilled, 'Verifying required controls and website validation.');
    let validation: FormValidationResult;
    try {
      validation = await readValidationWithRecovery(options, step, journal);
    } catch {
      options.onStatus(`Easy Apply step ${step}: validation could not reconnect after automatic recovery. Skipping this job without clicking Next or Submit.`, 'warning');
      return finish('paused', step - 1);
    }

    // If validation shows empty required fields, attempt a rapid self-healing fill pass
    if (!validation.isValid && validation.emptyCount > 0) {
      options.onStatus(`Easy Apply step ${step}: self-healing ${validation.emptyCount} unfilled field(s)...`);
      try {
        const healResult = await fillWithAutomaticRecovery(options, step, journal);
        fieldsFilled += healResult.filledCount;
        if (!await options.wait(500)) return finish('stopped', step - 1);
        validation = await readValidationWithRecovery(options, step, journal);
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
      return finish('paused', step - 1);
    }

    liveTelemetry.emit({
      type: 'validate',
      title: `Step ${step} validation passed`,
      detail: `All required form inputs verified valid`,
      status: 'completed',
    });

    options.onStatus(`Easy Apply step ${step}: advancing...`);
    journal.mark(step, 'advancing', fieldsFilled, 'Clicking the next safe workflow control.');
    let action;
    try {
      action = await options.advanceStep(options.allowSubmit);
    } catch (error) {
      journal.recovered('Action click interrupted: ' + String(error));
      const submitted = await checkSubmissionConfirmed(options, 5);
      if (submitted) return finish('submitted', step);
      options.onStatus('The browser changed during the action click. The click will not be repeated because it could duplicate a submission.', 'warning');
      return finish('paused', step, true);
    }

    if (action.requiresConfirmation || (action.action === 'submit' && !options.allowSubmit)) {
      options.onStatus('Easy Apply is filled and ready. Final submission was not authorized for this run.', 'warning');
      return finish('paused', step);
    }

    // 1. Direct Submit Action
    if (action.action === 'submit') {
      journal.mark(step, 'confirming', fieldsFilled, 'Submit was clicked; waiting for positive confirmation.');
      options.onStatus('Easy Apply: submitting application...');
      liveTelemetry.emit({
        type: 'click',
        title: 'Submit application button',
        detail: 'Triggering final application submission',
        status: 'running',
      });

      await options.wait(2000);
      const confirmed = await checkSubmissionConfirmed(options, 4);
      if (!confirmed) {
        options.onStatus('Submission was clicked, but the portal did not provide a positive confirmation. Please review it manually.', 'warning');
        return finish('paused', step, true);
      }

      liveTelemetry.emit({
        type: 'validate',
        title: 'Checking submitted or not',
        detail: 'Application submission completed',
        status: 'completed',
      });
      return finish('submitted', step);
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

      if (!await options.wait(1200)) return finish('stopped', step);
      
      // Look for the final submit button on the review page
      journal.mark(step, 'advancing', fieldsFilled, 'Advancing from review to the final action.');
      let submitAction;
      try {
        submitAction = await options.advanceStep(options.allowSubmit);
      } catch (error) {
        journal.recovered('Review action interrupted: ' + String(error));
        const submitted = await checkSubmissionConfirmed(options, 5);
        if (submitted) return finish('submitted', step);
        options.onStatus('The review action was interrupted and cannot be repeated safely without risking duplicate submission.', 'warning');
        return finish('paused', step, true);
      }
      if (submitAction.requiresConfirmation || !options.allowSubmit) {
        options.onStatus('Review is complete and the application is ready for your final submission.', 'warning');
        return finish('paused', step);
      }
      if (submitAction.success && submitAction.action === 'submit') {
        journal.mark(step, 'confirming', fieldsFilled, 'Final submit was clicked; waiting for positive confirmation.');
        options.onStatus('Easy Apply: final submission triggered!');
        liveTelemetry.emit({
          type: 'click',
          title: 'Submit application button',
          detail: 'Submitting final reviewed application',
          status: 'running',
        });
        
        await options.wait(2000);
        const confirmed = await checkSubmissionConfirmed(options, 4);
        if (!confirmed) {
          options.onStatus('Final submission could not be positively confirmed by the portal.', 'warning');
          return finish('paused', step, true);
        }

        liveTelemetry.emit({
          type: 'validate',
          title: 'Checking submitted or not',
          detail: 'Application submission completed',
          status: 'completed',
        });
        return finish('submitted', step);
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
        return finish('submitted', step);
      }
      for (let retry = 1; retry <= 2 && !action.success; retry++) {
        journal.recovered('Action control was not ready.');
        options.onStatus(`Easy Apply step ${step}: action control was not ready; re-scanning automatically (${retry}/2)...`, 'warning');
        if (!await options.wait(500 * retry)) return finish('stopped', step);
        try {
          action = await options.advanceStep(options.allowSubmit);
        } catch {
          const recoveredSubmission = await checkSubmissionConfirmed(options, 5);
          if (recoveredSubmission) return finish('submitted', step);
          options.onStatus('The action retry was interrupted. It will not be clicked again because submission state is unknown.', 'warning');
          return finish('paused', step, true);
        }
      }
      if (!action.success) return finish('paused', step);
      if (action.requiresConfirmation || (action.action === 'submit' && !options.allowSubmit)) return finish('paused', step);
      if (action.action === 'submit') {
        journal.mark(step, 'confirming', fieldsFilled, 'Recovered submit click; waiting for positive confirmation.');
        const recoveredSubmission = await checkSubmissionConfirmed(options, 5);
        return recoveredSubmission ? finish('submitted', step) : finish('paused', step, true);
      }
    }

    if (!await options.wait(1500)) return finish('stopped', step);
    
    const submitted = await checkSubmissionConfirmed(options, 3);
    if (submitted) {
      liveTelemetry.emit({
        type: 'validate',
        title: 'Checking submitted or not',
        detail: 'Submission confirmation verified in DOM',
        status: 'completed',
      });
      return finish('submitted', step);
    }

    const nextModal = await options.executeScript<ModalState>(EASY_APPLY_MODAL_STATE_SCRIPT).catch(() => ({ isOpen: false, hasForm: false }));
    if (!nextModal.isOpen || !nextModal.hasForm) {
      options.onStatus('The application dialog closed without a positive submission confirmation. Please verify manually.', 'warning');
      return finish('paused', step);
    }

    journal.mark(step + 1, 'scanning', fieldsFilled, 'Previous step advanced successfully.');
    step++;
  }

  return finish(options.isActive() ? 'max_steps' : 'stopped', Math.min(step - 1, options.maxSteps));
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
