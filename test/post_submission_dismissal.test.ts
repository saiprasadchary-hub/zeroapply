import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { dismissSubmissionReceipt, type PostSubmissionDismissal } from '../src/agent/recovery/postSubmissionDismissal';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 650 } });
  const view: WebviewTarget = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script) };
  for (let job = 1; job <= 2; job++) {
    await page.setContent('<h1>Post-application test fixture</h1><div id="host"></div>');
    await page.evaluate((jobNumber: number) => {
      const root = document.querySelector('#host')!.attachShadow({ mode: 'open' });
      root.innerHTML = `<dialog open style="width:650px;height:350px;font:18px system-ui"><h2>Your application was sent to Fixture Company ${jobNumber}!</h2><p>Turn your resume into a profile that recruiters notice</p><div id="actions"></div></dialog>`;
      const state = window as unknown as { fixtureClicks: { notNow: number; update: number } };
      state.fixtureClicks = { notNow: 0, update: 0 };
      setTimeout(() => {
        root.querySelector('#actions')!.innerHTML = '<button id="not-now">Not now</button><button id="update">Update profile</button>';
        root.querySelector('#not-now')!.addEventListener('click', () => { state.fixtureClicks.notNow++; root.querySelector('dialog')!.close(); });
        root.querySelector('#update')!.addEventListener('click', () => { state.fixtureClicks.update++; });
      }, 650);
    }, job);
    const result: PostSubmissionDismissal = await dismissSubmissionReceipt(view);
    assert.equal(result.dismissed, true, `Receipt ${job}, including the final batch job, must close`);
    assert.deepEqual(await page.evaluate('window.fixtureClicks'), { notNow: 1, update: 0 });
    assert.equal((await dismissSubmissionReceipt(view)).clicked, false, 'Closed receipt must not be clicked again');
  }
  await page.setContent('<dialog open><h2>Contact information</h2><input required><button id="skip">Not now</button></dialog>');
  await page.evaluate(`window.skipClicks = 0; document.querySelector('#skip').onclick = () => window.skipClicks++;`);
  assert.equal((await dismissSubmissionReceipt(view)).clicked, false, 'An unfinished application must never be dismissed');
  assert.equal(await page.evaluate('window.skipClicks'), 0);
  await page.setContent('<dialog open style="width:600px;height:300px"><h2>Your application was sent to Fixture Company!</h2><button id="not-now">Not now</button><button id="update">Update profile</button></dialog>');
  await page.evaluate(`window.clicks = 0; document.querySelector('#not-now').onclick = () => window.clicks++;`);
  const unchanged = await dismissSubmissionReceipt(view);
  assert.equal(unchanged.dismissed, false);
  assert.equal(unchanged.clicked, true);
  assert.equal(await page.evaluate('window.clicks'), 1, 'No repeated click when the dialog fails to close');
  await page.evaluate(`document.querySelector('#not-now').onclick = () => document.querySelector('dialog').close();`);
  const closed = await dismissSubmissionReceipt(view);
  assert.equal(closed.dismissed, true);
  await mkdir('output/upgrades', { recursive: true });
  await page.screenshot({ path: 'output/upgrades/not-now-dismissed-fixture.png' });
  console.log('Post-submit dismissal passed: delayed shadow-DOM buttons, two consecutive/final-job receipts, visible cursor, no Update profile, no unfinished-form dismissal and no click loop.');
} finally { await browser.close(); }
