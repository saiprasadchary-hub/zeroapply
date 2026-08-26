import type { StandardSiteAdapter } from './siteAdapters';

export function isStandardApplicationFormCandidate(
  fieldCount: number,
  strongFieldCount: number,
  hasFileInput: boolean,
  hasApplicationContext: boolean,
  hasSemanticRoot: boolean,
): boolean {
  return fieldCount > 0
    && strongFieldCount > 0
    && hasApplicationContext
    && (hasFileInput || hasSemanticRoot || strongFieldCount >= 2);
}

export type StandardPageErrorState =
  | 'security_checkpoint'
  | 'login_required'
  | 'rate_limited'
  | 'job_unavailable'
  | 'transient_error'
  | 'not_found';

export function classifyStandardPageError(title: string, body: string, url = ''): StandardPageErrorState {
  const text = (title + ' ' + body).toLowerCase();
  const location = url.toLowerCase();
  if (/captcha|verify you are (?:a )?human|checking your browser|cloudflare|security check to continue/.test(text)) {
    return 'security_checkpoint';
  }
  if (/\/(?:authwall|login|signin|sign-in|signup)(?:[/?#]|$)/.test(location)
    || /session expired|sign in to (?:apply|continue)|log in to (?:apply|continue)|authentication required|login required/.test(text)) {
    return 'login_required';
  }
  if (/too many requests|rate limit|temporarily blocked|try again later/.test(text)) return 'rate_limited';
  if (/job (?:is )?no longer available|position (?:has been )?(?:filled|closed)|job posting (?:has )?(?:expired|closed)|not accepting applications/.test(text)) {
    return 'job_unavailable';
  }
  if (/something went wrong|temporarily unavailable|service unavailable|bad gateway|gateway timeout|network error|page (?:isn't|is not) working/.test(text)) {
    return 'transient_error';
  }
  return 'not_found';
}

const STANDARD_APPLICATION_FORM_DETECTION = `
  const applicationRootSelector = 'form, main, [role="dialog"], [aria-modal="true"], .jobs-apply-form, [class*="application-form"], [id*="application-form"], [data-automation-id*="application"]';
  const pageChromeSelector = 'header, nav, [role="navigation"], [role="banner"], .global-nav, .jobs-search-box, .search-basic-typeahead, .jobs-search-results-list, .scaffold-layout__list';
  const fieldSelector = 'input, textarea, select, [role="combobox"], [contenteditable="true"]';
  const applicationContextWords = /apply(?:ing| for)|application|candidate|applicant|resume|cv|cover letter|personal information|contact information|work authorization/i;
  const strongFieldWords = /first[ _-]*name|last[ _-]*name|full[ _-]*name|e-?mail|phone|mobile|resume|curriculum vitae|cover[ _-]*letter|linkedin|portfolio|website|work[ _-]*authorization|address|city|postal|zip|current[ _-]*company|school|education|experience/i;
  const qualifiesAsApplicationForm = ${isStandardApplicationFormCandidate.toString()};
  const usableApplicationField = (field) => {
    const type = String(field.getAttribute('type') || '').toLowerCase();
    return visible(field)
      && !['hidden', 'search', 'submit', 'button', 'reset', 'image'].includes(type)
      && !field.closest(pageChromeSelector);
  };
  const fieldHint = (field, root) => {
    const directLabel = field.id ? root.querySelector('label[for="' + CSS.escape(field.id) + '"]') : null;
    const wrappedLabel = field.closest('label, fieldset, [class*="form-field"], [class*="form-group"]')?.querySelector?.('label, legend');
    return [
      field.getAttribute('type'), field.getAttribute('name'), field.id, field.getAttribute('autocomplete'),
      field.getAttribute('placeholder'), field.getAttribute('aria-label'), directLabel?.innerText, wrappedLabel?.innerText,
    ].filter(Boolean).join(' ');
  };
  const applicationForm = Array.from(document.querySelectorAll(applicationRootSelector))
    .filter((root) => visible(root) && !root.closest(pageChromeSelector))
    .map((root) => {
      const fields = Array.from(root.querySelectorAll(fieldSelector)).filter(usableApplicationField);
      const semanticText = [root.id, typeof root.className === 'string' ? root.className : '', root.getAttribute('aria-label'), root.getAttribute('data-automation-id')].filter(Boolean).join(' ');
      const strongFieldCount = fields.filter((field) => {
        const type = String(field.getAttribute('type') || '').toLowerCase();
        return ['email', 'tel', 'file'].includes(type) || strongFieldWords.test(fieldHint(field, root));
      }).length;
      const hasFileInput = fields.some((field) => String(field.getAttribute('type') || '').toLowerCase() === 'file');
      const hasSemanticRoot = /application|applicant|candidate|apply[-_ ]?(?:form|flow)|job[-_ ]?apply/i.test(semanticText);
      const contextText = String(root.innerText || '').slice(0, 10000) + ' ' + String(document.title || '') + ' ' + semanticText;
      return {
        root,
        fields,
        strongFieldCount,
        hasFileInput,
        hasSemanticRoot,
        hasApplicationContext: applicationContextWords.test(contextText),
      };
    })
    .filter((candidate) => qualifiesAsApplicationForm(
      candidate.fields.length,
      candidate.strongFieldCount,
      candidate.hasFileInput,
      candidate.hasApplicationContext,
      candidate.hasSemanticRoot,
    ))
    .sort((a, b) => Number(b.hasSemanticRoot) - Number(a.hasSemanticRoot) || b.fields.length - a.fields.length)[0];
`;

export function createStandardJobExtractorScript(adapter: StandardSiteAdapter): string {
  return `
(function extractStandardJobs() {
  const allowedHosts = ${JSON.stringify(adapter.hosts)};
  const pathPatterns = ${JSON.stringify(adapter.jobPathPatterns)};
  const hostMatches = (hostname, expected) => hostname === expected || hostname.endsWith('.' + expected);
  const visible = (element) => element instanceof HTMLElement && element.offsetParent !== null;
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  const seen = new Set();
  const jobs = [];

  for (const anchor of anchors) {
    let parsed;
    try { parsed = new URL(anchor.href, window.location.href); } catch { continue; }
    if (parsed.protocol !== 'https:') continue;
    if (!allowedHosts.some((host) => hostMatches(parsed.hostname.toLowerCase(), host))) continue;
    const comparable = (parsed.pathname + parsed.search).toLowerCase();
    if (!pathPatterns.some((pattern) => comparable.includes(pattern))) continue;

    parsed.hash = '';
    const stableUrl = parsed.toString();
    const identity = stableUrl.replace(/([?&])(trk|trackingid|refid|ref|utm_[^=]+)=[^&]*/gi, '$1').toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);

    const card = anchor.closest('[data-job-id], [data-oc-id], li, article, .job-card-container, .jobTuple, [class*="jobCard"], [class*="job-card"]');
    const context = card || anchor.parentElement || anchor;
    const text = String(context.innerText || anchor.innerText || '').trim();
    const titleElement = context.querySelector?.('h1, h2, h3, [class*="title"], [data-testid*="title"]');
    const companyElement = context.querySelector?.('[class*="company"], [data-testid*="company"], h4');
    const title = String(titleElement?.innerText || anchor.innerText || anchor.getAttribute('aria-label') || 'Job opening').trim().slice(0, 180);
    const company = String(companyElement?.innerText || 'Unknown company').trim().slice(0, 140);
    const alreadyApplied = /(?:^|\\b)(already applied|application submitted|you applied|applied on)(?:\\b|$)/i.test(text);

    if (visible(anchor) || visible(context)) {
      jobs.push({ title, company, url: stableUrl, alreadyApplied });
    }
    if (jobs.length >= 50) break;
  }

  return jobs;
})();
`;
}

export const STANDARD_BROWSER_CONTEXT_SCRIPT = `
(function inspectSemanticBrowserContext() {
  const visible = (element) => {
    if (!element || typeof element.getBoundingClientRect !== 'function') return false;
    const view = element.ownerDocument?.defaultView || window;
    const style = view.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const textOf = (element) => String(element?.innerText || element?.textContent || element?.value || element?.getAttribute?.('aria-label') || element?.getAttribute?.('title') || '')
    .replace(/\\s+/g, ' ').trim().slice(0, 160);
  const classify = (text) => {
    const value = text.toLowerCase().replace(/[↗↘›»→]+$/, '').trim();
    if (/^(submit(?: (?:my|your))? application|send(?: (?:my|your))? application|complete application|finish application|apply|apply now|apply for this job|send)$/.test(value)) return 'submit';
    if (/^(review|review application|review (?:&|and) submit|proceed to review)$/.test(value)) return 'review';
    if (/^(next|continue|proceed|save (?:&|and) continue|save (?:&|and) next|next step|continue application|continue to next step)$/.test(value)) return 'next';
    if (/apply/.test(value)) return 'apply';
    return 'other';
  };

  let sameOriginFrames = 0;
  let inaccessibleFrames = 0;
  for (const frame of Array.from(document.querySelectorAll('iframe'))) {
    try {
      if (frame.contentDocument?.documentElement) sameOriginFrames++;
      else inaccessibleFrames++;
    } catch {
      inaccessibleFrames++;
    }
  }

  const controls = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"], [role="button"]'))
    .filter(visible)
    .map((element) => ({ text: textOf(element), action: classify(textOf(element)) }))
    .filter((item) => item.text && item.action !== 'other')
    .slice(0, 30);
  const heading = Array.from(document.querySelectorAll('h1, h2, [role="heading"]')).filter(visible).map(textOf).find(Boolean) || '';

  return {
    title: String(document.title || '').slice(0, 200),
    heading,
    actions: controls,
    sameOriginFrames,
    inaccessibleFrames,
  };
})();
`;

export const STANDARD_FORM_ENTRY_SCRIPT = `
(function enterStandardApplication() {
  const visible = (element) => {
    if (!(element instanceof HTMLElement) || element.offsetParent === null) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const textOf = (element) => String(element?.innerText || element?.textContent || element?.value || element?.getAttribute?.('aria-label') || element?.getAttribute?.('title') || '')
    .replace(/\\s+/g, ' ').replace(/[↗↘›»→]+$/, '').trim();
  const diagnosePage = ${classifyStandardPageError.toString()};
  const bodyText = String(document.body?.innerText || '');

  if (/(?:already applied|application submitted|you applied|your application (?:was|has been) received)/i.test(bodyText)) {
    return { state: 'already_applied' };
  }

${STANDARD_APPLICATION_FORM_DETECTION}
  if (applicationForm) {
    return { state: 'form_ready', fieldCount: applicationForm.fields.length };
  }

  const candidates = Array.from(document.querySelectorAll('a[href], button, [role="button"]'))
    .filter((element) => visible(element) && !element.closest('form, [role="dialog"], [aria-modal="true"], .jobs-apply-form, [class*="application-form"], [id*="application-form"]'));
  const apply = candidates.find((element) => {
    const text = textOf(element).toLowerCase();
    if (/easy apply/.test(text)) return false;
    return /^(apply|apply now|apply for this job|start application|continue application|apply on (?:company|employer) (?:site|website))$/.test(text)
      || /^apply (?:on|at|for)/.test(text);
  });

  if (!apply) {
    const applicationFrame = Array.from(document.querySelectorAll('iframe[src]')).filter(visible).find((frame) => {
      const hint = [frame.src, frame.getAttribute('title'), frame.getAttribute('aria-label')].filter(Boolean).join(' ');
      return /apply|application|candidate|career|job/i.test(hint);
    });
    if (applicationFrame?.src) {
      try {
        const target = new URL(applicationFrame.src, window.location.href);
        if (target.protocol === 'https:' && !target.username && !target.password) {
          return { state: 'navigate', href: target.toString(), text: 'embedded application' };
        }
      } catch {}
    }
    return { state: diagnosePage(document.title || '', bodyText, window.location.href) };
  }
  if (apply instanceof HTMLAnchorElement && apply.href) {
    let target;
    try { target = new URL(apply.href, window.location.href); } catch { return { state: 'not_found' }; }
    if (target.protocol !== 'https:' || target.username || target.password) return { state: 'not_found' };
    const isLinkedInHost = target.hostname === 'linkedin.com' || target.hostname.endsWith('.linkedin.com');
    const requiresNativeLinkedInRedirect = isLinkedInHost
      && (target.pathname === '/safety/go' || target.pathname === '/safety/go/' || target.pathname.includes('/jobs/view/externalApply/'));
    if (requiresNativeLinkedInRedirect) {
      apply.scrollIntoView({ block: 'center', behavior: 'instant' });
      apply.click();
      return { state: 'clicked', text: textOf(apply) };
    }
    return { state: 'navigate', href: target.toString(), text: textOf(apply) };
  }

  apply.scrollIntoView({ block: 'center', behavior: 'instant' });
  apply.click();
  return { state: 'clicked', text: textOf(apply) };
})();
`;

export const STANDARD_FORM_STATE_SCRIPT = `
(function inspectStandardApplicationState() {
  const visible = (element) => {
    if (!(element instanceof HTMLElement) || element.offsetParent === null) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const diagnosePage = ${classifyStandardPageError.toString()};
  const bodyText = String(document.body?.innerText || '');
  if (/(?:already applied|application submitted|you applied|your application (?:was|has been) received)/i.test(bodyText)) {
    return { state: 'already_applied' };
  }
${STANDARD_APPLICATION_FORM_DETECTION}
  return applicationForm
    ? { state: 'form_ready', fieldCount: applicationForm.fields.length }
    : { state: diagnosePage(document.title || '', bodyText, window.location.href) };
})();
`;

export const STANDARD_FORM_VALIDATION_SCRIPT = `
(function validateStandardApplicationForm() {
  const visible = (element) => {
    if (!(element instanceof HTMLElement) || element.offsetParent === null) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const forms = Array.from(document.querySelectorAll('form')).filter(visible);
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(visible);
  const main = document.querySelector('main');
  const applicationWords = /application|applicant|candidate|resume|cv|cover letter|employment|education|experience|review your information/i;
  const candidates = [...dialogs, ...forms, ...(visible(main) ? [main] : [])];
  const root = candidates.sort((a, b) => {
    const score = (element) => element.querySelectorAll('input, textarea, select').length * 10
      + (applicationWords.test(String(element.innerText || '').slice(0, 8000)) ? 20 : 0)
      + (element.matches('[role="dialog"], form') ? 5 : 0);
    return score(b) - score(a);
  })[0] || document;
  const required = Array.from(root.querySelectorAll('[required], [aria-required="true"]')).filter(visible);
  const groups = new Set();
  const empty = required.filter((field) => {
    if (field.disabled || field.readOnly) return false;
    if (field instanceof HTMLInputElement && (field.type === 'radio' || field.type === 'checkbox')) {
      const key = field.name || field.id;
      if (groups.has(key)) return false;
      groups.add(key);
      const escaped = CSS.escape(field.name || '');
      const group = field.name ? Array.from(root.querySelectorAll('input[name="' + escaped + '"]')) : [field];
      return !group.some((item) => item.checked);
    }
    return !String(field.value || field.textContent || '').trim();
  });
  const errors = Array.from(root.querySelectorAll('[aria-invalid="true"], [role="alert"], .error, [class*="error-message"], [class*="field-error"]'))
    .filter((element) => {
      if (!visible(element)) return false;
      const text = String(element.innerText || '').trim();
      if (!text) return false;
      return element.getAttribute('aria-invalid') === 'true'
        || /(?:^|\\b)(?:error|required|invalid|missing|must|please (?:enter|select|choose|provide))(?:\\b|$)/i.test(text);
    });
  const messages = [
    ...empty.map((field) => {
      const label = field.id ? root.querySelector('label[for="' + CSS.escape(field.id) + '"]') : null;
      return String(label?.innerText || field.getAttribute('aria-label') || field.getAttribute('name') || field.id || 'Required field').trim().slice(0, 160);
    }),
    ...errors.map((element) => String(element.innerText || element.getAttribute('aria-label') || 'Validation error').trim().slice(0, 160)),
  ].filter(Boolean);
  return {
    isValid: empty.length === 0 && errors.length === 0,
    emptyCount: empty.length,
    errorCount: errors.length,
    messages: Array.from(new Set(messages)).slice(0, 5),
  };
})();
`;

export const createStandardStepScript = (allowSubmit: boolean): string => `
(function advanceStandardApplication() {
  const allowSubmit = ${allowSubmit ? 'true' : 'false'};
  const visible = (element) => {
    if (!(element instanceof HTMLElement) || element.offsetParent === null || element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const forms = Array.from(document.querySelectorAll('form')).filter(visible);
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(visible);
  const main = document.querySelector('main');
  const applicationWords = /application|applicant|candidate|resume|cv|cover letter|employment|education|experience|review your information/i;
  const roots = [...dialogs, ...forms, ...(visible(main) ? [main] : [])]
    .filter((root) => {
      const fieldCount = root.querySelectorAll('input, textarea, select, [contenteditable="true"]').length;
      const text = String(root.innerText || '').slice(0, 8000);
      return fieldCount >= 2 || (applicationWords.test(text) && root.querySelector('button, input[type="submit"], [role="button"]'));
    });
  const root = roots.sort((a, b) => {
    const score = (element) => element.querySelectorAll('input, textarea, select').length * 10
      + (applicationWords.test(String(element.innerText || '').slice(0, 8000)) ? 20 : 0)
      + (element.matches('[role="dialog"], form') ? 5 : 0);
    return score(b) - score(a);
  })[0];
  if (!root) return { success: false, action: 'none' };

  const controls = Array.from(root.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"], [role="button"]')).filter(visible);
  const read = (element) => String(element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || element.getAttribute('title') || '')
    .replace(/\\s+/g, ' ').replace(/[↗↘›»→]+$/, '').trim();
  const find = (pattern) => controls.find((element) => pattern.test(read(element).toLowerCase()));
  const submit = find(/^(submit(?: (?:my|your))? application|send(?: (?:my|your))? application|complete application|finish application|apply|apply now|apply for this job|send)$/);
  const review = find(/^(review|review application|review (?:&|and) submit|proceed to review)$/);
  const next = find(/^(next|continue|proceed|save (?:&|and) continue|save (?:&|and) next|next step|continue application|continue to next step)$/);
  const target = submit || review || next;
  if (!target) return { success: false, action: 'none' };
  const action = target === submit ? 'submit' : target === review ? 'review' : 'next';
  const text = read(target);

  if (action === 'submit' && !allowSubmit) {
    return { success: false, action, text, requiresConfirmation: true };
  }

  target.scrollIntoView({ block: 'center', behavior: 'instant' });
  target.focus();
  target.click();
  return { success: true, action, text };
})();
`;

export const STANDARD_SUBMISSION_CONFIRMATION_SCRIPT = `
(function confirmStandardSubmission() {
  const visible = (element) => element instanceof HTMLElement && element.offsetParent !== null;
  const regions = Array.from(document.querySelectorAll('[role="alert"], [role="status"], [role="dialog"], [class*="confirmation"], [class*="success"]')).filter(visible);
  const regionText = regions.map((element) => String(element.innerText || '')).join('\\n').toLowerCase();
  const pageText = String(document.body?.innerText || '').toLowerCase();
  const activeFields = Array.from(document.querySelectorAll('input, textarea, select, [role="combobox"]'))
    .filter((field) => visible(field) && !['hidden', 'search'].includes(String(field.getAttribute('type') || '').toLowerCase()));
  const patterns = [
    /application (?:has been |was )?(?:successfully )?(?:submitted|sent|received)/,
    /thank you for (?:your )?(?:application|applying)/,
    /thanks for applying/,
    /we (?:have )?received your application/,
    /your application is (?:now )?complete/,
    /successfully applied/
  ];
  const regionMatch = patterns.find((pattern) => pattern.test(regionText));
  if (regionMatch) return { confirmed: true, evidence: String(regionText.match(regionMatch)?.[0] || 'submission confirmation') };
  const pageMatch = patterns.find((pattern) => pattern.test(pageText));
  if (pageMatch && activeFields.length < 2) {
    return { confirmed: true, evidence: String(pageText.match(pageMatch)?.[0] || 'submission confirmation') };
  }

  const path = window.location.pathname.toLowerCase();
  if (activeFields.length < 2 && /(?:application-)?(?:confirmation|submitted|thank-you|thanks)(?:[/]|$)/.test(path)) {
    return { confirmed: true, evidence: 'Confirmation URL: ' + window.location.href };
  }

  return { confirmed: false };
})();
`;
