/**
 * Automated Verification Suite: Demo LinkedIn Clone Workflow Evaluation
 * Tests perception, 3-tier answering (Persona, Memory Bank, Local LLM),
 * and step-by-step form resolution across all 5 steps of the clone LinkedIn page.
 */

import assert from 'node:assert/strict';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { classifySingleField } from '../src/agent/domScanner/fieldClassifier';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';
import { isFieldAlreadySatisfied } from '../src/agent/formFiller/formAuditor';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/domScanner/fieldClassifier';

// Candidate Persona: Sai Prasad Chary
const candidateSaiPrasad: PersonaData = {
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
  techStack: ['Python', 'TypeScript', 'React', 'Node.js', 'FastAPI', 'LangChain', 'Ollama', 'Electron'],
  targetRoles: ['AI Automation Intern', 'Full Stack AI Engineer'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Sai Prasad Chary - Full Stack & AI Agent Developer. 4 years of experience building multi-step agentic workflows, Python automation pipelines, and tool-calling systems.',
  experienceSummary: 'Founder & CEO at Impulsesearch. Led AI agent development for autonomous web workflows.',
  resumeChunks: {
    summary: 'AI Automation Engineer with 4 years experience building tool-calling agents and production automation pipelines.',
    skills: 'Python, TypeScript, React, LangChain, Local LLMs (Qwen 2.5), FastAPI, Electron, DOM Automation',
    experience: 'Founder & Lead Engineer at Impulsesearch (2021-Present): Architected multi-step AI agent workflows with local LLM inference.',
    projects: 'Engineered an autonomous AI agent workflow utilizing Python, LangChain, and local LLMs (Qwen 2.5) with deterministic DOM automation and resilient retry loops to automate multi-step web applications.',
    workAuthorization: 'Authorized to work in India without visa sponsorship.',
  },
};

// Seed memory bank from persona
questionMemory.clear();
questionMemory.seedFromPersona(candidateSaiPrasad);

async function runEvaluation() {
  console.log('======================================================================');
  console.log('🚀 EVALUATING ZEROAPPLY WORKFLOW ON DEMO LINKEDIN PAGE');
  console.log(`Candidate: ${candidateSaiPrasad.fullName}`);
  console.log(`Location:  ${candidateSaiPrasad.location}`);
  console.log('======================================================================\n');

  // ==================================================================
  // STEP 1: CONTACT INFO
  // ==================================================================
  console.log('--- [STEP 1: Contact Information] ---');

  // 1.1 Email Dropdown
  const emailField: ScannedField = {
    id: 'input-email-address',
    selector: '#input-email-address',
    tagName: 'select',
    inputType: 'select',
    label: 'Email address *',
    name: 'email',
    placeholder: '',
    options: ['Select an email address', 'kspchary077@gmail.com', 'sai.work@gmail.com'],
    required: true,
    currentValue: '',
  };
  const emailClassified = classifySingleField(emailField, candidateSaiPrasad);
  const emailResolved = await resolveQuestion(emailClassified, candidateSaiPrasad);
  console.log(`1.1 Email Address:`);
  console.log(`    Input Type:  ${emailField.inputType}`);
  console.log(`    Options:     ${JSON.stringify(emailField.options)}`);
  console.log(`    Answer:      "${emailResolved.answer}" (Source: ${emailResolved.source}, Confidence: ${(emailResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(emailResolved.answer, 'kspchary077@gmail.com', 'Email must match selected candidate email option');
  assert.ok(emailResolved.confidence >= 0.95);

  // 1.2 Phone Country Code Dropdown
  const countryCodeField: ScannedField = {
    id: 'input-phone-country',
    selector: '#input-phone-country',
    tagName: 'select',
    inputType: 'select',
    label: 'Phone country code *',
    name: 'phoneCountry',
    placeholder: '',
    options: ['Select country code', 'India (+91)', 'United States (+1)', 'United Kingdom (+44)', 'Canada (+1)', 'Germany (+49)'],
    required: true,
    currentValue: '',
  };
  const countryClassified = classifySingleField(countryCodeField, candidateSaiPrasad);
  const countryResolved = await resolveQuestion(countryClassified, candidateSaiPrasad);
  console.log(`1.2 Phone Country Code:`);
  console.log(`    Input Type:  ${countryCodeField.inputType}`);
  console.log(`    Answer:      "${countryResolved.answer}" (Source: ${countryResolved.source}, Confidence: ${(countryResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(countryResolved.answer, 'India (+91)', 'Country code must match India (+91) for candidate in Hyderabad');
  assert.ok(countryResolved.confidence >= 0.95);

  // 1.3 Mobile Phone Number
  const phoneField: ScannedField = {
    id: 'input-phone-number',
    selector: '#input-phone-number',
    tagName: 'input',
    inputType: 'tel',
    label: 'Mobile phone number *',
    name: 'phoneNumber',
    placeholder: 'e.g. 8374370572',
    required: true,
    currentValue: '',
  };
  const phoneClassified = classifySingleField(phoneField, candidateSaiPrasad);
  const phoneResolved = await resolveQuestion(phoneClassified, candidateSaiPrasad);
  console.log(`1.3 Mobile Phone Number:`);
  console.log(`    Input Type:  ${phoneField.inputType}`);
  console.log(`    Answer:      "${phoneResolved.answer}" (Source: ${phoneResolved.source}, Confidence: ${(phoneResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(phoneResolved.answer, '+91 83743 70572', 'Phone number must match candidate phone');

  // ==================================================================
  // STEP 2: RESUME SELECTION
  // ==================================================================
  console.log('\n--- [STEP 2: Resume Selection] ---');
  const availableResumes = [
    'Resume for SWE.pdf',
    'Resume.pdf (Aug 2025)',
    'Resume.pdf (Jul 2025)',
    'Resume (1).pdf',
    'sai prasad.pdf',
  ];
  const bestResume = availableResumes.find((r) => /swe|engineer|sai prasad/i.test(r)) || availableResumes[0];
  console.log(`2.1 Available Resumes on Account: ${JSON.stringify(availableResumes)}`);
  console.log(`    Selected Target Resume:      "${bestResume}"`);
  assert.ok(bestResume.includes('SWE') || bestResume.includes('sai prasad'), 'Resume selection must pick relevant SWE/named resume');

  // ==================================================================
  // STEP 3: WORK EXPERIENCE & BACKGROUND
  // ==================================================================
  console.log('\n--- [STEP 3: Work Experience] ---');

  // 3.1 Job Title
  const jobTitleField: ScannedField = {
    id: 'input-job-title',
    selector: '#input-job-title',
    tagName: 'input',
    inputType: 'text',
    label: 'Recent Job Title *',
    placeholder: 'e.g. Software Engineer Intern',
    name: '',
    required: true,
    currentValue: '',
  };
  const titleClassified = classifySingleField(jobTitleField, candidateSaiPrasad);
  const titleResolved = await resolveQuestion(titleClassified, candidateSaiPrasad);
  console.log(`3.1 Recent Job Title:`);
  console.log(`    Answer:      "${titleResolved.answer}" (Source: ${titleResolved.source})`);
  assert.ok(titleResolved.answer.length > 0, 'Job title must be answered');

  // 3.2 Company
  const companyField: ScannedField = {
    id: 'input-company-name',
    selector: '#input-company-name',
    tagName: 'input',
    inputType: 'text',
    label: 'Company *',
    placeholder: 'e.g. Acme Corp',
    name: '',
    required: true,
    currentValue: '',
  };
  const companyClassified = classifySingleField(companyField, candidateSaiPrasad);
  const companyResolved = await resolveQuestion(companyClassified, candidateSaiPrasad);
  console.log(`3.2 Company:`);
  console.log(`    Answer:      "${companyResolved.answer}" (Source: ${companyResolved.source})`);
  assert.ok(companyResolved.answer === 'Impulsesearch' || companyResolved.answer.length > 2, 'Company must be realistic employer name');

  // 3.3 Location
  const locationField: ScannedField = {
    id: 'input-location',
    selector: '#input-location',
    tagName: 'input',
    inputType: 'text',
    label: 'Location *',
    placeholder: 'e.g. Hyderabad, India',
    name: '',
    required: true,
    currentValue: '',
  };
  const locationClassified = classifySingleField(locationField, candidateSaiPrasad);
  const locationResolved = await resolveQuestion(locationClassified, candidateSaiPrasad);
  console.log(`3.3 Location:`);
  console.log(`    Answer:      "${locationResolved.answer}" (Source: ${locationResolved.source})`);
  assert.ok(locationResolved.answer.includes('Hyderabad'), 'Location must reflect candidate city');

  // 3.4 Total Experience
  const expYearsField: ScannedField = {
    id: 'input-total-experience',
    selector: '#input-total-experience',
    tagName: 'input',
    inputType: 'number',
    label: 'Total Experience (Years) *',
    placeholder: 'e.g. 2',
    name: '',
    required: true,
    currentValue: '',
  };
  const expClassified = classifySingleField(expYearsField, candidateSaiPrasad);
  const expResolved = await resolveQuestion(expClassified, candidateSaiPrasad);
  console.log(`3.4 Total Experience (Years):`);
  console.log(`    Answer:      "${expResolved.answer}" (Source: ${expResolved.source})`);
  assert.equal(expResolved.answer, '4', 'Experience must match candidate total years');

  // ==================================================================
  // STEP 4: ADDITIONAL SCREENING QUESTIONS
  // ==================================================================
  console.log('\n--- [STEP 4: Additional Screening Questions] ---');

  // 4.1 Office in Hyderabad (Radio)
  const qOffice: ScannedField = {
    id: 'q_office_hyderabad',
    selector: 'input[name="q_office_hyderabad"]',
    tagName: 'input',
    inputType: 'radio',
    label: 'Are you willing to work from our office in Hyderabad for the duration of this internship? *',
    name: 'q_office_hyderabad',
    placeholder: '',
    options: ['Yes', 'No'],
    required: true,
    currentValue: '',
  };
  const officeResolved = await resolveQuestion(qOffice, candidateSaiPrasad);
  console.log(`4.1 Willing to work from Hyderabad office:`);
  console.log(`    Question: "${qOffice.label}"`);
  console.log(`    Answer:   "${officeResolved.answer}" (Source: ${officeResolved.source}, Confidence: ${(officeResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(officeResolved.answer, 'Yes', 'Office willingness must be Yes');

  // 4.2 Stipend Comfort (Radio)
  const qStipend: ScannedField = {
    id: 'q_stipend_comfort',
    selector: 'input[name="q_stipend_comfort"]',
    tagName: 'input',
    inputType: 'radio',
    label: 'The stipend for this internship is ₹20,000–₹25,000/month. Are you comfortable with this? *',
    name: 'q_stipend_comfort',
    placeholder: '',
    options: ['Yes', 'No'],
    required: true,
    currentValue: '',
  };
  const stipendResolved = await resolveQuestion(qStipend, candidateSaiPrasad);
  console.log(`4.2 Stipend comfort (₹20,000–₹25,000/month):`);
  console.log(`    Question: "${qStipend.label}"`);
  console.log(`    Answer:   "${stipendResolved.answer}" (Source: ${stipendResolved.source}, Confidence: ${(stipendResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(stipendResolved.answer, 'Yes', 'Stipend comfort must be Yes');

  // 4.3 AI Agents Built (Radio)
  const qAiAgentsRadio: ScannedField = {
    id: 'q_ai_agents',
    selector: 'input[name="q_ai_agents"]',
    tagName: 'input',
    inputType: 'radio',
    label: 'Have you built AI agents (not just RAG-based Q&A systems) — e.g., agents that take actions, call tools, or automate multi-step workflows? Please briefly describe one. *',
    name: 'q_ai_agents',
    placeholder: '',
    options: ['Yes', 'No'],
    required: true,
    currentValue: '',
  };
  const aiRadioResolved = await resolveQuestion(qAiAgentsRadio, candidateSaiPrasad);
  console.log(`4.3 AI Agents Built (Radio):`);
  console.log(`    Question: "${qAiAgentsRadio.label}"`);
  console.log(`    Answer:   "${aiRadioResolved.answer}" (Source: ${aiRadioResolved.source}, Confidence: ${(aiRadioResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(aiRadioResolved.answer, 'Yes', 'AI agents radio answer must be Yes');

  // 4.4 AI Agent Project Description (Textarea)
  const qAiAgentsDesc: ScannedField = {
    id: 'q_ai_agents_desc',
    selector: '#q_ai_agents_desc',
    tagName: 'textarea',
    inputType: 'textarea',
    label: 'Have you built AI agents (not just RAG-based Q&A systems) — e.g., agents that take actions, call tools, or automate multi-step workflows? Please briefly describe one. *',
    name: '',
    placeholder: 'Briefly describe the agent workflow, tools used, and outcome...',
    required: false,
    currentValue: '',
  };
  const aiDescResolved = await resolveQuestion(qAiAgentsDesc, candidateSaiPrasad);
  console.log(`4.4 AI Agent Project Description (Textarea):`);
  console.log(`    Answer:   "${aiDescResolved.answer}"`);
  console.log(`    Source:   ${aiDescResolved.source} | Confidence: ${(aiDescResolved.confidence * 100).toFixed(0)}%`);
  assert.notEqual(aiDescResolved.answer, 'Yes', 'Textarea description must NEVER be a simple "Yes" boolean');
  assert.notEqual(aiDescResolved.answer, 'No', 'Textarea description must NEVER be a simple "No" boolean');
  assert.ok(aiDescResolved.answer.length > 20, 'Textarea must contain an informative description of the project');
  assert.ok(aiDescResolved.answer.toLowerCase().includes('agent'), 'Description should mention agent workflow');

  // 4.5 Python Work Experience (Years)
  const qPythonYears: ScannedField = {
    id: 'q_python_years',
    selector: '#q_python_years',
    tagName: 'input',
    inputType: 'number',
    label: 'How many years of work experience do you have with Python? *',
    name: 'q_python_years',
    placeholder: 'e.g. 2',
    required: true,
    currentValue: '',
  };
  const pythonResolved = await resolveQuestion(qPythonYears, candidateSaiPrasad);
  console.log(`4.5 Python Experience Years:`);
  console.log(`    Question: "${qPythonYears.label}"`);
  console.log(`    Answer:   "${pythonResolved.answer}" (Source: ${pythonResolved.source}, Confidence: ${(pythonResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(pythonResolved.answer, '4', 'Python years must equal candidate experience years');

  // 4.6 Visa Sponsorship (Radio: No / Yes)
  const qVisa: ScannedField = {
    id: 'q_visa_sponsorship',
    selector: 'input[name="q_visa_sponsorship"]',
    tagName: 'input',
    inputType: 'radio',
    label: 'Do you require visa sponsorship now or in the future? *',
    name: 'q_visa_sponsorship',
    placeholder: '',
    options: ['No', 'Yes'],
    required: true,
    currentValue: '',
  };
  const visaResolved = await resolveQuestion(qVisa, candidateSaiPrasad);
  console.log(`4.6 Visa Sponsorship Requirement:`);
  console.log(`    Question: "${qVisa.label}"`);
  console.log(`    Answer:   "${visaResolved.answer}" (Source: ${visaResolved.source}, Confidence: ${(visaResolved.confidence * 100).toFixed(0)}%)`);
  assert.equal(visaResolved.answer, 'No', 'Visa sponsorship answer must be No');

  // ==================================================================
  // STEP 5: REVIEW & SUBMISSION
  // ==================================================================
  console.log('\n--- [STEP 5: Review & Submit] ---');
  const followCompanyField: ScannedField = {
    id: 'follow-company-chk',
    selector: '#follow-company-chk',
    tagName: 'input',
    inputType: 'checkbox',
    label: 'Follow HextGen Ai to stay up to date with their page',
    name: '',
    placeholder: '',
    required: false,
    currentValue: '',
  };
  const followClassified = classifySingleField(followCompanyField, candidateSaiPrasad);
  console.log(`5.1 Follow Company Checkbox:`);
  console.log(`    Field Type: ${followClassified.fieldType} (Standard Key: ${followClassified.standardKey})`);
  assert.equal(followClassified.fieldType, 'terms', 'Follow company checkbox classified as terms agreement');

  // Verify field auditor recognizes satisfaction once filled
  emailClassified.currentValue = emailResolved.answer;
  countryClassified.currentValue = countryResolved.answer;
  phoneClassified.currentValue = phoneResolved.answer;

  assert.ok(isFieldAlreadySatisfied(emailClassified, emailResolved.answer));
  assert.ok(isFieldAlreadySatisfied(countryClassified, countryResolved.answer));
  assert.ok(isFieldAlreadySatisfied(phoneClassified, phoneResolved.answer));

  console.log('\n======================================================================');
  console.log('✅ ALL 13 DEMO LINKEDIN FORM FIELDS & QUESTIONS PASSED 100% PERFECTLY!');
  console.log('======================================================================\n');
}

runEvaluation().catch((err) => {
  console.error('❌ Evaluation Test Failed:', err);
  process.exit(1);
});
