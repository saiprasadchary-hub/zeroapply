import { checkOllamaStatus, generateOllamaAnswer, getActiveModelName } from '../src/agent/localLlm/ollamaClient';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import type { PersonaData } from '../src/types';

async function main() {
  console.log('=== TESTING LOCAL LLM CONNECTION & INFERENCE ===');
  const modelName = getActiveModelName();
  console.log(`Active Target Model: ${modelName}`);

  const status = await checkOllamaStatus(2000);
  console.log('Ollama Status Result:', JSON.stringify(status, null, 2));

  const mockPersona: PersonaData = {
    fullName: 'Sai Prasad Chary',
    email: 'kspchary077@gmail.com',
    phone: '+91 83743 70572',
    location: 'Hyderabad, India',
    experienceYears: 5,
    minSalary: 20,
    workPreference: 'Remote',
    tone: 'Confident',
    techStack: ['TypeScript', 'React', 'Node.js', 'Python', 'AI Agents'],
    targetRoles: ['Full Stack Engineer', 'AI Agent Developer'],
    applyMode: 'easy',
    verified: true,
    resumeText: `
      SAI PRASAD CHARY
      Full Stack & AI Engineer with 5 years of experience building high-throughput systems, browser automation, and local LLM agents.
      Key skills: TypeScript, React, Python, Playwright, Ollama, LangChain.
    `,
  };

  // Test 1: Direct Ollama query
  if (status.online) {
    console.log('\n--- Test 1: Direct Local LLM Prompt Inference ---');
    try {
      const response = await generateOllamaAnswer(
        'Answer in one word: What is 2 + 2?',
        'You are a direct, concise assistant.'
      );
      console.log(`Raw Local LLM Response: "${response.trim()}"`);
    } catch (e: any) {
      console.log('Direct LLM Generation error:', e.message);
    }
  } else {
    console.log('\n⚠️ Ollama is currently offline on http://127.0.0.1:11434.');
  }

  // Test 2: Full Question Resolver Pipeline (Tier 1 Memory -> Tier 2 Persona -> Tier 3 Local LLM)
  console.log('\n--- Test 2: Full Multi-Tier Question Answering Pipeline ---');
  const q1 = await resolveQuestion(
    {
      label: 'How many years of work experience do you have in software development?',
      inputType: 'number',
    },
    mockPersona
  );
  console.log('Q1: "Years of work experience?"');
  console.log(`-> Answer: "${q1.answer}" | Source: [${q1.source.toUpperCase()}] | Confidence: ${q1.confidence}`);

  const q2 = await resolveQuestion(
    {
      label: 'Are you comfortable working in a remote environment?',
      inputType: 'select',
      options: ['Yes', 'No'],
    },
    mockPersona
  );
  console.log('\nQ2: "Comfortable working remote?"');
  console.log(`-> Answer: "${q2.answer}" | Source: [${q2.source.toUpperCase()}] | Confidence: ${q2.confidence}`);

  const q3 = await resolveQuestion(
    {
      label: 'Do you have experience developing AI Agents or TypeScript applications?',
      inputType: 'radio',
      options: ['Yes', 'No'],
    },
    mockPersona
  );
  console.log('\nQ3: "Experience developing AI Agents or TypeScript applications?"');
  console.log(`-> Answer: "${q3.answer}" | Source: [${q3.source.toUpperCase()}] | Confidence: ${q3.confidence}`);

  const q4 = await resolveQuestion(
    {
      label: 'Have you ever been convicted of a felony or crime?',
      inputType: 'radio',
      options: ['Yes', 'No'],
    },
    mockPersona
  );
  console.log('\nQ4: "Convicted of felony/crime (Disqualification Guard)?"');
  console.log(`-> Answer: "${q4.answer}" | Source: [${q4.source.toUpperCase()}] | Confidence: ${q4.confidence}`);

  // Test 3: Novel Open-Ended Question routed to Tier 3 Local LLM
  console.log('\n--- Test 3: Novel Question routed to Tier 3 Local LLM (Ollama) ---');
  const q5 = await resolveQuestion(
    {
      label: 'Briefly describe your strongest technical achievement building browser automation or AI tools',
      inputType: 'textarea',
    },
    mockPersona
  );
  console.log('Q5: "Briefly describe your strongest technical achievement..."');
  console.log(`-> Answer: "${q5.answer}" | Source: [${q5.source.toUpperCase()}] | Confidence: ${q5.confidence}`);
}

main().catch(console.error);
