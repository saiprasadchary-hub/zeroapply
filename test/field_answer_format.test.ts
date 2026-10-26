import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { scanFormFields, type WebviewTarget } from '../src/agent/domScanner/injectedScanner';
import { auditFormFields } from '../src/agent/formFiller/formAuditor';
import { fillField } from '../src/agent/formFiller/formFiller';
import { parseAnswer } from '../src/agent/localLlm/answerParser';
import { formatFieldAnswer, resolveFieldScreeningFact } from '../src/agent/localLlm/fieldAnswer';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { resolveFormStepBatch, resolveQuestionCognitively } from '../src/agent/localLlm/ultraQuestionResolver';
import type { PersonaData } from '../src/types';

const persona = { fullName: 'Format Fixture', employmentStatus: 'fresher', experienceYears: 0, targetRoles: ['Engineer'], techStack: [], location: 'Hyderabad, India', expectedSalaryLpa: 7 } as PersonaData;
const label = 'Are you currently serving your notice period, or have you already been relieved from your current company?*';
for (const inputType of ['radio', 'select-one', 'combobox']) {
  const field = { label, inputType, options: ['Yes', 'No', 'Not applicable'] };
  assert.equal(resolveFieldScreeningFact(field, persona), 'Not applicable');
  assert.equal((await resolveQuestion(field, persona)).answer, 'Not applicable');
  assert.equal((await resolveQuestionCognitively(field, persona)).answer, 'Not applicable');
  const batch = await resolveFormStepBatch([{ ...field, id: 'status' }], persona);
  assert.equal(batch.get('status')?.answer, 'Not applicable');
  assert.equal(formatFieldAnswer('Immediately', field), '', 'Availability cannot answer employment status');
}
assert.equal(resolveFieldScreeningFact({ label, inputType: 'radio', options: ['Yes', 'No'] }, persona), 'No');
assert.equal(resolveFieldScreeningFact({ label, inputType: 'radio', options: ['Yes, serving notice', 'No, already relieved'] }, persona), '', 'Fresher must not be represented as already relieved');
assert.equal(resolveFieldScreeningFact({ label, inputType: 'text' }, persona), 'Not applicable');
assert.equal(resolveFieldScreeningFact({ label, inputType: 'radio', options: ['Yes', 'No'] }, { ...persona, employmentStatus: 'currently_working', noticePeriodDays: 0 }), '', 'Zero notice days does not establish notice status');
assert.equal(resolveFieldScreeningFact({ label, inputType: 'radio', options: ['Yes', 'No'] }, { ...persona, employmentStatus: 'currently_working', verifiedScreeningAnswers: { [label]: 'Yes' } }), 'Yes');
assert.equal(resolveFieldScreeningFact({ label: 'Notice period', inputType: 'radio', options: ['Immediately', '15 days', '30 days'] }, persona), 'Immediately');
assert.equal(resolveFieldScreeningFact({ label: 'Notice period in days', inputType: 'number' }, persona), '0');
assert.equal(formatFieldAnswer('Immediately', { label: 'When can you join?', inputType: 'text' }), 'Immediately');
assert.equal(formatFieldAnswer('Immediately', { label: 'When can you join?', inputType: 'radio', options: ['Immediate', '30 days'] }), 'Immediate');
assert.equal(formatFieldAnswer('Immediately', { label: 'When can you join?', inputType: 'radio', options: ['15 days', '30 days'] }), '');
assert.equal(formatFieldAnswer('Immediately', { label: 'When can you join?', inputType: 'radio', options: ['Not immediately', '30 days'] }), '', 'An opposite option must not win by substring');
assert.equal(formatFieldAnswer('Immediately', { label: 'When can you join?', inputType: 'radio' }), '', 'Unscanned choices cannot be guessed');
assert.equal(formatFieldAnswer('No', { label: 'A checkbox', inputType: 'checkbox' }), 'false');
assert.equal(resolveFieldScreeningFact({ label: 'Can you join immediately?', inputType: 'radio', options: ['Yes', 'No'] }, persona), 'Yes');
assert.equal(resolveFieldScreeningFact({ label: 'Can you join immediately?', inputType: 'radio', options: ['Yes', 'No'] }, { ...persona, employmentStatus: 'currently_working', noticePeriodDays: 30 }), 'No');
assert.equal(resolveFieldScreeningFact({ label: 'Can you join within 15 days?', inputType: 'radio', options: ['Yes', 'No'] }, { ...persona, employmentStatus: 'currently_working', noticePeriodDays: 30 }), 'No');
assert.equal(formatFieldAnswer('Seven lakhs', { label: 'Expected salary', inputType: 'number' }), '');
assert.equal(parseAnswer('2', { inputType: 'radio', options: ['1 year', '2 years'], validationError: 'Enter a whole number' }).answer, '2 years');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(`<dialog open><form><fieldset><legend>${label}</legend><label><input type="radio" name="status" value="yes">Yes</label><label><input type="radio" name="status" value="no">No</label><label><input type="radio" name="status" value="na">Not applicable</label></fieldset><label for="join">Notice period</label><select required id="join"><option value="">Select an option</option><option value="0">Immediately</option><option value="30">30 days</option></select><label for="days">Notice period in days</label><input required type="number" id="days"><label for="statusText">Are you currently serving notice?</label><input required id="statusText"><button type="button" id="next">Next</button></form></dialog>`);
  const view: WebviewTarget = { executeJavaScript: <T>(script: string): Promise<T> => page.evaluate<T>(script) };
  const fields = classifyFields(await scanFormFields(view), persona);
  const status = fields.find(field => field.inputType === 'radio');
  assert.ok(status, 'Scanner must detect radio question and choices');
  assert.equal((await fillField(view, status, 'Immediately', persona)).success, false);
  assert.equal(await page.locator('input[type=radio]:checked').count(), 0, 'Wrong-format answers must not click any choice');
  for (const field of fields) {
    if (!field.mappedValue) continue;
    assert.equal((await fillField(view, field, field.mappedValue, persona)).success, true, `${field.label}: ${field.mappedValue}`);
  }
  assert.equal(await page.locator('input[value=na]').isChecked(), true);
  assert.equal(await page.locator('#join').inputValue(), '0');
  assert.equal(await page.locator('#days').inputValue(), '0');
  assert.equal(await page.locator('#statusText').inputValue(), 'Not applicable');
  assert.equal((await auditFormFields(view)).ready, true);
  console.log('Field formats passed: real radio, dropdown, number and text controls; both AI resolvers and batch; wrong formats rejected without clicks.');
} finally { await browser.close(); }
