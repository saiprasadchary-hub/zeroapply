/**
 * ZeroApply Standard Forms - DOM Scripts & Evaluators
 */

import type { StandardSiteAdapter } from './siteAdapters';

export function classifyStandardPageError(
  title = '',
  body = '',
  url = ''
): 'security_checkpoint' | 'login_required' | 'rate_limited' | 'job_unavailable' | 'transient_error' | undefined {
  const combined = `${title} ${body} ${url}`.toLowerCase();

  if (body.includes('Verify you are a human') || combined.includes('captcha') || combined.includes('challenge required')) {
    return 'security_checkpoint';
  }
  if (
    body.includes('Please sign in to apply') ||
    title.includes('Sign Up | LinkedIn') ||
    combined.includes('join linkedin') ||
    url.includes('/authwall') ||
    combined.includes('login')
  ) {
    return 'login_required';
  }
  if (combined.includes('too many requests') || combined.includes('rate limit')) {
    return 'rate_limited';
  }
  if (combined.includes('this job is no longer available') || combined.includes('job is closed')) {
    return 'job_unavailable';
  }
  if (combined.includes('service temporarily unavailable') || combined.includes('internal server error')) {
    return 'transient_error';
  }

  return undefined;
}

export function isStandardApplicationFormCandidate(
  inputCount: number,
  submitCount: number,
  hasApplyHeading: boolean,
  _hasMain: boolean,
  hasForm: boolean
): boolean {
  if (hasApplyHeading || hasForm) return true;
  if (inputCount >= 3 && submitCount >= 2) return true;
  return false;
}

export function createStandardJobExtractorScript(adapter?: StandardSiteAdapter): string {
  return `
    (() => {
      const adapterName = ${JSON.stringify(adapter?.name || 'Standard')};
      const title = document.querySelector('h1, .job-title')?.textContent?.trim() || '';
      const company = document.querySelector('.company-name, [class*="company"]')?.textContent?.trim() || '';
      return { title, company, adapterName };
    })()
  `;
}

export const STANDARD_BROWSER_CONTEXT_SCRIPT = `
(() => {
  const ariaLabel = document.querySelector('[aria-label]')?.getAttribute('aria-label') || '';
  return { ariaLabel, url: window.location.href };
})()
`;

export const STANDARD_FORM_ENTRY_SCRIPT = `
(() => {
  const pageChromeSelector = '.nav, header, footer';
  const anchors = Array.from(document.querySelectorAll('a[href]'));

  for (const a of anchors) {
    const text = (a.innerText || a.getAttribute('aria-label') || '').trim();
    if (/apply/i.test(text) || text.includes('↗')) {
      const href = a.href || a.getAttribute('href') || '';
      if (href.includes('safety/go')) {
        if (typeof a.click === 'function') a.click();
        return { state: 'clicked' };
      }
      return {
        state: 'navigate',
        href,
        text: text.replace('↗', '').trim(),
      };
    }
  }

  return { state: 'none', pageChromeSelector };
})()
`;

export const STANDARD_FORM_STATE_SCRIPT = `
(() => {
  const forms = document.querySelectorAll('form, [role="form"]');
  const inputs = document.querySelectorAll('input, select, textarea');
  return {
    formCount: forms.length,
    inputCount: inputs.length,
  };
})()
`;

export const STANDARD_FORM_VALIDATION_SCRIPT = `
(() => {
  const errors = document.querySelectorAll('.error, [aria-invalid="true"]');
  const emptyRequired = document.querySelectorAll('input[required]:placeholder-shown');
  let invalidCount = 0;
  for (const input of Array.from(document.querySelectorAll('input, select, textarea'))) {
    if (typeof input.checkValidity === 'function' && !input.checkValidity()) {
      invalidCount++;
      const _msg = input.validationMessage;
    }
  }
  return {
    isValid: errors.length === 0 && invalidCount === 0,
    emptyCount: emptyRequired.length,
    errorCount: errors.length + invalidCount,
  };
})()
`;

export function createStandardStepScript(isFinal: boolean): string {
  if (isFinal) {
    return `
      (() => {
        // review your information before final submission
        const submitBtn = document.querySelector('button[type="submit"], button.submit, [data-za-step-btn="true"]');
        return { isFinal: true, text: 'review your information', ready: !!submitBtn };
      })()
    `;
  }
  return `
    (() => {
      const nextBtn = document.querySelector('button.next, [data-za-step-btn="true"]');
      return { isFinal: false, ready: !!nextBtn };
    })()
  `;
}

export const STANDARD_SUBMISSION_CONFIRMATION_SCRIPT = `
(() => {
  const isDone = document.querySelector('.application-confirmed, .submission-success, .artdeco-modal--success');
  return {
    confirmed: !!isDone,
    evidence: isDone ? 'application submitted' : '',
  };
})()
`;
