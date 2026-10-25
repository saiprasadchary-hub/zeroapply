import { buildSearchUrl } from '../src/agent/search';
import {
  llmEngine,
  langchainPipeline,
  buildQuestionPrompt,
  parseAnswer,
  resolveQuestion,
} from '../src/agent/llm';
import type { PersonaData } from '../src/types';

async function verifyModularizedDomains() {
  console.log('=== TEST 1: Verifying src/agent/search ===');
  const linkedinUrl = buildSearchUrl('linkedin', 'Frontend Engineer', 'Remote');
  console.log('Generated LinkedIn Search URL:', linkedinUrl);
  if (!linkedinUrl.includes('linkedin.com/jobs/search')) {
    throw new Error('Search URL verification failed for LinkedIn');
  }

  const indeedUrl = buildSearchUrl('indeed', 'Full Stack Developer', 'New York');
  console.log('Generated Indeed Search URL:', indeedUrl);
  if (!indeedUrl.includes('indeed.com/jobs')) {
    throw new Error('Search URL verification failed for Indeed');
  }
  console.log('✓ src/agent/search verified successfully!\n');

  console.log('=== TEST 2: Verifying src/agent/llm (PromptBuilder & AnswerParser) ===');
  const mockPersona: PersonaData = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    experienceYears: 6,
    minSalary: 140000,
    workPreference: 'Remote',
    techStack: ['TypeScript', 'React', 'Node.js'],
    targetRoles: ['Senior Frontend Engineer'],
    resumeText: 'Experienced Senior Frontend Engineer with 6 years building high-performance web apps.',
  };

  const prompt = buildQuestionPrompt({
    question: 'How many years of experience do you have with TypeScript?',
    persona: mockPersona,
    inputType: 'number',
  });
  console.log('Prompt built successfully. System prompt length:', prompt.systemPrompt.length);

  const parsed = parseAnswer('Based on my experience, I have 6 years', { inputType: 'number' });
  console.log('Parsed Answer:', parsed);
  if (parsed.answer !== '6') {
    throw new Error(`Expected numeric answer '6', got '${parsed.answer}'`);
  }
  console.log('✓ PromptBuilder & AnswerParser verified successfully!\n');

  console.log('=== TEST 3: Verifying src/agent/llm (Ollama / LangChain / Fallback) ===');
  const isHealthy = await llmEngine.checkOllamaHealth(true);
  console.log('Ollama health check:', isHealthy ? 'ONLINE' : 'OFFLINE (Fallback Active)');

  const resolved = await resolveQuestion(
    {
      element: {} as any,
      fieldType: 'screening',
      label: 'Are you legally authorized to work?',
      inputType: 'radio',
      options: ['Yes', 'No'],
      required: true,
      confidence: 0.9,
    },
    mockPersona
  );
  console.log('Resolved Question Result:', resolved);
  if (!resolved.answer || !['Yes', 'No'].includes(resolved.answer)) {
    throw new Error(`Invalid resolved answer: ${resolved.answer}`);
  }
  console.log('✓ src/agent/llm questionResolver verified successfully!\n');

  console.log('ALL MODULAR DOMAIN VERIFICATIONS PASSED (100%)!');
}

verifyModularizedDomains().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
