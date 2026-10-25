import assert from 'node:assert/strict';
import { classifySingleField, classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/domScanner/fieldClassifier';

const mockPersona: PersonaData = {
  fullName: 'Kammari Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  experienceYears: 4,
  minSalary: 120,
  workPreference: 'On-site',
  techStack: ['Python', 'TypeScript', 'React'],
  targetRoles: ['Full Stack AI Engineer'],
  education: "Bachelor's of Technology in Computer Science",
  experienceSummary: 'Senior Engineer at Impulsesearch.',
};

function makeField(
  label: string,
  name = '',
  id = '',
  inputType = 'text',
  options: string[] = []
): ScannedField {
  return {
    id,
    selector: id ? `#${id}` : `input[name="${name}"]`,
    tagName: inputType === 'select' ? 'select' : 'input',
    inputType,
    label,
    placeholder: '',
    name,
    required: true,
    currentValue: '',
    options: options.length > 0 ? options : undefined,
  };
}

async function runSafetyTests() {
  console.log('======================================================================');
  console.log('🧪 TESTING CODE LICENSING & COMPANY NAME SAFETY (ZERO MISCLASSIFICATION)');
  console.log('======================================================================\n');

  // Test 1: Field 2 from screenshot - "If a comapny, please write the comapny name that will license the code.*"
  console.log('1. Verifying conditional company name is NEVER candidate personal name...');
  const companyField = makeField(
    'If a comapny, please write the comapny name that will license the code.*',
    'companyName',
    'code-license-company'
  );
  const classifiedCompany = classifySingleField(companyField, mockPersona);

  assert.notEqual(
    classifiedCompany.fieldType,
    'full_name',
    'Conditional company field MUST NOT be classified as full_name'
  );
  assert.notEqual(
    classifiedCompany.mappedValue,
    mockPersona.fullName,
    'Candidate personal full name MUST NEVER be filled into company name field'
  );
  assert.equal(
    classifiedCompany.mappedValue,
    'N/A',
    'Independent engineer licensing code conditionally must map to "N/A"'
  );
  console.log('  ✓ Conditional company field correctly resolved to "N/A" and protected from personal full name.');

  // Test 2: Field 1 from screenshot - Applicant entity type
  console.log('2. Verifying applicant type selects Independent software engineer...');
  const entityField = makeField(
    'Apply to',
    'applyToEntity',
    'entity-type',
    'radio',
    ['Independent software engineer / consultant', 'Other']
  );
  const classifiedEntity = classifySingleField(entityField, mockPersona);
  assert.equal(
    classifiedEntity.mappedValue,
    'Independent software engineer / consultant',
    'Applicant type must select Independent software engineer / consultant'
  );

  const resolvedEntity = await resolveQuestion(entityField, mockPersona);
  assert.equal(
    resolvedEntity.answer,
    'Independent software engineer / consultant'
  );
  console.log('  ✓ Applicant entity type correctly resolves to Independent software engineer / consultant.');

  // Test 3: Field 3 from screenshot - Git licensing email
  console.log('3. Verifying code licensing email...');
  const emailField = makeField(
    'Which email will you use for code licensing? Best use the one connected to your Git platforms.*',
    'licenseEmail',
    'git-email',
    'email'
  );
  const classifiedEmail = classifySingleField(emailField, mockPersona);
  assert.equal(classifiedEmail.fieldType, 'email');
  assert.equal(classifiedEmail.mappedValue, mockPersona.email);
  console.log('  ✓ Code licensing email correctly mapped to candidate email.');

  // Test 4: Field 4 from screenshot - Interest in code licensing and AI training payment
  console.log('4. Verifying licensing and AI training payment consent (Affirmative Yes)...');
  const consentField = makeField(
    'Would you be interested in non-exclusive licensing where you retain ownership of the code and receive payment when it is used for AI training?*',
    'licensingInterest',
    'licensing-consent',
    'radio',
    ['Yes', 'No']
  );
  const classifiedConsent = classifySingleField(consentField, mockPersona);
  assert.equal(
    classifiedConsent.mappedValue,
    'Yes',
    'Candidate must express interest/consent to receive payment for AI code licensing'
  );

  const resolvedConsent = await resolveQuestion(consentField, mockPersona);
  assert.equal(resolvedConsent.answer, 'Yes');
  console.log('  ✓ Licensing interest answered with affirmative "Yes".');

  // Test 5: Full Name Exclusion Engine across non-candidate "name" fields
  console.log('5. Verifying Full Name classifier excludes other entities...');
  const excludedLabels = [
    'Company Name',
    'Comapny Name',
    'School Name',
    'College / University Name',
    'Employer Name',
    'Emergency Contact Name',
    'Supervisor Name',
    'Manager Name',
    'Reference 1 Name',
    'Project Name',
    'Name of firm or agency',
  ];

  for (const label of excludedLabels) {
    const f = classifySingleField(makeField(label), mockPersona);
    assert.notEqual(
      f.fieldType,
      'full_name',
      `Label "${label}" must NOT be classified as candidate full_name`
    );
    assert.notEqual(
      f.mappedValue,
      mockPersona.fullName,
      `Label "${label}" must NOT receive candidate personal name`
    );
  }
  console.log('  ✓ All 11 non-candidate name fields strictly excluded from full_name.');

  // Test 6: Genuine candidate full name fields STILL match correctly
  console.log('6. Verifying authentic candidate full name fields...');
  const validFullNameLabels = [
    'Full Name *',
    'Full Name',
    'Legal Name',
    'Candidate Name',
    'Applicant Name',
    'Your Name',
    'Name *',
    'Name',
  ];

  for (const label of validFullNameLabels) {
    const f = classifySingleField(makeField(label), mockPersona);
    assert.equal(
      f.fieldType,
      'full_name',
      `Valid label "${label}" should be classified as full_name`
    );
    assert.equal(
      f.mappedValue,
      mockPersona.fullName,
      `Valid label "${label}" should receive candidate full name`
    );
  }
  console.log('  ✓ All authentic candidate full name fields correctly classified.');

  console.log('\n🎉 ALL CODE LICENSING & COMPANY NAME SAFETY TESTS PASSED!');
}

runSafetyTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
