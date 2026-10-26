import assert from 'node:assert/strict';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { resolveScreeningFact } from '../src/agent/localLlm/screeningFacts';
import type { PersonaData } from '../src/types';

async function runTests() {
  // Test 1: Availability range matching ("within 15 to 30days")
  const fresherPersona = {
    fullName: 'Sai Prasad',
    employmentStatus: 'fresher',
    experienceYears: 0,
    noticePeriodDays: 0,
    techStack: ['React', 'TypeScript', 'Python', 'FastAPI'],
    skills: ['Python', 'FastAPI'],
    location: 'Hyderabad, India',
  } as PersonaData;

  const joinQuestion = 'Can you join us within 15 to 30days?*';
  assert.equal(
    resolveScreeningFact(joinQuestion, fresherPersona),
    'Yes',
    'Fresher should be able to join within 15 to 30 days'
  );

  const experiencedPersona30d = {
    ...fresherPersona,
    employmentStatus: 'currently_working',
    experienceYears: 2,
    noticePeriodDays: 20,
  } as PersonaData;

  assert.equal(
    resolveScreeningFact(joinQuestion, experiencedPersona30d),
    'Yes',
    'Candidate with 20 days notice should be able to join within 15 to 30 days'
  );

  const experiencedPersona60d = {
    ...fresherPersona,
    employmentStatus: 'currently_working',
    experienceYears: 4,
    noticePeriodDays: 60,
  } as PersonaData;

  assert.equal(
    resolveScreeningFact(joinQuestion, experiencedPersona60d),
    'No',
    'Candidate with 60 days notice cannot join within 15 to 30 days'
  );

  // Test 2: LLM APIs and frameworks resolution with detected tools from candidate resume & stack
  const personaWithAiTools = {
    ...fresherPersona,
    techStack: ['Python', 'FastAPI', 'PyTorch'],
    resumeText: 'Developed autonomous agent workflows using LangChain and OpenAI API integrations.',
  } as PersonaData;

  const res1 = await resolveQuestion(
    { label: 'Which LLM APIs and frameworks have you used?*', inputType: 'text' },
    personaWithAiTools
  );
  assert.ok(res1.answer.length > 0, 'Answer must not be empty');
  assert.ok(res1.answer.includes('OpenAI API'), 'Should detect OpenAI API');
  assert.ok(res1.answer.includes('LangChain'), 'Should detect LangChain');
  assert.ok(res1.answer.includes('FastAPI'), 'Should detect FastAPI');
  assert.equal(res1.source, 'persona');

  // Test 3: LLM APIs with default grounded industry stack when resume has generic tech
  const genericPersona = {
    fullName: 'Sai Prasad',
    employmentStatus: 'fresher',
    experienceYears: 0,
    techStack: ['React', 'TypeScript', 'Node.js', 'Python'],
    skills: ['JavaScript', 'HTML/CSS'],
    targetRoles: ['AI Engineer', 'Full Stack Developer'],
  } as PersonaData;

  const res2 = await resolveQuestion(
    { label: 'Which LLM APIs and frameworks have you used?*', inputType: 'text' },
    genericPersona
  );
  assert.ok(res2.answer.length > 0, 'Answer must not be empty');
  assert.ok(res2.answer.includes('OpenAI API'), 'Default must include OpenAI API');
  assert.ok(res2.answer.includes('LangChain'), 'Default must include LangChain');
  assert.ok(res2.answer.includes('Ollama'), 'Default must include Ollama');

  // Test 4: Length-constrained LLM API question (e.g. maxLength: 20)
  const res3 = await resolveQuestion(
    { label: 'Which LLM APIs and frameworks have you used?', inputType: 'text', maxLength: 20 },
    personaWithAiTools
  );
  assert.ok(res3.answer.length <= 20, `Answer length (${res3.answer.length}) should not exceed maxLength 20`);
  assert.ok(res3.answer.length > 0, 'Constrained answer must not be empty');

  // Test 5: Binary Yes/No question for LLM experience
  const res4 = await resolveQuestion(
    {
      label: 'Do you have experience with LLM APIs and frameworks?',
      inputType: 'radio',
      options: ['Yes', 'No'],
    },
    personaWithAiTools
  );
  assert.equal(res4.answer, 'Yes', 'Binary option question should resolve to Yes');

  // Test 6: Experience years query should NOT return tools string
  const res5 = await resolveQuestion(
    { label: 'How many years of experience do you have with LLMs?', inputType: 'text' },
    fresherPersona
  );
  assert.equal(res5.answer, '0', 'Years question for fresher must return 0, not tools string');

  console.log('All LLM APIs & frameworks resolver tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
