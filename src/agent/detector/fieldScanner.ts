/**
 * ZeroApply Detector - Field Scanner Bridge
 */

export interface ScannedField {
  id: string;
  elementSelector: string;
  type: string;
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  value: string;
  options?: string[];
  disabled?: boolean;
}

export const DOM_SCANNER_SCRIPT = `
(() => {
  const inputs = Array.from(document.querySelectorAll('input, select, textarea, [role="radio"], [role="checkbox"]'));
  return inputs.map((el, i) => {
    const ariaControls = el.getAttribute('aria-controls') || '';
    const ariaChecked = el.getAttribute('aria-checked') || '';
    return {
      id: el.id || 'field_' + i,
      elementSelector: el.id ? '#' + el.id : (el.name ? '[name="' + el.name + '"]' : 'input'),
      type: el.getAttribute('role') || el.type || 'text',
      label: el.getAttribute('aria-label') || el.name || '',
      name: el.name || '',
      placeholder: el.placeholder || '',
      required: el.required || el.getAttribute('aria-required') === 'true',
      value: ariaChecked || el.value || '',
      ariaControls,
    };
  });
})()
`;
