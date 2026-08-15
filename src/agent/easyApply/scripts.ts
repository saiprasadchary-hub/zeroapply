export const SUBMISSION_CONFIRMED_SCRIPT = `
(function hasSubmissionConfirmation() {
  const visible = (element) => element instanceof HTMLElement && element.offsetParent !== null;
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal')).filter(visible);
  const text = (dialogs.length ? dialogs : [document.body])
    .map((element) => String(element?.innerText || '').toLowerCase())
    .join('\n');
  
  const hasModalConfirmation = /application (?:has been )?submitted|application was sent|application sent|thanks for applying|thank you for applying|your application was sent|your application was submitted|we received your application|turn your resume into a profile|keep track of your application in the|applied [0-9]+|applied on linkedin/i.test(text);
  if (hasModalConfirmation) return true;

  // Also check top-card job header for "Applied" status badge
  const topCardBtns = Array.from(document.querySelectorAll('.jobs-apply-button, .jobs-unified-top-card, .jobs-details-top-card, .artdeco-inline-feedback'));
  return topCardBtns.some(b => /applied/i.test(String(b.innerText || '')));
})();
`;

/** Confirms that the agent is still acting inside a visible Easy Apply dialog. */
export const EASY_APPLY_MODAL_STATE_SCRIPT = `
(function getEasyApplyModalState() {
  const visible = (element) => element instanceof HTMLElement && element.offsetParent !== null;
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal')).filter(visible);
  const dialog = dialogs.find((element) => /easy apply|application|resume|contact info/i.test(String(element.innerText || ''))) || dialogs[0];
  if (!dialog) return { isOpen: false, hasForm: false };
  const hasForm = Boolean(dialog.querySelector('input, textarea, select, [role="combobox"], [role="radiogroup"], button'));
  return { isOpen: true, hasForm };
})();
`;

export const FORM_VALIDATION_SCRIPT = `
(function validateVisibleRequiredFields() {
  const isVisible = (element) => {
    if (!element || element.offsetParent === null) return false;
    const style = getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  };
  const modals = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal')).filter(isVisible);
  const dialog = modals.find((element) => /easy apply|application|resume|contact info/i.test(String(element.innerText || ''))) || modals[0] || document;
  
  // Find only truly visible required fields inside the active modal dialog
  const nativeFields = Array.from(dialog.querySelectorAll('input[required], select[required], textarea[required], input[aria-required="true"], select[aria-required="true"], textarea[aria-required="true"], [role="combobox"][aria-required="true"], [role="textbox"][aria-required="true"]'))
    .filter(isVisible);
    
  const checkedGroups = new Set();
  const emptyRequired = nativeFields.filter((element) => {
    if (element.disabled || element.readOnly) return false;
    if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) {
      const key = element.name || element.id;
      if (checkedGroups.has(key)) return false;
      checkedGroups.add(key);
      const group = Array.from(document.querySelectorAll('input')).filter((input) => input.name === element.name);
      return !group.some((input) => input.checked);
    }
    return !String(element.value || '').trim();
  });
  
  const errors = Array.from(dialog.querySelectorAll('[aria-invalid="true"], .artdeco-inline-feedback--error'))
    .filter((element) => isVisible(element) && String(element.innerText || '').trim().length > 0);
    
  return { isValid: emptyRequired.length === 0 && errors.length === 0, emptyCount: emptyRequired.length, errorCount: errors.length };
})();
`;

export const POST_SUBMISSION_CLEANUP_SCRIPT = `
(async function closePostSubmissionPrompt() {
  const visible = (element) => element && element.offsetParent !== null && !element.disabled;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  for (let attempt = 0; attempt < 8; attempt++) {
    // 1. Check if dialog or modal exists
    const modal = document.querySelector('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal');
    if (!modal) {
      return { closed: true, action: 'none' };
    }

    // 2. Find buttons inside modal
    const buttons = Array.from(modal.querySelectorAll('button, [role="button"], a')).filter(visible);
    
    // Priority: "Not now" (LinkedIn profile update prompt)
    const notNowBtn = buttons.find((b) => {
      const txt = String(b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
      return txt === 'not now' || txt.includes('not now');
    });
    if (notNowBtn) {
      notNowBtn.click();
      await sleep(350);
      if (!document.querySelector('[role="dialog"], .artdeco-modal')) {
        return { closed: true, action: 'not-now' };
      }
    }

    // Priority: "Done" or "Got it" button
    const doneBtn = buttons.find((b) => {
      const txt = String(b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
      return txt === 'done' || txt === 'got it';
    });
    if (doneBtn) {
      doneBtn.click();
      await sleep(350);
      if (!document.querySelector('[role="dialog"], .artdeco-modal')) {
        return { closed: true, action: 'done' };
      }
    }

    // Priority: Dismiss / Close button
    const dismissBtn = buttons.find((b) => {
      const aria = String(b.getAttribute('aria-label') || '').toLowerCase();
      const cls = String(b.className || '').toLowerCase();
      return aria === 'dismiss' || aria === 'close' || cls.includes('dismiss') || cls.includes('close');
    });
    if (dismissBtn) {
      dismissBtn.click();
      await sleep(350);
      if (!document.querySelector('[role="dialog"], .artdeco-modal')) {
        return { closed: true, action: 'dismiss' };
      }
    }

    // Direct X button selectors
    const closeBtn = document.querySelector('button[aria-label="Dismiss"], button[data-test-modal-close-btn], .artdeco-modal__dismiss');
    if (closeBtn && visible(closeBtn)) {
      (closeBtn).click();
      await sleep(350);
      if (!document.querySelector('[role="dialog"], .artdeco-modal')) {
        return { closed: true, action: 'x-btn' };
      }
    }

    await sleep(250);
  }

  return { closed: !Boolean(document.querySelector('[role="dialog"], .artdeco-modal')), action: 'timeout' };
})();
`;

export const DISCARD_APPLICATION_SCRIPT = `
(async function discardIncompleteApplication() {
  const visible = (el) => el.offsetParent !== null && !el.disabled;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // 1. Try to find the modal close button (X) — LinkedIn uses artdeco-modal__dismiss
  const closeSelectors = 'button[aria-label="Dismiss"], button[data-test-modal-close-btn], .artdeco-modal__dismiss, [data-test-modal-close-btn]';
  const closeBtns = Array.from(document.querySelectorAll(closeSelectors)).filter(visible);
  if (closeBtns.length > 0) {
    closeBtns[0].click();
  } else {
    // Fallback: look for any visible X/close inside a dialog
    const dialog = document.querySelector('[role="dialog"], .artdeco-modal');
    if (dialog) {
      const xBtn = dialog.querySelector('button[aria-label="Dismiss"], button[aria-label="Close"]');
      if (xBtn) xBtn.click();
    }
  }

  // 2. Wait for the "Discard" confirmation dialog to appear (poll up to 2s)
  for (let attempt = 0; attempt < 8; attempt++) {
    await sleep(250);
    
    const confirmBtns = Array.from(document.querySelectorAll(
      'button[data-control-name="discard_application_confirm_btn"], button[data-test-dialog-primary-btn]'
    )).filter(visible);
    
    if (confirmBtns.length > 0) {
      confirmBtns[0].click();
      return { discarded: true, method: 'data-attr' };
    }
    
    // Fallback: text-based search for "Discard" button
    const allBtns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(visible);
    const discard = allBtns.find(b => {
      const text = String(b.innerText || '').toLowerCase().trim();
      return text === 'discard' || text === 'discard application' || text.includes('discard');
    });
    if (discard) {
      discard.click();
      return { discarded: true, method: 'text-match' };
    }
  }
  
  return { discarded: false, method: 'timeout' };
})();
`;
