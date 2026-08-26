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

async function fillWithRecovery(options: StandardFormWorkflowOptions): Promise<AgentRunResult> {
  let latest: AgentRunResult = {
    success: false,
    detectedCount: 0,
    filledCount: 0,
    message: 'Field filling failed',
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    latest = await options.fillCurrentStep().catch((error) => ({
      success: false,
      detectedCount: 0,
      filledCount: 0,
      message: error instanceof Error ? error.message : 'Field filling failed',
    }));
    if (SECURITY_MESSAGE.test(latest.message)
      || latest.success
      || latest.detectedCount > 0
      || !TRANSIENT_FILL_MESSAGE.test(latest.message)
      || attempt === 3) {
      return latest;
    }
    options.onStatus('The page changed while scanning. Recovering DOM state (attempt ' + (attempt + 1) + '/3)...', 'warning');
    if (!await options.wait(attempt * 450)) return latest;
  }
  return latest;
}

async function readValidation(
  options: StandardFormWorkflowOptions,
  attempts = 3,
): Promise<StandardFormValidationResult | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await options.executeScript<StandardFormValidationResult>(STANDARD_FORM_VALIDATION_SCRIPT);
      if (result && typeof result.isValid === 'boolean') return result;
    } catch {
      // A navigation can briefly destroy the execution context; retry after the new DOM settles.
    }
    if (attempt < attempts) {
      options.onStatus('Validation inspection was interrupted. Reconnecting to the form (attempt ' + (attempt + 1) + '/' + attempts + ')...', 'warning');
      if (!await options.wait(attempt * 350)) return null;
    }
  }
  return null;
}

export async function runStandardFormWorkflow(options: StandardFormWorkflowOptions): Promise<StandardFormWorkflowResult> {
  let fieldsFilled = 0;
  const qaPairs: { question: string; answer: string }[] = [];

  for (let step = 1; step <= options.maxSteps; step++) {
    if (!options.isActive()) return { outcome: 'stopped', fieldsFilled, stepsCompleted: step - 1, qaPairs };

    const existingConfirmation = await confirmSubmission(options, 1);
    if (existingConfirmation.confirmed) {
      return { outcome: 'submitted', fieldsFilled, stepsCompleted: step - 1, evidence: existingConfirmation.evidence, qaPairs };
    }

    options.onStatus('Standard form step ' + step + ': scanning and filling...');
    const fill = await fillWithRecovery(options);
    let stepFilled = fill.filledCount;
    addQaPairs(qaPairs, fill.qaPairs);

    if (SECURITY_MESSAGE.test(fill.message)) {
      options.onStatus(fill.message + ' Complete the check manually, then restart this run.', 'warning');
      return { outcome: 'needs_human', fieldsFilled: fieldsFilled + stepFilled, stepsCompleted: step - 1, qaPairs };
    }

    if (!await options.wait(500)) {
      return { outcome: 'stopped', fieldsFilled: fieldsFilled + stepFilled, stepsCompleted: step - 1, qaPairs };
    }

    let validation = await readValidation(options);
    if (!validation) {
      options.onStatus('The form could not be validated after 3 attempts. Paused before any Next or Submit action.', 'warning');
      return { outcome: 'needs_human', fieldsFilled: fieldsFilled + stepFilled, stepsCompleted: step - 1, qaPairs };
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
      const retry = await fillWithRecovery(options);
      stepFilled = Math.max(stepFilled, retry.filledCount);
      addQaPairs(qaPairs, retry.qaPairs);
      if (SECURITY_MESSAGE.test(retry.message)) {
        options.onStatus(retry.message + ' Complete the check manually, then restart this run.', 'warning');
        return { outcome: 'needs_human', fieldsFilled: fieldsFilled + stepFilled, stepsCompleted: step - 1, qaPairs };
      }
      if (!await options.wait(450)) {
        return { outcome: 'stopped', fieldsFilled: fieldsFilled + stepFilled, stepsCompleted: step - 1, qaPairs };
      }
      const recoveredValidation = await readValidation(options);
      if (!recoveredValidation) {
        options.onStatus('The page stopped responding during validation recovery. Paused before advancing.', 'warning');
        return { outcome: 'needs_human', fieldsFilled: fieldsFilled + stepFilled, stepsCompleted: step - 1, qaPairs };
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
      return { outcome: 'review_ready', fieldsFilled, stepsCompleted: step - 1, qaPairs };
    }

    let action: StandardFormStepResult;
    try {
      action = await options.advanceStep(options.allowSubmit);
    } catch {
      const confirmation = await confirmSubmission(options, 3);
      if (confirmation.confirmed) {
        return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, evidence: confirmation.evidence, qaPairs };
      }
      options.onStatus('The browser changed during the action click. Paused because retrying could duplicate a submission.', 'warning');
      return { outcome: 'needs_human', fieldsFilled, stepsCompleted: step, qaPairs };
    }
    if (action.requiresConfirmation || (action.action === 'submit' && !options.allowSubmit)) {
      options.onStatus('The form is filled and ready. Final submission was not authorized for this run.', 'warning');
      return { outcome: 'review_ready', fieldsFilled, stepsCompleted: step, qaPairs };
    }

    if (!action.success) {
      const confirmation = await confirmSubmission(options, 2);
      if (confirmation.confirmed) {
        return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, evidence: confirmation.evidence, qaPairs };
      }
      options.onStatus('The action button is not ready yet. Re-scanning controls once...', 'warning');
      if (!await options.wait(650)) return { outcome: 'stopped', fieldsFilled, stepsCompleted: step, qaPairs };
      try {
        action = await options.advanceStep(options.allowSubmit);
      } catch {
        const recoveredConfirmation = await confirmSubmission(options, 3);
        if (recoveredConfirmation.confirmed) {
          return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, evidence: recoveredConfirmation.evidence, qaPairs };
        }
        options.onStatus('The browser changed during action recovery. Paused to prevent a duplicate click.', 'warning');
        return { outcome: 'needs_human', fieldsFilled, stepsCompleted: step, qaPairs };
      }
      if (action.requiresConfirmation || (action.action === 'submit' && !options.allowSubmit)) {
        options.onStatus('The form is filled and ready. Final submission was not authorized for this run.', 'warning');
        return { outcome: 'review_ready', fieldsFilled, stepsCompleted: step, qaPairs };
      }
      if (!action.success) {
        options.onStatus('No safe Next or Submit action was found after recovery. The completed form is open for review.', 'warning');
        return { outcome: 'review_ready', fieldsFilled, stepsCompleted: step, qaPairs };
      }
    }

    if (!await options.wait(action.action === 'submit' ? 1800 : 1000)) {
      return { outcome: 'stopped', fieldsFilled, stepsCompleted: step, qaPairs };
    }

    if (action.action === 'submit') {
      const confirmation = await confirmSubmission(options);
      if (!confirmation.confirmed) {
        options.onStatus('Submit was clicked, but the site did not provide positive confirmation. Paused to prevent a duplicate application.', 'warning');
        return { outcome: 'needs_human', fieldsFilled, stepsCompleted: step, qaPairs };
      }
      return { outcome: 'submitted', fieldsFilled, stepsCompleted: step, evidence: confirmation.evidence, qaPairs };
    }
  }

  return { outcome: options.isActive() ? 'max_steps' : 'stopped', fieldsFilled, stepsCompleted: options.maxSteps, qaPairs };
}
