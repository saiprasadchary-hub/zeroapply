/**
 * ZeroApply Navigation - Advanced Wizard Step Navigator
 * Detects, evaluates, and advances multi-step wizard buttons across all major ATS platforms
 * (LinkedIn, Greenhouse, Lever, Workday, Ashby, SmartRecruiters, Indeed, and generic portals)
 * with robust validation error diagnosis and recovery hooks.
 */

import type { WebviewTarget } from '../domScanner/injectedScanner';
import { ensureVisualCursor } from '../stealth/agentCursor';

export interface ForwardButtonResult {
  exists: boolean;
  action: 'next' | 'review' | 'submit' | 'done' | 'none';
  selector: string;
  text: string;
  disabled: boolean;
}

export interface ValidationErrorSummary {
  hasErrors: boolean;
  errorCount: number;
  errorMessages: string[];
  invalidFieldSelectors: string[];
  fieldErrors?: Array<{ selector: string; message: string; id?: string }>;
}

export interface AdvanceResult {
  success: boolean;
  action: 'next' | 'review' | 'submit' | 'done' | 'none';
  stepChanged: boolean;
  hasErrors: boolean;
  errorCount?: number;
  errorMessages?: string[];
  fieldErrors?: Array<{ selector: string; message: string; id?: string }>;
}

export const DETECT_FORWARD_BUTTON_SCRIPT = `
(() => {
  // Clear any existing action target marks
  document.querySelectorAll('[data-za-action-target]').forEach(el => el.removeAttribute('data-za-action-target'));

  // Helper: safe closest
  function safeClosest(el, sel) {
    if (!el || typeof el.closest !== 'function') return null;
    try { return el.closest(sel); } catch(e) { return null; }
  }

  // Helper: Strict visibility check
  function isElementVisible(el) {
    if (!el) return false;
    if (el.style && (el.style.display === 'none' || el.hidden || el.getAttribute('aria-hidden') === 'true')) return false;
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    }
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
    return (r.width > 0 && r.height > 0) || (el.offsetWidth > 0 && el.offsetHeight > 0);
  }

  // 1. Find visible active application modal dialog if present
  const modalCandidates = Array.from(document.querySelectorAll(
    '#artdeco-modal-outlet .artdeco-modal, .artdeco-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .jobs-easy-apply-modal, .modal-dialog, [data-qa="application-modal"]'
  )).filter(m => {
    if (!isElementVisible(m)) return false;
    if (safeClosest(m, '.msg-overlay-container, #msg-overlay, #messaging-widget, .msg-overlay-bubble-header')) return false;
    const r = m.getBoundingClientRect ? m.getBoundingClientRect() : { width: 0, height: 0 };
    return r.width > 80 && r.height > 80;
  });

  let activeModal = modalCandidates[modalCandidates.length - 1] || null;

  // CRITICAL: If activeModal is an inner content div (e.g. .jobs-easy-apply-modal inside .artdeco-modal),
  // bubble UP to the outer dialog container so that footer, header, and actionbar buttons are included!
  if (activeModal && !activeModal.matches?.('.artdeco-modal, [role="dialog"]')) {
    const dialogAncestor = safeClosest(activeModal, '.artdeco-modal, [role="dialog"], #artdeco-modal-outlet');
    if (dialogAncestor && isElementVisible(dialogAncestor)) {
      activeModal = dialogAncestor;
    }
  }

  // 0. Check for Top Choice Prompt skip button (STRICTLY inside the active modal)
  if (activeModal) {
    const modalText = activeModal.innerText || '';
    const isTopChoiceActive = /mark.*(?:as\\s*a?\\s*)?top\\s*choice|make.*top\\s*choice|stand\\s*out\\s*with\\s*top\\s*choice|apply\\s*as\\s*a?\\s*top\\s*choice/i.test(modalText);

    if (isTopChoiceActive) {
      const modalButtons = Array.from(activeModal.querySelectorAll(
        'button, [role="button"], a.artdeco-button, a[role="button"], input[type="button"], input[type="submit"]'
      ));

      // Check for explicit "No thanks" / "Skip" button inside the modal dialog
      const skipBtn = modalButtons.find(b => {
        if (!isElementVisible(b)) return false;
        const t = (b.textContent || b.getAttribute('aria-label') || b.getAttribute('title') || b.getAttribute('value') || '').trim().toLowerCase();
        if (/mark.*(?:as\\s*a?\\s*)?top\\s*choice|try\\s*premium|get\\s*premium|upgrade|start\\s*(?:free\\s*)?trial|free\\s*trial|subscribe/i.test(t)) {
          return false;
        }
        return /skip|not\\s*now|no\\s*thanks|maybe\\s*later|apply\\s*without|continue\\s*without|without\\s*top\\s*choice/i.test(t);
      });

      if (skipBtn && !skipBtn.disabled && skipBtn.getAttribute('aria-disabled') !== 'true') {
        skipBtn.setAttribute('data-za-action-target', 'true');
        return {
          exists: true,
          action: 'next',
          selector: '[data-za-action-target="true"]',
          text: (skipBtn.textContent || skipBtn.getAttribute('aria-label') || 'Skip Top Choice').trim(),
          disabled: false,
        };
      }
    }
  }

  // 0.1 Check for Job Search Safety Reminder ("Continue applying")
  const allPageButtons = Array.from(document.querySelectorAll(
    'button, [role="button"], a.artdeco-button, a[role="button"], input[type="button"], input[type="submit"]'
  ));
  const continueApplyingBtn = allPageButtons.find(b => {
    if (!isElementVisible(b)) return false;
    const t = (b.textContent || b.getAttribute('aria-label') || b.getAttribute('title') || b.getAttribute('value') || '').trim().toLowerCase();
    return /continue\\s*applying/i.test(t);
  });
  if (continueApplyingBtn && !continueApplyingBtn.disabled && continueApplyingBtn.getAttribute('aria-disabled') !== 'true') {
    continueApplyingBtn.setAttribute('data-za-action-target', 'true');
    return {
      exists: true,
      action: 'next',
      selector: '[data-za-action-target="true"]',
      text: (continueApplyingBtn.textContent || continueApplyingBtn.getAttribute('aria-label') || 'Continue applying').trim(),
      disabled: false,
    };
  }

  // 1. Gather candidate forward/submit buttons
  const root = (activeModal && typeof activeModal.querySelectorAll === 'function') ? activeModal : document;
  let candidateButtons = Array.from(root.querySelectorAll(
    'footer button.artdeco-button--primary, .artdeco-modal__actionbar button.artdeco-button--primary, .jobs-easy-apply-footer button.artdeco-button--primary, ' +
    'button[aria-label*="Continue to next step" i], button[aria-label*="Review your application" i], button[aria-label*="Submit application" i], ' +
    'button[data-easy-apply-submit-button], #modal-submit-btn, ' +
    'button[data-easy-apply-next-button], #modal-next-btn, #btn-success-done, ' +
    '[data-za-step-btn="true"], ' +
    'footer button, .artdeco-modal__actionbar button, .jobs-easy-apply-footer button, ' +
    'button[data-automation-id*="submit"], button[data-automation-id*="next"], ' +
    'button[data-qa="btn-submit"], button[data-qa="btn-apply"], ' +
    '[data-testid*="submit"], [data-testid*="next"], ' +
    '.artdeco-button--primary, button[type="submit"], button.submit-button, ' +
    'button[aria-label*="Submit" i], button[aria-label*="Review" i], button[aria-label*="Continue" i], button[aria-label*="Next" i], ' +
    'button, [role="button"], input[type="submit"]'
  ));

  // If candidateButtons is empty or has no visible primary buttons inside activeModal, search across document
  if (candidateButtons.length === 0 || !candidateButtons.some(b => isElementVisible(b))) {
    candidateButtons = Array.from(document.querySelectorAll(
      'footer button.artdeco-button--primary, .artdeco-modal__actionbar button.artdeco-button--primary, .jobs-easy-apply-footer button.artdeco-button--primary, ' +
      'button[aria-label*="Continue to next step" i], button[aria-label*="Review your application" i], button[aria-label*="Submit application" i], ' +
      'button[data-easy-apply-submit-button], #modal-submit-btn, ' +
      'button[data-easy-apply-next-button], #modal-next-btn, ' +
      'footer button, .artdeco-modal__actionbar button, .jobs-easy-apply-footer button, ' +
      'button[aria-label*="Submit" i], button[aria-label*="Review" i], button[aria-label*="Continue" i], button[aria-label*="Next" i]'
    )).filter(b => !safeClosest(b, '.msg-overlay-container, #msg-overlay, #messaging-widget'));
  }

  // Categorize valid, visible candidates
  const evaluated = [];

  for (const btn of candidateButtons) {
    if (!isElementVisible(btn)) continue;
    if (activeModal && !activeModal.contains(btn)) {
      const isExplicitEasyApply = btn.hasAttribute('data-easy-apply-next-button') ||
        btn.hasAttribute('data-easy-apply-submit-button') ||
        safeClosest(btn, '.artdeco-modal, [role="dialog"], .jobs-easy-apply-modal, #artdeco-modal-outlet, .jobs-easy-apply-footer, .artdeco-modal__actionbar, footer');
      if (!isExplicitEasyApply) continue;
    }

    const btnText = (btn.textContent || '').trim().toLowerCase();
    const btnAria = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
    const btnTitle = (btn.getAttribute('title') || '').trim().toLowerCase();
    const btnVal = (btn.getAttribute('value') || '').trim().toLowerCase();
    const text = (btnText + ' ' + btnAria + ' ' + btnTitle + ' ' + btnVal).trim();

    // Guard: Paid upgrade actions
    if (/mark.*(?:as\\s*a?\\s*)?top\\s*choice|try\\s*premium|get\\s*premium|upgrade\\s*to\\s*premium|start\\s*(?:free\\s*)?trial|free\\s*trial|subscribe/i.test(text)) {
      continue;
    }

    // Guard: NEVER click "Update profile", "Save profile", "Add skills to profile", etc.
    if (/update.*profile|save.*profile|add.*skills.*profile|add.*to.*profile|update\s*my\s*profile|turn\s*your\s*resume/i.test(text)) {
      continue;
    }

    // Skip back / previous / cancel buttons UNLESS it's Done/Skip
    if (/back|previous|cancel|dismiss|close/i.test(btnText) && !/done/i.test(text) && !/skip/i.test(text)) {
      continue;
    }

    let action = 'none';
    if (/submit\\s*application|submit|finish/i.test(text)) action = 'submit';
    else if (/not\\s*now|no\\s*thanks|maybe\\s*later/i.test(text)) action = 'done';
    else if (/done|close\\s*modal/i.test(text) && (document.querySelector('#step-success.active, .success-view') || /application.*sent|application.*submitted/i.test(document.body ? document.body.innerText : ''))) action = 'done';
    else if (/review\\s*(?:your\\s*application|and\\s*submit)?|review/i.test(text)) action = 'review';
    else if (/skip|apply\\s*without|continue\\s*without/i.test(text)) action = 'next';
    else if (/next\\s*step|continue\\s*to\\s*next|next|continue|save\\s*&\\s*continue|save\\s*and\\s*continue/i.test(text)) action = 'next';
    else if (btn.matches && btn.matches('.artdeco-button--primary, footer button.artdeco-button--primary, .artdeco-modal__actionbar button.artdeco-button--primary')) {
      action = 'next';
    }

    if (action !== 'none') {
      evaluated.push({
        element: btn,
        action,
        text: (btnAria || btnText || action).trim(),
        disabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true',
        isPrimary: action === 'done' || Boolean(btn.matches && btn.matches('.artdeco-button--primary, button[type="submit"], button.submit-button, [data-easy-apply-submit-button], [data-easy-apply-next-button]')),
      });
    }
  }

  function sortCandidates(list) {
    return list.slice().sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      return 0;
    });
  }

  // Priority: submit > done > review > next
  const submitCandidate = sortCandidates(evaluated.filter(e => e.action === 'submit'))[0];
  const doneCandidate = sortCandidates(evaluated.filter(e => e.action === 'done'))[0];
  const reviewCandidate = sortCandidates(evaluated.filter(e => e.action === 'review'))[0];
  const nextCandidate = sortCandidates(evaluated.filter(e => e.action === 'next'))[0];

  const chosen = submitCandidate || doneCandidate || reviewCandidate || nextCandidate;
  if (chosen && chosen.element) {
    chosen.element.setAttribute('data-za-action-target', 'true');
    return {
      exists: true,
      action: chosen.action,
      selector: '[data-za-action-target="true"]',
      text: chosen.text,
      disabled: chosen.disabled,
    };
  }

  return { exists: false, action: 'none', selector: '', text: '', disabled: false };
})()
`;

export const DETECT_VALIDATION_ERRORS_SCRIPT = `
(() => {
  const errorEls = Array.from(document.querySelectorAll(
    '[aria-invalid="true"], ' +
    '.artdeco-inline-feedback--error, ' +
    '.fb-form-element--error, ' +
    '.is-invalid, .has-error, .input-error, ' +
    '[role="alert"], ' +
    '[data-test-form-element-error-messages], ' +
    '.form-error, .error-message, [class*="error-text"], [class*="inline-feedback--error"]'
  )).filter(el => {
    if (el.style && el.style.display === 'none') return false;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    return el.offsetParent !== null || el.getBoundingClientRect().height > 0;
  });

  const errorMessages = [];
  const invalidFieldSelectors = [];
  const fieldErrors = [];

  for (const errEl of errorEls) {
    const rawMsg = (errEl.textContent || '').trim();
    if (rawMsg && !errorMessages.includes(rawMsg)) {
      errorMessages.push(rawMsg);
    }

    // Step 1: Check if errEl itself is an input/select/textarea
    let input = (errEl.tagName === 'INPUT' || errEl.tagName === 'SELECT' || errEl.tagName === 'TEXTAREA')
      ? errEl
      : errEl.querySelector('input, select, textarea');

    // Step 2: Check if an input references this error element via aria-describedby or aria-errormessage
    if (!input && errEl.id) {
      input = document.querySelector('[aria-describedby~="' + errEl.id + '"], [aria-errormessage~="' + errEl.id + '"]');
    }

    // Step 3: Check enclosing form element / grouping container
    if (!input) {
      const container = errEl.closest(
        '.fb-form-element, .jobs-easy-apply-form-section__grouping, .jobs-easy-apply-form-element, .form-group, [data-test-form-element], .form-item, fieldset, div'
      );
      if (container) {
        input = container.querySelector('input, select, textarea');
      }
    }

    // Step 4: Check immediate previous sibling
    if (!input) {
      let prev = errEl.previousElementSibling;
      while (prev && !input) {
        if (prev.tagName === 'INPUT' || prev.tagName === 'SELECT' || prev.tagName === 'TEXTAREA') input = prev;
        else input = prev.querySelector('input, select, textarea');
        prev = prev.previousElementSibling;
      }
    }

    if (input) {
      try {
        if (rawMsg) input.setAttribute('data-za-validation-error', rawMsg);
        input.setAttribute('aria-invalid', 'true');
      } catch (e) {}

      let selector = '';
      if (input.id) {
        try {
          selector = '#' + (window.CSS && CSS.escape ? CSS.escape(input.id) : input.id.replace(/(["\\:])+/g, '\\\\$1'));
        } catch(e) {
          selector = '#' + input.id;
        }
      } else if (input.name) {
        selector = input.tagName.toLowerCase() + '[name="' + input.name + '"]';
      } else {
        selector = input.tagName.toLowerCase();
      }

      if (selector && !invalidFieldSelectors.includes(selector)) {
        invalidFieldSelectors.push(selector);
      }
      fieldErrors.push({
        selector,
        message: rawMsg,
        id: input.id || undefined,
      });
    }
  }

  return {
    hasErrors: errorEls.length > 0 || errorMessages.length > 0,
    errorCount: Math.max(errorEls.length, errorMessages.length),
    errorMessages,
    invalidFieldSelectors,
    fieldErrors,
  };
})()
`;

export class WizardStepNavigator {
  public async detectForwardButton(webview: WebviewTarget): Promise<ForwardButtonResult> {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      return { exists: false, action: 'none', selector: '', text: '', disabled: false };
    }

    try {
      const res = await webview.executeJavaScript<ForwardButtonResult>(DETECT_FORWARD_BUTTON_SCRIPT);
      return res || { exists: false, action: 'none', selector: '', text: '', disabled: false };
    } catch {
      return { exists: false, action: 'none', selector: '', text: '', disabled: false };
    }
  }

  public async detectValidationErrors(webview: WebviewTarget): Promise<ValidationErrorSummary> {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      return { hasErrors: false, errorCount: 0, errorMessages: [], invalidFieldSelectors: [] };
    }

    try {
      const res = await webview.executeJavaScript<ValidationErrorSummary>(DETECT_VALIDATION_ERRORS_SCRIPT);
      return {
        hasErrors: !!(res?.hasErrors || (res?.errorCount && res.errorCount > 0)),
        errorCount: res?.errorCount || 0,
        errorMessages: res?.errorMessages || [],
        invalidFieldSelectors: res?.invalidFieldSelectors || [],
        fieldErrors: res?.fieldErrors || [],
      };
    } catch {
      return { hasErrors: false, errorCount: 0, errorMessages: [], invalidFieldSelectors: [] };
    }
  }

  public async advance(webview: WebviewTarget, _timeoutMs = 2000): Promise<AdvanceResult> {
    let btn = await this.detectForwardButton(webview);
    if (!btn.exists) {
      return { success: false, action: 'none', stepChanged: false, hasErrors: false };
    }

    // 1. If button is disabled, wait up to 3000ms for async operations (e.g. resume upload / React state update) to settle
    if (btn.disabled) {
      const waitStart = Date.now();
      while (btn.disabled && Date.now() - waitStart < 3000) {
        await new Promise((r) => setTimeout(r, 300));
        btn = await this.detectForwardButton(webview);
      }
    }

    try {
      const actionLabel = btn.action === 'submit'
        ? 'ZeroApply AI: Submitting Application'
        : btn.action === 'review'
        ? 'ZeroApply AI: Reviewing Application'
        : btn.action === 'done'
        ? 'ZeroApply AI: Completed Application'
        : 'ZeroApply AI: Advancing Step';

      await ensureVisualCursor(webview);

      // Execute click via 3D visual cursor or native dispatch
      const clickScript = `
        (() => {
          const sel = ${JSON.stringify(btn.selector)};
          const label = ${JSON.stringify(actionLabel)};
          const el = document.querySelector(sel);
          if (el) {
            try {
              if (el.disabled) el.disabled = false;
              el.removeAttribute('disabled');
              el.removeAttribute('aria-disabled');
              const modal = el.closest('.jobs-easy-apply-modal, #artdeco-modal-outlet .artdeco-modal, [role="dialog"]');
              if (modal) {
                const scrollable = modal.querySelector('.artdeco-modal__content, .jobs-easy-apply-modal__content, [class*="content"]');
                if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
              }
              el.scrollIntoView({ behavior: 'auto', block: 'center' });
            } catch(e) {}
          }
          if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.clickElement === 'function') {
            return window.__zeroapplyCursor.clickElement(sel, label);
          }
          if (el) {
            el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            try {
              if (typeof el.click === 'function') {
                el.click();
              } else {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              }
            } catch(e) {}
            return true;
          }
          return false;
        })()
      `;

      await webview.executeJavaScript<boolean>(clickScript);
      await new Promise((r) => setTimeout(r, 450));

      // Verify post-click validation errors
      const errDiagnostics = await this.detectValidationErrors(webview);

      return {
        success: !errDiagnostics.hasErrors,
        action: btn.action,
        stepChanged: !errDiagnostics.hasErrors,
        hasErrors: errDiagnostics.hasErrors,
        errorCount: errDiagnostics.errorCount,
        errorMessages: errDiagnostics.errorMessages,
        fieldErrors: errDiagnostics.fieldErrors,
      };
    } catch {
      return {
        success: false,
        action: btn.action,
        stepChanged: false,
        hasErrors: true,
      };
    }
  }
}

export const stepNavigator = new WizardStepNavigator();

