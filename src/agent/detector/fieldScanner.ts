export interface ScannedField {
  id: string;
  elementSelector: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'custom_dropdown';
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  options?: string[]; // For select, radio, or custom dropdowns
  value?: string;
}

/**
 * Client-side DOM Scanner Script string
 * Injected directly into webview or executed in page context to extract all actionable form fields.
 */
export const DOM_SCANNER_SCRIPT = `
(function scanFormFields() {
  const fields = [];
  const radioGroups = {};
  let fieldIdx = 0;

  function getLabelText(el) {
    if (el.id) {
      const labelEl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (labelEl && labelEl.innerText.trim()) return labelEl.innerText.trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.innerText.trim()) {
      return parentLabel.innerText.trim();
    }
    return el.placeholder || el.value || el.name || el.id || '';
  }

  function getRadioQuestionText(el) {
    const fieldset = el.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend && legend.innerText.trim()) return legend.innerText.trim();
    }
    const rg = el.closest('[role="radiogroup"]');
    if (rg) {
      const id = rg.getAttribute('aria-labelledby');
      if (id) {
        const lbl = document.getElementById(id);
        if (lbl) return lbl.innerText.trim();
      }
      if (rg.getAttribute('aria-label')) return rg.getAttribute('aria-label');
    }
    // Fallback: Check previous element or parent blocks
    const parentBlock = el.closest('.display-flex, .form-group, .ember-view');
    if (parentBlock) {
      const potentialQuestion = parentBlock.querySelector('label span, legend span, label, legend');
      if (potentialQuestion) return potentialQuestion.innerText.trim();
    }
    return el.name || '';
  }

  const selector = 'input, textarea, select, [role="combobox"], [role="listbox"]';
  const elements = document.querySelectorAll(selector);

  elements.forEach((el) => {
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.type === 'image') return;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      if (el.type !== 'file' && el.type !== 'radio' && el.type !== 'checkbox') return;
    }

    fieldIdx++;
    const id = el.id || ('za_field_' + fieldIdx);
    if (!el.id) el.id = id;

    const tag = el.tagName.toLowerCase();
    
    if (el.type === 'radio') {
      const name = el.name || el.getAttribute('name');
      if (name) {
        if (!radioGroups[name]) {
          const qText = getRadioQuestionText(el);
          radioGroups[name] = {
            id: 'group_' + name,
            elementSelector: 'input[type="radio"][name="' + CSS.escape(name) + '"]',
            type: 'radio',
            label: qText || name,
            name: name,
            placeholder: '',
            required: el.required || false,
            options: [],
            value: ''
          };
          fields.push(radioGroups[name]);
        }
        const optText = getLabelText(el);
        if (optText && !radioGroups[name].options.includes(optText)) {
          radioGroups[name].options.push(optText);
        }
        return; // Handled by group
      }
    }

    let fieldType = 'text';
    if (tag === 'textarea') fieldType = 'textarea';
    else if (tag === 'select') fieldType = 'select';
    else if (el.type === 'file') fieldType = 'file';
    else if (el.type === 'checkbox') fieldType = 'checkbox';
    else if (el.type === 'email') fieldType = 'email';
    else if (el.type === 'tel') fieldType = 'tel';
    else if (el.type === 'number') fieldType = 'number';
    else if (el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'listbox') {
      fieldType = 'custom_dropdown';
    }

    let options = [];
    if (tag === 'select') {
      options = Array.from(el.options).map(o => o.text.trim()).filter(Boolean);
    }

    fields.push({
      id: id,
      elementSelector: '#' + CSS.escape(id),
      type: fieldType,
      label: getLabelText(el),
      name: el.name || '',
      placeholder: el.placeholder || '',
      required: el.required || el.getAttribute('aria-required') === 'true',
      options: options,
      value: el.value || '',
    });
  });

  return fields;
})();
`;
