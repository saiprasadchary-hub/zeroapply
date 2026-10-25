import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { advanceExactlyOneStep } from '../src/agent/navigation/manualStepNavigator';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const fixture = pathToFileURL(resolve('test/fixtures/manual-step.html')).href;
const view: WebviewTarget = { executeJavaScript: async <T>(code: string): Promise<T> => page.evaluate(code) as Promise<T> };
const load = async (query = ''): Promise<void> => { await page.goto(fixture + query); };
const counts = async (): Promise<{ step: string | undefined; clicks: string | undefined; submissions: string | undefined }> => page.evaluate(() => ({
  step: document.body.dataset.step, clicks: document.body.dataset.clickCount, submissions: document.body.dataset.submitCount,
}));
try {
  await load();
  const result = await advanceExactlyOneStep(view);
  assert.equal(result.advanced, true, result.message);
  assert.deepEqual(await counts(), { step: '2', clicks: '1', submissions: '0' });
  await page.waitForTimeout(500);
  assert.equal((await counts()).step, '2', 'No automatic second advance');
  assert.equal((await advanceExactlyOneStep(view)).advanced, true);
  assert.deepEqual(await counts(), { step: '3', clicks: '2', submissions: '0' });
  assert.equal((await advanceExactlyOneStep(view)).advanced, false, 'Next Step must not submit');
  assert.equal((await counts()).submissions, '0');

  await load('?delay=600');
  const rapid = await Promise.all([advanceExactlyOneStep(view), advanceExactlyOneStep(view), advanceExactlyOneStep(view)]);
  assert.equal(rapid.filter(result => result.advanced).length, 1);
  assert.equal((await counts()).clicks, '1', 'Rapid clicks do not queue additional transitions');

  for (const query of ['?disabled', '?required']) {
    await load(query);
    assert.equal((await advanceExactlyOneStep(view)).advanced, false);
    assert.equal((await counts()).clicks, '0', query);
  }
  await load('?validation');
  assert.equal((await advanceExactlyOneStep(view)).advanced, false);
  assert.equal((await counts()).clicks, '1', 'Validation does not trigger fallback clicks');

  await load('?silent');
  assert.equal((await advanceExactlyOneStep(view, 150)).advanced, false);
  assert.equal((await advanceExactlyOneStep(view, 150)).advanced, false);
  assert.equal((await counts()).clicks, '1', 'An uncertain transition cannot be clicked again');

  await load('?delay=700');
  assert.equal((await advanceExactlyOneStep(view, 150)).advanced, false);
  assert.equal((await advanceExactlyOneStep(view, 150)).advanced, false);
  await page.waitForTimeout(800);
  assert.equal((await counts()).step, '2');
  assert.equal((await counts()).clicks, '1', 'Delayed response does not cause a double advance');
  assert.equal((await advanceExactlyOneStep(view)).advanced, true);
  assert.equal((await counts()).step, '3');
  console.log('Real-browser one-step navigation passed: normal, repeated, rapid, disabled, required, validation, no-op, delayed, and final-submit cases.');
} finally { await browser.close(); }
