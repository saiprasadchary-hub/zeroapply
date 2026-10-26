import assert from 'node:assert/strict';
import { build, stop } from 'esbuild';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { validateInferenceExtras } from '../desktop/inference-policy.mjs';
import { answerSchema, validateStructuredAnswer } from '../src/agent/localLlm/structuredAnswer';
import { resolveFieldScreeningFact } from '../src/agent/localLlm/fieldAnswer';
import { checkpointFor, confirmRecoveryAnswers, newCheckpoint, saveCheckpoint } from '../src/agent/workflow/automationStore';
import { AutoApplyOrchestrator } from '../src/agent/workflow/orchestrator';
import { waitForControlReady } from '../src/agent/formFiller/controlReadiness';
import { joiningAvailabilityDays, validProfileDate } from '../src/agent/localLlm/availabilityFacts';
import { getQualityMetrics } from '../src/agent/telemetry/qualityMetrics';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';
import type { PersonaData } from '../src/types';

const persona = { fullName: 'Recovery Fixture', email: 'recovery@example.test', employmentStatus: 'fresher', experienceYears: 0, expectedSalaryLpa: 7, targetRoles: ['Engineer'], techStack: [], location: 'Hyderabad, India' } as PersonaData;
const field = { label: 'Preferred language', inputType: 'radio', options: ['Python', 'Java'] };
const response = { fieldId: 'language', status: 'answered', answer: 'Python', selectedOption: 'Python', evidence: ['Python'] };
assert.equal(answerSchema('language').type, 'object');
assert.equal(validateStructuredAnswer(JSON.stringify(response), 'language', field, 'Skills: Python').answer, 'Python');
for (const invalid of [
  { ...response, fieldId: 'another-field' }, { ...response, answer: 'JavaScript', selectedOption: 'JavaScript' },
  { ...response, evidence: ['Invented certificate'] }, { ...response, evidence: [] },
  { ...response, status: 'missing' },
]) assert.equal(validateStructuredAnswer(JSON.stringify(invalid), 'language', field, 'Skills: Python').answer, '');
assert.equal(validateStructuredAnswer('not json', 'language', field, 'Skills: Python').answer, '');
assert.throws(() => validateInferenceExtras({ images: ['YWJj'] }, false), /vision/);
assert.throws(() => validateInferenceExtras({ responseSchema: { type: 'object', $ref: 'https://attacker.test/schema' } }, true), /references/);
assert.throws(() => validateInferenceExtras({ images: ['invalid screenshot!'] }, true), /screenshot/);

const question = { label: 'How would you rate your Data Structures & Algorithms skills on a scale of 1–10?', inputType: 'text' };
const checkpoint = { ...newCheckpoint(persona, 'https://www.linkedin.com/jobs/view/77701/'), phase: 'blocked' as const, pending: [question] };
await saveCheckpoint(checkpoint);
await confirmRecoveryAnswers(checkpoint, persona, { [question.label]: '7' });
assert.equal(resolveFieldScreeningFact(question, persona), '7');
assert.equal(resolveFieldScreeningFact(question, { ...persona, expectedSalaryLpa: 9 }), '', 'Profile changes invalidate learned answers');
assert.equal(resolveFieldScreeningFact(question, { ...persona, email: 'other@example.test' }), '', 'Corrections cannot cross applicants');
assert.equal(resolveFieldScreeningFact({ ...question, inputType: 'radio', options: ['1', '2'] }, persona), '', 'A changed control or choices invalidates reuse');
const notice = { label: 'Are you currently serving your notice period?', inputType: 'radio', options: ['Yes', 'No'] };
assert.equal(resolveFieldScreeningFact(notice, { ...persona, employmentStatus: 'currently_working', noticeStatus: 'serving' }), 'Yes');
assert.equal(resolveFieldScreeningFact(notice, { ...persona, employmentStatus: 'currently_working', noticeStatus: 'relieved' }), 'No');
assert.equal(resolveFieldScreeningFact({ label: 'Are you serving notice, or already relieved?', inputType: 'radio', options: ['Yes, currently serving notice', 'No, already relieved'] }, { ...persona, employmentStatus: 'currently_working', noticeStatus: 'relieved' }), 'No, already relieved');
assert.equal(resolveFieldScreeningFact({ label: 'Have you already been relieved?', inputType: 'radio', options: ['Yes', 'No'] }, { ...persona, employmentStatus: 'currently_working', noticeStatus: 'relieved' }), 'Yes');
assert.equal(validProfileDate('2026-02-30'), undefined);
assert.equal(joiningAvailabilityDays({ ...persona, joiningDate: '2026-11-01' }, new Date('2026-10-26T08:00:00Z')), 6);
assert.equal(resolveFieldScreeningFact({ label: 'Can you join immediately?', inputType: 'radio', options: ['Yes', 'No'] }, { ...persona, joiningDate: '2099-01-01' }), 'No', 'Fresher does not override a saved future joining date');

const server = await chromium.launchServer({ channel: 'chrome', headless: true });
const browser = await chromium.connect(server.wsEndpoint());
try {
  const page = await browser.newPage();
  const ui = await build({ stdin: { resolveDir: process.cwd(), contents: `
    import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
    import {AutomationRecoveryPanel} from './src/components/AutomationRecoveryPanel';
    import {EmploymentDetails} from './src/components/EmploymentDetails';
    import {AutomationQuality} from './src/components/AutomationQuality';
    import {StorageHealthGuard} from './src/components/StorageHealthGuard';
    import {getSecureItem} from './src/services/secureStorage';
    window.failStorage=()=>{window.zeroApply={secureGet:()=>{throw new Error('wrong key');}};try{getSecureItem('unreadable');}catch{}};
    import {newCheckpoint,saveCheckpoint,learnedAnswer,checkpointFor} from './src/agent/workflow/automationStore';
    const persona=${JSON.stringify(persona)}; const question=${JSON.stringify(question)};
    const jobUrl='https://fixture.test/jobs/123';
    window.learned=()=>learnedAnswer(question,persona,jobUrl);
    window.savedCheckpoint=()=>checkpointFor(persona,jobUrl);
    window.resumeCount=0;
    function App(){ const [profile,setProfile]=useState({...persona,employmentStatus:'currently_working'});
      return React.createElement(StorageHealthGuard,null,React.createElement('main',null,
        React.createElement(AutomationRecoveryPanel,{persona,jobUrl,running:false,onResume:async()=>{window.resumeCount++;}}),
        React.createElement(EmploymentDetails,{persona:profile,onChange:patch=>setProfile(old=>({...old,...patch}))}),
        React.createElement(AutomationQuality))); }
    window.ready=(async()=>{ await saveCheckpoint({...newCheckpoint(persona,jobUrl),phase:'blocked',pending:[question],answers:[{question:'Python experience',answer:'0',source:'profile'}]});createRoot(document.getElementById('root')).render(React.createElement(App)); })();
  ` }, bundle: true, write: false, platform: 'browser', format: 'iife' });
  await page.route('https://fixture.test/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<div id="root"></div>' }));
  await page.goto('https://fixture.test/jobs/123');
  const cssFile = (await fs.readdir('dist/assets')).find(file => file.endsWith('.css'));
  if (cssFile) await page.addStyleTag({ content: await fs.readFile(`dist/assets/${cssFile}`, 'utf8') });
  await page.addScriptTag({ content: ui.outputFiles[0].text });
  await page.evaluate('window.ready');
  await page.getByLabel(question.label, { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Save answers & resume', exact: true }).click();
  assert.equal(await page.evaluate('window.resumeCount'), 1);
  assert.equal(await page.evaluate('window.learned()'), '7');
  await page.getByLabel('Notice status', { exact: true }).selectOption('serving');
  await page.getByLabel('Earliest joining date', { exact: true }).fill('2026-11-15');
  assert.equal(await page.getByLabel('Earliest joining date', { exact: true }).inputValue(), '2026-11-15');
  await fs.mkdir('output/upgrades', { recursive: true });
  await page.screenshot({ path: 'output/upgrades/production-recovery-preview.png', fullPage: true });
  await page.reload();
  await page.addScriptTag({ content: ui.outputFiles[0].text });
  await page.evaluate('window.ready');
  assert.equal(await page.evaluate('window.learned()'), '7', 'Confirmed corrections survive a real page reload');
  assert.equal((await page.evaluate('window.savedCheckpoint()') as { answers: unknown[] }).answers.length, 1, 'Verified progress survives reload');
  await page.evaluate('window.failStorage()');
  await page.getByRole('alert').getByRole('heading', { name: 'Saved data needs attention' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Save answers & resume', exact: true }).count(), 0, 'Storage failure removes automation controls');
  await page.route('https://www.linkedin.com/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<dialog open><h2>Additional Questions</h2><label for="python">How many years of work experience do you have with Python?</label><input id="python" required value="0"><label for="rating">How would you rate your Data Structures &amp; Algorithms skills on a scale of 1–10?</label><input id="rating" required><button id="review">Review</button></dialog>' }));
  await page.goto('https://www.linkedin.com/jobs/view/77704/');
  const resumedView: WebviewTarget = { executeJavaScript: <T>(code: string): Promise<T> => page.evaluate<T>(code) };
  await page.evaluate(`window.pythonWrites=0;window.submitClicks=0;document.querySelector('#python').addEventListener('input',()=>window.pythonWrites++);document.querySelector('#review').onclick=()=>{window.rating=document.querySelector('#rating').value;document.querySelector('dialog').innerHTML='<h2>Review your application</h2><button id="submit">Submit application</button>';document.querySelector('#submit').onclick=()=>window.submitClicks++;};`);
  await saveCheckpoint({ ...newCheckpoint(persona, page.url()), phase: 'blocked', answers: [{ question: 'How many years of work experience do you have with Python?', answer: '0', source: 'profile' }], pending: [question] });
  const resumed = await new AutoApplyOrchestrator().runApplication(resumedView, persona, { allowSubmit: false, stepDelayMs: 0, maxSteps: 2 });
  assert.match(resumed.error || '', /submission is disabled/);
  assert.equal(await page.evaluate('window.rating'), '7', 'Confirmed answers resume the actual workflow through Review');
  assert.equal(await page.evaluate('window.pythonWrites'), 0, 'Resume does not rewrite an unchanged verified answer');
  assert.equal(await page.evaluate('window.submitClicks'), 0);
  await page.setContent('<input id="answer"><div id="cover" style="position:fixed;inset:0;background:white"></div>');
  const view: WebviewTarget = { executeJavaScript: <T>(code: string): Promise<T> => page.evaluate<T>(code) };
  assert.equal(await waitForControlReady(view, ['#answer']), false, 'An overlay prevents interaction');
  await page.locator('#cover').evaluate(element => element.remove());
  assert.equal(await waitForControlReady(view, ['#answer']), true);
  await page.route('https://www.linkedin.com/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<dialog open><h2>Review application</h2><button id="submit">Submit application</button></dialog>' }));
  await page.goto('https://www.linkedin.com/jobs/view/77702/');
  await page.evaluate('window.clicks=0;document.querySelector("#submit").onclick=()=>window.clicks++;');
  const uncertain = { ...newCheckpoint(persona, page.url()), phase: 'uncertain' as const };
  await saveCheckpoint(uncertain);
  const priorUncertainCount = getQualityMetrics().uncertainApplications;
  const result = await new AutoApplyOrchestrator().runApplication(view, { ...persona, expectedSalaryLpa: 9 }, { allowSubmit: true, stepDelayMs: 0 });
  assert.match(result.error || '', /previous submission/);
  assert.equal(await page.evaluate('window.clicks'), 0, 'Uncertain submission cannot be repeated after a profile edit');
  assert.equal(checkpointFor(persona, page.url())?.phase, 'uncertain');
  assert.equal(getQualityMetrics().uncertainApplications, priorUncertainCount, 'Rechecking an uncertain submission does not count another submission');
  await saveCheckpoint({ ...uncertain, phase: 'submitting' });
  await new AutoApplyOrchestrator().runApplication(view, persona, { allowSubmit: true });
  assert.equal(checkpointFor(persona, page.url())?.phase, 'uncertain', 'An interrupted submitting checkpoint becomes an uncertainty lock');
  assert.equal(getQualityMetrics().uncertainApplications, priorUncertainCount + 1);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { zeroApply: { secureSet: async (): Promise<boolean> => false } } });
  try {
    await page.goto('https://www.linkedin.com/jobs/view/77703/');
    await page.evaluate('window.clicks=0;document.querySelector("#submit").onclick=()=>window.clicks++;');
    const failure = await new AutoApplyOrchestrator().runApplication(view, persona, { allowSubmit: true, stepDelayMs: 0 });
    assert.equal(failure.outcome, 'failed');
    assert.equal(await page.evaluate('window.clicks'), 0, 'A failed durable write must not allow submission');
  } finally { delete (globalThis as { window?: unknown }).window; }
  console.log('Production reliability passed: schema/evidence rejection, shared learned answers, employment facts, grouped recovery UI, durable reload, intercepted click prevention and uncertain-submit protection.');
} finally {
  try { await browser.close(); } finally { await server.kill(); stop(); }
}
