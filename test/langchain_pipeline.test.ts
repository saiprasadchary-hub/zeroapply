import assert from 'node:assert/strict';
import { LangChainPipeline, langchainPipeline } from '../src/agent/brain/langchainPipeline';
import { buildLangChainPromptTemplate, buildQuestionPrompt } from '../src/agent/brain/promptBuilder';
import { LangChainResumeRAG, langchainResumeRAG } from '../src/agent/rag/langchainResumeRAG';
import { resolveQuestion } from '../src/agent/form/questionResolver';
import type { PersonaData } from '../src/types';
import type { ClassifiedField } from '../src/agent/form/fieldClassifier';

console.log('====================================================');
console.log('[TEST] RUNNING LANGCHAIN PRODUCTION WORKFLOW TESTS');
console.log('====================================================');

// Sample Test Persona
const mockPersona: PersonaData = {
  fullName: 'Alex Vance',
  email: 'alex.vance@example.com',
  phone: '+1 555-0199',
  location: 'San Francisco, CA',
  experienceYears: 6,
  minSalary: 160,
  workPreference: 'Remote',
  targetRoles: ['Staff Frontend Engineer', 'Full Stack Developer'],
  techStack: ['TypeScript', 'React', 'Node.js', 'Next.js', 'LangChain'],
  education: 'B.S. in Computer Science, Stanford University, 2018',
  tone: 'Confident',
  resumeText: `
ALEX VANCE
Email: alex.vance@example.com | Phone: +1 555-0199 | Location: San Francisco, CA

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 6+ years of experience engineering high-throughput web applications and AI agent workflows using TypeScript, React, and Node.js.

WORK EXPERIENCE
Staff Frontend Engineer | TechCorp Inc. (2021 - Present)
- Architected enterprise React design systems cutting load times by 45%.
- Built LangChain-powered automated reasoning pipelines with local LLMs.
- Led a squad of 8 engineers delivering mission-critical cloud integrations.

Software Engineer | NextGen Apps (2018 - 2021)
- Developed REST and GraphQL microservices serving 2M+ active users.
- Improved database query performance by 60% using Redis caching.

EDUCATION
B.S. in Computer Science | Stanford University (2014 - 2018)
GPA: 3.8 / 4.0. Core coursework: Distributed Systems, Algorithms, Machine Learning.

SKILLS
Languages: TypeScript, JavaScript, Python, SQL, Go
Frameworks: React, Next.js, Express, LangChain, Tailwind CSS
Cloud & DevOps: Docker, Kubernetes, AWS, CI/CD, Git
`,
};

// ----------------------------------------------------
// TEST 1: LangChain ChatPromptTemplate Construction
// ----------------------------------------------------
console.log('>> TEST 1: Testing LangChain ChatPromptTemplate generation...');
const promptTemplate = buildLangChainPromptTemplate({
  question: 'How many years of professional experience do you have?',
  persona: mockPersona,
  inputType: 'number',
});

assert.ok(promptTemplate, 'Prompt template should be created');
assert.ok(promptTemplate.promptMessages, 'Should contain prompt messages');
assert.equal(promptTemplate.promptMessages.length, 2, 'Should have system and human prompt messages');
console.log('   [PASS] LangChain ChatPromptTemplate successfully assembled.');

// ----------------------------------------------------
// TEST 2: LangChain RecursiveCharacterTextSplitter RAG
// ----------------------------------------------------
console.log('>> TEST 2: Testing LangChain Resume RAG Document indexing...');
const docs = await langchainResumeRAG.indexPersona(mockPersona);
assert.ok(docs.length >= 3, `Expected at least 3 Document chunks, got ${docs.length}`);

// Verify Document structure & metadata
const firstDoc = docs[0];
assert.ok(firstDoc.pageContent.length > 0, 'Document must have pageContent');
assert.ok(firstDoc.metadata.section, 'Document must have metadata.section');
assert.ok(Array.isArray(firstDoc.metadata.keywords), 'Document must have keyword array');
assert.equal(firstDoc.metadata.source, 'resume');
assert.equal(firstDoc.metadata.candidateName, 'Alex Vance');
console.log(`   [PASS] Indexed ${docs.length} LangChain Documents with validated metadata.`);

// ----------------------------------------------------
// TEST 3: Semantic Document Retrieval via LangChain
// ----------------------------------------------------
console.log('>> TEST 3: Testing context retrieval for specific questions...');

const expContext = langchainResumeRAG.retrieveContext('What companies have you worked at and what were your responsibilities?');
assert.match(expContext, /TechCorp/i, 'Should retrieve TechCorp experience chunk');
assert.match(expContext, /Staff Frontend Engineer/i);

const eduContext = langchainResumeRAG.retrieveContext('Where did you complete your degree or university education?');
assert.match(eduContext, /Stanford/i, 'Should retrieve Stanford education chunk');

console.log('   [PASS] Context retriever accurately matched experience and education chunks.');

// ----------------------------------------------------
// TEST 4: LangChain Pipeline Execution & Resilience
// ----------------------------------------------------
console.log('>> TEST 4: Testing LangChain LCEL pipeline resilience...');
const pipeline = LangChainPipeline.getInstance();
assert.equal(pipeline.getModelName(), 'qwen2.5:1.5b');

const prompt = buildQuestionPrompt({
  question: 'Are you legally authorized to work in the United States?',
  persona: mockPersona,
  inputType: 'select',
  options: ['Yes', 'No'],
});

// Execute pipeline (returns model response if Ollama is up, or returns clean error without throwing)
const result = await pipeline.execute(prompt, { timeoutMs: 6000 });
assert.equal(typeof result.latencyMs, 'number');
assert.ok(result.latencyMs >= 0);
assert.equal(typeof result.success, 'boolean');
console.log(`   [PASS] Pipeline executed cleanly (success=${result.success}, latency=${result.latencyMs}ms).`);

// ----------------------------------------------------
// TEST 5: Question Resolver with LangChain Integration
// ----------------------------------------------------
console.log('>> TEST 5: Testing questionResolver end-to-end with LangChain...');
const testField: ClassifiedField = {
  elementId: 'input_work_auth',
  fieldType: 'work_authorization',
  confidence: 0.95,
  name: 'work_auth',
  label: 'Are you authorized to work in the US?',
  inputType: 'select',
  options: ['Yes', 'No'],
  required: true,
  visible: true,
  disabled: false,
  readOnly: false,
};

const resolved = await resolveQuestion(testField, mockPersona);
assert.ok(resolved.answer.length > 0, 'Answer must not be empty');
assert.ok(['Yes', 'No'].includes(resolved.answer), 'Answer must match one of the available options');
assert.ok(resolved.confidence > 0, 'Confidence must be positive');
assert.equal(resolved.source, 'memory', 'Should resolve from Memory Bank');
console.log(`   [PASS] Question resolved: "${resolved.question}" => "${resolved.answer}" (source=${resolved.source}).`);

// ----------------------------------------------------
// TEST 6: LinkedIn Commute Question Resolution
// ----------------------------------------------------
console.log('>> TEST 6: Testing LinkedIn Easy Apply commute question resolution...');
const commuteField: ClassifiedField = {
  elementId: 'radio_commute_1',
  fieldType: 'commute',
  confidence: 0.95,
  name: 'commute_question',
  label: "Are you comfortable commuting to this job's location?",
  inputType: 'radio',
  options: ['Yes', 'No'],
  required: true,
  visible: true,
  disabled: false,
  readOnly: false,
};

const commuteResolved = await resolveQuestion(commuteField, mockPersona);
assert.ok(['Yes', 'No'].includes(commuteResolved.answer));
console.log(`   [PASS] Commute question resolved: "${commuteResolved.question}" => "${commuteResolved.answer}" (source=${commuteResolved.source}).`);

// ----------------------------------------------------
// TEST 7: Advanced Option Parser with Phrases and Ranges
// ----------------------------------------------------
console.log('>> TEST 7: Testing answerParser option matching resilience...');
import { parseAnswer } from '../src/agent/brain/answerParser';

const p1 = parseAnswer('Yes, I am comfortable commuting to the office location', { options: ['Yes', 'No'] });
assert.equal(p1.selectedOption, 'Yes', 'Should match affirmative phrase to Yes option');

const p2 = parseAnswer('No, I require visa sponsorship in the future', { options: ['Yes', 'No'] });
assert.equal(p2.selectedOption, 'No', 'Should match negative phrase to No option');

const p3 = parseAnswer('I have 4 years of experience', { options: ['0-1 years', '2-3 years', '4-6 years', '7+ years'] });
assert.equal(p3.selectedOption, '4-6 years', 'Should match numeric range option');
console.log('   [PASS] Option parser matched phrases and numeric ranges accurately.');

// ----------------------------------------------------
// TEST 8: Memory Bank Persistence and Fast Recall
// ----------------------------------------------------
console.log('>> TEST 8: Testing Memory Bank save and recall...');
import { questionMemory } from '../src/agent/brain/questionMemory';
questionMemory.save('Do you have experience with Kubernetes in production?', 'Yes', 'user_override', 1.0);

const k8sField: ClassifiedField = {
  elementId: 'k8s_field',
  fieldType: 'custom_question',
  confidence: 0.5,
  label: 'Do you have experience with Kubernetes in production?',
  inputType: 'radio',
  options: ['Yes', 'No'],
  required: true,
  visible: true,
  disabled: false,
  readOnly: false,
};

const k8sResolved = await resolveQuestion(k8sField, mockPersona);
assert.equal(k8sResolved.answer, 'Yes');
assert.equal(k8sResolved.source, 'memory');
assert.equal(k8sResolved.fromCache, true);
console.log(`   [PASS] Saved memory bank question recalled instantly: "${k8sResolved.question}" => "${k8sResolved.answer}".`);

console.log('====================================================');
console.log('ALL LANGCHAIN PRODUCTION WORKFLOW TESTS PASSED (8 / 8)');
console.log('====================================================');
