import { liveTelemetry } from '../telemetry/liveTelemetry';
import { ProcessLogger } from '../tracker/processLogger';

export interface FormErrorDiagnosis {
  fieldId?: string;
  name?: string;
  type?: string;
  label?: string;
  errorMessage: string;
  suggestedAction: 'format_phone' | 'select_first_option' | 'check_required_box' | 'fill_default_numeric' | 'select_positive_radio' | 'retype_value' | 'unknown';
}

export interface SelfHealingResult {
  healedCount: number;
  remainingErrors: number;
  fixedFields: string[];
  diagnoses: FormErrorDiagnosis[];
}

export const SCAN_AND_HEAL_FORM_SCRIPT = `
(function selfHealFormErrors() {
  const diagnosedErrors = [];
  const fixedFields = [];

  // Find all error indicators
  const errorContainers = Array.from(document.querySelectorAll(
    '[aria-invalid="true"], .error, .has-error, .artdeco-inline-feedback--error, .fb-form-element--error, input:invalid, select:invalid, textarea:invalid, [data-test-form-element-error-messages]'
  ));

  for (const container of errorContainers) {
    let input = container;
    if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(container.tagName)) {
      input = container.querySelector('input, select, textarea') || container;
    }

    const errorMsgEl = container.closest('.fb-form-element, .artdeco-form-element, div, section')?.querySelector('.artdeco-inline-feedback, .error-message, .form-error, [data-test-form-element-error-messages]');
    const errorText = (errorMsgEl ? errorMsgEl.innerText : container.innerText || '').trim();
    const labelEl = container.closest('.fb-form-element, .artdeco-form-element, div')?.querySelector('label');
    const labelText = labelEl ? labelEl.innerText.trim() : (input.name || input.id || 'Field');

    const tagName = input.tagName ? input.tagName.toUpperCase() : '';
    const inputType = (input.type || '').toLowerCase();
    let action = 'unknown';

    // 1. Radio Button healing
    if (inputType === 'radio') {
      const name = input.name;
      const radioGroup = name ? Array.from(document.querySelectorAll(\`input[type="radio"][name="\${name}"]\`)) : [input];
      const isChecked = radioGroup.some(r => r.checked);
      if (!isChecked) {
        // Find a positive answer ("Yes", "I Agree", or first option)
        let targetRadio = radioGroup.find(r => {
          const parentText = (r.closest('label, div')?.innerText || '').toLowerCase();
          return parentText.includes('yes') || parentText.includes('agree') || parentText.includes('authorized') || parentText.includes('eligible');
        }) || radioGroup[0];

        if (targetRadio) {
          targetRadio.checked = true;
          targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
          targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
          fixedFields.push(\`Radio '\${labelText}': Selected default authorized option\`);
          action = 'select_positive_radio';
        }
      }
    }

    // 2. Checkbox healing (Required consents / authorizations)
    else if (inputType === 'checkbox') {
      if (!input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        fixedFields.push(\`Checkbox '\${labelText}': Checked required consent\`);
        action = 'check_required_box';
      }
    }

    // 3. Dropdown / Select healing
    else if (tagName === 'SELECT' || input.getAttribute('role') === 'combobox' || input.classList.contains('artdeco-dropdown__trigger')) {
      if (tagName === 'SELECT') {
        const select = input;
        if (!select.value || select.value === '' || select.selectedIndex <= 0) {
          // Pick best valid option: prioritize Yes / Authorized / Bachelor's / or first non-placeholder option
          const options = Array.from(select.options);
          let targetOption = options.find(opt => /^(?:yes|authorized|citizen|bachelor|immediate|proficient|expert)/i.test((opt.text || opt.value).trim())) ||
                             options.find(opt => opt.value && opt.value !== '' && !/^(?:select|choose|--)/i.test(opt.text.trim()));
          if (targetOption) {
            targetOption.selected = true;
            select.selectedIndex = options.indexOf(targetOption);
            try {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
              if (setter) setter.call(select, targetOption.value);
              else select.value = targetOption.value;
            } catch {
              select.value = targetOption.value;
            }
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('blur', { bubbles: true }));
            fixedFields.push(\`Dropdown '\${labelText}': Selected '\${targetOption.text.trim()}'\`);
            action = 'select_first_option';
          }
        }
      }
    }

    // 4. Phone Number format healing
    else if (inputType === 'tel' || labelText.toLowerCase().includes('phone') || labelText.toLowerCase().includes('mobile')) {
      const currentVal = input.value || '';
      const digitsOnly = currentVal.replace(/\\D/g, '');
      if (digitsOnly.length >= 7 && digitsOnly !== currentVal) {
        input.value = digitsOnly;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        fixedFields.push(\`Phone '\${labelText}': Cleaned format to digits '\${digitsOnly}'\`);
        action = 'format_phone';
      }
    }

    // 5. Numeric / Experience healing
    else if (inputType === 'number' || errorText.toLowerCase().includes('number') || errorText.toLowerCase().includes('numeric') || errorText.toLowerCase().includes('valid decimal')) {
      const val = input.value || '';
      const numDigits = val.replace(/[^0-9.]/g, '');
      const fixedNum = numDigits || '1';
      input.value = fixedNum;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      fixedFields.push(\`Numeric '\${labelText}': Normalized to '\${fixedNum}'\`);
      action = 'fill_default_numeric';
    }

    // 6. Generic missing text healing
    else if (['INPUT', 'TEXTAREA'].includes(tagName)) {
      if (!input.value || input.value.trim() === '') {
        const fallbackValue = labelText.toLowerCase().includes('summary') || labelText.toLowerCase().includes('pitch') || labelText.toLowerCase().includes('why')
          ? 'Experienced professional eager to contribute high-impact technical expertise.'
          : 'N/A';
        input.value = fallbackValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        fixedFields.push(\`Text '\${labelText}': Injected default response\`);
        action = 'retype_value';
      }
    }

    diagnosedErrors.push({
      fieldId: input.id || '',
      name: input.name || '',
      type: inputType || tagName,
      label: labelText,
      errorMessage: errorText || 'Validation error detected',
      suggestedAction: action,
    });
  }

  // Remove error outline markers
  const remainingErrors = Array.from(document.querySelectorAll('[aria-invalid="true"], input:invalid')).length;

  return {
    healedCount: fixedFields.length,
    remainingErrors,
    fixedFields,
    diagnoses: diagnosedErrors,
  };
})();
`;

export class FormRecoveryAgent {
  /**
   * Diagnoses and self-heals in-DOM form validation errors when step advancement is blocked.
   */
  public static async executeSelfHealing(webview: any): Promise<SelfHealingResult> {
    try {
      if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { healedCount: 0, remainingErrors: 0, fixedFields: [], diagnoses: [] };
      }

      const result: SelfHealingResult = await webview.executeJavaScript(SCAN_AND_HEAL_FORM_SCRIPT);

      if (result && result.healedCount > 0) {
        liveTelemetry.emit({
          type: 'validate',
          title: `Self-Healed ${result.healedCount} Form Field${result.healedCount > 1 ? 's' : ''}`,
          detail: result.fixedFields.join(' | '),
          status: 'completed',
        });

        ProcessLogger.log({
          level: 'SUCCESS',
          source: 'Form Recovery Agent',
          message: `Self-healing resolved ${result.healedCount} validation errors`,
          detail: result.fixedFields.join('; '),
          metadata: {
            healedCount: result.healedCount,
            remainingErrors: result.remainingErrors,
            diagnoses: result.diagnoses,
          },
        });
      }

      return result || { healedCount: 0, remainingErrors: 0, fixedFields: [], diagnoses: [] };
    } catch (err) {
      console.warn('[FormRecoveryAgent] Execution exception:', err);
      return { healedCount: 0, remainingErrors: 0, fixedFields: [], diagnoses: [] };
    }
  }
}
