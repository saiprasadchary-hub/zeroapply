/**
 * ZeroApply Form Filler - Form Auditor
 * Pre-flight validation ensuring no required fields are blank,
 * and no client-side validation errors prevent step advancement.
 */

import type { WebviewTarget } from '../domScanner/injectedScanner';

export interface UnansweredQuestionInfo {
  id?: string;
  name?: string;
  label: string;
  inputType: string;
  isRequired: boolean;
  selector?: string;
  hasError: boolean;
  errorText?: string;
  helperText?: string;
}

export interface AuditResult {
  ready: boolean;
  missingRequired: string[];
  unansweredQuestions: UnansweredQuestionInfo[];
  errors: string[];
}

export const FORM_AUDITOR_SCRIPT = `
(() => {
  try {
    const missing = [];
    const errors = [];
    const unanswered = [];
    const processedRadioGroups = new Set();

    function getAttr(el, attr) {
      if (!el || typeof el.getAttribute !== 'function') return '';
      return el.getAttribute(attr) || '';
    }

    function isElementVisible(el) {
      if (!el) return false;
      if (el.nodeType !== 1) return true;
      if (el.style && (el.style.display === 'none' || el.hidden || getAttr(el, 'aria-hidden') === 'true')) return false;
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
      }
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
      return (r.width > 0 && r.height > 0) || (el.offsetWidth > 0 && el.offsetHeight > 0);
    }

    function getActiveScope() {
      const primaryModal = document.querySelector(
        '.jobs-easy-apply-modal, #easy-apply-modal-overlay.active, #artdeco-modal-outlet .artdeco-modal'
      );
      if (primaryModal && isElementVisible(primaryModal)) {
        const r = primaryModal.getBoundingClientRect();
        if (r.width > 80 && r.height > 80) return primaryModal;
      }

      const modalCandidates = Array.from(document.querySelectorAll(
        '[role="dialog"][aria-modal="true"], .artdeco-modal, .modal-open .modal-dialog, [data-qa="application-modal"], [role="dialog"]'
      ));
      const activeModal = modalCandidates.find(m => {
        if (!isElementVisible(m)) return false;
        if (m.closest && m.closest('.msg-overlay-container, #msg-overlay, #messaging-widget, .msg-overlay-bubble-header')) return false;
        const r = m.getBoundingClientRect();
        return r.width > 80 && r.height > 80;
      });
      if (activeModal) return activeModal;

      const activeForm = document.querySelector(
        '#application_form, #application-form, form[data-cy="application-form"], .application-form, form[data-qa="apply-form"], form'
      );
      return activeForm || document.body || document;
    }

    const scope = getActiveScope();

    function safeClosest(el, sel) {
      if (!el || typeof el.closest !== 'function') return null;
      try { return el.closest(sel); } catch (e) { return null; }
    }

    function getFieldErrorMsg(container, el) {
      if (!container && !el) return '';
      const roots = [container, el?.parentElement, el?.parentElement?.parentElement].filter(Boolean);
      for (const root of roots) {
        if (!root || typeof root.querySelector !== 'function') continue;
        const errEl = root.querySelector(
          '.artdeco-inline-feedback--error, [data-test-form-builder-inline-feedback], [data-test-form-element-error-messages], .fb-form-element--error, [role="alert"], .field-error, .invalid-feedback, .error-message, [class*="inline-feedback--error"], [class*="error-text"], [class*="feedback--error"], [class*="errorMessage"], [data-automation-id*="error"]'
        );
        if (errEl) {
          const t = (errEl.textContent || '').trim();
          if (t) return t;
        }
      }
      return '';
    }

    function getFieldHelperText(container, el) {
      if (!container && !el) return '';
      const roots = [container, el?.parentElement].filter(Boolean);
      for (const root of roots) {
        if (!root || typeof root.querySelector !== 'function') continue;
        const helpEl = root.querySelector(
          '.jobs-easy-apply-form-element__help-text, [data-test-form-builder-help-text], .fb-form-element-sub-label, [data-test-form-element-sub-label], p[class*="help"], p[class*="sub-label"], .artdeco-inline-feedback--hint, [class*="helper-text"], p.t-12'
        );
        if (helpEl && helpEl !== el) {
          const t = (helpEl.textContent || '').trim();
          if (t) return t;
        }
      }
      return '';
    }

    // 1. Traverse all interactive form elements in scope
    const elements = Array.from(scope.querySelectorAll(
      'input:not([type="hidden"]), select, textarea, [role="combobox"], [role="listbox"], [role="radiogroup"], [role="switch"], [role="checkbox"], label, fieldset'
    ));

    for (const el of elements) {
      if (!el) continue;
      if (safeClosest(el, '.search-filters, .filter-bar, [class*="pill"]')) continue;
      if (getAttr(el, 'aria-hidden') === 'true') continue;

      // Step scoping: Skip elements inside inactive steps
      const stepParent = safeClosest(el, '.modal-step, .step-container, [data-step-container]');
      if (stepParent) {
        if (stepParent.style && stepParent.style.display === 'none') continue;
        const activeSibling = document.querySelector('.modal-step.active, .step-container.active, [data-step-container].active');
        if (activeSibling && !stepParent.classList.contains('active')) continue;
      }

      // Check visibility hierarchy
      let curr = el;
      let isHidden = false;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (curr.style && curr.style.display === 'none') { isHidden = true; break; }
        if (curr.hidden || getAttr(curr, 'aria-hidden') === 'true') { isHidden = true; break; }
        curr = curr.parentElement;
      }
      if (isHidden) continue;

      if (el.offsetParent === null && typeof el.getBoundingClientRect === 'function') {
        const r = el.getBoundingClientRect();
        const isInput = el.type === 'radio' || el.type === 'checkbox' || el.type === 'file';
        if (!isInput && r.width === 0 && r.height === 0) continue;
      }

      // A. Radio Groups
      if (el.type === 'radio' || getAttr(el, 'role') === 'radiogroup' || (el.tagName === 'FIELDSET' && el.querySelector('input[type="radio"]'))) {
        const name = (el.name || getAttr(el, 'data-test-form-element') || el.id || '').toLowerCase();
        const ariaLabel = getAttr(el, 'aria-label').toLowerCase();
        const text = (el.textContent || '').toLowerCase();

        // Skip resume selection cards/radios - handled exclusively by dedicated resume pipeline!
        if (
          name.includes('resume') ||
          name.includes('jobs-resume-picker') ||
          ariaLabel.includes('resume') ||
          text.includes('resume') ||
          safeClosest(el, '.jobs-resume-picker, .jobs-document-upload, #resume-selector-list, .resume-list, [data-test-resume-item], [data-test-document-card]')
        ) {
          continue;
        }

        const fieldset = safeClosest(el, 'fieldset, [role="radiogroup"], .jobs-easy-apply-form-section, .jobs-easy-apply-form-element, .fb-form-element') || (typeof el.querySelector === 'function' ? el : el.parentElement) || el;
        const groupKey = name || (fieldset.textContent || '').slice(0, 50);
        if (groupKey && processedRadioGroups.has(groupKey)) continue;
        if (groupKey) processedRadioGroups.add(groupKey);

        const label = ((typeof fieldset.querySelector === 'function' ? fieldset.querySelector('legend, label, .fb-form-element-label, [class*="label"]')?.textContent : null) || getAttr(el, 'aria-label') || name || 'Radio Question').trim();
        let anyChecked = (typeof fieldset.querySelector === 'function' && fieldset.querySelector('input[type="radio"]:checked, [aria-checked="true"]') !== null);
        if (!anyChecked && name) {
          anyChecked = Boolean(scope.querySelector('input[type="radio"][name="' + name + '"]:checked'));
        }
        const isReq = el.required || getAttr(el, 'aria-required') === 'true' || getAttr(fieldset, 'aria-required') === 'true' || /required|\\*/i.test(fieldset.textContent || '');
        const hasError = typeof fieldset.querySelector === 'function' && fieldset.querySelector('.artdeco-inline-feedback--error, [aria-invalid="true"], [class*="error"]') !== null;
        const errText = hasError ? getFieldErrorMsg(fieldset, el) : undefined;
        const helpText = getFieldHelperText(fieldset, el) || undefined;

        if (!anyChecked || hasError) {
          if (!anyChecked && isReq) missing.push(label);
          unanswered.push({
            id: el.id,
            name,
            label,
            inputType: 'radio',
            isRequired: isReq,
            selector: el.id ? '#' + el.id : (name ? 'input[type="radio"][name="' + name + '"]' : undefined),
            hasError,
            errorText: errText,
            helperText: helpText,
          });
        }
        continue;
      }

      if (el.tagName === 'FIELDSET') continue;

      // B. Checkboxes (Native & Custom)
      const isCustomCheckbox = getAttr(el, 'role') === 'checkbox' || getAttr(el, 'role') === 'switch' ||
        (el.tagName === 'LABEL' && !el.querySelector('input') && (
          el.querySelector('div[class*="border"], div[class*="rounded"], [class*="box"]') !== null ||
          /verify|accurate|agree|terms|consent|policy|declaration|certify|communications|whatsapp|joined|community/i.test(el.textContent || '')
        ));

      if (el.type === 'checkbox' || isCustomCheckbox) {
        const label = (safeClosest(el, 'label')?.textContent || el.textContent || getAttr(el, 'aria-label') || el.name || '').trim();
        // Skip top choice / premium upsell: these MUST remain unchecked!
        if (/top\\s*choice|premium/i.test(label)) continue;

        const hasSvg = el.querySelector && el.querySelector('svg') !== null;
        const box = el.querySelector ? (el.querySelector('div[class*="border"], div[class*="rounded"], [class*="box"]') || el) : el;
        const boxClass = (box.className && typeof box.className === 'string') ? box.className : '';
        const isBoxActive = (boxClass.includes('border-purple') || boxClass.includes('border-emerald') || boxClass.includes('border-indigo') || boxClass.includes('bg-purple') || boxClass.includes('bg-indigo') || boxClass.includes('bg-emerald') || boxClass.includes('bg-[#') || boxClass.includes('bg-')) && !boxClass.includes('bg-transparent') && !boxClass.includes('border-slate-300');

        const isReq = el.required || getAttr(el, 'aria-required') === 'true' || label.indexOf('*') !== -1 || /required|verify|accurate|agree|confirm/i.test(label);
        const isChecked = el.checked || getAttr(el, 'aria-checked') === 'true' || getAttr(el, 'data-state') === 'checked' || hasSvg || isBoxActive;
        if (isReq && !isChecked) {
          missing.push(label || 'Required Checkbox');
          unanswered.push({
            id: el.id,
            name: el.name,
            label: label || 'Checkbox',
            inputType: 'checkbox',
            isRequired: true,
            selector: el.id ? '#' + el.id : undefined,
            hasError: false,
          });
        }
        continue;
      }

      // C. Select / Dropdown / Combobox
      const elRole = getAttr(el, 'role');
      if (el.tagName === 'SELECT' || elRole === 'combobox' || elRole === 'listbox' || (el.classList && el.classList.contains('quantumWizMenuPaperselectOptionList'))) {
        if (elRole === 'option') continue;
        if (el.parentElement && safeClosest(el.parentElement, '[role="combobox"], [role="listbox"]')) continue;

        const val = (el.value || el.textContent || '').trim();
        const isPlaceholder = !val || /^(select|choose|select an option|select country code|please select|--|0)$/i.test(val);

        // Google Forms / Question item context
        const gItem = safeClosest(el, '[role="listitem"], .Qr7Oae, .geS5n, [jsmodel]');
        const gTitle = gItem ? gItem.querySelector('.M7eMe, [role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle')?.textContent?.replace(/\\s*\\*.*$/, '').trim() : '';

        const container = safeClosest(el, '.fb-form-element, .jobs-easy-apply-form-element, .jobs-easy-apply-form-section__grouping, [data-test-form-element], fieldset, [class*="group"], [class*="section"]') || el.parentElement;
        const label = (gTitle || getAttr(el, 'aria-label') || container?.querySelector('label, .fb-form-element-label, [class*="label"]')?.textContent || el.name || el.placeholder || '').trim();

        const isReq = el.required ||
          getAttr(el, 'aria-required') === 'true' ||
          (gItem && /\\*/.test(gItem.textContent || '')) ||
          /required|\\*/i.test(label) ||
          (container && (/required|\\*/i.test(container.textContent || '') || container.querySelector('[class*="required"], [class*="error"]') !== null));

        const hasError = getAttr(el, 'aria-invalid') === 'true' ||
          (container && container.querySelector('.artdeco-inline-feedback--error, [role="alert"]') !== null);
        const errText = hasError ? getFieldErrorMsg(container, el) : undefined;
        const helpText = getFieldHelperText(container, el) || undefined;

        if (isPlaceholder || hasError) {
          if (isPlaceholder && isReq) missing.push(label || 'Dropdown Selection');
          const customFieldId = getAttr(el, 'data-za-field-id');
          unanswered.push({
            id: el.id,
            name: el.name,
            label: label || 'Dropdown Question',
            inputType: 'select',
            isRequired: isReq,
            selector: customFieldId ? '[data-za-field-id="' + customFieldId + '"]' : (el.id ? '#' + el.id : undefined),
            hasError,
            errorText: errText,
            helperText: helpText,
          });
        }
        continue;
      }

      // D. File / Resume Upload Dropzone
      if (el.type === 'file') {
        const hasFiles = Boolean(el.files && el.files.length > 0);
        const hasSelectedResume = Boolean(
          scope.querySelector(
            '.jobs-resume-picker__resume-btn--selected, [aria-checked="true"], .selected, ' +
            'button[aria-checked="true"], .jobs-document-upload__resume-item--selected, ' +
            '.jobs-resume-picker__list-item button.jobs-resume-picker__resume-btn, ' +
            '[data-test-resume-item], [data-test-document-card]'
          )
        );
        if (hasFiles || hasSelectedResume) {
          continue;
        }
        const isReq = el.required || getAttr(el, 'aria-required') === 'true';
        if (isReq) {
          missing.push('Upload resume');
        }
        continue;
      }

      // E. Text / Tel / Email / Textarea / Number
      const val = (el.value || '').trim();
      const container = safeClosest(el, '.fb-form-element, .jobs-easy-apply-form-element, .jobs-easy-apply-form-section__grouping, [data-test-form-element], fieldset, [class*="group"], [class*="section"]') || el.parentElement;
      const label = (getAttr(el, 'aria-label') || el.placeholder || container?.querySelector('label, .fb-form-element-label, [class*="label"]')?.textContent || el.name || '').trim();

      const isReq = el.required ||
        getAttr(el, 'aria-required') === 'true' ||
        /required|\\*/i.test(label) ||
        (container && (/required|\\*/i.test(container.textContent || '') || container.querySelector('[class*="required"], [class*="error"]') !== null));

      const hasError = getAttr(el, 'aria-invalid') === 'true' ||
        (container && container.querySelector('.artdeco-inline-feedback--error, [role="alert"]') !== null);
      const errText = hasError ? getFieldErrorMsg(container, el) : undefined;
      const helpText = getFieldHelperText(container, el) || undefined;

      if (!val || hasError) {
        if (!val && isReq) missing.push(label || 'Required Input');
        unanswered.push({
          id: el.id,
          name: el.name,
          label: label || 'Input Field',
          inputType: el.type || (el.tagName ? el.tagName.toLowerCase() : 'text'),
          isRequired: isReq,
          selector: el.id ? '#' + el.id : undefined,
          hasError,
          errorText: errText,
          helperText: helpText,
        });
      }
    }

    // 2. Check for explicit validation error indicators
    const errorElements = Array.from(scope.querySelectorAll(
      '.artdeco-inline-feedback--error, [aria-invalid="true"], .fb-form-element--error, .has-error, .input-error, [data-test-form-element-error-messages]'
    ));
    for (const errEl of errorElements) {
      if (errEl.offsetParent === null) continue;
      const msg = errEl.textContent?.trim();
      if (msg && !errors.includes(msg)) errors.push(msg);
    }

    return {
      ready: missing.length === 0 && errors.length === 0 && unanswered.filter(u => u.isRequired || u.hasError).length === 0,
      missingRequired: Array.from(new Set(missing)),
      unansweredQuestions: unanswered,
      errors: Array.from(new Set(errors)),
    };
  } catch (err) {
    return {
      ready: true,
      missingRequired: [],
      unansweredQuestions: [],
      errors: [],
    };
  }
})()
`;

export async function auditFormFields(webview: WebviewTarget): Promise<AuditResult> {
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return { ready: true, missingRequired: [], unansweredQuestions: [], errors: [] };
  }

  try {
    const res = await webview.executeJavaScript<AuditResult>(FORM_AUDITOR_SCRIPT).catch(() => null);
    if (res && typeof res === 'object') {
      return {
        ready: typeof res.ready === 'boolean' ? res.ready : true,
        missingRequired: Array.isArray(res.missingRequired) ? res.missingRequired : [],
        unansweredQuestions: Array.isArray(res.unansweredQuestions) ? res.unansweredQuestions : [],
        errors: Array.isArray(res.errors) ? res.errors : [],
      };
    }
    return { ready: true, missingRequired: [], unansweredQuestions: [], errors: [] };
  } catch {
    return { ready: true, missingRequired: [], unansweredQuestions: [], errors: [] };
  }
}

/**
 * Validates whether a scanned field is already satisfactorily filled with valid data.
 */
export function isFieldAlreadySatisfied(
  field: { currentValue?: string; hasError?: boolean },
  targetValue: string
): boolean {
  if (!field) return false;
  const current = (field.currentValue || '').trim().toLowerCase();
  const target = (targetValue || '').trim().toLowerCase();

  // If blank or placeholder option or unselected boolean
  if (!current || /^(select|choose|select an option|select country code|please select|e\.g\.)/i.test(current)) {
    return false;
  }

  // If boolean: 'false' or 'no' is not satisfied when target is 'true' or 'yes'
  if ((current === 'false' || current === 'no') && (target === 'true' || target === 'yes')) {
    return false;
  }

  // If exact or substring match
  if (current === target || current.includes(target) || target.includes(current)) {
    return true;
  }

  // Non-matching existing values are NOT satisfied and must be updated
  return false;
}

