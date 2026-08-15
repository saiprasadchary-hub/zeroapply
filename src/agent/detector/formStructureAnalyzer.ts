export interface FormSummary {
  totalFields: number;
  requiredFields: number;
  hasResumeUpload: boolean;
  hasScreeningQuestions: boolean;
  actionButtons: {
    submitSelector?: string;
    nextSelector?: string;
    reviewSelector?: string;
  };
}

export const DOM_FORM_ANALYZER_SCRIPT = `
(function analyzeFormStructure() {
  let submitBtn = null;
  let nextBtn = null;
  let reviewBtn = null;

  const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));

  buttons.forEach((btn) => {
    const text = (btn.innerText || btn.value || '').trim().toLowerCase();
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

    if (text.includes('submit') || text.includes('apply now') || ariaLabel.includes('submit')) {
      if (!btn.id) btn.id = 'za_btn_submit_' + Math.random().toString(36).substr(2, 5);
      submitBtn = '#' + CSS.escape(btn.id);
    } else if (text.includes('next') || text.includes('continue') || ariaLabel.includes('next')) {
      if (!btn.id) btn.id = 'za_btn_next_' + Math.random().toString(36).substr(2, 5);
      nextBtn = '#' + CSS.escape(btn.id);
    } else if (text.includes('review') || ariaLabel.includes('review')) {
      if (!btn.id) btn.id = 'za_btn_review_' + Math.random().toString(36).substr(2, 5);
      reviewBtn = '#' + CSS.escape(btn.id);
    }
  });

  return {
    submitSelector: submitBtn,
    nextSelector: nextBtn,
    reviewSelector: reviewBtn,
  };
})();
`;
