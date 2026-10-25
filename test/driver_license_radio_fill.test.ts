import assert from 'node:assert/strict';
import { classifySingleField, classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { evaluateDisqualificationArmor } from '../src/agent/localLlm/ultraQuestionResolver';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import type { ScannedField } from '../src/agent/domScanner/injectedScanner';
import type { PersonaData } from '../src/agent/personaManager';

const dummyPersona: PersonaData = {
  fullName: 'Sai Prasad Chary',
  email: 'sai@example.com',
  phone: '+91 9876543210',
  location: 'Hyderabad, India',
  targetRoles: ['Software Engineer', 'Python Developer'],
  skills: ['Python', 'PostgreSQL', 'TypeScript'],
  experienceYears: 2,
  education: 'Bachelor of Technology in Computer Science',
};

// 1. Straight apostrophe driver's license classification
{
  const field: ScannedField = {
    id: 'urn:li:fs_easyApplyFormElement:(urn:li:fs_normalized_jobPosting:4304675549,4311029471,multipleChoice)',
    selector: 'input[type="radio"][name="driver-license"]',
    tagName: 'input',
    inputType: 'radio',
    label: "Do you have a valid driver's license?*",
    placeholder: '',
    name: 'driver-license',
    options: ['Yes', 'No'],
    required: true,
    currentValue: '',
    hasError: false,
  };

  const classified = classifySingleField(field, dummyPersona);
  assert.equal(classified.standardKey, 'driver_license');
  assert.equal(classified.mappedValue, 'Yes');
  assert.equal(classified.confidence >= 0.95, true);
  console.log("✔ Straight apostrophe driver's license classification verified");
}

// 2. Typographic curly apostrophe driver's license classification
{
  const field: ScannedField = {
    id: 'urn:li:fs_easyApplyFormElement:(urn:li:fs_normalized_jobPosting:4304675549,4311029471,multipleChoice)',
    selector: 'input[type="radio"][name="driver-license"]',
    tagName: 'input',
    inputType: 'radio',
    label: 'Do you have a valid driver’s license?*', // curly apostrophe \u2019
    placeholder: '',
    name: 'driver-license',
    options: ['Yes', 'No'],
    required: true,
    currentValue: '',
    hasError: false,
  };

  const classified = classifySingleField(field, dummyPersona);
  assert.equal(classified.standardKey, 'driver_license');
  assert.equal(classified.mappedValue, 'Yes');
  console.log("✔ Curly apostrophe driver’s license classification verified");
}

// 3. UK spelling driving licence classification
{
  const field: ScannedField = {
    id: 'driver-licence-field',
    selector: 'input[type="radio"][name="driving-licence"]',
    tagName: 'input',
    inputType: 'radio',
    label: 'Do you have a valid driving licence?*',
    placeholder: '',
    name: 'driving-licence',
    options: ['Yes', 'No'],
    required: true,
    currentValue: '',
    hasError: false,
  };

  const classified = classifySingleField(field, dummyPersona);
  assert.equal(classified.standardKey, 'driver_license');
  assert.equal(classified.mappedValue, 'Yes');
  console.log('✔ UK spelling driving licence classification verified');
}

// 4. Knockout armor evaluation for driver's license (straight & curly)
{
  const straightRes = evaluateDisqualificationArmor("Do you have a valid driver's license?*", ['Yes', 'No']);
  assert.equal(straightRes.isKnockout, true);
  assert.equal(straightRes.guaranteedAnswer, 'Yes');

  const curlyRes = evaluateDisqualificationArmor("Do you have a valid driver’s license?*", ['Yes', 'No']);
  assert.equal(curlyRes.isKnockout, true);
  assert.equal(curlyRes.guaranteedAnswer, 'Yes');
  console.log('✔ Knockout armor evaluation for driver license (straight & curly) verified');
}

// 5. Knockout armor for education degree completion
{
  const res = evaluateDisqualificationArmor("Have you completed the following level of education: Bachelor's Degree?*", ['Yes', 'No']);
  assert.equal(res.isKnockout, true);
  assert.equal(res.guaranteedAnswer, 'Yes');
  console.log('✔ Knockout armor evaluation for Bachelor degree completion verified');
}

// 6. Question resolver returns 'Yes' for driver's license via armor
{
  const field: ScannedField = {
    id: 'radio-q1',
    selector: 'input[type="radio"]',
    tagName: 'input',
    inputType: 'radio',
    label: 'Do you have a valid driver’s license?*',
    placeholder: '',
    options: ['Yes', 'No'],
    required: true,
    currentValue: '',
    hasError: false,
  };

  const res = await resolveQuestion(field, dummyPersona);
  assert.equal(res.answer, 'Yes');
  assert.equal(res.isKnockout, true);
  console.log("✔ Question resolver armor resolution for driver's license verified");
}

// 7. Error constraint self-healing for "Please make a selection"
{
  const fields: ScannedField[] = [
    {
      id: 'urn:li:fs_easyApplyFormElement:12345',
      selector: 'input[type="radio"]',
      tagName: 'input',
      inputType: 'radio',
      label: 'Do you agree to company terms and verification?*',
      placeholder: '',
      options: ['Yes', 'No'],
      required: true,
      currentValue: '',
      hasError: true,
      errorMessage: 'Please make a selection',
    }
  ];

  const classified = classifyFields(fields, dummyPersona);
  assert.equal(classified[0].mappedValue, 'Yes');
  console.log("✔ Self-healing affirmative resolution for 'Please make a selection' verified");
}

console.log('\nAll Driver License and Mandatory Radio Verification tests passed successfully! 🚀');
