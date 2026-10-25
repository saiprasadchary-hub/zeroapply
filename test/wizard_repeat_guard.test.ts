import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { stepNavigator } from '../src/agent/navigation/wizardStepNavigator';
import { STEP_TRANSITION_SCRIPT } from '../src/agent/navigation/stepTransition';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.route('https://www.linkedin.com/**', route => route.fulfill({ contentType: 'text/html', body: '<div role="button" style="width:500px;height:150px">Software Developer — Actively reviewing applicants</div><button>Next page</button><button>Easy Apply</button><p>This job search alert is on</p>' }));
  await page.goto('https://www.linkedin.com/jobs/search-results/');
  const view = { executeJavaScript: <T>(code: string): Promise<T> => page.evaluate(code) };
  assert.equal((await stepNavigator.detectForwardButton(view)).exists, false, 'Job card reviewing text and pagination must not be wizard actions');
  assert.equal((await stepNavigator.advance(view, 120)).success, false);
  const load = async (delay: number): Promise<void> => {
    await page.evaluate((delay) => {
      document.body.innerHTML = '<dialog style="width:600px;height:300px"><h2>Apply</h2><p>1/3 pages</p><label>Answer<input></label><button id="next">Next</button></dialog>';
      document.querySelector('dialog')!.showModal();
      document.body.dataset.clicks = '0';
      delete (window as unknown as Record<string, unknown>).__zeroApplyWizardTransition;
      document.querySelector('#next')!.addEventListener('click', () => {
        document.body.dataset.clicks = String(Number(document.body.dataset.clicks) + 1);
        if (delay >= 0) setTimeout(() => { document.querySelector('p')!.textContent = '2/3 pages'; }, delay);
      });
    }, delay);
  };
  const advance = async (timeout = 120): Promise<{clicked:boolean;stepChanged:boolean}> => page.evaluate(`(${STEP_TRANSITION_SCRIPT})('#next','Next',${timeout})`);
  await load(-1);
  assert.equal((await advance()).stepChanged, false);
  assert.equal((await advance()).clicked, false);
  assert.equal(await page.evaluate(() => document.body.dataset.clicks), '1', 'Unchanged form receives only one click');
  await page.locator('input').fill('Corrected answer');
  assert.equal((await advance()).clicked, true, 'A real answer change allows a controlled retry');
  await load(500);
  const results = await Promise.all([advance(), advance(), advance()]);
  assert.equal(results.filter(result => result.clicked).length, 1, 'Concurrent callers share the click lock');
  assert.equal((await advance()).clicked, false, 'Delayed transition must not receive another click');
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => document.body.dataset.clicks), '1');
  await load(100);
  assert.equal((await stepNavigator.advance(view, 1500)).stepChanged, true, 'Real step progression is detected');
  console.log('Repeat-click checks passed: search-page exclusion, no-op lock, changed answers, concurrent calls, delayed transitions, real progression.');
} finally { await browser.close(); }
