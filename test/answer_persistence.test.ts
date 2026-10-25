import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { executeSyntheticInteraction } from '../src/agent/domScanner/syntheticInteraction';
import { fillField } from '../src/agent/formFiller/formFiller';
import { auditFormFields } from '../src/agent/formFiller/formAuditor';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';
import type { ClassifiedField } from '../src/agent/domScanner/fieldClassifier';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<label>Expected salary<input id="salary" type="text"></label>');
  const target = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script) } as WebviewTarget;
  const field = { id: 'salary', selector: '#salary', label: 'Expected salary', tagName: 'input', inputType: 'text', fieldType: 'salary', confidence: 1, standardKey: 'salary', required: true, currentValue: '', name: 'salary', placeholder: '' } as ClassifiedField;
  assert.equal((await fillField(target, field, '600000')).success, true);
  await page.evaluate(() => document.querySelector('input')!.addEventListener('input', () => { document.querySelector('input')!.value = ''; }));
  assert.equal((await fillField(target, field, '700000')).success, false, 'Rejected text must never be reported as filled');
  await page.setContent('<div id="choices"><button role="radio" aria-checked="false">No</button></div>');
  await page.evaluate(() => document.querySelector('button')!.addEventListener('click', () => {
    document.querySelector('#choices')!.innerHTML = '<button role="radio" aria-checked="true">No</button>';
  }));
  assert.equal((await executeSyntheticInteraction(target, 'radiogroup', '#choices', 'No')).success, true, 'Replaced radio nodes must be verified from current DOM');
  const failedTarget = { executeJavaScript: async (): Promise<never> => { throw new Error('Frame detached'); } } as WebviewTarget;
  assert.equal((await auditFormFields(failedTarget)).ready, false, 'Unavailable form must never pass audit');
  console.log('Answer persistence checks passed: saved text, rejected text, failed audit.');
} finally { await browser.close(); }
