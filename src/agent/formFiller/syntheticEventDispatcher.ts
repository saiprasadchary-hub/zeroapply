import { OPTION_MATCHERS_SCRIPT } from './optionMatchingScript';
/**
 * ZeroApply Form Filler - Advanced Synthetic Event Dispatcher
 * Injected script helpers ensuring full React/Vue/Angular synthetic event propagation:
 * pointerdown -> mousedown -> focus -> input -> change -> blur,
 * with comprehensive support for custom comboboxes, switches, and radio cards.
 */

export function buildSyntheticEventScript(
  selector: string | string[],
  value: string,
  inputType: string,
  fallbackHints?: { name?: string; id?: string; label?: string; placeholder?: string }
): string {
  return `
(async () => {
  try {
    const __name = (fn) => fn; // tsx adds function-name annotations in development.
    const { normalizeOption, isPlaceholderOption, optionPolarity, optionMatchScore } = ${OPTION_MATCHERS_SCRIPT};
    const targetSelectors = ${JSON.stringify(Array.isArray(selector) ? selector : [selector])};
    const hints = ${JSON.stringify(fallbackHints || {})};

    async function activate(target) {
      if (window.__zeroapplyCursor?.clickElement) {
        return await window.__zeroapplyCursor.clickElement(target, 'Select option');
      }
      target.click();
      return true;
    }

    function findTarget() {
      for (const sel of targetSelectors) {
        if (!sel) continue;
        try {
          const found = document.querySelector(sel);
          if (found) return found;
        } catch (e) {}

        if (sel.startsWith('#')) {
          const rawId = sel.slice(1);
          const byId = document.getElementById(rawId);
          if (byId) return byId;
          try {
            const byAttr = document.querySelector('[id="' + rawId.replace(/"/g, '\\\\"') + '"]');
            if (byAttr) return byAttr;
          } catch (e) {}
        }

        const idMatch = sel.match(/^\\[id="([^"]+)"\\]$/);
        if (idMatch) {
          const byId = document.getElementById(idMatch[1]);
          if (byId) return byId;
        }
      }

      if (hints.id) {
        const byId = document.getElementById(hints.id);
        if (byId) return byId;
      }
      if (hints.name) {
        try {
          const byName = document.querySelector('[name="' + hints.name.replace(/"/g, '\\\\"') + '"]');
          if (byName) return byName;
        } catch (e) {}
      }
      if (hints.placeholder) {
        try {
          const byPl = document.querySelector('[placeholder="' + hints.placeholder.replace(/"/g, '\\\\"') + '"]');
          if (byPl) return byPl;
        } catch (e) {}
      }
      if (hints.label) {
        const clean = hints.label.toLowerCase().slice(0, 30);
        const labels = Array.from(document.querySelectorAll('label, .fb-form-element-label, legend, span[class*="label"]'));
        for (const l of labels) {
          if ((l.textContent || '').toLowerCase().includes(clean)) {
            const container = l.closest('.fb-form-element, fieldset, .jobs-easy-apply-form-element, div');
            if (container) {
              const input = container.querySelector('input:not([type="hidden"]), select, textarea');
              if (input) return input;
            }
          }
        }
      }

      return null;
    }

    const el = findTarget();
    if (!el) return false;

    // Scroll element smoothly into view
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Pointerdown & Mousedown & Focus
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    if (typeof el.focus === 'function') el.focus();

    const typeStr = String(${JSON.stringify(inputType)} || '').toLowerCase();
    const targetVal = String(${JSON.stringify(value)} || '').trim();
    const targetLower = targetVal.toLowerCase();

    // 1. Radio Buttons (Native or Custom Card)
    if (typeStr === 'radio') {
      let targetRadio = el;
      if (el.tagName !== 'INPUT' || el.type !== 'radio') {
        const nestedRadios = Array.from(el.querySelectorAll('input[type="radio"], [role="radio"]'));
        if (nestedRadios.length > 0) {
          const match = nestedRadios.find(r => {
            const lbl = r.closest('label')?.textContent?.toLowerCase() || (r.id ? document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(r.id) : r.id) + '"]')?.textContent?.toLowerCase() : '') || (r.value || '').toLowerCase();
            return lbl && (lbl.includes(targetLower) || targetLower.includes(lbl));
          }) || nestedRadios[0];
          targetRadio = match;
        }
      }

      if (targetRadio.tagName === 'INPUT') {
        const previousChecked = targetRadio.checked;
        const nativeRadioSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
        if (nativeRadioSetter) nativeRadioSetter.call(targetRadio, true);
        else targetRadio.checked = true;

        const tracker = targetRadio._valueTracker;
        if (tracker) {
          tracker.setValue(previousChecked);
        }

        const lbl = (targetRadio.id ? document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(targetRadio.id) : targetRadio.id) + '"]') : null) || targetRadio.closest('label');
        const clickTarget = lbl || targetRadio;

        clickTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        clickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        clickTarget.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
        clickTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        try { if (!await activate(clickTarget)) return false; } catch(e) {}

        targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
        targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      // Custom radio item (e.g. div[role="radio"])
      targetRadio.setAttribute('aria-checked', 'true');
      targetRadio.setAttribute('data-state', 'checked');
      targetRadio.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      targetRadio.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      targetRadio.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      targetRadio.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      try { if (!await activate(targetRadio)) return false; } catch(e) {}
      targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
      targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // 2. Checkboxes & Switches (Native or Custom)
    if (typeStr === 'checkbox' || typeStr === 'switch') {
      const shouldBeChecked = !/^(no|false|0|off|skip|uncheck|unchecked)$/i.test(targetVal);
      if (el.tagName === 'INPUT') {
        const previousChecked = el.checked;
        if (el.checked !== shouldBeChecked) {
          const nativeCheckboxSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
          if (nativeCheckboxSetter) {
            nativeCheckboxSetter.call(el, shouldBeChecked);
          } else {
            el.checked = shouldBeChecked;
          }
          const tracker = el._valueTracker;
          if (tracker) {
            tracker.setValue(previousChecked);
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Safety: Verify state matches desired condition
        if (el.checked !== shouldBeChecked) {
          el.checked = shouldBeChecked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
      }

      // Custom Checkbox or Switch (div / label / button)
      function isCustomChecked(node) {
        if (!node) return false;
        if (node.getAttribute('aria-checked') === 'true' || node.getAttribute('data-state') === 'checked') return true;
        if (node.querySelector('svg') || node.querySelector('[data-icon*="check"]') || node.querySelector('.lucide-check')) return true;
        const box = node.querySelector('div[class*="border"], div[class*="rounded"], [class*="box"]') || node;
        const cls = (box.className && typeof box.className === 'string') ? box.className : '';
        if ((cls.includes('border-purple') || cls.includes('border-emerald') || cls.includes('border-indigo') || cls.includes('bg-purple') || cls.includes('bg-indigo') || cls.includes('bg-emerald') || cls.includes('bg-[#') || cls.includes('bg-')) && !cls.includes('bg-transparent') && !cls.includes('border-slate-300')) return true;
        return false;
      }

      const isCurrentChecked = isCustomChecked(el);
      if (isCurrentChecked !== shouldBeChecked) {
        el.setAttribute('aria-checked', shouldBeChecked ? 'true' : 'false');
        el.setAttribute('data-state', shouldBeChecked ? 'checked' : 'unchecked');
        const box = el.querySelector('div[class*="border"], div[class*="rounded"], [class*="box"]') || el;
        const clickOpts = { bubbles: true, cancelable: true, view: window };
        box.dispatchEvent(new PointerEvent('pointerdown', clickOpts));
        box.dispatchEvent(new MouseEvent('mousedown', clickOpts));
        box.dispatchEvent(new PointerEvent('pointerup', clickOpts));
        box.dispatchEvent(new MouseEvent('mouseup', clickOpts));
        if (typeof box.click === 'function') if (!await activate(box)) return false;
        if (box !== el && typeof el.click === 'function') {
          if (!await activate(el)) return false;
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    }

    // 3. Custom Comboboxes / Dropdowns ([role="combobox"], [data-baseweb="select"], .select2, .react-select)
    if (el.tagName !== 'SELECT' && (typeStr === 'combobox' || el.getAttribute('role') === 'combobox')) {
      // If inner input exists, set its value
      const innerInput = (typeof el.querySelector === 'function' ? el.querySelector('input') : null) || (el.tagName === 'INPUT' ? el : null);
      if (innerInput) {
        const previousVal = innerInput.value;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(innerInput, targetVal);
        else innerInput.value = targetVal;
        const tracker = innerInput._valueTracker;
        if (tracker) {
          tracker.setValue(previousVal);
        }
        innerInput.dispatchEvent(new Event('input', { bubbles: true }));
        innerInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Trigger click to expand dropdown options if applicable
      if (!await activate(el)) return false;

      // Wait for the listbox to appear (LinkedIn's React needs a frame to render)
      let listbox = document.querySelector('[role="listbox"], .select2-results, .react-select__menu, .basic-typeahead__selectable-list');
      if (!listbox) {
        await new Promise(r => setTimeout(r, 150));
        listbox = document.querySelector('[role="listbox"], .select2-results, .react-select__menu, .basic-typeahead__selectable-list');
      }
      if (!listbox) {
        await new Promise(r => setTimeout(r, 400));
        listbox = document.querySelector('[role="listbox"], .select2-results, .react-select__menu, .basic-typeahead__selectable-list');
      }

      if (listbox) {
        const options = Array.from(listbox.querySelectorAll('[role="option"], .select2-results__option, .react-select__option, li'))
          .filter(o => !o.disabled && o.getAttribute?.('aria-disabled') !== 'true' && !isPlaceholderOption(o.textContent || ''));
        let clicked = false;
        // Pass 1: exact / cross-language match
        for (const opt of options) {
          const optText = (opt.textContent || '').trim().toLowerCase();
          if (!opt.disabled && opt.getAttribute?.('aria-disabled') !== 'true' && optionMatchScore(targetVal, optText) > 0) {
            if (!await activate(opt)) return false;
            clicked = true;
            break;
          }
        }
        // Pass 2: if LLM said "Yes"/"No" try affirmative/negative
        if (!clicked) {
          const isAffirmative = /^(yes|true|agree|confirm|authorized|eligible)$/i.test(targetVal);
          const isNegative = /^(no|false|disagree|decline)$/i.test(targetVal);
          if (isAffirmative) {
            const aff = options.find(o => /^(yes|ja|sí|si|oui|sim|agree|confirm)$/i.test((o.textContent || '').trim()));
            if (aff) { if (!await activate(aff)) return false; clicked = true; }
          } else if (isNegative) {
            const neg = options.find(o => /^(no|nein|non|não)$/i.test((o.textContent || '').trim()));
            if (neg) { if (!await activate(neg)) return false; clicked = true; }
          }
        }
        return clicked;
      }
      return false;
    }

    // 4. Native HTML Select
    if (el.tagName === 'SELECT') {
      const previousValue = el.value;
      const nativeSelectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
      const opts = Array.from(el.options || []);
      let chosenOpt = null;
      let bestScore = 0;
      for (const opt of opts) {
        if (opt.disabled || opt.parentElement?.disabled || isPlaceholderOption(opt.textContent || '') || opt.value === '') continue;
        const score = Math.max(optionMatchScore(targetVal, opt.textContent || ''), optionMatchScore(targetVal, opt.value || ''));
        if (score > bestScore) { chosenOpt = opt; bestScore = score; }
      }
      if (!chosenOpt) return false;
      chosenOpt.selected = true;
      el.selectedIndex = opts.indexOf(chosenOpt);
      if (nativeSelectSetter) nativeSelectSetter.call(el, chosenOpt.value);
      else el.value = chosenOpt.value;
      const tracker = el._valueTracker;
      if (tracker) {
        tracker.setValue(previousValue);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      return el.value === chosenOpt.value && !isPlaceholderOption(el.options?.[el.selectedIndex]?.textContent || '');
    }


    // 5. Native Textarea
    if (el.tagName === 'TEXTAREA') {
      const previousValue = el.value;
      const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeTextareaSetter) nativeTextareaSetter.call(el, targetVal);
      else el.value = targetVal;
      const tracker = el._valueTracker;
      if (tracker) {
        tracker.setValue(previousValue);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      return true;
    }

    // 6. Native Text / Tel / Email / Number / Url Inputs
    const previousValue = el.value;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, targetVal);
    } else {
      el.value = targetVal;
    }
    const tracker = el._valueTracker;
    if (tracker) {
      tracker.setValue(previousValue);
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

    return true;
  } catch (err) {
    return false;
  }
})()
`;
}

