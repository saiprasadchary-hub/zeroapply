/** Commit an autocomplete suggestion; typing its label alone is not a selection. */
export function buildTypeaheadSelectionScript(selectors: string[], value: string): string {
  return `(async () => {
    try {
      const diagnostics = window.__zeroApplyTypeaheadDebug = { stage: 'finding-input' };
      const selectors = ${JSON.stringify(selectors)};
      const target = ${JSON.stringify(value)};
      const normalize = value => String(value || '').toLowerCase().replace(/\\s+/g, ' ').trim();
      const find = () => {
        for (const selector of selectors) { try { const el = document.querySelector(selector); if (el) return el; } catch {} }
        return null;
      };
      const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
      let input = find();
      if (!input || input.tagName !== 'INPUT') return false;
      const lists = () => {
        const current = find();
        if (!current) return [];
        const owned = (current.getAttribute('aria-controls') || current.getAttribute('aria-owns') || '').split(/\\s+/).filter(Boolean);
        if (owned.length) return owned.map(id => document.getElementById(id)).filter(visible);
        return Array.from(document.querySelectorAll('[role="listbox"]')).filter(list => visible(list)
          && list.getAttribute('aria-labelledby')?.split(/\\s+/).includes(current.id));
      };
      diagnostics.stage = 'opening-suggestions';
      input.focus();
      if (normalize(input.value) !== normalize(target) || !lists().length) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, target); else input.value = target;
        // React ignores same-value input events unless its tracked previous value changes.
        input._valueTracker?.setValue('');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const deadline = Date.now() + 5000;
      let selected = null;
      while (Date.now() < deadline) {
        const options = lists().flatMap(list => Array.from(list.querySelectorAll('[role="option"]')))
          .filter(option => visible(option) && option.getAttribute('aria-disabled') !== 'true' && !option.disabled);
        // Duplicate labels are common; pick one exact match, never an unrelated first option.
        selected = options.find(option => normalize(option.innerText || option.textContent) === normalize(target));
        if (selected) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!selected) { diagnostics.stage = 'no-matching-suggestion'; return false; }
      diagnostics.stage = 'clicking-suggestion';
      const clickable = selected.querySelector('button, [role="button"]') || selected;
      // Focusing a suggestion first can blur the input and destroy React's popup.
      // Move the visible cursor without moving focus, then activate the nested button once.
      if (window.__zeroapplyCursor?.moveToElement) {
        if (!await window.__zeroapplyCursor.moveToElement(clickable, 'Select location: ' + target)) return false;
      } else { clickable.scrollIntoView({ block: 'nearest' }); }
      if (!clickable.isConnected) return false;
      const rect = clickable.getBoundingClientRect();
      const event = { bubbles: true, cancelable: true, composed: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 };
      clickable.dispatchEvent(new PointerEvent('pointerdown', { ...event, buttons: 1 }));
      clickable.dispatchEvent(new MouseEvent('mousedown', { ...event, buttons: 1 }));
      clickable.dispatchEvent(new PointerEvent('pointerup', { ...event, buttons: 0 }));
      clickable.dispatchEvent(new MouseEvent('mouseup', { ...event, buttons: 0 }));
      clickable.click();
      // Some typeaheads commit through keyboard selection rather than their nested button.
      // Use only the index of the already-validated exact match, never a blind Enter.
      await new Promise(resolve => setTimeout(resolve, 300));
      input = find();
      if (input && lists().length) {
        const options = lists().flatMap(list => Array.from(list.querySelectorAll('[role="option"]'))).filter(visible);
        const targetIndex = options.findIndex(option => normalize(option.innerText || option.textContent) === normalize(target));
        const activeId = input.getAttribute('aria-activedescendant');
        const currentIndex = options.findIndex(option => option.id === activeId);
        if (targetIndex >= 0 && targetIndex < 20) {
          input.focus();
          const steps = targetIndex - currentIndex;
          const key = steps >= 0 ? 'ArrowDown' : 'ArrowUp';
          const keyCode = steps >= 0 ? 40 : 38;
          for (let i = 0; i < Math.abs(steps); i++) {
            input.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, keyCode, which: keyCode, bubbles: true, composed: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key, code: key, keyCode, which: keyCode, bubbles: true, composed: true }));
            await new Promise(resolve => setTimeout(resolve, 80));
          }
          const active = document.getElementById(input.getAttribute('aria-activedescendant') || '');
          if (!active || normalize(active.innerText || active.textContent) === normalize(target)) {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true }));
          }
        }
      }
      // Finish editing normally so widgets that retain the popup until blur can commit and validate.
      find()?.blur();
      // Input/change after selection would reopen the menu and undo a controlled selection.
      diagnostics.stage = 'selection-dispatched';
      return true;
    } catch (error) { window.__zeroApplyTypeaheadDebug = { stage: 'exception', error: String(error) }; return false; }
  })()`;
}

/** Run after the interaction script returns, allowing controlled UI updates to commit. */
export function buildTypeaheadVerificationScript(selectors: string[], value: string): string {
  return `(() => {
    const normalize = value => String(value || '').toLowerCase().replace(/\\s+/g, ' ').trim();
    for (const selector of ${JSON.stringify(selectors)}) {
      let input; try { input = document.querySelector(selector); } catch { continue; }
      if (!input || input.tagName !== 'INPUT') continue;
      if (normalize(input.value) !== normalize(${JSON.stringify(value)}) || input.getAttribute('aria-invalid') === 'true') return false;
      const owned = (input.getAttribute('aria-controls') || input.getAttribute('aria-owns') || '').split(/\\s+/).filter(Boolean);
      const menus = owned.map(id => document.getElementById(id)).filter(menu => menu && menu.getClientRects().length && getComputedStyle(menu).visibility !== 'hidden');
      return !menus.some(menu => Array.from(menu.querySelectorAll('[role="option"]')).some(option => option.getClientRects().length));
    }
    return false;
  })()`;
}
