import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { AutoApplyOrchestrator } from '../src/agent/workflow/orchestrator';
import type { WebviewTarget } from '../src/agent/domScanner/injectedScanner';
import type { PersonaData } from '../src/types';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.route('https://www.linkedin.com/**', route => route.fulfill({ contentType: 'text/html', body: '<dialog open><h2>Apply to Fixture Company</h2><div role="alert" class="artdeco-inline-feedback--error">Fixture validation failed</div><button id="next">Next</button></dialog>' }));
  await page.goto('https://www.linkedin.com/jobs/view/123456/');
  await page.evaluate(`window.nextClicks = 0; document.querySelector('#next').addEventListener('click', () => window.nextClicks++);`);
  const target = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script), getURL: () => page.url() } as WebviewTarget;
  const result = await new AutoApplyOrchestrator().runApplication(target, { fullName: 'Fixture', location: 'Hyderabad, India', employmentStatus: 'fresher', experienceYears: 0, minSalary: 0, targetRoles: ['Engineer'], techStack: [] } as unknown as PersonaData, { maxSteps: 1, stepDelayMs: 0, allowSubmit: true });
  assert.notEqual(result.outcome, 'submitted');
  assert.equal(await page.evaluate('window.nextClicks'), 0, 'Unresolved audit must not dispatch Next');
  assert.match(result.error || '', /verification|verify|validation|Required answers/i);
  await page.setContent('<dialog open><h2>Review your application</h2><button id="submit">Submit application</button></dialog>');
  await page.evaluate(`window.submitClicks = 0; document.querySelector('#submit').addEventListener('click', () => window.submitClicks++);`);
  const review = await new AutoApplyOrchestrator().runApplication(target, { fullName: 'Fixture', location: 'Hyderabad, India', employmentStatus: 'fresher', experienceYears: 0, minSalary: 0, targetRoles: ['Engineer'], techStack: [] } as unknown as PersonaData, { maxSteps: 1, stepDelayMs: 0, allowSubmit: false });
  assert.equal(await page.evaluate('window.submitClicks'), 0, 'Review-only runs must never submit');
  assert.match(review.error || '', /submission is disabled/);
  await page.setContent('<dialog open><h2>Application</h2><button id="done">Done</button></dialog>');
  await page.evaluate(`window.doneClicks = 0; document.querySelector('#done').addEventListener('click', () => window.doneClicks++);`);
  const done = await new AutoApplyOrchestrator().runApplication(target, { fullName: 'Fixture', location: 'Hyderabad, India', employmentStatus: 'fresher', experienceYears: 0, minSalary: 0, targetRoles: ['Engineer'], techStack: [] } as unknown as PersonaData, { maxSteps: 1, stepDelayMs: 0, allowSubmit: true });
  assert.notEqual(done.outcome, 'submitted', 'A Done button without a receipt cannot count as a submitted application');
  assert.equal(await page.evaluate('window.doneClicks'), 0);
  console.log('Audit and submission gates passed: unresolved validation and review-only runs dispatch no forward click.');
} finally { await browser.close(); }
