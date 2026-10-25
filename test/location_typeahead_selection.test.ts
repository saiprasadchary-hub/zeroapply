import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fillField } from '../src/agent/formFiller/formFiller';
import type { ClassifiedField } from '../src/agent/domScanner/fieldClassifier';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const target = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script) } as WebviewTarget;
  const field = { id: 'city', selector: '#city', label: 'Enter city or location', tagName: 'input', inputType: 'combobox', required: true, isCustomComponent: true, currentValue: '', confidence: 1 } as ClassifiedField;
  await page.setContent('<input id="city" aria-autocomplete="list" aria-owns="cities"><div id="cities" role="listbox" hidden></div>');
  await page.evaluate(() => {
    const input = document.querySelector('input')!;
    input.addEventListener('blur', () => { const list = document.querySelector('#cities')! as HTMLElement; list.hidden = true; list.replaceChildren(); });
    input.addEventListener('input', () => setTimeout(() => {
      const list = document.querySelector('#cities')! as HTMLElement;
      list.hidden = false;
      list.innerHTML = ['Wrong city', 'Hyderabad, Telangana, India', 'Hyderabad, Telangana, India'].map(text => `<div role="option" aria-selected="false"><button>${text}</button></div>`).join('');
      list.querySelectorAll('button').forEach(button => button.addEventListener('pointerup', () => {
        input.value = button.textContent!;
        input.dataset.selected = button.textContent!;
        setTimeout(() => { list.hidden = true; }, 2600);
      }));
    }, 1100));
  });
  assert.equal((await fillField(target, field, 'Hyderabad, Telangana, India')).success, true);
  assert.equal(await page.locator('#city').getAttribute('data-selected'), 'Hyderabad, Telangana, India');
  assert.equal(await page.locator('#cities').isVisible(), false, 'No synthetic input event may reopen selected menu');
  // Repeat with the same saved text; React-style tracking must still request suggestions.
  await page.evaluate(`(() => { const input = document.querySelector('input'); input._valueTracker = { setValue: v => { input.dataset.tracked = v; } }; })()`);
  assert.equal((await fillField(target, field, 'Hyderabad, Telangana, India')).success, true);
  assert.equal(await page.locator('#city').getAttribute('data-tracked'), '');
  await page.setContent('<input id="city" value="Hyderabad, Telangana, India" aria-autocomplete="list" aria-owns="cities"><div id="cities" role="listbox"><div role="option"><button>Wrong city</button></div></div>');
  assert.equal((await fillField(target, field, 'Hyderabad, Telangana, India')).success, false, 'Matching text alone must not pass selection');
  assert.equal(await page.locator('#cities').isVisible(), true);
  console.log('Location typeahead passed: delayed suggestions, nested button, duplicate exact labels, closed menu, unmatched suggestion rejected.');
} finally { await browser.close(); }
