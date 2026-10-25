import type { WebviewTarget } from '../domScanner/injectedScanner';
import { stepNavigator } from './wizardStepNavigator';
import { ensureVisualCursor } from '../stealth/agentCursor';

export interface ManualStepResult {
  advanced: boolean;
  message: string;
}

// This function runs entirely in the target page, including its pending-click lock.
export const MANUAL_STEP_SCRIPT = String.raw`async function advanceOneStepInPage(selector, timeoutMs) {
  const page = window;
  const visible = (element) => {
    const style = getComputedStyle(element);
    return !element.closest('[hidden], [aria-hidden="true"]')
      && style.display !== 'none' && style.visibility !== 'hidden'
      && element.getClientRects().length > 0;
  };
  const findRoot = () => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, .modal-dialog')).filter(visible);
    return dialogs.at(-1) || Array.from(document.querySelectorAll('form')).find(visible) || document.body;
  };
  const fingerprint = (root) => JSON.stringify(
    Array.from(root.querySelectorAll('h1, h2, h3, h4, legend, label, input, select, textarea, [aria-current="step"], [role="progressbar"], .step-section-title, [data-step], [data-step-id], [data-current-step]'))
      .filter(visible)
      .map(element => [element.tagName, element.id, element.getAttribute('name'), element.getAttribute('type'),
        element.matches('input, select, textarea') ? '' : element.textContent?.trim(),
        element.getAttribute('aria-valuenow'), element.getAttribute('aria-current'),
        element.getAttribute('data-step'), element.getAttribute('data-step-id'), element.getAttribute('data-current-step')]),
  );
  const changed = (pending) => {
    if (location.href !== pending.url) return true;
    const root = pending.root.isConnected && visible(pending.root) ? pending.root : findRoot();
    return fingerprint(root) !== pending.fingerprint;
  };
  const previous = page.__zeroApplyManualStep;
  if (previous?.waiting) return { advanced: false, message: 'One step is already in progress. Wait for it to finish.' };
  if (previous && !changed(previous)) {
    return { advanced: false, message: 'The previous click is still unconfirmed. Waiting for the page to change; no second click was sent.' };
  }
  delete page.__zeroApplyManualStep;

  const button = document.querySelector(selector);
  if (!button || !visible(button)) return { advanced: false, message: 'No visible Next or Review button was found.' };
  if (button.matches(':disabled') || button.getAttribute('aria-disabled') === 'true' || button.closest('[inert]')) {
    return { advanced: false, message: 'The next-step button is disabled. Complete the required fields first.' };
  }
  const text = [button.textContent, button.getAttribute('aria-label'), button.getAttribute('value')].join(' ').trim();
  if (/submit|finish|send\s*application/i.test(text) || button.hasAttribute('data-easy-apply-submit-button')) {
    return { advanced: false, message: 'You are on the final step. Review and use the form’s Submit button when ready.' };
  }
  if (!/\b(next|continue|review|skip)\b|not\s*now|no\s*thanks/i.test(text)) {
    return { advanced: false, message: 'No safe Next, Continue or Review action was found.' };
  }
  const root = button.closest('[role="dialog"], .artdeco-modal, .modal-dialog, form') || findRoot();
  if (root === document.body) {
    return { advanced: false, message: 'Open an application form before using Next Step.' };
  }
  const invalid = Array.from(root.querySelectorAll('input, select, textarea'))
    .find(field => visible(field) && field.willValidate && !field.validity.valid);
  if (invalid) {
    invalid.reportValidity();
    return { advanced: false, message: 'Complete the required fields on this step before continuing.' };
  }

  const pending = { root, fingerprint: fingerprint(root), url: location.href, waiting: true };
  page.__zeroApplyManualStep = pending;
  try {
    button.scrollIntoView({ block: 'center', behavior: 'instant' });
    // Cursor movement completes before the sole activation; never retry an uncertain click.
    if (page.__zeroapplyCursor?.clickElement) {
      const clicked = await page.__zeroapplyCursor.clickElement(button, 'Next Step');
      if (!clicked) {
        delete page.__zeroApplyManualStep;
        return { advanced: false, message: 'The target changed before the click. Check the form and try again.' };
      }
    } else {
      button.click();
    }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const errors = Array.from(root.querySelectorAll('[aria-invalid="true"], .artdeco-inline-feedback--error, .form-error, .error-message'))
        .filter(visible);
      if (errors.length > 0) {
        delete page.__zeroApplyManualStep;
        return { advanced: false, message: 'The form stayed on this step. Correct its highlighted errors and try again.' };
      }
      if (changed(pending)) {
        delete page.__zeroApplyManualStep;
        return { advanced: true, message: 'Advanced one step. Ready for your next click.' };
      }
    }
    return { advanced: false, message: 'The click was sent, but the next step is not confirmed yet. No extra click was sent.' };
  } finally {
    pending.waiting = false;
  }
}`;

const advancingTargets = new WeakSet<WebviewTarget>();

export async function advanceExactlyOneStep(view: WebviewTarget, timeoutMs = 8_000): Promise<ManualStepResult> {
  if (advancingTargets.has(view)) return { advanced: false, message: 'One step is already in progress.' };
  advancingTargets.add(view);
  try {
    await ensureVisualCursor(view);
    const button = await stepNavigator.detectForwardButton(view);
    if (!button.exists) return { advanced: false, message: 'No Next or Review button was found on this form.' };
    if (button.action === 'submit' || button.action === 'done') {
      return { advanced: false, message: 'You are on the final step. Review and use the form’s Submit button when ready.' };
    }
    return await view.executeJavaScript<ManualStepResult>(
      `(${MANUAL_STEP_SCRIPT})(${JSON.stringify(button.selector)}, ${Math.max(100, Math.min(30_000, timeoutMs))})`,
      true,
    );
  } catch {
    return { advanced: false, message: 'The page changed or the step could not be confirmed. Check the form before clicking again.' };
  } finally {
    advancingTargets.delete(view);
  }
}
