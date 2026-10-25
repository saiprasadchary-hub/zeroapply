import assert from 'node:assert/strict';
import type { PersonaData } from '../src/types';
import { classifySingleField, classifyFields, type ScannedField } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { resolveCompensationAnswer } from '../src/agent/localLlm/ultraQuestionResolver';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';

console.log('=== TEST: CTC INR & Salary Validation Healing Verification ===\n');

const mockPersona: PersonaData = {
  fullName: 'Sai Prasad Chary',
  email: 'sai@example.com',
  phone: '+91 9876543210',
  location: 'Hyderabad, India',
  experienceYears: 2,
  minSalary: 8, // 8 LPA = ₹8,00,000 INR
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'Django'],
  targetRoles: ['Python Developer', 'Software Engineer'],
  applyMode: 'easy',
  verified: true,
  linkedIn: 'https://linkedin.com/in/saiprasad',
  gitHub: 'https://github.com/saiprasad',
  portfolio: 'https://sai.dev',
};

// -----------------------------------------------------------------------------
// TEST 1: classifySingleField maps INR CTC fields directly to full INR numbers
// -----------------------------------------------------------------------------
console.log('--- TEST 1: classifySingleField maps "Current CTC in INR" to 800000 ---');
const currentCtcField: ScannedField = {
  id: 'current-ctc',
  selector: '#current-ctc',
  tagName: 'input',
  inputType: 'text',
  label: 'Please enter your current ctc in INR*',
  placeholder: '',
  name: 'currentCtc',
  required: true,
  currentValue: '',
  helperText: 'Please enter your expected annual compensation in INR. Example: 350000',
};

const classifiedCurrent = classifySingleField(currentCtcField, mockPersona);
assert.equal(classifiedCurrent.fieldType, 'salary', 'Field type must be salary');
assert.equal(classifiedCurrent.mappedValue, '800000', 'Current CTC in INR must map 8 LPA to 800000');
console.log('✅ Current CTC in INR mapped to 800000 successfully.');

console.log('--- TEST 2: classifySingleField maps "Expected CTC in INR" to 800000 ---');
const expectedCtcField: ScannedField = {
  id: 'expected-ctc',
  selector: '#expected-ctc',
  tagName: 'input',
  inputType: 'text',
  label: 'Please enter your expected ctc in INR*',
  placeholder: '',
  name: 'expectedCtc',
  required: true,
  currentValue: '',
};

const classifiedExpected = classifySingleField(expectedCtcField, mockPersona);
assert.equal(classifiedExpected.fieldType, 'salary', 'Field type must be salary');
assert.equal(classifiedExpected.mappedValue, '800000', 'Expected CTC in INR must map 8 LPA to 800000');
console.log('✅ Expected CTC in INR mapped to 800000 successfully.');

// -----------------------------------------------------------------------------
// TEST 3: Fields explicitly asking for LPA keep the raw LPA number
// -----------------------------------------------------------------------------
console.log('--- TEST 3: classifySingleField keeps raw LPA when explicitly requested ---');
const lpaField: ScannedField = {
  id: 'expected-lpa',
  selector: '#expected-lpa',
  tagName: 'input',
  inputType: 'text',
  label: 'What is your expected salary (in LPA)?',
  placeholder: '',
  name: 'expectedLpa',
  required: true,
  currentValue: '',
};

const classifiedLpa = classifySingleField(lpaField, mockPersona);
assert.equal(classifiedLpa.mappedValue, '8', 'Explicit LPA request must keep 8');
console.log('✅ Explicit LPA field preserved 8 successfully.');

// -----------------------------------------------------------------------------
// TEST 4: classifyFields heals invalid mappedValue when error constraint active
// -----------------------------------------------------------------------------
console.log('--- TEST 4: classifyFields heals "Enter a whole number larger than 100" ---');
const faultyField: ScannedField = {
  id: 'failing-ctc',
  selector: '#failing-ctc',
  tagName: 'input',
  inputType: 'text',
  label: 'Please enter your current ctc in INR*',
  placeholder: '',
  name: 'ctc',
  required: true,
  currentValue: '8',
  errorMessage: 'Enter a whole number larger than 100',
  hasError: true,
};

const healedList = classifyFields([faultyField], mockPersona);
assert.equal(healedList.length, 1);
assert.equal(healedList[0].mappedValue, '800000', 'classifyFields must heal "8" to "800000" under error condition');
console.log('✅ classifyFields healed single-digit CTC under "larger than 100" constraint to 800000.');

// -----------------------------------------------------------------------------
// TEST 5: resolveQuestion resolves error constraint with helper text
// -----------------------------------------------------------------------------
console.log('--- TEST 5: resolveQuestion resolves whole number error constraint ---');
const resolved = await resolveQuestion({
  label: 'Please enter your current ctc in INR*',
  validationError: 'Enter a whole number larger than 100',
  helperText: 'Please enter your expected annual compensation in INR. Example: 350000',
  hasError: true,
}, mockPersona);

assert.equal(resolved.answer, '800000', 'resolveQuestion must resolve to 800000');
console.log('✅ resolveQuestion resolved to 800000 under active error constraint.');

// -----------------------------------------------------------------------------
// TEST 6: QuestionMemoryBank poisoning self-healing
// -----------------------------------------------------------------------------
console.log('--- TEST 6: Question Memory Bank auto-corrects stale single-digit LPA answers ---');
const poisonedKey = 'Please enter your current ctc in INR';
// Simulate historical poisoned entry
questionMemory.set(poisonedKey, '8', 'persona');
assert.equal(questionMemory.get(poisonedKey)?.answer, '8', 'Memory must initially hold poisoned 8');

// Calling resolveQuestion without activeError must trigger the compensation memory guard
const recoveredFromMemory = await resolveQuestion({
  label: poisonedKey,
}, mockPersona);

assert.equal(recoveredFromMemory.answer, '800000', 'Must self-heal poisoned memory answer to 800000');
assert.equal(questionMemory.get(poisonedKey)?.answer, '800000', 'Memory Bank must be updated to 800000');
console.log('✅ Question Memory Bank auto-corrected poisoned "8" to "800000".');

// -----------------------------------------------------------------------------
// TEST 7: ultraQuestionResolver resolveCompensationAnswer test
// -----------------------------------------------------------------------------
console.log('--- TEST 7: ultraQuestionResolver resolveCompensationAnswer ---');
const ansCur = resolveCompensationAnswer('Please enter your current ctc in INR', mockPersona);
assert.equal(ansCur, '800000', 'Current CTC in INR must resolve to 800000');

const ansExp = resolveCompensationAnswer('Please enter your expected ctc in INR', mockPersona);
assert.equal(ansExp, '800000', 'Expected CTC in INR must resolve to 800000');

const ansLpaDirect = resolveCompensationAnswer('Current CTC (in Lakhs)', mockPersona);
assert.equal(ansLpaDirect, '8', 'Lakhs request must resolve to 8');
console.log('✅ ultraQuestionResolver resolveCompensationAnswer passed all cases.');

console.log('\n🎉 ALL CTC INR & SALARY VALIDATION TESTS PASSED PERFECTLY!\n');
