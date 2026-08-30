import assert from 'node:assert/strict';
import { classifyAllFields } from '../src/agent/detector/fieldClassifier';
import type { ScannedField } from '../src/agent/detector/fieldScanner';
import { mapPersonaToFields } from '../src/agent/autofill/personaMapper';
import { generateHumanBypassScript, normalizePhoneForField } from '../src/agent/autofill/humanSimulator';
import { STANDARD_FORM_VALIDATION_SCRIPT } from '../src/agent/All supported forms/scripts';
import type { PersonaData } from '../src/types';

assert.equal(normalizePhoneForField('+91 98765 43210', 10, '[6-9]{1}[0-9]{9}'), '9876543210');
assert.equal(normalizePhoneForField('91-98765-43210', 10, '[6-9]{1}[0-9]{9}'), '9876543210');
assert.equal(normalizePhoneForField('+1 (415) 555-0199', 10), '4155550199');
assert.equal(normalizePhoneForField('9876543210', 10), '9876543210');
assert.equal(normalizePhoneForField('+919876543210', 0, '[6-9]{1}[0-9]{9}'), '9876543210');

const fields: ScannedField[] = [
  { id: 'name', elementSelector: '#name', type: 'text', label: 'NAME', name: 'name', placeholder: 'Name', required: true, value: '' },
  { id: 'email', elementSelector: '#email', type: 'email', label: 'EMAIL', name: 'email', placeholder: 'Email', required: true, value: '' },
  { id: 'phone', elementSelector: '#phone', type: 'tel', label: 'PHONE NUMBER', name: 'phone', placeholder: 'Phone number', required: true, value: '' },
];
const classified = classifyAllFields(fields);
assert.deepEqual(classified.map((item) => item.category), ['fullName', 'email', 'phone']);

const persona: PersonaData = {
  fullName: 'Test Candidate',
  email: 'candidate@example.com',
  phone: '+91 98765 43210',
  location: 'Hyderabad, India',
  linkedIn: '',
  gitHub: '',
  portfolio: '',
  experienceYears: 1,
  minSalary: 5,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['TypeScript'],
  targetRoles: ['Software Intern'],
  applyMode: 'normal',
  applicationLimit: 1,
  verified: true,
};
const instructions = await mapPersonaToFields(classified, persona);
assert.deepEqual(instructions.map((instruction) => instruction.value), [
  'Test Candidate',
  'candidate@example.com',
  '+91 98765 43210',
]);

const fillScript = generateHumanBypassScript(JSON.stringify(instructions));
assert.match(fillScript, /setNativeValue\(element, typed\)/);
assert.match(fillScript, /Already correct:/);
assert.match(fillScript, /failedFields/);
assert.match(fillScript, /element\.maxLength/);
assert.doesNotThrow(() => new Function(fillScript));
assert.match(STANDARD_FORM_VALIDATION_SCRIPT, /checkValidity/);
assert.match(STANDARD_FORM_VALIDATION_SCRIPT, /validationMessage/);

console.log('Contact autofill accuracy tests passed (15/15).');
