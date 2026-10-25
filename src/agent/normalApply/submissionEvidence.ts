/** Positive confirmation only; a dismiss button or profile upsell is not a receipt. */
export const SUBMISSION_EVIDENCE_SCRIPT = `(() => {
  const roots = [document];
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const confirmed = text => /your application (?:was|has been) sent|application (?:has been |was )?submitted|thank you for applying|thanks for applying|application received|received your application|your response has been recorded/i.test(text || '');
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
    for (const dialog of root.querySelectorAll('dialog[open], [role="dialog"], .artdeco-modal, .success-view, #step-success.active, .application-confirmation, [data-automation-id="congratulations"]')) {
      if (visible(dialog) && confirmed(dialog.innerText || dialog.textContent)) return true;
    }
    // Some application receipts are pages rather than dialogs. Ignore background search cards.
    for (const heading of root.querySelectorAll('h1, h2, h3, [role="status"], [role="alert"]')) {
      if (!heading.closest('[componentkey^="job-card"], .job-card, li.jobs-search-results__list-item') && visible(heading) && confirmed(heading.innerText || heading.textContent)) return true;
    }
  }
  return false;
})()`;
