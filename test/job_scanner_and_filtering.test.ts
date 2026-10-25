import assert from 'node:assert/strict';
import {
  filterEasyApplyCards,
  rankJobCards,
  type DetectedJobCard,
} from '../src/agent/jobScanner/jobCardDetector';
import {
  extractSkillsFromDescription,
} from '../src/agent/jobScanner/jobDescriptionExtractor';
import { JobMatchScorer } from '../src/agent/jobScanner/jobMatchScorer';
import type { PersonaData } from '../src/types';

console.log('=== TEST 1: Job Card Detection & Easy Apply Filtering ===');
const mockCards: DetectedJobCard[] = [
  {
    jobId: '101',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
    location: 'Remote',
    isEasyApply: true,
    selector: '[data-job-id="101"]',
  },
  {
    jobId: '102',
    title: 'Senior React Developer',
    company: 'InnovateX',
    location: 'San Francisco, CA',
    isEasyApply: false,
    selector: '[data-job-id="102"]',
  },
  {
    jobId: '103',
    title: 'AI Automation Intern',
    company: 'Apex Dynamics',
    location: 'Hyderabad, India',
    isEasyApply: true,
    selector: '[data-job-id="103"]',
  },
];

const easyApplyOnly = filterEasyApplyCards(mockCards);
assert.equal(easyApplyOnly.length, 2);
assert.equal(easyApplyOnly[0].jobId, '101');
assert.equal(easyApplyOnly[1].jobId, '103');
console.log('✓ filterEasyApplyCards successfully identified Easy Apply cards.');

console.log('=== TEST 2: Job Card Target Role Ranking ===');
const ranked = rankJobCards(mockCards, ['AI Automation Intern']);
assert.equal(ranked[0].jobId, '103');
console.log('✓ rankJobCards accurately prioritized target role card to the top.');

console.log('=== TEST 3: Technical Skills Extraction from Job Description ===');
const sampleDesc = `
We are looking for a Senior Full Stack AI Engineer.
Requirements:
- Strong proficiency with React, TypeScript, and Node.js.
- Experience with Ollama, LLMs, and Python edge pipelines.
- Hands-on deployment with Docker and Kubernetes on AWS.
`;

const extractedSkills = extractSkillsFromDescription(sampleDesc);
assert.ok(extractedSkills.includes('react'));
assert.ok(extractedSkills.includes('typescript'));
assert.ok(extractedSkills.includes('python'));
assert.ok(extractedSkills.includes('docker'));
assert.ok(extractedSkills.includes('aws'));
assert.ok(extractedSkills.includes('ollama'));
console.log('✓ extractSkillsFromDescription detected:', extractedSkills);

console.log('=== TEST 4: Job Match Scoring Compatibility ===');
const candidatePersona: PersonaData = {
  fullName: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '+1-555-0100',
  location: 'Remote',
  experienceYears: 5,
  techStack: ['React', 'TypeScript', 'Node.js', 'Python', 'Ollama', 'Docker'],
  targetRoles: ['Senior Full Stack AI Engineer', 'AI Automation Intern'],
  workPreference: 'Remote',
} as PersonaData;

const highMatchJob = {
  title: 'Senior Full Stack AI Engineer',
  descriptionText: sampleDesc,
};

const lowMatchJob = {
  title: 'Pediatric Dental Surgeon',
  descriptionText: 'Requires dental degree, clinic hygiene certification, and teeth extraction experience.',
};

const highEval = JobMatchScorer.evaluate(highMatchJob, candidatePersona, 60);
const lowEval = JobMatchScorer.evaluate(lowMatchJob, candidatePersona, 60);

assert.equal(highEval.isMatch, true);
assert.equal(highEval.recommendation, 'APPLY');
assert.ok(highEval.score >= 75);

assert.equal(lowEval.isMatch, false);
assert.equal(lowEval.recommendation, 'SKIP');
assert.ok(lowEval.score < 40);

console.log(`✓ High match evaluated: ${highEval.score}% [${highEval.recommendation}]`);
console.log(`✓ Low match evaluated: ${lowEval.score}% [${lowEval.recommendation}]`);

console.log('\n🎉 ALL JOB SCANNER & FILTERING TESTS PASSED (100%)!');
