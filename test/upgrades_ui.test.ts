import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const preview = await build({ stdin: { resolveDir: process.cwd(), contents: `
  import React, { useState } from 'react';
  import { createRoot } from 'react-dom/client';
  import { PersonaForm } from './src/components/PersonaForm';
  import { SubmissionEvidencePanel } from './src/components/SubmissionEvidencePanel';
  import { AgentHealthDetails } from './src/components/AgentHealthDetails';
  import { beginInference, finishInference } from './src/agent/telemetry/agentHealth';
  import { saveSubmissionEvidence } from './src/agent/tracker/submissionEvidenceStore';
  function Preview() {
    const [persona, setPersona] = useState({fullName:'Fixture Applicant', email:'fixture@example.test', phone:'', linkedIn:'', gitHub:'', portfolio:'', location:'Hyderabad, India', experienceYears:0, employmentStatus:'fresher', minSalary:0, workPreference:'Remote', tone:'Confident', techStack:[], targetRoles:['Engineer'], applyMode:'easy', verified:true});
    return React.createElement('main', {className:'max-w-4xl mx-auto p-6 space-y-6'}, React.createElement('h1',null,'Upgrade preview · test data'), React.createElement(AgentHealthDetails), React.createElement(SubmissionEvidencePanel), React.createElement(PersonaForm,{persona,setPersona,onSaveToast:()=>{}}));
  }
  const request = beginInference('Fixture vision model',true); finishInference(request);
  window.saveFixtureReceipt = saveSubmissionEvidence;
  createRoot(document.getElementById('root')).render(React.createElement(Preview));
` }, bundle: true, write: false, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.svg': 'dataurl' }, define: { 'import.meta.env': '{}' }, plugins: [{ name: 'vite-url-assets', setup(builder) {
  builder.onResolve({ filter: /\?url$/ }, () => ({ path: 'fixture-worker-url', namespace: 'fixture-asset' }));
  builder.onLoad({ filter: /.*/, namespace: 'fixture-asset' }, () => ({ contents: 'export default "fixture-worker-url";', loader: 'js' }));
} }] });
const assets = await fs.readdir('dist/assets').catch(() => [] as string[]);
const stylesheet = assets.find(file => file.startsWith('index-') && file.endsWith('.css'));
const css = stylesheet ? await fs.readFile(path.join('dist/assets', stylesheet), 'utf8') : '';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fixture.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
  await page.goto('https://fixture.test/upgrades');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: preview.outputFiles[0].text });
  await page.getByLabel('Local time zone', { exact: true }).fill('Asia/Kolkata');
  await page.getByLabel('Available from', { exact: true }).fill('09:00');
  await page.getByLabel('Available until', { exact: true }).fill('17:00');
  await page.getByLabel('pacific time overlap', { exact: true }).selectOption('false');
  await page.getByLabel('Night shifts', { exact: true }).selectOption('false');
  assert.equal(await page.getByLabel('pacific time overlap', { exact: true }).inputValue(), 'false');
  const output = path.resolve('output/upgrades');
  await fs.mkdir(output, { recursive: true });
  const availability = page.locator('fieldset').filter({ has: page.locator('legend', { hasText: 'Availability & working hours' }) });
  await availability.screenshot({ path: path.join(output, 'availability-settings.png') });
  await page.getByLabel('Local time zone', { exact: true }).fill('Invalid/Zone');
  assert.equal(await page.getByLabel('Local time zone', { exact: true }).getAttribute('aria-invalid'), 'true');
  await page.getByLabel('Local time zone', { exact: true }).fill('Asia/Kolkata');
  await page.getByText('AI activity', { exact: true }).click();
  assert.equal(await page.getByText('Screenshot sent with this request.', { exact: true }).isVisible(), true);
  await page.getByText('AI activity', { exact: true }).click();
  await page.evaluate(`window.saveFixtureReceipt({ id: 'ui-fixture', capturedAt: new Date().toISOString(), applicant: {name:'Fixture Applicant',email:'fixture@example.test'},jobUrl:'https://fixture.test/jobs/123', jobId:'123', companyName:'Fixture Company',jobTitle:'Engineer',confirmationText:'Your application was sent to Fixture Company! (test fixture)',answers:[{question:'Years of experience',answer:'0',source:'verified form value'}],screenshotError:'Screenshot omitted in this UI-only fixture.' })`);
  await page.getByText('Saved application proof (0)', { exact: true }).click();
  await page.getByRole('button', { name: 'Refresh receipts', exact: true }).click();
  await page.getByText(/Engineer · Fixture Company/).click();
  assert.equal(await page.getByText('Years of experience', { exact: true }).isVisible(), true);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download proof & answers', exact: true }).click();
  assert.match((await downloadPromise).suggestedFilename(), /application-receipt-ui-fixture.json/);
  await page.locator('details').filter({ has: page.locator('summary', { hasText: 'Saved application proof' }) }).first().screenshot({ path: path.join(output, 'saved-proof-preview.png') });
  assert.deepEqual(errors, [], 'Upgrade controls must render and interact without browser errors');
  console.log('Upgrade UI passed: availability edits, invalid zone feedback, screenshot delivery status, proof preview and downloadable answers.');
} finally { await browser.close(); }
