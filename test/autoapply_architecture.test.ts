import assert from 'node:assert/strict';
import {
  QuestionMemoryBank,
  normalizeQuestion,
  tokenize,
} from '../src/agent/brain/questionMemory';
import {
  buildResumeChunks,
  findRelevantResumeContext,
  extractKeywords,
} from '../src/agent/brain/resumeContext';
import { buildQuestionPrompt } from '../src/agent/brain/promptBuilder';
import {
  cleanRawOutput,
  matchBestOption,
  parseNumericValue,
  parseAnswer,
} from '../src/agent/brain/answerParser';
import { classifyFields } from '../src/agent/form/fieldClassifier';
import { WorkflowStateMachine } from '../src/agent/workflow/stateMachine';
import type { PersonaData } from '../src/types';

const mockPersona: PersonaData = {
  fullName: 'Alex Vance',
  location: 'San Francisco, CA, USA',
  email: 'alex@example.com',
  phone: '+1 555-0199',
  linkedIn: 'https://linkedin.com/in/alexvance',
  gitHub: 'https://github.com/alexvance',
  portfolio: 'https://alexvance.dev',
  experienceYears: 6,
  minSalary: 25,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS'],
  targetRoles: ['Senior Frontend Engineer', 'Full Stack Developer'],
  applyMode: 'easy',
  verified: true,
  resumeText: `
PROFESSIONAL SUMMARY
Experienced Full Stack Engineer with 6+ years designing high-throughput web applications and scalable cloud systems.

WORK EXPERIENCE
Senior Software Engineer at Acme Corp (2021 - Present)
- Engineered real-time data pipelines using Node.js and TypeScript handling 50k events/sec.
- Architected performant React frontend with sub-100ms render times.

EDUCATION
Bachelor of Science in Computer Science, University of California, Berkeley
`,
};

console.log('--- Testing Question Memory Bank ---');
const memory = QuestionMemoryBank.getInstance();
memory.clear();

// Seed from persona
memory.seedFromPersona(mockPersona);

// Exact lookup
const exact = memory.lookup('Legal authorization to work');
assert.equal(exact.hit, true, 'Exact lookup should hit');
assert.equal(exact.answer, 'Yes');

// Fuzzy lookup with synonym expansion & phrasing change
const fuzzyYrs = memory.lookup('How many yrs exp do you have?');
assert.equal(fuzzyYrs.hit, true, 'Fuzzy lookup with yrs exp should hit');
assert.equal(fuzzyYrs.answer, '6');

const fuzzySpons = memory.lookup('Do you require visa sponsorship now or in the future?');
assert.equal(fuzzySpons.hit, true, 'Fuzzy lookup for sponsorship should hit');
assert.equal(fuzzySpons.answer, 'No');

console.log('✅ QuestionMemoryBank: Exact and fuzzy retrieval verified.');

console.log('--- Testing Resume Context & RAG ---');
const chunks = buildResumeChunks(mockPersona);
assert.ok(chunks.length >= 2, 'Should extract at least 2 sections');

const expContext = findRelevantResumeContext('What did you build at Acme Corp with React?', chunks);
assert.ok(expContext.includes('React'), 'Context should contain React excerpt');
assert.ok(expContext.includes('Acme Corp'), 'Context should contain Acme Corp excerpt');

console.log('✅ ResumeContext: Semantic chunking and token scoring verified.');

console.log('--- Testing Prompt Builder & Answer Parser ---');
const prompt = buildQuestionPrompt({
  question: 'Are you legally authorized to work in the United States?',
  persona: mockPersona,
  options: ['Yes, I am authorized', 'No, I need sponsorship'],
  inputType: 'select',
});
assert.ok(prompt.systemPrompt.includes('Respond with EXACTLY one matching option'), 'System prompt should include guardrails');
assert.ok(prompt.userPrompt.includes('Alex Vance'), 'User prompt should include candidate name');

// Answer Parser tests
const rawWithThink = '<think>Candidate is authorized</think>```\nYes, I am authorized\n```';
const cleaned = cleanRawOutput(rawWithThink);
assert.equal(cleaned, 'Yes, I am authorized');

const optionMatch = matchBestOption('Yes', ['Yes, I am authorized', 'No']);
assert.ok(optionMatch !== null, 'Option match should succeed');
assert.equal(optionMatch?.option, 'Yes, I am authorized');

const numVal = parseNumericValue('$120,000 / year');
assert.equal(numVal, '120000');

console.log('✅ PromptBuilder & AnswerParser: Formatting and fuzzy matching verified.');

console.log('--- Testing Field Classifier ---');
const scannedFields = [
  {
    id: 'f1',
    selector: '#first_name',
    tagName: 'input',
    inputType: 'text',
    label: 'First Name *',
    placeholder: 'Given name',
    name: 'firstName',
    currentValue: '',
    required: true,
    hasError: false,
    rect: { x: 0, y: 0, width: 100, height: 30 },
  },
  {
    id: 'f2',
    selector: '#email',
    tagName: 'input',
    inputType: 'email',
    label: 'Email address',
    placeholder: '',
    name: 'email',
    currentValue: '',
    required: true,
    hasError: false,
    rect: { x: 0, y: 35, width: 100, height: 30 },
  },
  {
    id: 'f3',
    selector: '#exp',
    tagName: 'input',
    inputType: 'number',
    label: 'Total years of experience',
    placeholder: '',
    name: 'yearsOfExp',
    currentValue: '',
    required: true,
    hasError: false,
    rect: { x: 0, y: 70, width: 100, height: 30 },
  },
];

const classified = classifyFields(scannedFields, mockPersona);
assert.equal(classified[0]?.fieldType, 'first_name');
assert.equal(classified[0]?.mappedValue, 'Alex');
assert.equal(classified[1]?.fieldType, 'email');
assert.equal(classified[1]?.mappedValue, 'alex@example.com');
assert.equal(classified[2]?.fieldType, 'years_exp');
assert.equal(classified[2]?.mappedValue, '6');

console.log('✅ FieldClassifier: Direct persona mapping verified.');

console.log('--- Testing Workflow State Machine ---');
const sm = new WorkflowStateMachine();
assert.equal(sm.getState(), 'idle');

assert.equal(sm.transition('analyzing'), true);
assert.equal(sm.getState(), 'analyzing');

assert.equal(sm.transition('scanning'), true);
assert.equal(sm.getState(), 'scanning');

assert.equal(sm.transition('filling'), true);
assert.equal(sm.getState(), 'filling');

assert.equal(sm.transition('submitting'), true);
assert.equal(sm.getState(), 'submitting');

assert.equal(sm.transition('confirming'), true);
assert.equal(sm.getState(), 'confirming');

assert.equal(sm.transition('done'), true);
assert.equal(sm.getState(), 'done');

console.log('✅ WorkflowStateMachine: State transitions verified.');

console.log('\n🎉 ALL ZEROAPPLY AUTOAPPLY ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉\n');
