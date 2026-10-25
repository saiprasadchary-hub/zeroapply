import { parseAnswer } from '../src/agent/localLlm/answerParser';
import assert from 'node:assert/strict';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { resolveQuestionCognitively, resolveFormStepBatch, evaluateDisqualificationArmor } from '../src/agent/localLlm/ultraQuestionResolver';
import { classifyFields, type ScannedField } from '../src/agent/domScanner/fieldClassifier';
import type { PersonaData } from '../src/types';
const persona = { fullName: 'Regression Applicant', location: 'Hyderabad, India', employmentStatus: 'fresher', experienceYears: 0, minSalary: 0, techStack: [], resumeText: '', education: '', resumeChunks: {} } as PersonaData;
for (const label of ['Are you legally authorized to work in the United States?', 'Do you require visa sponsorship?', 'What is your GPA?', 'What year did you graduate?', 'Have you completed a bachelor degree?', 'Do you have a valid driving license?', 'Are you at least 18 years old?', 'Have you been convicted of a felony?']) {
  assert.equal((await resolveQuestion({ label, inputType: 'text' }, persona)).answer, '', label);
  assert.equal((await resolveQuestionCognitively({ label, inputType: 'text' }, persona)).answer, '', label);
  assert.equal(evaluateDisqualificationArmor(label, ['Yes', 'No']).guaranteedAnswer, undefined);
}
const field = { id: 'experience', selector: '#experience', label: 'Total years of experience', name: 'experience', inputType: 'number', tagName: 'input', placeholder: '', required: true, currentValue: '0', hasError: true, errorMessage: 'Enter a whole number greater than 3' } as ScannedField;
assert.equal(classifyFields([field], persona)[0].mappedValue, '0', 'Validation must never inflate experience');
assert.equal((await resolveQuestion({ ...field, validationError: field.errorMessage }, persona)).answer, '0');
const explicit = { ...persona, verifiedScreeningAnswers: { 'Are you legally authorized to work in the United States?': 'No' } };
assert.equal((await resolveQuestion({ label: 'Are you legally authorized to work in the United States?', options: ['Yes', 'No'] }, explicit)).answer, 'No');
assert.equal((await resolveQuestion({ label: 'Expected hourly rate in USD' }, persona)).answer, '', 'No invented currency rates');
console.log('Grounded screening regressions passed: both resolvers, unknown personal facts, exact user evidence and preserved experience.');

assert.equal(parseAnswer('0', { inputType: 'number', validationError: 'Enter a whole number greater than 3' }).answer, '0');
assert.equal(parseAnswer('0', { inputType: 'number', validationError: 'Enter a decimal greater than 3' }).answer, '0.0');
assert.equal(parseAnswer('12', { inputType: 'number', validationError: 'Maximum value is 5' }).answer, '12');
assert.equal(parseAnswer('unknown', { inputType: 'number', validationError: 'Enter a number greater than 3' }).answer, '');

const batch = await resolveFormStepBatch([{ id: 'sponsor', label: 'Do you require visa sponsorship?', options: ['Yes', 'No'] }], persona);
assert.equal(batch.get('sponsor')?.answer, '', 'Batch must obey the same evidence guard as single answers');
