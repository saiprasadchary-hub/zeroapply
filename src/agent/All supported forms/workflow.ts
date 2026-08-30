import {
  STANDARD_FORM_VALIDATION_SCRIPT,
  STANDARD_SUBMISSION_CONFIRMATION_SCRIPT,
} from './scripts';
import type { AgentRunResult } from '../orchestrator/agentEngine';
import type {
  StandardFormConfirmation,
  StandardFormStepResult,
  StandardFormValidationResult,
  StandardFormWorkflowOptions,
  StandardFormWorkflowResult,
} from './types';
import { runRecoverableOperation, WorkflowCheckpointJournal } from '../recovery/workflowRecovery';

async function confirmSubmission(options: StandardFormWorkflowOptions, attempts = 5): Promise<StandardFormConfirmation> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await options.executeScript<StandardFormConfirmation>(STANDARD_SUBMISSION_CONFIRMATION_SCRIPT)
      .catch(() => ({ confirmed: false }));
    if (result?.confirmed) return result;
    if (attempt < attempts - 1 && !await options.wait(800)) break;
  }
  return { confirmed: false };
}

const SECURITY_MESSAGE = /security checkpoint|captcha|authentication session|not logged in|mfa|one-time password|two-factor|verify your identity/i;
const TRANSIENT_FILL_MESSAGE = /dom scan failed|desktop browser is not available|execution context|navigation|temporar|timeout|no input fields detected/i;

function addQaPairs(
  target: { question: string; answer: string }[],
  pairs?: { question: string; answer: string }[],
): void {
  for (const pair of pairs || []) {
    if (!target.some((saved) => saved.question === pair.question && saved.answer === pair.answer)) target.push(pair);
  }
}

async function fillWithRecovery(
  options: StandardFormWorkflowOptions,
  journal: WorkflowCheckpointJournal,
  step: number,
): Promise<AgentRunResult> {
  return runRecoverableOperation(
    async () => {
      const result = await options.fillCurrentStep();
      if (!result || typeof result.filledCount !== 'number') throw new Error('Field filling returned an invalid result.');
      if (!result.success && result.detectedCount === 0 && TRANSIENT_FILL_MESSAGE.test(result.message)) {
        throw new Error(result.message);
      }
      return result;
    },
    {
      label: 'Standard form autofill',
      maxAttempts: 5,
      retryAllErrors: true,
      isActive: options.isActive,
      wait: options.wait,
      onRetry: (attempt, maxAttempts, error) => {
        journal.recovered('Autofill interrupted: ' + String(error));
        options.onStatus(`The page changed while filling. Resuming saved step ${step} (${attempt}/${maxAttempts})...`, 'warning');
      },
    },
  );
}

async function readValidation(
  options: StandardFormWorkflowOptions,
  journal: WorkflowCheckpointJournal,
  step: number,
  attempts = 3,
): Promise<StandardFormValidationResult | null> {
  try {
    return await runRecoverableOperation(
      async () => {
      const result = await options.executeScript<StandardFormValidationResult>(STANDARD_FORM_VALIDATION_SCRIPT);
        if (!result || typeof result.isValid !== 'boolean') throw new Error('Validation execution context was unavailable.');
        return result;
      },
      {
        label: 'Standard form validation',
        maxAttempts: attempts,
        retryAllErrors: true,
        isActive: options.isActive,
        wait: options.wait,
        onRetry: (attempt, maxAttempts, error) => {
          journal.recovered('Validation interrupted: ' + String(error));
          options.onStatus(`Validation was interrupted. Reconnecting to saved step ${step} (${attempt}/${maxAttempts})...`, 'warning');
        },
      },
    );
  } catch {
    return null;
  }
}

export async function runStandardFormWorkflow(options: StandardFormWorkflowOptions): Promise<StandardFormWorkflowResult> {
  const journal = new WorkflowCheckpointJournal('standard_form', options.checkpointKey || 'standard_form:active', options.resumeCheckpoint);
  const savedCheckpoint = journal.current();
  let fieldsFilled = savedCheckpoint.fieldsFilled || 0;
  const qaPairs: { question: string; answer: string }[] = [];

  const finish = (
    outcome: StandardFormWorkflowResult['outcome'],
    stepsCompleted: number,
    extra: { evidence?: string; haltBatch?: boolean; totalFields?: number } = {},
  ): StandardFormWorkflowResult => {
    if (typeof extra.totalFields === 'number') fieldsFilled = Math.max(fieldsFilled, extra.totalFields);
    if (outcome === 'submitted') journal.mark(Math.max(1, stepsCompleted), 'completed', fieldsFilled, 'Submission positively confirmed.');
    const checkpoint = journal.current();
    journal.clear();
    return {
      outcome,
      fieldsFilled,
      stepsCompleted,
      evidence: extra.evidence,
      qaPairs,
      checkpoint,
      recoveryCount: checkpoint.recoveryCount,
      haltBatch: Boolean(extra.haltBatch),
    };
  };

  if (savedCheckpoint.phase === 'advancing' || savedCheckpoint.phase === 'submitting' || savedCheckpoint.phase === 'confirming') {
    options.onStatus('Recovered an interrupted action. Checking for submission confirmation before resuming...', 'warning');
    const confirmation = await confirmSubmission(options, 6);
    if (confirmation.confirmed) return finish('submitted', savedCheckpoint.step, { evidence: confirmation.evidence });
    options.onStatus('The previous action cannot be proven safe to repeat. This application is open for manual review.', 'warning');
    return finish('needs_human', Math.max(0, savedCheckpoint.step - 1), { haltBatch: true });
  }

  const startStep = Math.max(1, Math.min(options.maxSteps, savedCheckpoint.step || 1));

  for (let step = startStep; step <= options.maxSteps; step++) {
    if (!options.isActive()) return finish('stopped', step - 1);
    journal.mark(step, 'scanning', fieldsFilled, 'Scanning the current standard-form step.');

    const existingConfirmation = await confirmSubmission(options, 1);
    if (existingConfirmation.confirmed) {
      return finish('submitted', step - 1, { evidence: existingConfirmation.evidence });
    }

    options.onStatus('Standard form step ' + step + ': scanning and filling...');
    journal.mark(step, 'filling', fieldsFilled, 'Mapping persona and LLM answers to visible controls.');
    let fill: AgentRunResult;
    try {
      fill = await fillWithRecovery(options, journal, step);
    } catch {
      options.onStatus('Automatic field recovery was exhausted on this application. It will be skipped without clicking Next or Submit.', 'warning');
      return finish('review_ready', step - 1);
    }
    let stepFilled = fill.filledCount;
    addQaPairs(qaPairs, fill.qaPairs);

    if (SECURITY_MESSAGE.test(fill.message)) {
      options.onStatus(fill.message + ' Complete the check manually, then restart this run.', 'warning');
      return finish('needs_human', step - 1, { haltBatch: true, totalFields: fieldsFilled + stepFilled });
    }

    if (!await options.wait(500)) {
      return finish('stopped', step - 1, { totalFields: fieldsFilled + stepFilled });
    }

    journal.mark(step, 'validating', fieldsFilled + stepFilled, 'Verifying required controls and website validation.');
    let validation = await readValidation(options, journal, step, 5);
    if (!validation) {
      options.onStatus('The form could not be validated after 3 attempts. Paused before any Next or Submit action.', 'warning');
      return finish('needs_human', step - 1, { totalFields: fieldsFilled + stepFilled });
    }

    for (let recovery = 1; !validation.isValid && recovery <= 2; recovery++) {
      const details = validation.messages?.slice(0, 2).join('; ');
      options.onStatus(
        'Auto-recovery ' + recovery + '/2: re-solving '
          + validation.emptyCount + ' required field(s) and '
          + validation.errorCount + ' validation error(s)'
          + (details ? ' (' + details + ')' : '') + '.',
        'warning',
      );
      const retry = await fillWithRecovery(options, journal, step);
      stepFilled = Math.max(stepFilled, retry.filledCount);
      addQaPairs(qaPairs, retry.qaPairs);
      if (SECURITY_MESSAGE.test(retry.message)) {
        options.onStatus(retry.message + ' Complete the check manually, then restart this run.', 'warning');
        return finish('needs_human', step - 1, { haltBatch: true, totalFields: fieldsFilled + stepFilled });
      }
      if (!await options.wait(450)) {
        return finish('stopped', step - 1, { totalFields: fieldsFilled + stepFilled });
      }
      const recoveredValidation = await readValidation(options, journal, step, 5);
      if (!recoveredValidation) {
        options.onStatus('The page stopped responding during validation recovery. Paused before advancing.', 'warning');
        return finish('needs_human', step - 1, { totalFields: fieldsFilled + stepFilled });
      }
      validation = recoveredValidation;
    }

    fieldsFilled += stepFilled;
    if (!validation.isValid) {
      const details = validation.messages?.slice(0, 2).join('; ');
      options.onStatus(
        'Paused after safe recovery: ' + validation.emptyCount + ' required field(s) or '
          + validation.errorCount + ' validation error(s) still need review'
          + (details ? ' (' + details + ')' : '') + '.',
        'warning',
      );
      return finish('review_ready', step - 1);
    }

    let action: StandardFormStepResult;
    journal.mark(step, 'advancing', fieldsFilled, 'Clicking the next safe workflow control.');
    try {
      action = await options.advanceStep(options.allowSubmit);
    } catch {
      const confirmation = await confirmSubmission(options, 3);
      if (confirmation.confirmed) {
        return finish('submitted', step, { evidence: confirmation.evidence });
      }
      options.onStatus('The browser changed during the action click. Paused because retrying could duplicate a submission.', 'warning');
      return finish('needs_human', step, { haltBatch: true });
    }
    if (action.requiresConfirmation || (action.action === 'submit' && !options.allowSubmit)) {
      options.onStatus('The form is filled and ready. Final submission was not authorized for this run.', 'warning');
      return finish('review_ready', step);
    }

    if (!action.success) {
      const confirmation = await confirmSubmission(options, 2);
      if (confirmation.confirmed) {
        return finish('submitted', step, { evidence: confirmation.evidence });
      }
      options.onStatus('The action button is not ready yet. Re-scanning controls once...', 'warning');
      if (!await options.wait(650)) return finish('stopped', step);
      try {
        action = await options.advanceStep(options.allowSubmit);
      } catch {
        const recoveredConfirmation = await confirmSubmission(options, 3);
        if (recoveredConfirmation.confirmed) {
          return finish('submitted', step, { evidence: recoveredConfirmation.evidence });
        }
        options.onStatus('The browser changed during action recovery. Paused to prevent a duplicate click.', 'warning');
        return finish('needs_human', step, { haltBatch: true });
      }
      if (action.requiresConfirmation || (action.action === 'submit' && !options.allowSubmit)) {
        options.onStatus('The form is filled and ready. Final submission was not authorized for this run.', 'warning');
        return finish('review_ready', step);
      }
      if (!action.success) {
        options.onStatus('No safe Next or Submit action was found after recovery. The completed form is open for review.', 'warning');
        return finish('review_ready', step);
      }
    }

    if (!await options.wait(action.action === 'submit' ? 1800 : 1000)) {
      return finish('stopped', step);
    }

    if (action.action === 'submit') {
      journal.mark(step, 'confirming', fieldsFilled, 'Submit was clicked; waiting for positive confirmation.');
      const confirmation = await confirmSubmission(options);
      if (!confirmation.confirmed) {
        options.onStatus('Submit was clicked, but the site did not provide positive confirmation. Paused to prevent a duplicate application.', 'warning');
        return finish('needs_human', step, { haltBatch: true });
      }
      return finish('submitted', step, { evidence: confirmation.evidence });
    }

    journal.mark(step + 1, 'scanning', fieldsFilled, 'Previous step advanced successfully.');
  }

  return finish(options.isActive() ? 'max_steps' : 'stopped', options.maxSteps);
}
