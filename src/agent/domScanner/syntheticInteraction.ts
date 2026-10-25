/**
 * ZeroApply Universal Synthetic Interaction Engine (Production Grade)
 * 
 * Provides high-fidelity, framework-compliant DOM automation:
 * 1. React 18 / Vue 3 / Angular native setter bypass with _valueTracker sync
 * 2. Full browser event cycle: pointerdown -> mousedown -> focus -> InputEvent('insertText') -> change -> blur
 * 3. Headless Portal Combobox Driver (Radix, MUI, React-Select, Ant Design)
 * 4. Custom Checkboxes, Toggle Switches, and Card Radios
 */

export interface InteractionResult {
  success: boolean;
  actionTaken: string;
  error?: string;
}

export const SYNTHETIC_INJECTION_SCRIPT = `
window.__zeroapplySynthetic = {
  // 1. Text Input & Textarea with Framework Setter Bypass
  async fillTextInput(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Element not found: ' + selector };

    try {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.focus({ preventScroll: true });

      const prevValue = el.value || '';
      const proto = el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      
      // Sync React _valueTracker
      const tracker = el._valueTracker;
      if (tracker) {
        tracker.setValue(prevValue);
      }

      if (nativeSetter) {
        nativeSetter.call(el, value);
      } else {
        el.value = value;
      }

      // Dispatch genuine InputEvent and standard events
      try {
        const inputEvt = new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType: 'insertText' });
        el.dispatchEvent(inputEvt);
      } catch (e) {
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }

      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));

      return { success: true, actionTaken: 'Filled text input with: ' + value };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  // 2. Select Dropdown option selection
  async selectOption(selector, desiredValue) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Select element not found: ' + selector };

    try {
      const options = Array.from(el.options || []);
      const target = desiredValue.toLowerCase().trim();
      let bestOption = options.find((o) => o.text.toLowerCase().trim() === target || o.value.toLowerCase().trim() === target);
      
      if (!bestOption) {
        bestOption = options.find((o) => o.text.toLowerCase().includes(target) || target.includes(o.text.toLowerCase()));
      }

      if (bestOption) {
        const prev = el.value;
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue(prev);

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(el, bestOption.value);
        } else {
          el.value = bestOption.value;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        return { success: true, actionTaken: 'Selected option: ' + bestOption.text };
      }
      return { success: false, error: 'Could not match option for: ' + desiredValue };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  // 3. Radio Group Selection
  async selectRadio(groupSelector, desiredValue) {
    try {
      const roots = Array.from(document.querySelectorAll(groupSelector));
      const radios = [...new Set(roots.flatMap(root =>
        root.matches('input[type="radio"], [role="radio"]')
          ? [root]
          : Array.from(root.querySelectorAll('input[type="radio"], [role="radio"]'))
      ))];
      if (radios.length === 0) return { success: false, error: 'No radios found for ' + groupSelector };
      const target = desiredValue.toLowerCase().trim();
      if (!target) return { success: false, error: 'No radio answer provided' };
      const getLabels = r => [
        r.getAttribute('aria-label'),
        r.getAttribute('data-value'),
        r.closest('label')?.innerText,
        r.id ? document.querySelector('label[for="' + CSS.escape(r.id) + '"]')?.innerText : '',
        r.value,
        r.textContent,
      ].filter(value => typeof value === 'string' && value.trim()).map(value => value.toLowerCase().trim());
      // Exact comparison prevents "Male" from matching "Female".
      const radio = radios.find(r => getLabels(r).includes(target));
      if (!radio) return { success: false, error: 'Could not match radio option for: ' + desiredValue };
      const isSelected = candidate => candidate.matches('input[type="radio"]')
        ? candidate.checked
        : candidate.getAttribute('aria-checked') === 'true' || candidate.getAttribute('data-state') === 'checked';
      if (!isSelected(radio)) {
        if (window.__zeroapplyCursor?.clickElement) {
          if (!await window.__zeroapplyCursor.clickElement(radio, 'Select: ' + desiredValue)) return { success: false, error: 'Radio click was blocked' };
        } else {
          radio.scrollIntoView({ behavior: 'auto', block: 'center' });
          radio.click();
        }
      }
      // Controlled forms may replace option nodes after selection. Verify current DOM nodes.
      let selected = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const currentRoots = Array.from(document.querySelectorAll(groupSelector));
        const currentRadios = currentRoots.flatMap(root => root.matches('input[type="radio"], [role="radio"]')
          ? [root] : Array.from(root.querySelectorAll('input[type="radio"], [role="radio"]')));
        selected = currentRadios.some(candidate => getLabels(candidate).includes(target) && isSelected(candidate));
        if (selected) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!selected) return { success: false, error: 'Radio selection was not confirmed: ' + desiredValue };
      return { success: true, actionTaken: 'Checked radio: ' + desiredValue };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  // 4. Custom Combobox & Portal Driver (Radix, MUI, React-Select, Ant Design)
  async fillTypeahead(selector, desiredValue) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Combobox not found: ' + selector };

    try {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      el.focus();
      el.click();

      // Wait 180ms for portal popup to mount
      await new Promise((r) => setTimeout(r, 180));

      const target = desiredValue.toLowerCase().trim();

      // Look for mounted options in portal or DOM
      function findActiveOptions() {
        const portal = document.querySelector(
          '[data-radix-popper-content-wrapper], [role="listbox"], .select__menu, .ant-select-dropdown:not(.ant-select-dropdown-hidden), .artdeco-typeahead__results'
        );
        const root = portal || document;
        return Array.from(root.querySelectorAll('[role="option"], .select__option, .typeahead-result, li[data-value], .ant-select-item-option-content'));
      }

      let options = findActiveOptions();

      // Try direct match from open menu
      let match = options.find((opt) => (opt.innerText || opt.textContent || '').toLowerCase().trim() === target);
      if (!match) {
        match = options.find((opt) => (opt.innerText || opt.textContent || '').toLowerCase().includes(target));
      }

      if (match) {
        match.scrollIntoView({ block: 'nearest' });
        match.click();
        return { success: true, actionTaken: 'Clicked combobox option: ' + (match.innerText || desiredValue) };
      }

      // If typing is required to filter options
      if (el.tagName === 'INPUT' || el.querySelector('input')) {
        const inputEl = el.tagName === 'INPUT' ? el : el.querySelector('input');
        const prefix = desiredValue.slice(0, Math.min(5, desiredValue.length));
        
        inputEl.value = prefix;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 280));

        options = findActiveOptions();
        match = options.find((opt) => (opt.innerText || opt.textContent || '').toLowerCase().includes(target)) || options[0];

        if (match) {
          match.click();
          return { success: true, actionTaken: 'Selected filtered option: ' + (match.innerText || desiredValue) };
        }
      }

      // Fallback: Dispatch full value and close
      if (el.tagName === 'INPUT') {
        el.value = desiredValue;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      return { success: true, actionTaken: 'Applied combobox value: ' + desiredValue };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  // 5. Checkbox & Switch Toggler
  async toggleCheckbox(selector, shouldCheck) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Checkbox not found: ' + selector };

    try {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return { success: false, error: 'Checkbox is disabled: ' + selector };
      const isInput = el.tagName === 'INPUT' && el.type === 'checkbox';
      const currentChecked = isInput ? el.checked : (el.getAttribute('aria-checked') === 'true' || el.getAttribute('data-state') === 'checked');

      if (currentChecked !== shouldCheck) {
        el.click();
        if (isInput) {
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 150));
      const active = document.querySelector(selector);
      const checked = active && (isInput ? active.checked : active.getAttribute('aria-checked') === 'true' || active.getAttribute('data-state') === 'checked');
      if (!active || checked !== shouldCheck) return { success: false, error: 'Checkbox selection did not persist: ' + selector };
      return { success: true, actionTaken: 'Set checkbox checked to: ' + shouldCheck };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  // 6. Multi-Select Checkbox Group Selector ("Select all that apply")
  async selectCheckboxGroup(groupSelector, desiredValues) {
    const group = document.querySelector(groupSelector) || document;
    const checkboxes = Array.from(group.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));
    if (checkboxes.length === 0) return { success: false, error: 'No checkboxes found in group: ' + groupSelector };

    try {
      const targets = (Array.isArray(desiredValues) ? desiredValues : String(desiredValues).split(/[,;]+/))
        .map((v) => String(v).toLowerCase().trim())
        .filter(Boolean);

      let count = 0;
      for (const cb of checkboxes) {
        const label = (
          cb.closest('label')?.innerText ||
          document.querySelector('label[for="' + CSS.escape(cb.id) + '"]')?.innerText ||
          cb.getAttribute('aria-label') ||
          cb.value ||
          ''
        ).toLowerCase().trim();

        const shouldCheck = targets.some((t) => label.includes(t) || t.includes(label));
        const isChecked = cb.checked || cb.getAttribute('aria-checked') === 'true';

        if (shouldCheck && !isChecked) {
          cb.click();
          cb.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
        }
      }
      return { success: true, actionTaken: 'Checked ' + count + ' items in multi-select checkbox group' };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  // 7. Humanized Keystroke Typing Pipeline (for masked inputs e.g. Phone, SSN, Date)
  async typeTextHumanized(selector, value, delayMs = 30) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: 'Element not found: ' + selector };

    try {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      el.focus();
      el.value = '';

      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        const keyInit = { key: char, bubbles: true, cancelable: true };
        el.dispatchEvent(new KeyboardEvent('keydown', keyInit));
        el.dispatchEvent(new KeyboardEvent('keypress', keyInit));
        el.value += char;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
        el.dispatchEvent(new KeyboardEvent('keyup', keyInit));
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }

      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      return { success: true, actionTaken: 'Humanized typed: ' + value };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
};
`;

export async function executeSyntheticInteraction(
  webview: any,
  widgetType: string,
  selector: string,
  value: string
): Promise<InteractionResult> {
  try {
    // Inject synthetic helper into webview context
    await webview.executeJavaScript(SYNTHETIC_INJECTION_SCRIPT + '\nvoid 0;');

    let script = '';
    const safeSelector = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    if (widgetType === 'select') {
      script = `window.__zeroapplySynthetic.selectOption('${safeSelector}', '${safeValue}')`;
    } else if (widgetType === 'radiogroup') {
      script = `window.__zeroapplySynthetic.selectRadio('${safeSelector}', '${safeValue}')`;
    } else if (widgetType === 'combobox') {
      script = `window.__zeroapplySynthetic.fillTypeahead('${safeSelector}', '${safeValue}')`;
    } else if (widgetType === 'checkboxgroup') {
      script = `window.__zeroapplySynthetic.selectCheckboxGroup('${safeSelector}', '${safeValue}')`;
    } else if (widgetType === 'checkbox' || widgetType === 'switch') {
      const isPositive = !/^(no|false|0|off|uncheck)$/i.test(value.trim());
      script = `window.__zeroapplySynthetic.toggleCheckbox('${safeSelector}', ${isPositive})`;
    } else {
      script = `window.__zeroapplySynthetic.fillTextInput('${safeSelector}', '${safeValue}')`;
    }

    const res = await webview.executeJavaScript(script);
    return res || { success: true, actionTaken: 'Executed interaction' };
  } catch (err: any) {
    return {
      success: false,
      actionTaken: 'Interaction failed',
      error: err?.message || String(err),
    };
  }
}
