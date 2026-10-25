import assert from 'node:assert/strict';
import { runLocalMLClassification } from '../src/resume-autofill/localMLParser';
import { calculateAtsScore } from '../src/ats/atsScorer';
import type { PersonaData } from '../src/types';

const persona: PersonaData = {
  fullName: 'Old Applicant', email: 'old@example.com', phone: '+91 9876543210',
  location: 'Hyderabad', linkedIn: '', gitHub: '', portfolio: '',
  experienceYears: 8, minSalary: 50, applicationLimit: 5,
  techStack: ['Docker'], targetRoles: [], workPreference: 'Remote',
  tone: 'Confident', applyMode: 'easy', verified: true,
};
const text = `Name: María O'Connor
Pune | maria@sample.org | +91 98765 43210
Skills
C++, C#, React
Education
Bachelor of Computer Science
2018 – 2022
Experience
Intern at Hyderabad Labs
2023 – 2024`;
const parsed = await runLocalMLClassification(text, persona);
assert.equal(parsed.fullName, "María O'Connor");
assert.equal(parsed.city, 'Pune');
assert.equal(parsed.postalCode, '');
assert.equal(parsed.experienceYears, undefined);
assert.deepEqual(parsed.techStack, ['React', 'C++', 'C#']);
assert.equal(parsed.education, 'Bachelor of Computer Science');
const years = await runLocalMLClassification('Alex Smith\nSummary\n2.5 years of professional experience', persona);
assert.equal(years.experienceYears, 2.5);
const result = calculateAtsScore(persona, text);
assert.equal(result.wordCount, text.split(/\s+/).length);
assert.ok(result.detectedSkills.some((skill) => skill.name === 'C++'));
assert.ok(result.detectedSkills.some((skill) => skill.name === 'C#'));
assert.ok(!result.detectedSkills.some((skill) => skill.name === 'Docker'));
assert.equal(calculateAtsScore({ ...persona, resumeText: text }, text).overallScore, result.overallScore);
assert.equal(calculateAtsScore(persona, '').wordCount, 0);
assert.equal(calculateAtsScore(persona, '').pillars.contactProfile.items[1].passed, false);
assert.match(result.summaryDescription, /heuristic readiness estimate/);
console.log('Resume upload grounding and ATS evidence checks passed.');
