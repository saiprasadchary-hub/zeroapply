import assert from 'node:assert/strict';
import {
  resolveGeographicDetailsSync,
  isNumericPostalCode,
  sanitizePostalCode,
} from '../src/agent/location/geoIntelligence';
import { classifySingleField, type ScannedField } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';
import type { PersonaData } from '../src/types';

console.log('=== UNIVERSAL GEOGRAPHIC INTELLIGENCE TEST SUITE ===');

// --- TEST 1: Knowledge Base Resolution for Indian Tech Hubs ---
console.log('--- TEST 1: Knowledge Base Resolution for Indian Tech Hubs ---');
const hydGeo = resolveGeographicDetailsSync('Hyderabad');
assert.equal(hydGeo.city, 'Hyderabad', 'City should be Hyderabad');
assert.equal(hydGeo.state, 'Telangana', 'State should be Telangana');
assert.equal(hydGeo.country, 'India', 'Country should be India');
assert.equal(hydGeo.postalCode, '500081', 'Postal code should be numeric PIN');
assert.ok(isNumericPostalCode(hydGeo.postalCode), 'Postal code must satisfy numeric validation');
console.log('✅ Hyderabad correctly resolved:', hydGeo);

const blrGeo = resolveGeographicDetailsSync('Bengaluru, Karnataka, India');
assert.equal(blrGeo.city, 'Bengaluru');
assert.equal(blrGeo.state, 'Karnataka');
assert.equal(blrGeo.country, 'India');
assert.equal(blrGeo.postalCode, '560001');
console.log('✅ Bengaluru correctly resolved:', blrGeo);

// --- TEST 2: US Tech Hub Resolution ---
console.log('--- TEST 2: US Tech Hub Resolution ---');
const sfGeo = resolveGeographicDetailsSync('San Francisco, CA');
assert.equal(sfGeo.city, 'San Francisco');
assert.equal(sfGeo.state, 'California');
assert.equal(sfGeo.country, 'United States');
assert.equal(sfGeo.postalCode, '94105');
console.log('✅ San Francisco correctly resolved:', sfGeo);

const austinGeo = resolveGeographicDetailsSync('Austin, TX');
assert.equal(austinGeo.city, 'Austin');
assert.equal(austinGeo.state, 'Texas');
assert.equal(austinGeo.country, 'United States');
assert.equal(austinGeo.postalCode, '78701');
console.log('✅ Austin correctly resolved:', austinGeo);

// --- TEST 3: Strict Postal Code Validation and Sanitization ---
console.log('--- TEST 3: Strict Postal Code Validation and Sanitization ---');
assert.equal(isNumericPostalCode('500081'), true, '500081 is a valid PIN code');
assert.equal(isNumericPostalCode('94105'), true, '94105 is a valid ZIP code');
assert.equal(isNumericPostalCode('Hyderabad'), false, '"Hyderabad" must NEVER be accepted as a postal code');
assert.equal(isNumericPostalCode('Texas'), false, '"Texas" must NEVER be accepted as a postal code');

// Test auto-sanitization
const sanitizedCity = sanitizePostalCode('Hyderabad', 'Hyderabad');
assert.equal(sanitizedCity, '500081', 'City name "Hyderabad" passed to postal code must sanitize to 500081');

const sanitizedEmbedded = sanitizePostalCode('Postal: 500032', 'Hyderabad');
assert.equal(sanitizedEmbedded, '500032', 'Embedded PIN in string must be cleanly extracted');
console.log('✅ Postal code validator correctly blocks text and extracts numeric PINs.');

// --- TEST 4: DOM Field Classification Binding ---
console.log('--- TEST 4: DOM Field Classification Binding ---');
const testPersona: PersonaData = {
  fullName: 'Sai Prasad Chary Kammari',
  location: 'Hyderabad',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: 'https://kspchary.dev',
  experienceYears: 4,
  minSalary: 25000,
  workPreference: 'On-site',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript'],
  targetRoles: ['AI Automation Engineer'],
  applyMode: 'easy',
  verified: true,
};

const stateField: ScannedField = {
  id: 'state-input',
  selector: '#state-input',
  tagName: 'input',
  inputType: 'text',
  label: 'State/Province',
  placeholder: 'Enter state',
  name: 'state',
  required: true,
  currentValue: '',
};

const classifiedState = classifySingleField(stateField, testPersona);
assert.equal(classifiedState.fieldType, 'state');
assert.equal(classifiedState.mappedValue, 'Telangana', 'State/Province field must map to Telangana, never Hyderabad');

const postalField: ScannedField = {
  id: 'postal-input',
  selector: '#postal-input',
  tagName: 'input',
  inputType: 'text',
  label: 'Zip/Postal Code',
  placeholder: 'Enter postal code',
  name: 'postalCode',
  required: true,
  currentValue: '',
};

const classifiedPostal = classifySingleField(postalField, testPersona);
assert.equal(classifiedPostal.fieldType, 'postal_code');
assert.equal(classifiedPostal.mappedValue, '500081', 'Zip/Postal Code field must map to 500081, never Hyderabad');

const countryField: ScannedField = {
  id: 'country-input',
  selector: '#country-input',
  tagName: 'input',
  inputType: 'text',
  label: 'Country',
  placeholder: 'Select country',
  name: 'country',
  required: true,
  currentValue: '',
};

const classifiedCountry = classifySingleField(countryField, testPersona);
assert.equal(classifiedCountry.fieldType, 'country');
assert.equal(classifiedCountry.mappedValue, 'India', 'Country field must map to India, never Hyderabad');

console.log('✅ DOM field classifier assigns exact distinct values:');
console.log(`   - State:   "${classifiedState.mappedValue}"`);
console.log(`   - Postal:  "${classifiedPostal.mappedValue}"`);
console.log(`   - Country: "${classifiedCountry.mappedValue}"`);

// --- TEST 5: Question Resolver End-to-End ---
console.log('--- TEST 5: Question Resolver End-to-End ---');
(async () => {
  // Seed memory bank
  questionMemory.clear();
  questionMemory.seedFromPersona(testPersona);

  const resCountry = await resolveQuestion(countryField, testPersona);
  assert.equal(resCountry.answer, 'India', 'QuestionResolver must answer Country as India');

  const resState = await resolveQuestion(stateField, testPersona);
  assert.equal(resState.answer, 'Telangana', 'QuestionResolver must answer State/Province as Telangana');

  const resPostal = await resolveQuestion(postalField, testPersona);
  assert.equal(resPostal.answer, '500081', 'QuestionResolver must answer Zip/Postal Code as 500081');

  console.log('✅ QuestionResolver cleanly answers geographic fields without cross-contamination!');
  console.log('🎉 ALL GEOGRAPHIC INTELLIGENCE TESTS PASSED!');
})();
