import assert from 'node:assert/strict';
import type { PersonaData } from '../src/types';
import { classifySingleField, type ScannedField } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { resolveCompensationAnswer } from '../src/agent/localLlm/ultraQuestionResolver';

console.log('=== TEST: Fresher vs Currently Working & Current CTC Verification ===\n');

// 1. Fresher Persona Setup
const fresherPersona: PersonaData = {
  fullName: 'Sai Prasad Chary',
  email: 'sai@example.com',
  phone: '+91 9876543210',
  location: 'Hyderabad, India',
  experienceYears: 0,
  minSalary: 10, // Expected 10 LPA
  employmentStatus: 'fresher',
  currentCtcLpa: 0,
  currentCompany: '',
  noticePeriodDays: 0,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript'],
  targetRoles: ['Software Engineer', 'Full Stack Engineer'],
  applyMode: 'easy',
  verified: true,
  linkedIn: 'https://linkedin.com/in/sai',
  gitHub: 'https://github.com/sai',
  portfolio: '',
};

// 2. Currently Working Persona Setup
const workingPersona: PersonaData = {
  fullName: 'Sai Prasad Chary',
  email: 'sai@example.com',
  phone: '+91 9876543210',
  location: 'Hyderabad, India',
  experienceYears: 3,
  minSalary: 16, // Expected 16 LPA
  employmentStatus: 'currently_working',
  currentCtcLpa: 8, // Currently at 8 LPA
  currentCompany: 'TechKareer Solutions',
  noticePeriodDays: 30,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'React'],
  targetRoles: ['Senior Software Engineer'],
  applyMode: 'easy',
  verified: true,
  linkedIn: 'https://linkedin.com/in/sai',
  gitHub: 'https://github.com/sai',
  portfolio: '',
};

// --- TEST 1: Current CTC for Fresher ---
console.log('--- TEST 1: Fresher fills 0 for Current CTC in LPA and INR ---');
const currentCtcLpaField: ScannedField = {
  id: 'current-ctc-lpa',
  selector: '#current-ctc-lpa',
  tagName: 'input',
  inputType: 'text',
  label: 'What is your current CTC (in LPA)?*',
  placeholder: '',
  name: 'currentCtcLpa',
  required: true,
  currentValue: '',
};

const c1Fresher = classifySingleField(currentCtcLpaField, fresherPersona);
assert.equal(c1Fresher.mappedValue, '0', 'Fresher must have 0 for current CTC in LPA');

const currentCtcInrField: ScannedField = {
  id: 'current-ctc-inr',
  selector: '#current-ctc-inr',
  tagName: 'input',
  inputType: 'text',
  label: 'Please enter your current ctc in INR*',
  placeholder: '',
  name: 'currentCtcInr',
  required: true,
  currentValue: '',
};

const c1InrFresher = classifySingleField(currentCtcInrField, fresherPersona);
assert.equal(c1InrFresher.mappedValue, '0', 'Fresher must have 0 for current CTC in INR');
console.log('✅ Fresher maps current CTC to 0 successfully.');

// --- TEST 2: Current CTC for Currently Working Candidate ---
console.log('--- TEST 2: Currently Working candidate fills configured currentCtcLpa (8 LPA & 800000 INR) ---');
const c2Working = classifySingleField(currentCtcLpaField, workingPersona);
assert.equal(c2Working.mappedValue, '8', 'Currently working must have 8 for current CTC in LPA');

const c2InrWorking = classifySingleField(currentCtcInrField, workingPersona);
assert.equal(c2InrWorking.mappedValue, '800000', 'Currently working must have 800000 for current CTC in INR');
console.log('✅ Currently Working candidate maps current CTC to 8 LPA and 800000 INR.');

// --- TEST 3: Expected CTC stays distinct from Current CTC ---
console.log('--- TEST 3: Expected CTC maps to minSalary (10 LPA for Fresher, 16 LPA for Working) ---');
const expectedCtcLpaField: ScannedField = {
  id: 'expected-ctc-lpa',
  selector: '#expected-ctc-lpa',
  tagName: 'input',
  inputType: 'text',
  label: 'What is your expected CTC (in LPA)?*',
  placeholder: '',
  name: 'expectedCtcLpa',
  required: true,
  currentValue: '',
};

const expFresher = classifySingleField(expectedCtcLpaField, fresherPersona);
assert.equal(expFresher.mappedValue, '10', 'Fresher expected CTC must be 10 LPA');

const expWorking = classifySingleField(expectedCtcLpaField, workingPersona);
assert.equal(expWorking.mappedValue, '16', 'Working candidate expected CTC must be 16 LPA');
console.log('✅ Expected CTC correctly maps to expected salary independently from current CTC.');

// --- TEST 4: Notice Period in Days ---
console.log('--- TEST 4: Notice Period maps to 0 days for Fresher and 30 days for Working candidate ---');
const noticeField: ScannedField = {
  id: 'notice-days',
  selector: '#notice-days',
  tagName: 'input',
  inputType: 'number',
  label: 'How long is your notice period (in days)?*',
  placeholder: '',
  name: 'noticePeriodDays',
  required: true,
  currentValue: '',
};

const nFresher = classifySingleField(noticeField, fresherPersona);
assert.equal(nFresher.mappedValue, '0', 'Fresher notice period must be 0');

const nWorking = classifySingleField(noticeField, workingPersona);
assert.equal(nWorking.mappedValue, '30', 'Working candidate notice period must be 30');
console.log('✅ Notice period correctly resolved based on employment status.');

// --- TEST 5: resolveQuestion handles Fresher vs Working status questions ---
console.log('--- TEST 5: Employment status questions (Are you currently working? / Fresher?) ---');
const statusQuestion: ScannedField = {
  id: 'emp-status',
  selector: '#emp-status',
  tagName: 'select',
  inputType: 'select',
  label: 'Are you currently working?',
  placeholder: '',
  name: 'isEmployed',
  required: true,
  currentValue: '',
  options: ['Yes', 'No']
};

const resFresher = await resolveQuestion(statusQuestion, fresherPersona);
assert.equal(resFresher.answer, 'No', 'Fresher must answer No to "Are you currently working?"');

const resWorking = await resolveQuestion(statusQuestion, workingPersona);
assert.equal(resWorking.answer, 'Yes', 'Working candidate must answer Yes to "Are you currently working?"');
console.log('✅ Employment status questions resolved accurately.');

console.log('\n🎉 ALL FRESHER VS CURRENTLY WORKING TESTS PASSED PERFECTLY!\n');
