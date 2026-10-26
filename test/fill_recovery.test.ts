import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fillFieldWithRecovery } from '../src/agent/formFiller/fillRecovery';
import type { ClassifiedField } from '../src/agent/domScanner/fieldClassifier';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';
import type { PersonaData } from '../src/types';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<form><label for="salary-new">Expected salary</label><input id="salary-new" name="salary" required><label for="current">Current salary</label><input id="current" value="0"></form>');
  const view: WebviewTarget = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script) };
  const field = { id: 'salary-old', selector: '#salary-old', label: 'Expected salary', name: 'salary', inputType: 'text', tagName: 'input', required: true, currentValue: '', placeholder: '', fieldType: 'salary', standardKey: 'salary', confidence: 1 } as ClassifiedField;
  // Simulate a React remount between scanning and filling: the original ID has gone.
  const persona = { employmentStatus: 'fresher', expectedSalaryLpa: 7 } as PersonaData;
  assert.equal((await fillFieldWithRecovery(view, field, '700000', persona)).success, true);
  assert.equal(await page.locator('#salary-new').inputValue(), '700000');
  assert.equal(await page.locator('#current').inputValue(), '0', 'Recovery must not target a neighboring salary question');
  await page.locator('#salary-new').fill('');
  assert.equal((await fillFieldWithRecovery(view, field, '700000', persona, () => true)).success, false);
  assert.equal(await page.locator('#salary-new').inputValue(), '', 'Stop prevents recovery interactions');
  await page.locator('#salary-new').evaluate(element => element.setAttribute('aria-invalid', 'true'));
  assert.equal((await fillFieldWithRecovery(view, field, '700000', persona)).success, false, 'Persistent validation errors must not become a success');
  console.log('Browser recovery passed: remounted field, preserved expected salary, cancellation and persistent invalid state.');
} finally { await browser.close(); }
