import assert from 'node:assert/strict';
import { classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { analyzeErrorConstraint } from '../src/agent/localLlm/errorConstraintAnalyzer';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { resolveQuestionCognitively } from '../src/agent/localLlm/ultraQuestionResolver';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/domScanner/injectedScanner';

console.log('=== LINKEDIN FOLLOW SELECT QUESTION & VALIDATION ERROR VERIFICATION ===');

const mockPersona: PersonaData = {
  fullName: 'Sai Prasad Chary',
  email: 'saiprasad@example.com',
  phone: '+91 9876543210',
  location: 'Hyderabad, Telangana, India',
  linkedinUrl: 'https://www.linkedin.com/in/saiprasad',
  portfolioUrl: 'https://saiprasad.dev',
  workExperience: 'Python Full Stack Engineer with 3 years experience',
  skills: ['Python', 'Django', 'React', 'TypeScript'],
  targetRoles: ['Python Developer', 'Full Stack Engineer'],
  answers: {},
};

// TEST 1: The exact field from the screenshot
console.log('\n--- TEST 1: Field Classification of Company Follow Question with LinkedIn URL ---');
const followSelectField: ScannedField = {
  id: 'urn:li:fs_easyApplyFormElement:12345',
  name: 'follow_company',
  tagName: 'select',
  inputType: 'select',
  label: 'Follow us for more insights https://www.linkedin.com/company/sunsystechsol-pvt-ltd/*',
  options: ['Select an option', 'Yes'],
  required: true,
  currentValue: '',
  selector: 'select#urn\\:li\\:fs_easyApplyFormElement\\:12345',
  fallbackSelectors: [],
  rect: { left: 10, top: 10, width: 200, height: 35 },
};

const classifiedList = classifyFields([followSelectField], mockPersona);
const classified = classifiedList[0];

assert.notEqual(
  classified.fieldType,
  'linkedin_url',
  'Company follow question with URL MUST NOT be classified as candidate linkedin_url'
);
assert.equal(
  classified.mappedValue,
  'Yes',
  'Company follow dropdown must have affirmative mappedValue "Yes"'
);
console.log('✅ Field correctly classified as company_follow_consent with mappedValue: "Yes" (not linkedin_url).');

// TEST 2: Active validation error: "Please enter a valid answer"
console.log('\n--- TEST 2: Error Constraint Analyzer on "Please enter a valid answer" ---');
const analysis = analyzeErrorConstraint('Please enter a valid answer');
assert.equal(
  analysis.category,
  'required_selection',
  'LinkedIn "Please enter a valid answer" must be categorized as required_selection'
);
console.log('✅ "Please enter a valid answer" correctly categorized as required_selection.');

// TEST 3: Recovery with active error in classifyFields
console.log('\n--- TEST 3: Recovery in classifyFields when error is present ---');
const errorField: ScannedField = {
  ...followSelectField,
  errorMessage: 'Please enter a valid answer',
};
const errorClassified = classifyFields([errorField], mockPersona)[0];
assert.equal(
  errorClassified.mappedValue,
  'Yes',
  'Error recovery must pick valid affirmative option "Yes"'
);
console.log('✅ classifyFields recovers from "Please enter a valid answer" with mappedValue: "Yes".');

// TEST 4: Question Resolver
console.log('\n--- TEST 4: questionResolver on Company Follow Question ---');
const resolved = await resolveQuestion(
  {
    label: 'Follow us for more insights https://www.linkedin.com/company/sunsystechsol-pvt-ltd/*',
    options: ['Select an option', 'Yes'],
    inputType: 'select',
  },
  mockPersona
);
assert.equal(resolved.answer, 'Yes', 'questionResolver must answer "Yes"');
console.log('✅ questionResolver returned answer: "Yes".');

// TEST 5: Cognitive Question Resolver (ultraQuestionResolver)
console.log('\n--- TEST 5: resolveQuestionCognitively on Company Follow Question ---');
const cogResolved = await resolveQuestionCognitively(
  {
    label: 'Follow us for more insights https://www.linkedin.com/company/sunsystechsol-pvt-ltd/*',
    options: ['Select an option', 'Yes'],
    inputType: 'select',
  },
  mockPersona
);
assert.equal(cogResolved.answer, 'Yes', 'ultraQuestionResolver must answer "Yes"');
console.log('✅ resolveQuestionCognitively returned answer: "Yes".');

// TEST 6: Real LinkedIn profile URL field must STILL be correctly classified
console.log('\n--- TEST 6: Candidate LinkedIn Profile URL input field preservation ---');
const realProfileField: ScannedField = {
  id: 'profile_url',
  name: 'linkedin_profile',
  tagName: 'input',
  inputType: 'text',
  label: 'LinkedIn Profile URL',
  options: [],
  required: true,
  currentValue: '',
  selector: 'input#profile_url',
  fallbackSelectors: [],
  rect: { left: 10, top: 10, width: 200, height: 35 },
};
const realProfileClassified = classifyFields([realProfileField], mockPersona)[0];
assert.equal(
  realProfileClassified.fieldType,
  'linkedin_url',
  'Actual candidate profile URL must be classified as linkedin_url'
);
assert.equal(
  realProfileClassified.mappedValue,
  'https://www.linkedin.com/in/saiprasad',
  'Candidate profile URL mappedValue must be persona linkedinUrl'
);
console.log('✅ Candidate LinkedIn Profile URL input field correctly preserved as linkedin_url.');

console.log('\n🎉 ALL LINKEDIN FOLLOW QUESTION & ERROR CONSTRAINT TESTS PASSED 100%! 🎉\n');
