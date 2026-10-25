/**
 * Automated Verification Suite: Super Field Classifier
 * Verifies accurate semantic classification across 20+ standardized categories
 * with deep synonym engines, fieldset/legend context hints, and persona auto-mapping.
 */

import assert from 'node:assert/strict';
import { classifySingleField, classifyFields } from '../src/agent/domScanner/fieldClassifier';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/domScanner/fieldClassifier';

const mockPersona: PersonaData = {
  fullName: 'Kammari Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: 'https://kspchary.dev',
  experienceYears: 4,
  minSalary: 120,
  workPreference: 'On-site',
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'React', 'Ollama', 'FastAPI'],
  targetRoles: ['Full Stack AI Engineer', 'AI Automation Intern'],
  applyMode: 'easy',
  verified: true,
  education: "Bachelor's of Technology in Computer Science",
  experienceSummary: 'Founder & CEO at Impulsesearch.',
};

function makeField(label: string, name = '', id = '', inputType = 'text', contextHint = ''): ScannedField {
  return {
    id,
    selector: id ? `#${id}` : `input[name="${name}"]`,
    tagName: 'input',
    inputType,
    label,
    placeholder: '',
    name,
    required: true,
    currentValue: '',
    contextHint: contextHint || undefined,
  };
}

async function runClassifierTests() {
  console.log('======================================================================');
  console.log('🧪 TESTING SUPER FIELD CLASSIFIER (20+ CATEGORIES & SYNONYM ENGINES)');
  console.log('======================================================================\n');

  // 1. Personal & Contact
  console.log('1. Contact & Identity Classification...');
  const f1 = classifySingleField(makeField('Given Name', 'firstName'), mockPersona);
  assert.equal(f1.fieldType, 'first_name');
  assert.equal(f1.mappedValue, 'Kammari');

  const f2 = classifySingleField(makeField('Surname / Family Name', 'lastName'), mockPersona);
  assert.equal(f2.fieldType, 'last_name');
  assert.equal(f2.mappedValue, 'Sai Prasad Chary');

  const f3 = classifySingleField(makeField('Primary Email', 'email', '', 'email'), mockPersona);
  assert.equal(f3.fieldType, 'email');
  assert.equal(f3.mappedValue, 'kspchary077@gmail.com');

  const f4 = classifySingleField(makeField('Phone Country Code', 'phoneCountry', 'input-phone-country', 'select'), mockPersona);
  assert.equal(f4.fieldType, 'phone_country_code');
  assert.equal(f4.mappedValue, 'India (+91)');

  const f5 = classifySingleField(makeField('Mobile phone number *', 'phoneNumber', '', 'tel'), mockPersona);
  assert.equal(f5.fieldType, 'phone');
  assert.equal(f5.mappedValue, '+91 83743 70572');
  console.log('  ✓ Contact fields classified and mapped correctly.');

  // 2. Online Presence
  console.log('2. Online Presence...');
  const f6 = classifySingleField(makeField('LinkedIn Profile URL', 'linkedinUrl'), mockPersona);
  assert.equal(f6.fieldType, 'linkedin_url');
  assert.equal(f6.mappedValue, 'https://linkedin.com/in/kspchary');

  const f7 = classifySingleField(makeField('GitHub Profile', 'github'), mockPersona);
  assert.equal(f7.fieldType, 'github_url');
  assert.equal(f7.mappedValue, 'https://github.com/saiprasadchary-hub');

  const f8 = classifySingleField(makeField('Personal Portfolio or Website', 'website'), mockPersona);
  assert.equal(f8.fieldType, 'portfolio_url');
  assert.equal(f8.mappedValue, 'https://kspchary.dev');
  console.log('  ✓ Profiles classified and mapped correctly.');

  // 3. Experience & Roles
  console.log('3. Experience & Roles...');
  const f9 = classifySingleField(makeField('Total years of professional experience', 'totalExperience'), mockPersona);
  assert.equal(f9.fieldType, 'years_exp');
  assert.equal(f9.mappedValue, '4');

  const f10 = classifySingleField(makeField('How many years of experience with Python do you have?', 'pythonExp'), mockPersona);
  assert.equal(f10.fieldType, 'role_years_exp');
  assert.equal(f10.mappedValue, '4');

  const f11 = classifySingleField(makeField('Most recent job title', 'recentTitle'), mockPersona);
  assert.equal(f11.fieldType, 'current_title');
  assert.equal(f11.mappedValue, 'Full Stack AI Engineer');

  const f12 = classifySingleField(makeField('Current Employer or Company', 'currentCompany'), mockPersona);
  assert.equal(f12.fieldType, 'current_company');
  assert.equal(f12.mappedValue, 'Impulsesearch');
  console.log('  ✓ Experience fields classified and mapped correctly.');

  // 4. Work Authorization & Sponsorship (with Fieldset Context)
  console.log('4. Work Authorization & Sponsorship...');
  const f13 = classifySingleField(
    makeField('Yes', 'authRadio', '', 'radio', 'Are you legally authorized to work in India?'),
    mockPersona
  );
  assert.equal(f13.fieldType, 'work_authorization');
  assert.equal(f13.mappedValue, 'Yes');

  const f14 = classifySingleField(
    makeField('No', 'sponsorshipRadio', '', 'radio', 'Will you now or in the future require visa sponsorship?'),
    mockPersona
  );
  assert.equal(f14.fieldType, 'sponsorship');
  assert.equal(f14.mappedValue, 'No');
  console.log('  ✓ Work authorization with contextual legends classified correctly.');

  // 5. Compensation & Geography
  console.log('5. Compensation & Geography...');
  const f15 = classifySingleField(makeField('Desired Salary / Annual CTC (₹ in Lakhs)', 'expectedSalary'), mockPersona);
  assert.equal(f15.fieldType, 'salary');
  assert.equal(f15.mappedValue, '120');

  const f16 = classifySingleField(makeField('Current City', 'city'), mockPersona);
  assert.equal(f16.fieldType, 'city');
  assert.equal(f16.mappedValue, 'Hyderabad');

  const f17 = classifySingleField(makeField('Country of Residence', 'country'), mockPersona);
  assert.equal(f17.fieldType, 'country');
  assert.equal(f17.mappedValue, 'India');
  console.log('  ✓ Geography & compensation mapped correctly.');

  // 6. Equal Employment Opportunity (EEO)
  console.log('6. Equal Employment Opportunity...');
  const f18 = classifySingleField(makeField('Gender Identity', 'gender', '', 'select'), mockPersona);
  assert.equal(f18.fieldType, 'gender');
  assert.equal(f18.mappedValue, 'Decline to self-identify');

  const f19 = classifySingleField(makeField('Veteran Status', 'veteran', '', 'select'), mockPersona);
  assert.equal(f19.fieldType, 'veteran_status');
  assert.equal(f19.mappedValue, 'I am not a protected veteran');

  const f20 = classifySingleField(makeField('Disability Status', 'disability', '', 'select'), mockPersona);
  assert.equal(f20.fieldType, 'disability');
  assert.equal(f20.mappedValue, 'I do not have a disability');
  console.log('  ✓ EEO voluntary self-identification classified and safely mapped.');

  // 7. Novel Screening Question Fallback
  console.log('7. Novel Screening Question Fallback...');
  const f21 = classifySingleField(makeField('Briefly describe your experience deploying local LLMs with Ollama', 'q1', '', 'textarea'), mockPersona);
  assert.equal(f21.fieldType, 'screening');
  console.log('  ✓ Custom screening question routed to Qwen 2.5 local model pipeline.');

  console.log('\n🎉 ALL SUPER FIELD CLASSIFIER TESTS PASSED SUCCESSFULLY!');
}

runClassifierTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
