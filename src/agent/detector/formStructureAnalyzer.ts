export interface FormSummary {
  portalType: 'linkedin' | 'indeed' | 'greenhouse' | 'lever' | 'workday' | 'generic';
  portalName: string;
  isModalOpen: boolean;
  stepCurrent: number;
  stepTotal: number;
  totalFields: number;
  requiredFields: number;
  hasResumeUpload: boolean;
  hasScreeningQuestions: boolean;
  jobDetails?: {
    title?: string;
    company?: string;
    location?: string;
    salarySnippet?: string;
  };
  actionButtons: {
    submitSelector?: string;
    nextSelector?: string;
    reviewSelector?: string;
  };
}

export const DOM_FORM_ANALYZER_SCRIPT = `
(function analyzeFormStructure() {
  const visible = (el) => el && el.offsetParent !== null;

  // 1. Detect Portal Environment
  const host = window.location.hostname.toLowerCase();
  let portalType = 'generic';
  let portalName = 'General ATS';

  if (host.includes('linkedin.com')) {
    portalType = 'linkedin';
    portalName = 'LinkedIn Easy Apply';
  } else if (host.includes('indeed.com')) {
    portalType = 'indeed';
    portalName = 'Indeed';
  } else if (host.includes('greenhouse.io') || document.querySelector('#embedded_job_board, #application_form')) {
    portalType = 'greenhouse';
    portalName = 'Greenhouse';
  } else if (host.includes('lever.co') || document.querySelector('.application-form')) {
    portalType = 'lever';
    portalName = 'Lever';
  } else if (host.includes('myworkdayjobs.com') || host.includes('workday')) {
    portalType = 'workday';
    portalName = 'Workday';
  }

  // 2. Identify active modal or root container
  const modals = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal, .jobs-apply-form')).filter(visible);
  const activeModal = modals.find(m => /easy apply|application|contact info|resume/i.test(String(m.innerText || ''))) || modals[0] || null;
  const root = activeModal || document.body;

  // 3. Detect multi-step stepper / progress
  let stepCurrent = 1;
  let stepTotal = 1;
  const progressEl = root.querySelector('progress, [role="progressbar"], .artdeco-completeness-meter-linear');
  if (progressEl) {
    const val = progressEl.getAttribute('value') || progressEl.getAttribute('aria-valuenow');
    const max = progressEl.getAttribute('max') || progressEl.getAttribute('aria-valuemax') || '100';
    if (val && max) {
      stepCurrent = Math.round((Number(val) / Number(max)) * 4) || 1;
      stepTotal = 4;
    }
  }

  // 4. Extract Job Metadata if on job listing page
  const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .jobsearch-JobInfoHeader-title, h1');
  const compEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, [data-company-name="true"]');
  const locEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet');

  // 5. Action Buttons (Submit, Next, Review)
  let submitBtn = null;
  let nextBtn = null;
  let reviewBtn = null;

  const buttons = Array.from(root.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]')).filter(visible);

  buttons.forEach((btn) => {
    const text = (btn.innerText || btn.value || '').trim().toLowerCase();
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

    if (text.includes('submit application') || text === 'submit' || ariaLabel.includes('submit')) {
      if (!btn.id) btn.id = 'za_btn_submit_' + Math.random().toString(36).substring(2, 7);
      submitBtn = '#' + CSS.escape(btn.id);
    } else if (text.includes('next') || text.includes('continue') || ariaLabel.includes('next')) {
      if (!btn.id) btn.id = 'za_btn_next_' + Math.random().toString(36).substring(2, 7);
      nextBtn = '#' + CSS.escape(btn.id);
    } else if (text.includes('review') || ariaLabel.includes('review')) {
      if (!btn.id) btn.id = 'za_btn_review_' + Math.random().toString(36).substring(2, 7);
      reviewBtn = '#' + CSS.escape(btn.id);
    }
  });

  const fields = Array.from(root.querySelectorAll('input, select, textarea, [role="combobox"]')).filter(visible);
  const requiredFields = fields.filter(f => f.required || f.getAttribute('aria-required') === 'true');
  const hasResumeUpload = fields.some(f => f.type === 'file' || /resume|cv/i.test(f.name || f.id || ''));

  return {
    portalType,
    portalName,
    isModalOpen: Boolean(activeModal),
    stepCurrent,
    stepTotal,
    totalFields: fields.length,
    requiredFields: requiredFields.length,
    hasResumeUpload,
    hasScreeningQuestions: fields.length > 3,
    jobDetails: {
      title: titleEl ? titleEl.innerText.trim() : undefined,
      company: compEl ? compEl.innerText.trim() : undefined,
      location: locEl ? locEl.innerText.trim() : undefined,
    },
    actionButtons: {
      submitSelector: submitBtn,
      nextSelector: nextBtn,
      reviewSelector: reviewBtn,
    },
  };
})();
`;
