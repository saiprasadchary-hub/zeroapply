export interface ScannedField {
  id: string;
  elementSelector: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'custom_dropdown' | 'signature';
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

  function cleanQuestionText(raw) {
    if (!raw) return '';
    let txt = String(raw).replace(/\\s+/g, ' ').trim();
    // Strip required asterisks, visually hidden badges, or trailing colons
    txt = txt.replace(/[\\n\\r]+/g, ' ')
             .replace(/[*]+/g, '')
             .replace(/\\s*\\(optional\\)\\s*$/i, '')
             .replace(/\\s*\\(required\\)\\s*$/i, '')
             .replace(/[:]\\s*$/, '')
             .trim();
    return txt;
  }

  function isGenericPlaceholder(txt) {
    if (!txt) return true;
    const lower = txt.toLowerCase().trim();
    return /^(?:select|please select|choose|--|select an option|select one|choose an option|select...|options)$/i.test(lower) || lower.length < 2;
  }

  function getLabelText(el) {
    let foundText = '';

    // 1. Direct label[for="id"]
    if (el.id) {
      const labelEl = root.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (labelEl) {
        const spanVisible = labelEl.querySelector('span[aria-hidden="true"]') || labelEl;
        foundText = cleanQuestionText(spanVisible.innerText || labelEl.innerText);
      }
    }

    // 2. aria-labelledby
    if (isGenericPlaceholder(foundText)) {
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const idList = labelledBy.split(/\\s+/);
        const lblTexts = idList.map(id => {
          const l = document.getElementById(id);
          return l ? l.innerText.trim() : '';
        }).filter(Boolean);
        if (lblTexts.length > 0) foundText = cleanQuestionText(lblTexts.join(' '));
      }
    }

    // 3. aria-label or title
    if (isGenericPlaceholder(foundText)) {
      const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('title');
      if (ariaLabel && !isGenericPlaceholder(ariaLabel)) {
        foundText = cleanQuestionText(ariaLabel);
      }
    }

    // 4. Closest label wrapper
    if (isGenericPlaceholder(foundText)) {
      const parentLabel = el.closest('label');
      if (parentLabel) {
        const span = parentLabel.querySelector('span[aria-hidden="true"], .fb-form-element-label__title--is-required, span') || parentLabel;
        foundText = cleanQuestionText(span.innerText);
      }
    }

    // 5. Parent form element container / LinkedIn fb-form-element
    if (isGenericPlaceholder(foundText)) {
      const parentBlock = el.closest('.fb-form-element, .artdeco-form-element, .jobs-easy-apply-form-section__grouping, .fb-dropdown, [class*="form-element"], .display-flex, .form-group');
      if (parentBlock) {
        const potentialQuestion = parentBlock.querySelector(
          '.fb-form-element-label, label span[aria-hidden="true"], label span, legend span, label, legend, .artdeco-dropdown__label, .fb-dropdown__label, .t-14.t-bold, [class*="label"]'
        );
        if (potentialQuestion) {
          foundText = cleanQuestionText(potentialQuestion.innerText);
        }
      }
    }

    if (!isGenericPlaceholder(foundText)) {
      return foundText;
    }

    return cleanQuestionText(el.placeholder || el.name || el.id || '');
  }

  function getRadioQuestionText(el) {
    const fieldset = el.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend span[aria-hidden="true"]') || fieldset.querySelector('legend');
      if (legend && legend.innerText.trim()) return cleanQuestionText(legend.innerText);
    }
    const rg = el.closest('[role="radiogroup"]');
    if (rg) {
      const id = rg.getAttribute('aria-labelledby');
      if (id) {
        const lbl = document.getElementById(id);
        if (lbl) return cleanQuestionText(lbl.innerText);
      }
      if (rg.getAttribute('aria-label')) return cleanQuestionText(rg.getAttribute('aria-label'));
    }
    // Fallback: Check parent blocks
    const parentBlock = el.closest('.fb-form-element, .jobs-easy-apply-form-section__grouping, .display-flex, .form-group, .ember-view');
    if (parentBlock) {
      const potentialQuestion = parentBlock.querySelector('label span[aria-hidden="true"], legend span, label, legend');
      if (potentialQuestion) return cleanQuestionText(potentialQuestion.innerText);
    }
    return cleanQuestionText(el.name || '');
  }

  const selector = 'input, textarea, select, canvas, [role="combobox"], [role="listbox"], button[aria-haspopup="listbox"], button[data-test-fb-dropdown-trigger], .artdeco-dropdown__trigger';
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
    else if (tag === 'canvas' || el.classList.contains('signature-pad') || /sign/i.test(el.id || el.className)) fieldType = 'signature';
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
      options = Array.from(el.options)
        .map(o => (o.text || o.value || '').trim())
        .filter(t => t && !isGenericPlaceholder(t));
    } else if (fieldType === 'custom_dropdown') {
      // Check for hidden select or sibling option elements
      const parentContainer = el.closest('.fb-dropdown, .artdeco-dropdown, [class*="dropdown"]') || el.parentElement;
      if (parentContainer) {
        const hiddenSelect = parentContainer.querySelector('select');
        if (hiddenSelect && hiddenSelect.options) {
          options = Array.from(hiddenSelect.options)
            .map(o => (o.text || o.value || '').trim())
            .filter(t => t && !isGenericPlaceholder(t));
        }
      }
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
