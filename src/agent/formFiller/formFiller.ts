import { selectTypeaheadOption } from './typeaheadSelection';
import { executeSyntheticInteraction } from '../domScanner/syntheticInteraction';
import { matchSelectOption } from './optionMatching';
import { OPTION_MATCHERS_SCRIPT } from './optionMatchingScript';
/**
 * ZeroApply Form Filler - Advanced Multi-Component Form Filler
 * Orchestrates synthetic event typing, selection, radio toggling, and dropzones
 * with realistic human stealth 3D visual purple cursor simulation.
 */

import type { ClassifiedField } from '../domScanner/fieldClassifier';
import type { WebviewTarget } from '../domScanner/injectedScanner';
import type { PersonaData } from '../../types';
import { buildSyntheticEventScript } from './syntheticEventDispatcher';
import {
  ensureVisualCursor,
  cursorMoveAndClick,
  cursorMoveAndType,
  cursorMoveAndSelect,
} from '../stealth/agentCursor';
import { attachResumeFile } from '../fileUpload/fileUploadBridge';
import { sanitizePostalCode } from '../location/geoIntelligence';
import { normalizePhoneForField } from '../autofill/humanSimulator';

export interface FieldFillResult {
  success: boolean;
  selector?: string;
  value?: string;
  error?: string;
}

export async function fillField(
  webview: WebviewTarget,
  field: ClassifiedField,
  value: string,
  _persona?: PersonaData
): Promise<FieldFillResult> {
  if (!webview || !field || value === undefined || value === null) {
    return { success: false, error: 'Invalid parameters' };
  }

  const selector = field.selector || (field.id ? (field.id.startsWith('#') || field.id.startsWith('[') ? field.id : `[id="${field.id.replace(/"/g, '\\"')}"]`) : '');
  if (!selector) return { success: false, error: 'Missing selector' };

  const allSelectors: string[] = [
    selector,
    ...(field.fallbackSelectors || []),
    field.id ? (field.id.startsWith('#') || field.id.startsWith('[') ? field.id : `[id="${field.id.replace(/"/g, '\\"')}"]`) : '',
    field.name ? `${field.tagName || 'input'}[name="${field.name.replace(/"/g, '\\"')}"]` : '',
  ].filter(Boolean) as string[];

  const hints = {
    id: field.id,
    name: field.name,
    label: field.label,
    placeholder: field.placeholder,
  };

  try {
    await ensureVisualCursor(webview);
    const inputType = (field.inputType || '').toLowerCase();
    const cleanLabel = field.label ? field.label.replace(/\s*\*.*$/, '').trim() : (value || 'Field');

    // Safety Guard: NEVER interact with global navigation, site header, job search bars, or job alert/newsletter widgets!
    const isSearchBarOrNav = await webview.executeJavaScript<boolean>(`
      (() => {
        try {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return false;
          if (el.closest('.jobs-search-box, .global-nav, header, nav, [role="search"], .search-global-typeahead, [data-view-name*="search-box"], .keywordsearch, .jobsearch, form[action*="jobalert"], .jobs-alert-form, .jobs-search-create-alert, [data-test-job-alert-modal], [class*="subscribe"], form[action*="alert"], .search-wrapper, .search-container, #search-wrapper, [class*="talentnetwork"], [class*="talent-community"], .searchfield')) {
            return true;
          }
          const text = ((el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '') + ' ' + (el.name || '') + ' ' + (el.id || '')).toLowerCase();
          if (/(?:receive|create|get)\\s*(?:an?\\s*)?job\\s*alert|job\\s*alert\\s*frequency|search\\s*by\\s*keyword|search\\s*by\\s*location|search\\s*by\\s*postal/i.test(text)) {
            return true;
          }
          return false;
        } catch(e) {
          return false;
        }
      })()
    `).catch(() => false);

    if (isSearchBarOrNav === true) {
      return { success: false, error: 'Target element is inside global navigation, job search bar, or job alert subscription widget' };
    }

    // Smoothly scroll target element into viewport center before interaction
    await webview.executeJavaScript(`
      (() => {
        try {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        } catch(e) {}
      })()
    `).catch(() => {});
    await new Promise((r) => setTimeout(r, 120));

    const isTypeahead = await webview.executeJavaScript<boolean>(`(() => {
      for (const selector of ${JSON.stringify(allSelectors)}) {
        try { const el = document.querySelector(selector);
          if (el?.tagName === 'INPUT' && (el.getAttribute('aria-autocomplete') === 'list' || el.getAttribute('data-testid') === 'typeahead-input')) return true;
        } catch {}
      }
      return false;
    })()`).catch(() => false);
    if (isTypeahead) {
      const selected = await selectTypeaheadOption(webview, allSelectors, value);
      return { success: selected, selector, value, error: selected ? undefined : 'Matching autocomplete suggestion was not selected and confirmed.' };
    }

    // 1. Radio Button Groups (Native Radios or Custom Radio Cards)
    if (inputType === 'radio' && field.isCustomComponent) {
      const result = await executeSyntheticInteraction(webview, 'radiogroup', selector, value);
      return { success: result.success, selector, value, error: result.error };
    }

    if (inputType === 'radio') {
      const radioClickScript = `
        (async () => {
          const __name = (fn) => fn;
          const { optionMatchScore } = ${OPTION_MATCHERS_SCRIPT};
          const rawVal = ${JSON.stringify(value || '')}.toLowerCase().trim();
          const targetOptions = ${JSON.stringify(field.options || [])};
          const fieldName = ${JSON.stringify(field.name || '')};
          const fieldLabel = ${JSON.stringify(field.label || '')}.toLowerCase().trim();
          const primarySel = ${JSON.stringify(selector || '')};
          const fallbackSels = ${JSON.stringify(field.fallbackSelectors || [])};

          // Helper: Safely query elements without syntax errors
          function safeQueryAll(sel, root = document) {
            if (!sel) return [];
            try { return Array.from(root.querySelectorAll(sel)); } catch(e) { return []; }
          }

          // Step 1: Find ALL candidate radios for THIS specific question
          let candidates = [];

          // Strategy A: By input name attribute
          if (fieldName) {
            candidates = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r =>
              r.name === fieldName || r.getAttribute('name') === fieldName
            );
          }

          // Strategy B: If fallbackSelectors were populated by scanner, include all of them
          if (fallbackSels.length > 0) {
            for (const s of fallbackSels) {
              const els = safeQueryAll(s);
              for (const e of els) {
                if (!candidates.includes(e)) candidates.push(e);
              }
            }
          }

          // Strategy C: Exact primary selector, and if it belongs to a container or group, expand to all group members
          if (primarySel) {
            const seed = safeQueryAll(primarySel);
            for (const s of seed) {
              if (s.name && candidates.length === 0) {
                const sameName = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => r.name === s.name);
                for (const r of sameName) {
                  if (!candidates.includes(r)) candidates.push(r);
                }
              }
              const container = s.closest('fieldset, [role="radiogroup"], .fb-form-element, .jobs-easy-apply-form-section, div[class*="radio"]');
              if (container) {
                const groupRadios = safeQueryAll('input[type="radio"], [role="radio"], [data-radix-radio-item]', container);
                for (const r of groupRadios) {
                  if (!candidates.includes(r)) candidates.push(r);
                }
              }
              if (!candidates.includes(s)) candidates.push(s);
            }
          }

          // Strategy D: By question container / fieldset matching question label
          if (candidates.length === 0 && fieldLabel) {
            const containers = safeQueryAll('fieldset, .fb-form-element, [role="radiogroup"], .jobs-easy-apply-form-section, div');
            const qContainer = containers.find(c => {
              const hasR = c.querySelector('input[type="radio"], [role="radio"]');
              if (!hasR) return false;
              const header = c.querySelector('legend, label, h3, p, span, [class*="title"], [class*="label"], [class*="header"]');
              const t = (header?.textContent || '').toLowerCase().trim();
              return t && (t.includes(fieldLabel.slice(0, 25)) || fieldLabel.includes(t.slice(0, 25)));
            });
            if (qContainer) {
              candidates = safeQueryAll('input[type="radio"], [role="radio"], [data-radix-radio-item]', qContainer);
            }
          }

          // Fallback E: All radios on the page if still empty
          if (candidates.length === 0) {
            candidates = safeQueryAll('input[type="radio"], [role="radio"], [data-radix-radio-item]');
          }

          // Exclude resume picker radios from generic questions
          candidates = candidates.filter(r => {
            const name = (r.name || r.id || '').toLowerCase();
            const aria = (r.getAttribute ? r.getAttribute('aria-label') : '').toLowerCase();
            if (name.includes('resume') || name.includes('jobs-resume-picker') || aria.includes('resume')) return false;
            if (typeof r.closest === 'function' && r.closest('.jobs-resume-picker, .jobs-document-upload, #resume-selector-list, .resume-list, [data-test-resume-item], [data-test-document-card]')) return false;
            return true;
          });

          if (candidates.length === 0) return false;

          // Step 2: Build option items with their text representations
          const optionItems = candidates.map(el => {
            let labelEl = el.closest('label');
            if (!labelEl && el.id) {
              try {
                if (window.CSS && CSS.escape) {
                  labelEl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
                } else {
                  labelEl = document.querySelector('label[for="' + el.id.replace(/(["\\:])+/g, '\\\\$1') + '"]');
                }
              } catch(e) {}
            }
            if (!labelEl && el.parentElement) {
              labelEl = el.parentElement.querySelector('label') || el.parentElement;
            }
            const text = (el.getAttribute('aria-label')?.trim() || el.getAttribute('data-value')?.trim() || labelEl?.textContent?.trim() || el.value || '').trim();
            const textLower = text.toLowerCase();
            return { element: el, labelEl, text, textLower };
          });

          let best = null;
          let bestScore = 0;
          for (const item of optionItems) {
            if (item.element.disabled || item.element.getAttribute('aria-disabled') === 'true') continue;
            const score = Math.max(optionMatchScore(rawVal, item.text), optionMatchScore(rawVal, item.element.value || ''));
            if (score > bestScore) { best = item; bestScore = score; }
          }
          if (!best) return false;

          const targetEl = best.element;
          const clickTarget = targetEl.getAttribute('role') === 'radio' ? targetEl : best.labelEl || targetEl;

          // Step 4: Visual cursor glide & click animation
          if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.moveToElement === 'function') {
            try {
              if (!await window.__zeroapplyCursor.moveToElement(clickTarget || targetEl, 'Select: ' + best.text.slice(0, 32))) return false;
            } catch(e) {}
          }

          // Step 5: Execute complete human & React-compatible click sequence
          try {
            if (typeof clickTarget.scrollIntoView === 'function') {
              clickTarget.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
          } catch(e) {}

          try { clickTarget.focus(); } catch(e) {}
          try { targetEl.focus(); } catch(e) {}

          // Native checked property setter for React & Ember controlled components
          if (targetEl.tagName === 'INPUT' && targetEl.type === 'radio') {
            const previousChecked = targetEl.checked;
            try {
              const nativeChecked = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
              if (nativeChecked) {
                nativeChecked.call(targetEl, true);
              } else {
                targetEl.checked = true;
              }
            } catch(e) {
              targetEl.checked = true;
            }
            try {
              const tracker = targetEl._valueTracker;
              if (tracker) {
                tracker.setValue(previousChecked);
              }
            } catch(e) {}
          }

          // Dispatch trusted pointer & mouse events on click target
          clickTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
          clickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          clickTarget.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
          clickTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          if (typeof clickTarget.click === 'function') {
            try { clickTarget.click(); } catch(e) {}
          } else {
            clickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          }

          // Also dispatch mouse events directly to target radio input if clickTarget !== targetEl
          if (clickTarget !== targetEl) {
            try { targetEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window })); } catch(e) {}
            try { targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window })); } catch(e) {}
            try {
              if (typeof targetEl.click === 'function') {
                targetEl.click();
              } else {
                targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              }
            } catch(e) {}
          }

          // Dispatch change & input events on both targetEl and clickTarget
          try { targetEl.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}
          try { targetEl.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
          if (clickTarget !== targetEl) {
            try { clickTarget.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}
            try { clickTarget.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
          }

          await new Promise(resolve => setTimeout(resolve, 180));
          return targetEl.tagName === 'INPUT' ? targetEl.checked === true : targetEl.getAttribute('aria-checked') === 'true';
        })()
      `;
      const clicked = await webview.executeJavaScript<boolean>(radioClickScript);
      return { success: Boolean(clicked), selector, value };
    }

    // 2. Custom Combobox & Dropdowns (Google Forms, Radix, Select2, React-Select, AntD, LinkedIn Typeahead)
    if (inputType === 'combobox' || (field.isCustomComponent && inputType !== 'select' && inputType !== 'checkbox' && inputType !== 'switch' && inputType !== 'radio' && inputType !== 'file')) {
      await cursorMoveAndClick(webview, selector, { label: `ZeroApply AI: Select ${cleanLabel}` });
      const selectResult = await webview.executeJavaScript<boolean>(`
        (async () => {
          const __name = (fn) => fn;
          const { isPlaceholderOption, optionMatchScore } = ${OPTION_MATCHERS_SCRIPT};
          const rawTarget = ${JSON.stringify(value || '')}.toLowerCase().trim();
          const cleanSelector = ${JSON.stringify(selector)};
          const allCandidateSelectors = ${JSON.stringify(allSelectors)};

          function findTrigger(sel) {
            if (!sel) return null;
            try {
              const el = document.querySelector(sel);
              if (el) return el;
            } catch(e) {}
            if (typeof sel === 'string' && sel.startsWith('#')) {
              const rawId = sel.slice(1);
              try {
                const byId = document.getElementById(rawId);
                if (byId) return byId;
              } catch(e) {}
              try {
                if (window.CSS && CSS.escape) {
                  const escaped = document.querySelector('#' + CSS.escape(rawId));
                  if (escaped) return escaped;
                }
              } catch(e) {}
            }
            return null;
          }

          let trigger = null;
          for (const s of [cleanSelector, ...allCandidateSelectors]) {
            trigger = findTrigger(s);
            if (trigger) break;
          }
          if (!trigger) return false;

          try {
            if (typeof trigger.focus === 'function') trigger.focus();
            if (typeof trigger.scrollIntoView === 'function') {
              trigger.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
          } catch(e) {}

          // If trigger is an input element, populate value and trigger input events to open typeahead results
          if (trigger.tagName && trigger.tagName.toLowerCase() === 'input' && rawTarget) {
            try {
              trigger.focus();
              const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (nativeValueSetter) nativeValueSetter.call(trigger, ${JSON.stringify(value || '')});
              else trigger.value = ${JSON.stringify(value || '')};
              trigger.dispatchEvent(new Event('input', { bubbles: true }));
              trigger.dispatchEvent(new Event('change', { bubbles: true }));
            } catch(e) {}
          }

          // Dispatch complete human click sequence to trigger dropdown popup
          trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
          trigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          trigger.click();

          // Fallback keydown / inner icon click if popup hasn't opened after 120ms
          setTimeout(() => {
            try {
              const inner = trigger.querySelector('.quantumWizMenuPaperselectDropDown, [role="presentation"], span') || trigger;
              inner.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
              trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            } catch(e) {}
          }, 120);

          const startTime = Date.now();
          let optionElements = [];

          while (Date.now() - startTime < 800) {
            const found = Array.from(document.querySelectorAll(
              '.basic-typeahead__selectable-list [role="option"], .basic-typeahead__selectable-list li, .exportSelectPopup [role="option"], .OA0qNb [role="option"], [role="listbox"] [role="option"], [role="listbox"] li, [role="option"], .select2-results__option, .react-select__option, [data-radix-collection-item], .quantumWizMenuPaperselectOption, .artdeco-typeahead__result-item, [data-test-typeahead-result], .typeahead-result, [data-automation-id*="promptOption"], [data-automation-id*="menuItem"], [role="menuitem"], .menu .item, div[class*="option"]'
            )).filter(o => {
              if (!o) return false;
              const r = o.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && o.getAttribute('aria-disabled') !== 'true';
            });

            if (found.length > 0) {
              optionElements = found;
              break;
            }
            await new Promise(r => setTimeout(r, 60));
          }

          if (optionElements.length === 0) {
            const container = trigger.closest('[role="listitem"], .Qr7Oae, .geS5n, [jsmodel], div');
            if (container) {
              optionElements = Array.from(container.querySelectorAll('[role="option"], .quantumWizMenuPaperselectOption'));
            }
          }

          if (optionElements.length === 0) return false;

          const validOptions = optionElements.filter(el => {
            const txt = (el.getAttribute('data-value') || el.textContent || '').trim().toLowerCase();
            return txt && !/^(choose|select|select an option|please select|--)$/i.test(txt);
          });

          const pool = validOptions.length > 0 ? validOptions : optionElements;

          let bestOption = null;
          let bestScore = 0;
          for (const optEl of pool) {
            if (optEl.disabled || optEl.getAttribute('aria-disabled') === 'true') continue;
            const text = (optEl.textContent || '').trim();
            if (isPlaceholderOption(text)) continue;
            const score = Math.max(optionMatchScore(rawTarget, text), optionMatchScore(rawTarget, optEl.getAttribute('data-value') || ''));
            if (score > bestScore) { bestScore = score; bestOption = optEl; }
          }
          if (!bestOption) return false;

          try {
            if (typeof bestOption.scrollIntoView === 'function') {
              bestOption.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
          } catch(e) {}

          bestOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          bestOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          bestOption.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
          bestOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          bestOption.click();

          // Also click any inner span / content element for Google Closure / Material ripple triggers
          try {
            const innerContent = bestOption.querySelector('.vRMGwf, .quantumWizMenuPaperselectContent, span, [class*="content"]');
            if (innerContent && innerContent !== bestOption) {
              innerContent.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
          } catch(e) {}

          // Notify trigger of value change
          try {
            trigger.dispatchEvent(new Event('change', { bubbles: true }));
            trigger.dispatchEvent(new Event('input', { bubbles: true }));
          } catch(e) {}

          return true;
        })()
      `).catch(() => false);

      await new Promise((r) => setTimeout(r, 350));
      return { success: Boolean(selectResult), selector, value };
    }

    // 3. Native Select Dropdown
    if (field.tagName === 'select' || inputType === 'select') {
      const selectVal = field.options?.length ? matchSelectOption(value, field.options) : value;
      if (!selectVal) return { success: false, selector, value, error: 'No dropdown option matches the supplied answer.' };
      await cursorMoveAndSelect(webview, selector, selectVal, { label: `ZeroApply AI: Select ${selectVal}` }).catch(() => false);
      const selected = await webview.executeJavaScript<boolean>(buildSyntheticEventScript(allSelectors, selectVal, 'select', hints)).catch(() => false);
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
      const verified = selected && await webview.executeJavaScript<boolean>(`(() => {
        const __name = (fn) => fn; // tsx adds function-name annotations in development.
        const { isPlaceholderOption, optionMatchScore } = ${OPTION_MATCHERS_SCRIPT};
        const el = ${JSON.stringify(allSelectors)}.map((s) => { try { return document.querySelector(s); } catch { return null; } }).find(Boolean);
        if (!el || el.tagName !== 'SELECT') return false;
        const option = el.options[el.selectedIndex];
        return Boolean(option && !option.disabled && option.value !== '' && !isPlaceholderOption(option.textContent || '')
          && Math.max(optionMatchScore(${JSON.stringify(selectVal)}, option.textContent || ''), optionMatchScore(${JSON.stringify(selectVal)}, option.value || '')) > 0);
      })()`).catch(() => false);
      return { success: Boolean(verified), selector, value: selectVal, error: verified ? undefined : 'Dropdown selection did not persist.' };
    }

    // 4. Checkbox / Switch
    if (inputType === 'checkbox' || inputType === 'switch') {
      if (field.fieldType === 'resume' || field.fieldType === 'resume_upload' || /resume|\.pdf|\.doc/i.test(field.label || '') || /resume|\.pdf|\.doc/i.test(field.name || '')) {
        return { success: true, selector, value };
      }
      const result = await executeSyntheticInteraction(webview, inputType, selector, value);
      return { success: result.success, selector, value, error: result.error };
    }

    // 5. File / Resume Upload Dropzone
    if (inputType === 'file') {
      const uploadRes = await attachResumeFile(webview, selector, cleanLabel || 'Candidate');
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 250));
      return { success: uploadRes.success, selector, value: uploadRes.fileName, error: uploadRes.success ? undefined : uploadRes.message };
    }

    // 6. Text, Tel, Email, Number, Textarea
    let finalValue = value;
    if (field.fieldType === 'postal_code' || /postal.*code|zip.*code|\bzip\b|\bpin\s*code|\bpin\b/i.test(field.label || field.name || '')) {
      finalValue = sanitizePostalCode(value);
    } else if (field.fieldType === 'phone' || inputType === 'tel' || /phone|mobile|cell|contact/i.test(field.label || field.name || '')) {
      const normalized = normalizePhoneForField(value, 10);
      if (normalized) {
        finalValue = normalized;
      } else {
        const rawDigits = (value || '').replace(/\D/g, '');
        finalValue = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
      }
    }

    await cursorMoveAndType(webview, selector, finalValue, { label: `ZeroApply AI: Fill ${cleanLabel}` });
    await webview.executeJavaScript(buildSyntheticEventScript(allSelectors, finalValue, inputType, hints)).catch(() => false);
    await new Promise((r) => setTimeout(r, 220 + Math.random() * 200));
    const verified = await webview.executeJavaScript<boolean>(`(() => {
      try {
        const roots = [document];
        for (let i = 0; i < roots.length; i++) {
          for (const node of roots[i].querySelectorAll('*')) if (node.shadowRoot) roots.push(node.shadowRoot);
          for (const candidate of ${JSON.stringify(allSelectors)}) {
            let el;
            try { el = roots[i].querySelector(candidate); } catch { continue; }
            if (!el || !('value' in el)) continue;
            return String(el.value).trim() === ${JSON.stringify(finalValue.trim())} && el.getAttribute('aria-invalid') !== 'true';
          }
        }
        return false;
      } catch { return false; }
    })()`).catch(() => false);
    return { success: verified, selector, value: finalValue, error: verified ? undefined : 'Text answer did not persist or is marked invalid.' };
  } catch (err) {
    console.error(`[FormFiller] Error filling field ${field.label}:`, err);
    return { success: false, selector, value, error: String(err) };
  }
}

