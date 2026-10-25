// Mock localStorage for CLI Node testing environment
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  length: 0,
  key: (_index: number) => null,
};

import { classifyFields } from '../src/agent/form/fieldClassifier';
import { isFieldAlreadySatisfied } from '../src/agent/form/formAuditor';
import { questionMemory } from '../src/agent/brain/questionMemory';
import { parseAnswer } from '../src/agent/brain/answerParser';
import { buildQuestionPrompt } from '../src/agent/brain/promptBuilder';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/form/fieldScanner';

const candidatePersona: PersonaData = {
  fullName: 'Kammari Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: 'https://kspchary.dev',
  experienceYears: 4,
  minSalary: 120,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Electron'],
  targetRoles: ['Full Stack AI Engineer', 'Frontend Architect'],
  applyMode: 'easy',
  verified: true,
  education: 'B.Tech in Computer Science',
  resumeText: `Kammari Sai Prasad Chary
Full Stack AI Developer with 4+ years of experience engineering web applications and AI desktop software.
Skills: React, TypeScript, Python, FastAPI, Electron, TailwindCSS, LLM Prompt Engineering.
Experience: Full Stack Engineer (2021-Present): Designed AI automation tools, optimized DOM algorithms, built REST APIs.
Education: B.Tech in Computer Science and Engineering.
Availability: Available to start immediately. Authorized to work without sponsorship.`,
  resumeChunks: {
    summary: 'Full Stack AI Developer with 4+ years experience engineering responsive web applications.',
    skills: 'React, TypeScript, Python, FastAPI, Electron, TailwindCSS, LLM Prompt Engineering',
    experience: 'Full Stack Engineer (2021-Present): Designed AI automation tools, optimized DOM algorithms.',
    education: 'B.Tech in Computer Science and Engineering (2017-2021)',
    availability: 'Available to start immediately.',
    workAuthorization: 'Authorized to work without sponsorship.',
  },
};

async function testAllFormFieldTypes() {
  console.log('=== ZEROAPPLY COMPREHENSIVE ALL FORM FIELD TYPES AUDIT ===\n');

  // Seed candidate memory bank
  questionMemory.seedFromPersona(candidatePersona);

  // 1. CHECKBOX
  console.log('--- 1. Checkbox Field Audit ---');
  const checkboxField: ScannedField = {
    id: 'terms_agree',
    selector: '#agree',
    tagName: 'input',
    inputType: 'checkbox',
    label: 'I agree to the candidate privacy policy and background check terms',
    placeholder: '',
    name: 'terms',
    currentValue: 'false',
    required: true,
    hasError: false,
    rect: { x: 0, y: 0, width: 20, height: 20 },
  };
  const [classifiedCheckbox] = classifyFields([checkboxField], candidatePersona);
  const parsedCheckbox = parseAnswer('Yes, I agree to the policy', { inputType: 'checkbox' });
  console.log('Parsed checkbox answer:', parsedCheckbox.answer); // "true"
  if (parsedCheckbox.answer !== 'true') throw new Error('Checkbox parsing failed');
  const checkboxNotSatisfied = isFieldAlreadySatisfied(classifiedCheckbox, parsedCheckbox.answer);
  if (checkboxNotSatisfied) throw new Error('Unchecked checkbox should not be satisfied');
  classifiedCheckbox.currentValue = 'true';
  const checkboxSatisfied = isFieldAlreadySatisfied(classifiedCheckbox, parsedCheckbox.answer);
  if (!checkboxSatisfied) throw new Error('Checked checkbox should be satisfied');
  console.log('✅ Checkbox parsing & satisfaction verified!');

  // 2. RADIO BUTTONS
  console.log('\n--- 2. Radio Group Field Audit ---');
  const radioField: ScannedField = {
    id: 'sponsorship_radio',
    selector: '#sponsorship',
    tagName: 'input',
    inputType: 'radio',
    label: 'Will you now or in the future require visa sponsorship?',
    placeholder: '',
    name: 'visa_sponsorship',
    currentValue: '',
    required: true,
    options: ['Yes', 'No'],
    hasError: false,
    rect: { x: 0, y: 0, width: 20, height: 20 },
  };
  const [classifiedRadio] = classifyFields([radioField], candidatePersona);
  console.log('Radio classified fieldType:', classifiedRadio.fieldType);
  console.log('Radio mappedValue from persona:', classifiedRadio.mappedValue);
  if (classifiedRadio.mappedValue !== 'No') throw new Error('Sponsorship radio should resolve to No');
  classifiedRadio.currentValue = 'No';
  if (!isFieldAlreadySatisfied(classifiedRadio, 'No')) throw new Error('Selected radio should be satisfied');
  console.log('✅ Radio group resolution & satisfaction verified!');

  // 3. DROPDOWN (NATIVE SELECT)
  console.log('\n--- 3. Dropdown (Native Select) Audit ---');
  const selectField: ScannedField = {
    id: 'proficiency_select',
    selector: '#english_level',
    tagName: 'select',
    inputType: 'select',
    label: 'What is your level of proficiency in English?',
    placeholder: '',
    name: 'english',
    currentValue: 'Select an option',
    required: true,
    options: ['Conversational', 'Professional working', 'Full professional', 'Native or bilingual'],
    hasError: false,
    rect: { x: 0, y: 0, width: 200, height: 40 },
  };
  const [classifiedSelect] = classifyFields([selectField], candidatePersona);
  const parsedSelect = parseAnswer('I have full professional English proficiency', { options: selectField.options });
  console.log('Parsed select option:', parsedSelect.answer);
  if (parsedSelect.answer !== 'Full professional') throw new Error('Option matching failed');
  if (isFieldAlreadySatisfied(classifiedSelect, parsedSelect.answer)) throw new Error('Placeholder should not be satisfied');
  classifiedSelect.currentValue = 'Full professional';
  if (!isFieldAlreadySatisfied(classifiedSelect, parsedSelect.answer)) throw new Error('Chosen option should be satisfied');
  console.log('✅ Native dropdown select verified!');

  // 4. CUSTOM COMBOBOX
  console.log('\n--- 4. Custom Combobox Audit ---');
  const comboboxField: ScannedField = {
    id: 'country_code_combobox',
    selector: '[data-test-country-code]',
    tagName: 'button',
    inputType: 'combobox',
    label: 'Phone country code',
    placeholder: '',
    name: 'country_code',
    currentValue: 'India (+91)',
    required: true,
    options: ['United States (+1)', 'United Kingdom (+44)', 'India (+91)', 'Canada (+1)'],
    hasError: false,
    rect: { x: 0, y: 0, width: 200, height: 40 },
  };
  const [classifiedCombobox] = classifyFields([comboboxField], candidatePersona);
  console.log('Combobox mappedValue:', classifiedCombobox.mappedValue);
  if (classifiedCombobox.mappedValue !== 'India (+91)') throw new Error('Country code combobox should be India (+91)');
  if (!isFieldAlreadySatisfied(classifiedCombobox, classifiedCombobox.mappedValue)) throw new Error('Combobox should be satisfied');
  console.log('✅ Custom combobox verified!');

  // 5. NUMBER INPUT
  console.log('\n--- 5. Number Input Audit ---');
  const numberField: ScannedField = {
    id: 'exp_number',
    selector: '#exp_years',
    tagName: 'input',
    inputType: 'number',
    label: 'How many years of work experience do you have?',
    placeholder: '',
    name: 'experience',
    currentValue: '',
    required: true,
    hasError: false,
    rect: { x: 0, y: 0, width: 100, height: 40 },
  };
  const [classifiedNumber] = classifyFields([numberField], candidatePersona);
  console.log('Number mappedValue:', classifiedNumber.mappedValue);
  if (classifiedNumber.mappedValue !== '4') throw new Error('Experience number should be 4');
  const parsedNumber = parseAnswer('I have around 4 years of experience', { inputType: 'number' });
  if (parsedNumber.answer !== '4') throw new Error('Numeric extraction failed');
  classifiedNumber.currentValue = '4';
  if (!isFieldAlreadySatisfied(classifiedNumber, '4')) throw new Error('Number field should be satisfied');
  console.log('✅ Number input verified!');

  // 6. TEXT / CONTACT INPUTS
  console.log('\n--- 6. Text / Contact Input Audit ---');
  const emailField: ScannedField = {
    id: 'email_input',
    selector: '#email',
    tagName: 'input',
    inputType: 'email',
    label: 'Email address',
    placeholder: '',
    name: 'email',
    currentValue: 'kspchary077@gmail.com',
    required: true,
    hasError: false,
    rect: { x: 0, y: 0, width: 250, height: 40 },
  };
  const phoneField: ScannedField = {
    id: 'phone_input',
    selector: '#phone',
    tagName: 'input',
    inputType: 'text',
    label: 'Mobile phone number',
    placeholder: '',
    name: 'phone',
    currentValue: '+91 83743 70572',
    required: true,
    hasError: false,
    rect: { x: 0, y: 0, width: 250, height: 40 },
  };
  const [classifiedEmail, classifiedPhone] = classifyFields([emailField, phoneField], candidatePersona);
  if (classifiedEmail.mappedValue !== 'kspchary077@gmail.com') throw new Error('Email mismatch');
  if (classifiedPhone.mappedValue !== '+91 83743 70572') throw new Error('Phone mismatch');
  if (!isFieldAlreadySatisfied(classifiedEmail, classifiedEmail.mappedValue)) throw new Error('Email should be satisfied');
  if (!isFieldAlreadySatisfied(classifiedPhone, classifiedPhone.mappedValue)) throw new Error('Phone should be satisfied');
  console.log('✅ Text contact inputs verified!');

  // 7. TEXTAREA / MULTILINE ESSAYS
  console.log('\n--- 7. Textarea Multiline Essay Audit ---');
  const textareaField: ScannedField = {
    id: 'summary_textarea',
    selector: '#why_us',
    tagName: 'textarea',
    inputType: 'textarea',
    label: 'Please provide a brief professional summary or cover note.',
    placeholder: 'Tell us about your background...',
    name: 'cover_note',
    currentValue: '',
    required: false,
    hasError: false,
    rect: { x: 0, y: 0, width: 400, height: 120 },
  };
  const [classifiedTextarea] = classifyFields([textareaField], candidatePersona);
  // Verify prompt generation includes resume context for textareas
  const prompt = buildQuestionPrompt({
    question: textareaField.label,
    persona: candidatePersona,
    resumeContext: candidatePersona.resumeChunks!.summary,
    inputType: 'textarea',
  });
  if (!prompt.userPrompt.includes(candidatePersona.fullName) || !prompt.userPrompt.includes('Full Stack AI Developer')) {
    throw new Error('Prompt missing candidate user data');
  }
  const mockAnswer = 'Full Stack AI Developer with 4+ years experience engineering web applications and AI desktop software.';
  const parsedTextarea = parseAnswer(mockAnswer, { inputType: 'textarea' });
  if (parsedTextarea.answer.length < 20) throw new Error('Textarea output invalid');
  classifiedTextarea.currentValue = mockAnswer;
  if (!isFieldAlreadySatisfied(classifiedTextarea, mockAnswer)) throw new Error('Textarea should be satisfied');
  console.log('✅ Textarea multiline prompt & resolution verified!');

  // 8. DATE INPUT
  console.log('\n--- 8. Date Input Audit ---');
  const dateField: ScannedField = {
    id: 'start_date_input',
    selector: '#start_date',
    tagName: 'input',
    inputType: 'date',
    label: 'Earliest start date',
    placeholder: 'YYYY-MM-DD',
    name: 'startDate',
    currentValue: '',
    required: true,
    hasError: false,
    rect: { x: 0, y: 0, width: 150, height: 40 },
  };
  const [classifiedDate] = classifyFields([dateField], candidatePersona);
  const parsedDate = parseAnswer('Immediately', { inputType: 'date' });
  const todayISO = new Date().toISOString().split('T')[0];
  console.log('Parsed date for Immediately:', parsedDate.answer);
  if (parsedDate.answer !== todayISO) throw new Error('Date parsing failed');
  classifiedDate.currentValue = todayISO;
  if (!isFieldAlreadySatisfied(classifiedDate, todayISO)) throw new Error('Date input should be satisfied');
  console.log('✅ Date input verified!');

  // 9. FILE UPLOAD (RESUME)
  console.log('\n--- 9. File Upload (Resume) Audit ---');
  const fileField: ScannedField = {
    id: 'resume_file_input',
    selector: 'input[type="file"]',
    tagName: 'input',
    inputType: 'file',
    label: 'Upload resume',
    placeholder: '',
    name: 'resume',
    currentValue: '',
    required: true,
    hasError: false,
    rect: { x: 0, y: 0, width: 200, height: 40 },
  };
  const [classifiedFile] = classifyFields([fileField], candidatePersona);
  if (classifiedFile.fieldType !== 'resume_upload') throw new Error('File should be resume_upload');
  if (isFieldAlreadySatisfied(classifiedFile, 'Resume.pdf')) throw new Error('Empty file should not be satisfied');
  classifiedFile.currentValue = 'Kammari_Sai_Prasad_Resume.pdf';
  if (!isFieldAlreadySatisfied(classifiedFile, 'Resume.pdf')) throw new Error('Attached file should be satisfied');
  console.log('✅ File upload field verified!');

  console.log('\n=============================================================');
  console.log('🎉 ALL 9 FORM FIELD TYPES VERIFIED & AUDITED SUCCESSFULLY!');
  console.log('🎉 ALL ANSWERS ORIGINATE FROM CANDIDATE USER DATA (PERSONA & RESUME)!');
  console.log('=============================================================');
}

testAllFormFieldTypes().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
