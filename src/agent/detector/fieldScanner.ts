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

  // 1. Identify active application modal container if open
  const isVisible = (el) => el && el.offsetParent !== null;
  const modals = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, .jobs-easy-apply-modal, .jobs-apply-form')).filter(isVisible);
  const root = modals.find(m => /easy apply|application|contact info|resume/i.test(String(m.innerText || ''))) || modals[0] || document.body;

  function getLabelText(el) {
    if (el.id) {
      const labelEl = root.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (labelEl && labelEl.innerText.trim()) return labelEl.innerText.trim();
    }
    const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('title');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const lblEl = document.getElementById(labelledBy);
      if (lblEl && lblEl.innerText.trim()) return lblEl.innerText.trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.innerText.trim()) {
      return parentLabel.innerText.trim();
    }
    const parentBlock = el.closest('.display-flex, .form-group, .ember-view, .jobs-easy-apply-form-section__grouping, .fb-dropdown, [class*="form-element"]');
    if (parentBlock) {
      const potentialQuestion = parentBlock.querySelector('label span, legend span, label, legend, .artdeco-dropdown__label, .fb-dropdown__label, [class*="label"]');
      if (potentialQuestion && potentialQuestion.innerText.trim()) return potentialQuestion.innerText.trim();
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

  const selector = 'input, textarea, select, [role="combobox"], [role="listbox"], button[aria-haspopup="listbox"], button[data-test-fb-dropdown-trigger], .artdeco-dropdown__trigger';
  const elements = Array.from(root.querySelectorAll(selector));

  elements.forEach((el) => {
    const isDropdownTrigger = el.getAttribute('role') === 'combobox' || el.getAttribute('aria-haspopup') === 'listbox' || el.classList.contains('artdeco-dropdown__trigger');
    if ((el.type === 'hidden' || el.type === 'submit' || el.type === 'image') && !isDropdownTrigger) return;
    if (el.type === 'button' && !isDropdownTrigger) return;
    
    // When scanning document root without modal, ignore global search boxes and result lists
    if (root === document.body) {
      if (el.closest('header, nav, .global-nav, .jobs-search-box, .search-basic-typeahead, .jobs-search-results-list, .scaffold-layout__list')) {
        return;
      }
    }

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      if (el.type !== 'file' && el.type !== 'radio' && el.type !== 'checkbox' && !isDropdownTrigger) return;
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
    else if (isDropdownTrigger || el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'listbox') {
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
