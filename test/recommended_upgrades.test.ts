import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { getScopedQuestionMemory } from '../src/agent/memory/scopedQuestionMemory';
import { resolveScreeningFact } from '../src/agent/localLlm/screeningFacts';
import { isValidTimeZone } from '../src/agent/localLlm/availabilityFacts';
import { beginInference, finishInference, getAgentHealth } from '../src/agent/telemetry/agentHealth';
import { executeSyntheticInteraction } from '../src/agent/domScanner/syntheticInteraction';
import type { PersonaData } from '../src/types';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string): string | null => storage.get(key) ?? null,
  setItem: (key: string, value: string): void => { storage.set(key, value); },
} });
const persona = { fullName: 'Fixture A', email: 'a@example.test', employmentStatus: 'fresher', location: 'Hyderabad, India', experienceYears: 0 } as PersonaData;
const context = { companyName: 'Fixture Company', jobTitle: 'Engineer', options: ['Yes', 'No'] };
getScopedQuestionMemory(persona, context).set('Exact question?', 'No', 'user');
assert.equal(getScopedQuestionMemory(persona, context).lookup('Exact question?').answer, 'No', 'Scoped answers survive a bank reload');
for (const [profile, scope] of [
  [{ ...persona, email: 'b@example.test' }, context],
  [{ ...persona, experienceYears: 2 }, context],
  [persona, { ...context, companyName: 'Other Company' }],
  [persona, { ...context, jobTitle: 'Other Role' }],
  [persona, { ...context, options: ['Yes, 20 hours', 'No'] }],
] as const) assert.equal(getScopedQuestionMemory(profile, scope).lookup('Exact question?').hit, false);
assert.equal(getScopedQuestionMemory(persona, context).lookup('Different exact question?').hit, false, 'No fuzzy transfer of differently worded screening questions');
getScopedQuestionMemory(persona).set('Exact question?', 'Yes', 'user');
assert.equal(getScopedQuestionMemory(persona).lookup('Exact question?').hit, false, 'Unknown company context disables persistent reuse');

const available = { ...persona, availability: { timeZone: 'Asia/Kolkata', start: '09:00', end: '17:00', nightShift: false, overlap: { pacific: true, india: false } } };
assert.equal(resolveScreeningFact('Can you overlap Pacific time zone hours?', available), 'Yes');
assert.equal(resolveScreeningFact('Can you overlap India time zone hours?', available), 'No');
assert.equal(resolveScreeningFact('Can you overlap Eastern time zone hours?', available), '');
assert.equal(resolveScreeningFact('Can you work a night shift?', available), 'No');
assert.equal(resolveScreeningFact('Preferred working hours?', available), '09:00–17:00 (Asia/Kolkata)');
assert.equal(isValidTimeZone('MadeUp/Zone'), false);
assert.equal(resolveScreeningFact('Preferred working hours?', { ...available, availability: { ...available.availability, timeZone: 'MadeUp/Zone' } }), '');
const older = beginInference('fixture', false);
const newer = beginInference('fixture', true);
finishInference(older, 'Older request timed out');
assert.equal(getAgentHealth().lastInference?.id, newer);
assert.equal(getAgentHealth().pendingRequests, 1);
finishInference(newer);
assert.equal(getAgentHealth().lastInference?.screenshotSent, true);
assert.equal(getAgentHealth().lastInference?.status, 'completed');
assert.equal(getAgentHealth().pendingRequests, 0);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.route('https://fixture.test/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Fixture</h1>' }));
  await page.goto('https://fixture.test/application/123');
  const view: WebviewTarget = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script) };
  await page.setContent('<button id="trigger" role="combobox" aria-controls="options">Choose</button><div id="options" role="listbox" hidden></div><div role="listbox"><div role="option">Wrong unrelated menu</div></div>');
  await page.evaluate(() => {
    const button = document.querySelector('#trigger')!;
    button.addEventListener('click', () => setTimeout(() => {
      const list = document.querySelector('#options')! as HTMLElement;
      list.hidden = false;
      list.innerHTML = '<div role="option">Wrong choice</div><div role="option">Exact choice</div>';
      list.querySelectorAll('[role="option"]').forEach(option => option.addEventListener('click', () => {
        button.textContent = option.textContent; list.hidden = true;
      }));
    }, 300));
  });
  assert.equal((await executeSyntheticInteraction(view, 'combobox', '#trigger', 'Exact choice')).success, true);
  assert.equal(await page.locator('#trigger').innerText(), 'Exact choice');

  // Exercise the production IndexedDB code in a real browser, then reload to prove durability.
  const bundled = await build({ stdin: { contents: `export * from './src/agent/tracker/submissionEvidenceStore';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'receiptStore', platform: 'browser' });
  const script = bundled.outputFiles[0].text;
  await page.addScriptTag({ content: script });
  const bundle = { id: 'fixture-receipt', capturedAt: new Date().toISOString(), applicant: { name: 'Fixture', email: 'fixture@example.test' }, jobUrl: 'https://fixture.test/application/123', jobId: '123', companyName: 'Fixture Company', jobTitle: 'Engineer', confirmationText: 'Your application was sent to Fixture Company!', answers: [{ question: 'Experience', answer: '0', source: 'verified form value' }], screenshot: 'fixture-image' };
  await page.evaluate(`receiptStore.saveSubmissionEvidence(${JSON.stringify(bundle)})`);
  await page.reload();
  await page.addScriptTag({ content: script });
  const saved = await page.evaluate('receiptStore.listSubmissionEvidence()') as typeof bundle[];
  assert.deepEqual(saved, [bundle]);
  await page.evaluate(`receiptStore.deleteSubmissionEvidence('fixture-receipt')`);
  assert.deepEqual(await page.evaluate('receiptStore.listSubmissionEvidence()'), []);
  // A Done button alone must never produce a proof bundle.
  await page.setContent('<dialog open><button>Done</button></dialog>');
  await assert.rejects(() => page.evaluate(`receiptStore.captureSubmissionEvidence({ executeJavaScript: code => Promise.resolve(eval(code)) }, ${JSON.stringify({ applicant: bundle.applicant, jobUrl: bundle.jobUrl, companyName: bundle.companyName, jobTitle: bundle.jobTitle, answers: [] })})`), /No visible application receipt/);
  console.log('Recommended upgrades passed: applicant/context memory isolation, explicit availability, concurrent health, shared dropdowns, durable proof/reload/delete and false receipt rejection.');
} finally { await browser.close(); }
