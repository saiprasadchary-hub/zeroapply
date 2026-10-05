/**
 * ZeroApply Vision / Perception - Page Analyzer
 * Analyzes current webview page state, detects platform, search results,
 * job detail views, active modals, and apply button characteristics.
 */

import type { WebviewTarget } from './domObserver';

export interface ApplyButtonInfo {
  exists: boolean;
  type: 'easy_apply' | 'external' | 'none';
  text: string;
  selector: string;
  url?: string;
  isModalTrigger: boolean;
}

export interface PageAnalysisResult {
  url: string;
  title: string;
  state: 'search_results' | 'job_detail' | 'easy_apply_modal' | 'application_form' | 'unknown';
  platform: string;
  hasActiveModal: boolean;
  applyButton: ApplyButtonInfo;
  jobTitle?: string;
  companyName?: string;
}

export const PAGE_ANALYZER_SCRIPT = `
(() => {
  try {
    const url = window.location.href || '';
    const title = document.title || '';
    let platform = 'other';

    if (url.includes('linkedin.com') || title.includes('LinkedIn')) platform = 'linkedin';
    else if (url.includes('indeed.com')) platform = 'indeed';
    else if (url.includes('glassdoor.com')) platform = 'glassdoor';

    // 1. Check for Active Modal
    const modalEl = document.querySelector('.jobs-easy-apply-modal, .artdeco-modal, [role="dialog"], #easy-apply-modal-overlay.active');
    const hasActiveModal = !!modalEl && (modalEl.offsetParent !== null || modalEl.classList.contains('active'));

    // Helper to check element visibility
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    // 2. Discover Apply Button across LinkedIn and Universal ATS Career Portals
    let applyButton = {
      exists: false,
      type: 'none',
      text: '',
      selector: '',
      url: '',
      isModalTrigger: false,
    };

    let applyCandidate = null;
    // 1. LinkedIn specific selectors
    const linkedinCandidate = document.querySelector('.jobs-apply-button, button[data-za-apply-btn], [data-job-id] .jobs-apply-button, #main-easy-apply-btn, .jobs-s-apply button, a.jobs-apply-button');
    if (linkedinCandidate && !linkedinCandidate.closest('.filter-bar, .search-filters, [class*="pill"]')) {
      applyCandidate = linkedinCandidate;
    }

    // 2. Universal ATS & Direct Career Portals (SAP SuccessFactors, Workday, Taleo, Greenhouse, Lever, etc.)
    if (!applyCandidate) {
      const allButtons = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]'));
      applyCandidate = allButtons.find((b) => {
        if (!isVisible(b)) return false;
        if (b.closest('header, nav, .jobs-search-box, [role="search"], .keywordsearch, .jobsearch, [class*="alert"], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield')) return false;
        const txt = (b.textContent || b.value || '').trim();
        return /apply now|apply for this job|start application|apply online|^apply\\b/i.test(txt) && !/applied/i.test(txt);
      }) || null;
    }
    
    if (applyCandidate) {
      const text = (applyCandidate.textContent || applyCandidate.value || applyCandidate.getAttribute('aria-label') || '').trim();
      const isEasy = /easy\\s*apply|in\\s*apply/i.test(text);
      const link = applyCandidate.closest('a')?.href || (applyCandidate.tagName === 'A' ? applyCandidate.href : '') || applyCandidate.getAttribute('data-href') || '';
      applyButton = {
        exists: true,
        type: isEasy ? 'easy_apply' : 'external',
        text,
        url: link,
        selector: applyCandidate.id ? '#' + applyCandidate.id : (applyCandidate.tagName ? applyCandidate.tagName.toLowerCase() : 'button'),
        isModalTrigger: isEasy,
      };
    }

    // 3. Page State determination (Distinguish Landing Page from Active Form)
    const hasRealCandidateInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).some((el) => {
      if (!isVisible(el)) return false;
      if (el.closest('header, nav, .jobs-search-box, [role="search"], .keywordsearch, .jobsearch, [class*="alert"], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield')) return false;
      const desc = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '')).toLowerCase();
      return /first.*name|last.*name|email|phone|resume|cover.*letter|address|experience|education/i.test(desc);
    });

    let state = 'unknown';
    if (hasActiveModal) {
      state = 'easy_apply_modal';
    } else if (hasRealCandidateInputs) {
      state = 'application_form';
    } else if (applyButton.exists || document.querySelector('.job-details-panel, .jobs-description, .jobsearch, [class*="job-description"], [class*="jobDescription"]')) {
      state = 'job_detail';
    } else if (url.includes('search') || document.querySelector('.jobs-search-results-list, .job-card')) {
      state = 'search_results';
    }

    // 4. Job metadata
    const jobTitleEl = document.querySelector('.job-details__title, .jobs-unified-top-card__job-title, h1');
    const companyEl = document.querySelector('.company-banner__name, .jobs-unified-top-card__company-name, [class*="company"]');

    return {
      url,
      title,
      state,
      platform,
      hasActiveModal,
      applyButton,
      jobTitle: jobTitleEl?.textContent?.trim() || '',
      companyName: companyEl?.textContent?.trim() || '',
    };
  } catch (err) {
    return {
      url: window.location.href,
      title: document.title,
      state: 'unknown',
      platform: 'other',
      hasActiveModal: false,
      applyButton: { exists: false, type: 'none', text: '', selector: '', isModalTrigger: false },
    };
  }
})()
`;

export async function analyzePage(webview: WebviewTarget): Promise<PageAnalysisResult> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return {
      url: '',
      title: '',
      state: 'unknown',
      platform: 'other',
      hasActiveModal: false,
      applyButton: { exists: false, type: 'none', text: '', selector: '', isModalTrigger: false },
    };
  }

  try {
    const res = await webview.executeJavaScript<PageAnalysisResult>(PAGE_ANALYZER_SCRIPT);
    return res;
  } catch (error) {
    console.error('[PageAnalyzer] Error analyzing page:', error);
    return {
      url: '',
      title: '',
      state: 'unknown',
      platform: 'other',
      hasActiveModal: false,
      applyButton: { exists: false, type: 'none', text: '', selector: '', isModalTrigger: false },
    };
  }
}
