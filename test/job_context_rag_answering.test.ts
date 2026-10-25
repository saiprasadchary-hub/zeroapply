import assert from 'node:assert/strict';
import {
  extractJobContext,
  EXTRACT_JOB_CONTEXT_SCRIPT,
  type ExtractedJobContext,
} from '../src/agent/vision';
import { buildQuestionPrompt } from '../src/agent/localLlm/promptBuilder';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import type { PersonaData } from '../src/types';

console.log('=== TEST 1: Job Context Extraction Script Syntax ===');
assert.ok(EXTRACT_JOB_CONTEXT_SCRIPT.includes('skillsRequired'));
assert.ok(EXTRACT_JOB_CONTEXT_SCRIPT.includes('jobTitle'));
assert.doesNotThrow(() => {
  new Function(EXTRACT_JOB_CONTEXT_SCRIPT);
});
console.log('✓ EXTRACT_JOB_CONTEXT_SCRIPT compiled with zero syntax errors');

console.log('=== TEST 2: High-Level extractJobContext Bridge ===');
const mockWebview = {
  executeJavaScript: async () => {
    return {
      jobTitle: 'AI Automation Engineer',
      companyName: 'Anthropic Partner Lab',
      location: 'Hyderabad, India',
      workplaceType: 'Hybrid',
      employmentType: 'Full-time',
      compensation: '₹25,000 - ₹35,000/month',
      experienceRequired: '2+ years of experience',
      skillsRequired: ['Python', 'TypeScript', 'LangChain', 'React', 'Docker'],
      jobSummary: 'Looking for an AI engineer to build autonomous tool-calling workflows.',
      rawDescriptionText: 'Full job description text...',
      timestamp: Date.now(),
    };
  },
};

(async () => {
  const context = await extractJobContext(mockWebview as any);
  assert.equal(context.jobTitle, 'AI Automation Engineer');
  assert.equal(context.companyName, 'Anthropic Partner Lab');
  assert.equal(context.workplaceType, 'Hybrid');
  assert.deepEqual(context.skillsRequired, ['Python', 'TypeScript', 'LangChain', 'React', 'Docker']);
  console.log('✓ Job context successfully extracted: ' + context.jobTitle + ' at ' + context.companyName);

  console.log('=== TEST 3: PromptBuilder with Job Context RAG Injection ===');
  const dummyPersona: PersonaData = {
    fullName: 'Sai Prasad',
    email: 'sai@example.com',
    phone: '+91 9999999999',
    location: 'Hyderabad, India',
    workPreference: 'Remote',
    experienceYears: 4,
    minSalary: 25000,
    techStack: ['Python', 'TypeScript'],
    targetRoles: ['AI Engineer'],
  };

  const built = buildQuestionPrompt({
    question: 'Why do you want to work at this company?',
    persona: dummyPersona,
    jobContext: context,
  });

  assert.ok(built.userPrompt.includes('TARGET ROLE ON WEBPAGE:'));
  assert.ok(built.userPrompt.includes('Anthropic Partner Lab'));
  assert.ok(built.userPrompt.includes('AI Automation Engineer'));
  assert.ok(built.userPrompt.includes('LangChain'));
  console.log('✓ Local Qwen prompt enriched with webpage target role and required skills');

  console.log('=== TEST 4: Inverted Question Disqualification Safety Guard ===');
  // 1. Criminal record / Felony question -> MUST BE NO
  const felonyRes = await resolveQuestion(
    { label: 'Have you ever been convicted of a felony or misdemeanor crime?' },
    dummyPersona
  );
  assert.equal(felonyRes.answer, 'No');
  assert.equal(felonyRes.confidence, 1.0);
  console.log('✓ Inverted Guard: Felony question answered strictly "No"');

  // 2. Disciplinary termination -> MUST BE NO
  const firedRes = await resolveQuestion(
    { label: 'Have you ever been discharged or terminated for cause from any prior employment?' },
    dummyPersona
  );
  assert.equal(firedRes.answer, 'No');
  assert.equal(firedRes.confidence, 1.0);
  console.log('✓ Inverted Guard: Termination for cause answered strictly "No"');

  // 3. Non-compete agreement -> MUST BE NO
  const nonCompeteRes = await resolveQuestion(
    { label: 'Are you currently bound by any non-compete or restrictive covenant agreement?' },
    dummyPersona
  );
  assert.equal(nonCompeteRes.answer, 'No');
  assert.equal(nonCompeteRes.confidence, 1.0);
  console.log('✓ Inverted Guard: Non-compete agreement answered strictly "No"');

  // 4. Age 18+ requirement -> MUST BE YES
  const ageRes = await resolveQuestion(
    { label: 'Are you at least 18 years of age?' },
    dummyPersona
  );
  assert.equal(ageRes.answer, 'Yes');
  assert.equal(ageRes.confidence, 1.0);
  console.log('✓ Affirmative Guard: Age 18+ requirement answered strictly "Yes"');

  // 5. Background check consent -> MUST BE YES
  const bgCheckRes = await resolveQuestion(
    { label: 'Do you consent to a mandatory background check?' },
    dummyPersona
  );
  assert.equal(bgCheckRes.answer, 'Yes');
  assert.equal(bgCheckRes.confidence, 1.0);
  console.log('✓ Affirmative Guard: Background check consent answered strictly "Yes"');

  console.log('\n🎉 ALL JOB CONTEXT & INVERTED SAFETY GUARD TESTS PASSED (100%)!');
})();
