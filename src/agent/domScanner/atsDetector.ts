/**
 * ZeroApply DOM Scanner - Universal ATS & Platform Architecture Detector
 * Automatically detects job application architectures across LinkedIn Easy Apply,
 * Greenhouse, Lever, Workday, Ashby, SmartRecruiters, Indeed, Taleo, and custom company portals.
 */

export type AtsPlatform =
  | 'linkedin_easy_apply'
  | 'greenhouse'
  | 'lever'
  | 'workday'
  | 'ashby'
  | 'smartrecruiters'
  | 'indeed'
  | 'taleo'
  | 'generic_portal';

export type FormStructureType =
  | 'multi_step_modal'
  | 'multi_page_wizard'
  | 'single_page_form'
  | 'embedded_iframe';

export type ApplicationStage =
  | 'job_search_results'
  | 'job_detail_view'
  | 'active_form_step'
  | 'review_summary_step'
  | 'submission_success'
  | 'validation_error'
  | 'unknown';

export interface AtsDetectionResult {
  platform: AtsPlatform;
  displayName: string;
  structure: FormStructureType;
  stage: ApplicationStage;
  containerSelector: string;
  currentStep?: number;
  totalSteps?: number;
  progressPercent?: number;
  hasErrors: boolean;
  errorCount: number;
  canAdvance: boolean;
  canSubmit: boolean;
}

import type { WebviewTarget } from './injectedScanner';
export type { WebviewTarget } from './injectedScanner';

export const ATS_DETECTOR_SCRIPT = `
(() => {
  try {
    const url = window.location.href.toLowerCase();
    const bodyText = document.body ? document.body.innerText.toLowerCase() : '';

    // 1. Detect ATS Platform
    let platform = 'generic_portal';
    let displayName = 'Company Career Portal';

    // LinkedIn
    if (
      url.includes('linkedin.com') ||
      document.querySelector('.jobs-easy-apply-modal, #easy-apply-modal-overlay, [data-easy-apply-next-button], #main-easy-apply-btn')
    ) {
      platform = 'linkedin_easy_apply';
      displayName = 'LinkedIn Easy Apply';
    }
    // Greenhouse
    else if (
      url.includes('greenhouse.io') ||
      url.includes('boards.greenhouse') ||
      url.includes('gh_src') ||
      document.querySelector('#application_form, #main_fields, [id*="greenhouse"]')
    ) {
      platform = 'greenhouse';
      displayName = 'Greenhouse ATS';
    }
    // Lever
    else if (
      url.includes('lever.co') ||
      url.includes('jobs.lever') ||
      document.querySelector('.application-form, #application-form, .posting-headline, [data-qa="btn-apply"]')
    ) {
      platform = 'lever';
      displayName = 'Lever ATS';
    }
    // Workday
    else if (
      url.includes('myworkdayjobs.com') ||
      url.includes('workday') ||
      document.querySelector('[data-automation-id*="application"], .wd-ApplicationPage, [data-automation-id="bottom-navigation-next-button"]')
    ) {
      platform = 'workday';
      displayName = 'Workday Career Portal';
    }
    // Ashby
    else if (
      url.includes('ashbyhq.com') ||
      document.querySelector('[data-testid="application-form"], [class*="ashby_"]')
    ) {
      platform = 'ashby';
      displayName = 'Ashby ATS';
    }
    // SmartRecruiters
    else if (
      url.includes('smartrecruiters.com') ||
      document.querySelector('form[data-cy="application-form"], .st-apply, [data-testid="st-apply"]')
    ) {
      platform = 'smartrecruiters';
      displayName = 'SmartRecruiters';
    }
    // Indeed
    else if (
      url.includes('indeed.com') ||
      document.querySelector('[data-ia-element], #ia-container, .ia-JobApplication')
    ) {
      platform = 'indeed';
      displayName = 'Indeed Quick Apply';
    }
    // Taleo
    else if (url.includes('taleo.net') || document.querySelector('[name*="taleo"]')) {
      platform = 'taleo';
      displayName = 'Oracle Taleo';
    }
    // Google Forms
    else if (url.includes('docs.google.com') || url.includes('forms.gle')) {
      platform = 'generic_portal';
      displayName = 'Google Forms';
    }

    // 2. Form Container Scoping
    let containerSelector = 'body';
    let structure = 'single_page_form';

    // Active Modal Scoping
    const activeModal = document.querySelector(
      '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], .artdeco-modal, .modal-open .modal-dialog'
    );
    if (activeModal) {
      structure = 'multi_step_modal';
      if (activeModal.id) containerSelector = '#' + activeModal.id;
      else if (activeModal.className) containerSelector = '.' + activeModal.className.trim().split(/\\s+/)[0];
      else containerSelector = '[role="dialog"]';
    } else if (document.querySelector('iframe[src*="apply"], iframe[id*="apply"], iframe[src*="job"]')) {
      structure = 'embedded_iframe';
      containerSelector = 'iframe';
    } else if (document.querySelector('.application-step, [data-step], .wizard-step, .step-container')) {
      structure = 'multi_page_wizard';
    }

    // 3. Application Stage Detection
    let stage = 'unknown';

    // Check for success / confirmation
    const successEl = document.querySelector(
      '#step-success.active, .success-view, [data-test-modal-close-btn], .application-submitted, [class*="success-message"]'
    );
    const hasSuccessText = /your application was sent|application submitted|thank you for applying|received your application/i.test(bodyText);

    if (successEl || hasSuccessText) {
      stage = 'submission_success';
    }
    // Check for Review Step
    else if (
      document.querySelector('#step-5.active, [data-step="review"], .review-section, [data-test-form-review]') ||
      /review your application|please review before submitting/i.test(bodyText)
    ) {
      stage = 'review_summary_step';
    }
    // Check for Active Form Step
    else if (
      document.querySelector('input:not([type="hidden"]), select, textarea, [role="combobox"]') &&
      (activeModal || document.querySelector('form, #application-form, .application-form'))
    ) {
      stage = 'active_form_step';
    }
    // Check for Job Detail View with Apply button
    else if (document.querySelector('button.jobs-apply-button, #main-easy-apply-btn, [aria-label*="Apply"], [data-qa="btn-apply"]')) {
      stage = 'job_detail_view';
    }
    // Check for Job Search Results
    else if (document.querySelector('li.jobs-search-results-list__list-item, li.jobs-search-results__list-item, div.job-card-container, [data-occludable-job-id], [data-view-name="job-card"], .job-card, [data-job-id], div.job_seen_beacon')) {
      stage = 'job_search_results';
    }

    // 4. Progress & Pagination Parsing (e.g. "2/5 pages", "Step 2 of 4", progress bar 40%)
    let currentStep;
    let totalSteps;
    let progressPercent;

    const progressTextEl = document.querySelector(
      '.modal-progress-text, [class*="progress-text"], [aria-label*="step"], .wizard-progress, .page-indicator'
    );
    if (progressTextEl) {
      const pText = progressTextEl.textContent || '';
      const matchSlash = pText.match(/(\\d+)\\s*[/]\\s*(\\d+)/);
      if (matchSlash) {
        currentStep = parseInt(matchSlash[1], 10);
        totalSteps = parseInt(matchSlash[2], 10);
      } else {
        const matchOf = pText.match(/step\\s*(\\d+)\\s*(?:of|out of)\\s*(\\d+)/i);
        if (matchOf) {
          currentStep = parseInt(matchOf[1], 10);
          totalSteps = parseInt(matchOf[2], 10);
        }
      }
    }

    const progressBar = document.querySelector('.modal-progress-bar, [role="progressbar"], .progress-bar');
    if (progressBar) {
      const styleWidth = progressBar.style ? progressBar.style.width || '' : '';
      const percentVal = parseFloat(styleWidth);
      if (!isNaN(percentVal)) {
        progressPercent = percentVal;
      }
      const ariaVal = typeof progressBar.getAttribute === 'function' ? progressBar.getAttribute('aria-valuenow') : null;
      if (ariaVal) progressPercent = parseFloat(ariaVal);
    }

    if (!progressPercent && currentStep && totalSteps && totalSteps > 0) {
      progressPercent = Math.round((currentStep / totalSteps) * 100);
    }


    // 5. Validation Errors Detection
    const errorElements = Array.from(document.querySelectorAll(
      '[aria-invalid="true"], .fb-form-element--error, .is-invalid, .has-error, .input-error, [role="alert"], .artdeco-inline-feedback--error'
    )).filter(el => {
      if (el.style && el.style.display === 'none') return false;
      return el.offsetParent !== null;
    });

    const hasErrors = errorElements.length > 0;
    const errorCount = errorElements.length;

    if (hasErrors && stage === 'active_form_step') {
      stage = 'validation_error';
    }

    // 6. Action Capabilities
    const forwardBtn = document.querySelector(
      'button[data-easy-apply-next-button], button[data-easy-apply-submit-button], #modal-next-btn, #modal-submit-btn, button.artdeco-button--primary'
    );

    const canAdvance = !!(forwardBtn && !forwardBtn.disabled);
    const submitBtn = document.querySelector(
      'button[data-easy-apply-submit-button], #modal-submit-btn, button[aria-label*="Submit application"]'
    );
    const canSubmit = !!(submitBtn && !submitBtn.disabled && (submitBtn.offsetParent !== null || submitBtn.style.display !== 'none'));

    return {
      platform,
      displayName,
      structure,
      stage,
      containerSelector,
      currentStep,
      totalSteps,
      progressPercent,
      hasErrors,
      errorCount,
      canAdvance,
      canSubmit,
    };
  } catch (err) {
    return {
      platform: 'generic_portal',
      displayName: 'Generic Portal',
      structure: 'single_page_form',
      stage: 'unknown',
      containerSelector: 'body',
      hasErrors: false,
      errorCount: 0,
      canAdvance: false,
      canSubmit: false,
    };
  }
})()
`;

export async function detectAtsArchitecture(webview: WebviewTarget): Promise<AtsDetectionResult> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return {
      platform: 'generic_portal',
      displayName: 'Generic Portal',
      structure: 'single_page_form',
      stage: 'unknown',
      containerSelector: 'body',
      hasErrors: false,
      errorCount: 0,
      canAdvance: false,
      canSubmit: false,
    };
  }

  try {
    const result = await webview.executeJavaScript<AtsDetectionResult>(ATS_DETECTOR_SCRIPT);
    if (result && typeof result === 'object' && 'platform' in result && typeof result.platform === 'string') {
      return result;
    }
    return {
      platform: 'generic_portal',
      displayName: 'Generic Portal',
      structure: 'single_page_form',
      stage: 'unknown',
      containerSelector: 'body',
      hasErrors: false,
      errorCount: 0,
      canAdvance: false,
      canSubmit: false,
    };
  } catch (err) {

    console.warn('[AtsDetector] Execution error:', err);
    return {
      platform: 'generic_portal',
      displayName: 'Generic Portal',
      structure: 'single_page_form',
      stage: 'unknown',
      containerSelector: 'body',
      hasErrors: false,
      errorCount: 0,
      canAdvance: false,
      canSubmit: false,
    };
  }
}
