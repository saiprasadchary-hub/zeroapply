/**
 * ZeroApply Closed-Loop Pre-Flight Audit & Self-Healing Recovery (Production Grade)
 * 
 * Verifies that the website accepted all injected values without validation errors.
 * If a validation error is detected, feeds the constraint back to the LLM/Cognitive engine,
 * refuels the field with the corrected value, and re-audits before advancing.
 */

import type { PersonaData } from '../../types';
import { resolveQuestionCognitively } from '../localLlm/ultraQuestionResolver';
import { executeSyntheticInteraction } from '../domScanner/syntheticInteraction';

export interface FormErrorItem {
  selector: string;
  fieldLabel: string;
  errorMessage: string;
  widgetType?: string;
  options?: string[];
}

export interface FormAuditStatus {
  isClean: boolean;
  errors: FormErrorItem[];
  unfilledRequiredFields: string[];
}

export const AUDIT_DOM_SCRIPT = `(() => {
  function getCleanText(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
  }

  const errorElements = document.querySelectorAll(
    '.artdeco-inline-feedback--error, [role="alert"], .error-message, .form-error, .invalid-feedback, [aria-invalid="true"], [data-qa="error"], .has-error, .input-error'
  );

  const errors = [];
  const processedSelectors = new Set();

  errorElements.forEach((errEl) => {
    const text = getCleanText(errEl);
    if (!text || text.length < 2) return;

    // Find parent container
    const container = errEl.closest('.fb-dash-form-element, .form-group, fieldset, .input-group') || errEl.parentElement;
    const input = container?.querySelector('input, select, textarea, [role="combobox"]');
    const label = getCleanText(container?.querySelector('label, h3, h4, legend, .fb-dash-form-element__label')) || 'Required Field';

    let selector = '';
    let widgetType = 'text';
    let options = [];

    if (input) {
      if (input.id) selector = '#' + CSS.escape(input.id);
      else if (input.name) selector = input.tagName.toLowerCase() + '[name="' + CSS.escape(input.name) + '"]';

      const tag = input.tagName.toLowerCase();
      const type = (input.type || '').toLowerCase();
      const role = (input.getAttribute('role') || '').toLowerCase();

      if (tag === 'textarea') widgetType = 'textarea';
      else if (tag === 'select') {
        widgetType = 'select';
        options = Array.from(input.options || []).map((o) => o.text.trim()).filter(Boolean);
      } else if (role === 'combobox' || input.getAttribute('aria-haspopup') === 'listbox') {
        widgetType = 'combobox';
      } else if (type === 'radio') {
        widgetType = 'radiogroup';
        if (input.name) {
          const siblings = Array.from(document.querySelectorAll('input[type="radio"][name="' + CSS.escape(input.name) + '"]'));
          options = siblings.map((s) => getCleanText(s.closest('label')) || s.value).filter(Boolean);
        }
      } else if (type === 'checkbox') {
        widgetType = 'checkbox';
      }
    }

    const finalSelector = selector || (input ? input.tagName.toLowerCase() : 'input');
    if (!processedSelectors.has(finalSelector)) {
      processedSelectors.add(finalSelector);
      errors.push({
        selector: finalSelector,
        fieldLabel: label,
        errorMessage: text,
        widgetType,
        options: options.length > 0 ? options : undefined,
      });
    }
  });

  // Sniff native HTML5 invalid elements that may have browser validation messages
  const invalidInputs = Array.from(document.querySelectorAll('input:invalid, select:invalid, textarea:invalid'));
  invalidInputs.forEach((inp) => {
    if (inp.type === 'hidden' || inp.offsetParent === null) return;
    const msg = inp.validationMessage || 'This field is required or formatted incorrectly';
    const container = inp.closest('.fb-dash-form-element, .form-group, fieldset') || inp.parentElement;
    const label = getCleanText(container?.querySelector('label, h3, h4, legend')) || inp.name || 'Required Field';

    let selector = '';
    if (inp.id) selector = '#' + CSS.escape(inp.id);
    else if (inp.name) selector = inp.tagName.toLowerCase() + '[name="' + CSS.escape(inp.name) + '"]';

    const finalSelector = selector || inp.tagName.toLowerCase();
    if (!processedSelectors.has(finalSelector)) {
      processedSelectors.add(finalSelector);
      errors.push({
        selector: finalSelector,
        fieldLabel: label,
        errorMessage: msg,
        widgetType: inp.tagName.toLowerCase() === 'select' ? 'select' : inp.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text',
      });
    }
  });

  // Check required unfilled fields
  const requiredInputs = Array.from(
    document.querySelectorAll('input[required], select[required], textarea[required], [aria-required="true"]')
  );
  const unfilled = [];
  requiredInputs.forEach((inp) => {
    if (inp.type === 'hidden' || inp.offsetParent === null) return;
    const val = inp.value ? inp.value.trim() : '';
    if (!val) {
      const parent = inp.closest('.fb-dash-form-element, .form-group, fieldset') || inp.parentElement;
      const label = getCleanText(parent?.querySelector('label, h3, h4, legend')) || inp.name || 'Required Field';
      unfilled.push(label);
    }
  });

  return {
    isClean: errors.length === 0 && unfilled.length === 0,
    errors,
    unfilledRequiredFields: unfilled
  };
})()`;

export async function auditFormHealth(webview: any): Promise<FormAuditStatus> {
  try {
    const res = await webview.executeJavaScript(AUDIT_DOM_SCRIPT);
    return res || { isClean: true, errors: [], unfilledRequiredFields: [] };
  } catch (err) {
    console.warn('[ClosedLoopAudit] Audit script check failed:', err);
    return { isClean: true, errors: [], unfilledRequiredFields: [] };
  }
}

/**
 * Self-Healing Error Recovery Loop
 * Re-runs the Cognitive Resolver with the exact error message and re-injects the corrected value.
 */
export async function healFormErrors(
  webview: any,
  errors: FormErrorItem[],
  persona: PersonaData
): Promise<{ recoveredCount: number; remainingErrors: FormErrorItem[] }> {
  let recoveredCount = 0;
  const remainingErrors: FormErrorItem[] = [];

  for (const errItem of errors) {
    console.log(`[SelfHealing] Detected error on "${errItem.fieldLabel}": "${errItem.errorMessage}". Attempting cognitive self-correction...`);

    const widget = errItem.widgetType || 'text';
    const corrected = await resolveQuestionCognitively(
      {
        label: errItem.fieldLabel,
        selector: errItem.selector,
        validationError: errItem.errorMessage,
        widgetType: widget,
        options: errItem.options,
        required: true,
      },
      persona
    );

    if (corrected.answer) {
      const fillRes = await executeSyntheticInteraction(webview, widget, errItem.selector, corrected.answer);
      if (fillRes.success) {
        recoveredCount++;
        console.log(`✓ [SelfHealing] Repaired "${errItem.fieldLabel}" with corrected answer: "${corrected.answer}"`);
      } else {
        remainingErrors.push(errItem);
      }
    } else {
      remainingErrors.push(errItem);
    }
  }

  return { recoveredCount, remainingErrors };
}
