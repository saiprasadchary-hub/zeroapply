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

import { solveScreeningQuestion } from '../src/agent/llm/ollamaClient';
import type { PersonaData } from '../src/types';

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
  techStack: ['React', 'TypeScript', 'Node.js', 'Python', 'AI/LLM', 'FastAPI', 'TailwindCSS', 'Electron'],
  targetRoles: ['Full Stack AI Engineer', 'Frontend Architect'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Kammari Sai Prasad Chary - Full Stack AI Developer. 4+ years of experience building modern web apps with React, TypeScript, Python, FastAPI, and local LLM integrations. Education: B.Tech in Computer Science.',
  resumeChunks: {
    summary: 'Full Stack AI Developer with 4+ years experience engineering responsive web applications, electron desktop tools, and local LLM pipelines using React, TypeScript, Python, and FastAPI.',
    skills: 'React, TypeScript, JavaScript, Node.js, Python, FastAPI, Electron, TailwindCSS, REST APIs, Git, Docker, LLM Prompt Engineering',
    experience: 'Full Stack Engineer (2021-Present): Engineered AI-powered developer tools, optimized client rendering performance by 45%, and architected scalable backend microservices.',
    projects: 'Built ZeroApply AI desktop application with local Ollama integration, visual DOM automation, and multi-modal form recovery.',
    education: 'B.Tech in Computer Science and Engineering (2017-2021).',
    certifications: 'Certified AI & Cloud Solutions Specialist.',
    availability: 'Available to join immediately or within 2 weeks notice.',
    compensation: 'Expected compensation: ₹15,00,000 - ₹20,00,000 INR per annum ($120k USD equivalent).',
    workAuthorization: 'Authorized to work without sponsorship.',
    references: 'Available upon request from former engineering supervisors.'
  }
};

async function testQuestions() {
  const questions: Array<{ q: string; opts?: string[] }> = [
    { q: 'On a scale of 1 to 10, how interested are you in technology, AI, and startups?*' },
    { q: 'How many years of professional experience do you have with TypeScript and React?' },
    { q: 'Are you legally authorized to work in your country of residence without sponsorship?', opts: ['Yes', 'No'] },
    { q: 'Will you now or in the future require visa sponsorship?', opts: ['Yes', 'No'] },
    { q: 'What is your highest level of completed education?', opts: ['High School', 'Associate', "Bachelor's Degree", "Master's Degree", 'PhD'] },
    { q: 'Tell us about a notable project you built and technologies used.' },
    { q: 'What is your notice period or earliest start date?', opts: ['Immediate', '1-2 Weeks', '1 Month', '2+ Months'] },
    { q: 'What is your expected salary?' },
    { q: 'Why are you interested in this software engineering role?' },
    { q: 'Please provide references or supervisor contact details.' },
    { q: 'Are you comfortable reaching out to people you have never spoken to before through LinkedIn or email?*', opts: ['Select an option', 'Yes', 'No'] },
    { q: 'Do you have access to a laptop or desktop computer for this work?' },
    { q: 'Are you currently enrolled or a recent graduate?', opts: ['Yes', 'No'] },
    { q: 'Are you available for full-time employment upon graduation?', opts: ['Yes', 'No'] },
    { q: 'What is your graduation year or expected completion date?' },
    { q: 'Can you commit to 40 hours per week for this role?', opts: ['Yes', 'No'] },
    { q: 'What is your major or branch of study?', opts: ['Computer Science & Engineering', 'Electrical Engineering', 'Business', 'Other'] },
    { q: 'What relevant computer science coursework have you completed?' }
  ];

  console.log('======================================================');
  console.log('🧪 RESUME-TO-QUESTION EVALUATION TEST');
  console.log('Candidate: ' + candidatePersona.fullName);
  console.log('======================================================\n');

  for (let i = 0; i < questions.length; i++) {
    const item = questions[i];
    const res = await solveScreeningQuestion(item.q, candidatePersona, { availableOptions: item.opts });
    console.log(`[${i + 1}] Question: ${item.q}`);
    if (item.opts) console.log(`    Dropdown Options: ${JSON.stringify(item.opts)}`);
    console.log(`    🎯 Auto-Generated Answer: "${res.answer}"`);
    console.log(`    ⚡ Confidence: ${(res.confidence * 100).toFixed(0)}% | Source: ${res.source}`);
    console.log('------------------------------------------------------');
  }
}

testQuestions().catch(console.error);
