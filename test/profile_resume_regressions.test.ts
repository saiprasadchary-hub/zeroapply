import assert from 'node:assert/strict';
import type { PersonaData } from '../src/types';
import { personaToResume, DEFAULT_RESUME_DOCUMENT } from '../src/resume/exportUtils';
import { buildResumeChunks, findRelevantResumeContext } from '../src/agent/memory/resumeContextRetriever';
import { questionMemory } from '../src/agent/memory/questionMemoryBank';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';

const persona: PersonaData = {
  fullName: 'Test Applicant', email: 'applicant@example.com', phone: '',
  location: 'Bengaluru, Karnataka, India', city: 'Bengaluru',
  linkedIn: '', gitHub: '', portfolio: '', experienceYears: 0,
  minSalary: 50, applicationLimit: 50, techStack: ['React'],
  targetRoles: ['Software Engineering Intern'], workPreference: 'Remote',
  tone: 'Confident', applyMode: 'easy', verified: false,
  resumeChunks: { experience: 'Built mobile interfaces using React Native.', projects: 'Built CampusChat with WebSockets and SQLite.' },
};

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => { store.set(key, value); },
  removeItem: (key: string): void => { store.delete(key); },
  clear: (): void => store.clear(),
} });
store.set('zeroapply_persona_profiles_list', JSON.stringify([{ id: 'test', name: 'Test', data: persona, createdAt: '2026-01-01' }]));
const { PersonaManager } = await import('../src/persona/personaManager');
const restored = PersonaManager.getActiveProfile().data;
assert.equal(restored.location, persona.location);
assert.equal(restored.city, persona.city);
assert.equal(restored.experienceYears, 0);
assert.equal(restored.minSalary, 50);
assert.equal(restored.applicationLimit, 50);

const resume = personaToResume(persona);
assert.equal(resume.contact.fullName, persona.fullName);
assert.equal(resume.contact.portfolio, '');
assert.deepEqual(resume.experience, []);
assert.deepEqual(resume.education, []);
assert.deepEqual(resume.projects, []);
assert.deepEqual(resume.certifications, []);
assert.deepEqual(resume.skills.tools, []);
const existing = structuredClone(DEFAULT_RESUME_DOCUMENT);
assert.deepEqual(personaToResume(persona, existing).experience, existing.experience);
assert.equal(DEFAULT_RESUME_DOCUMENT.contact.fullName, 'Alex Vance');

const chunks = buildResumeChunks(persona);
assert.match(findRelevantResumeContext('Describe a significant engineering project you built', chunks, 1), /CampusChat/);
const originalFetch = globalThis.fetch;
globalThis.fetch = async (): Promise<Response> => { throw new Error('Offline test'); };
try {
  questionMemory.clear();
  const essay = await resolveQuestion({ label: 'What is your experience in mobile application development?', inputType: 'textarea' }, persona);
  assert.match(essay.answer, /React Native/);
  questionMemory.clear();
  const years = await resolveQuestion({ label: 'How many years of experience do you have?', inputType: 'number' }, persona);
  assert.equal(years.answer, '0');
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Profile preservation, resume isolation, project retrieval, and experience answers passed.');
