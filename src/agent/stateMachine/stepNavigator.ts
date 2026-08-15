export type ApplicationStepAction = 'next' | 'review' | 'submit' | 'none';

export interface ApplicationStepResult {
  success: boolean;
  action: ApplicationStepAction;
  text?: string;
}

export const STEP_NAVIGATOR_SCRIPT = `
(function clickApplicationStepButton() {
  const selectors = 'button, input[type="button"], input[type="submit"], a[role="button"], div[role="button"], span[role="button"], [class*="btn-primary"], [class*="submit"], [class*="next"]';
  const rawElements = Array.from(document.querySelectorAll(selectors));
  
  // Only consider visible, enabled interactive elements that are not inside cookie banners or navigation menus
  const visibleButtons = rawElements.filter((btn) => {
    if (btn.offsetParent === null || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return false;
    const parentClasses = (btn.closest('footer, nav, .cookie, [id*="cookie"], [class*="banner"]') || {}).className || '';
    return !/cookie|banner/i.test(typeof parentClasses === 'string' ? parentClasses : '');
  });

  // Prioritize buttons located within open dialogs or modals
  const activeDialog = Array.from(document.querySelectorAll('[role="dialog"], .jobs-apply-form, .jobs-easy-apply-modal, .artdeco-modal'))
    .find((dialog) => dialog.offsetParent !== null);
  // Batch mode must never fall back to the job-results page. A missing dialog
  // is an unexpected portal state and requires human review.
  if (!activeDialog) return { success: false, action: 'none' };
  const candidatesPool = visibleButtons.filter(b => activeDialog.contains(b));

  // Helper to get full button text (handles nested spans like LinkedIn's artdeco buttons)
  const getButtonText = (btn) => {
    const text = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
    const ariaLabel = (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim().toLowerCase();
    return { text, ariaLabel };
  };

  const findButton = (matcher) => candidatesPool.find((btn) => {
    const { text, ariaLabel } = getButtonText(btn);
    return matcher(text, ariaLabel, btn);
  });

  const candidates = [
    ['submit', (text, aria, btn) => {
      // LinkedIn-specific: footer submit button
      if (btn.classList.contains('artdeco-button--primary') && /submit/i.test(text)) return true;
      return /^(submit|submit application|send application|finish|complete application|send)$/.test(text) || /submit application|send application/.test(aria);
    }],
    ['review', (text, aria, btn) => {
      if (btn.classList.contains('artdeco-button--primary') && /review/i.test(text)) return true;
      return text.includes('review') || aria.includes('review') || text === 'proceed to review';
    }],
    ['next', (text, aria, btn) => {
      // LinkedIn-specific: the primary action button in the modal footer is almost always "Next"
      if (btn.classList.contains('artdeco-button--primary') && /next/i.test(text)) return true;
      return text === 'next' || /^continue/.test(text) || text.includes('next step') || text.includes('save & continue') || text.includes('save and continue') || aria.includes('next') || aria.includes('continue');
    }],
  ];

  for (const [action, matcher] of candidates) {
    const targetBtn = findButton(matcher);
    if (!targetBtn) continue;

    try {
      targetBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
      targetBtn.focus();
    } catch {}

    targetBtn.click();

    return { success: true, action, text: targetBtn.innerText || targetBtn.textContent || targetBtn.value };
  }

  return { success: false, action: 'none' };
})();
`;
