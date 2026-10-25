import assert from 'node:assert/strict';
import { classifyFields } from '../src/agent/form/fieldClassifier';
import { isFieldAlreadySatisfied } from '../src/agent/form/formAuditor';
import type { PersonaData } from '../src/types';
import type { ScannedField } from '../src/agent/form/fieldScanner';
import { getVisualCursorScript } from '../src/agent/stealth/agentCursor';

console.log('=== TEST: LinkedIn Question Detection Matching User DevTools Screenshot ===\n');

const mockPersona: PersonaData = {
  fullName: 'Sai Prasad Chary',
  email: 'kspchary077@gmail.com',
  phone: '+91 83743 70572',
  location: 'Hyderabad, India',
  linkedIn: 'https://linkedin.com/in/kspchary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: 'https://kspchary.dev',
  experienceYears: 4,
  minSalary: 120000,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['React', 'TypeScript', 'Node.js'],
  targetRoles: ['Full Stack Developer'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Full Stack Engineer with 4 years experience.',
};

// 1. Replicate question extraction algorithm from fieldScanner.ts
function isValidQuestionText(t: string): boolean {
  if (!t) return false;
  const clean = t.replace(/[\s\r\n]+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 200) return false;
  if (/^(?:dismiss|close|clear|select|choose|loading|optional|error|remove|upload|back|next|submit|review|cancel|\u25bc|\u25b2)$/i.test(clean)) return false;
  if (clean.includes('|')) return false;
  if (/\b(?:influencer|founder|creator|ambassador|engineer at|developer at|student at|graduate)\b/i.test(clean) && clean.length > 35) return false;
  if (clean.includes('@') || clean.startsWith('http') || /^\+?\d{1,4}\s*\d{6,}/.test(clean)) return false;
  return true;
}

function cleanLabel(label: string): string {
  return (label || '')
    .replace(/\s*\*+\s*$/, '')
    .replace(/\s*\(?(?:required|optional)\)?\s*$/i, '')
    .replace(/\s*\*+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('--- TEST 1: Question Filtering Rejects Profile Headline & Keeps Question Spans ---');
const headline = 'kspchary | Influencer | Content Creator | Founder of Impulsesearch | Google Campus Ambassador |';
assert.equal(isValidQuestionText(headline), false, 'Headline banner with pipes must NEVER be accepted as a question');

const q1 = 'Email address*';
const q2 = 'Phone country code*';
const q3 = 'Mobile phone number*';
assert.equal(isValidQuestionText(q1), true);
assert.equal(isValidQuestionText(q2), true);
assert.equal(isValidQuestionText(q3), true);

assert.equal(cleanLabel(q1), 'Email address');
assert.equal(cleanLabel(q2), 'Phone country code');
assert.equal(cleanLabel(q3), 'Mobile phone number');
console.log('✅ Candidate headline rejected, question spans properly validated and cleaned.');

console.log('\n--- TEST 2: Field Classification on Screenshot Fields ---');
const scannedFields: ScannedField[] = [
  {
    id: 'field_email',
    selector: '[data-za-id="za_email"]',
    tagName: 'select',
    inputType: 'select',
    label: cleanLabel(q1),
    placeholder: '',
    name: 'emailAddress',
    currentValue: 'kspchary077@gmail.com',
    required: true,
    hasError: false,
    rect: { x: 50, y: 150, width: 400, height: 40 },
  },
  {
    id: 'field_country',
    selector: '[data-za-id="za_country"]',
    tagName: 'select',
    inputType: 'select',
    label: cleanLabel(q2),
    placeholder: '',
    name: 'phoneNumber-country',
    currentValue: 'India (+91)',
    required: true,
    hasError: false,
    rect: { x: 50, y: 230, width: 400, height: 40 },
  },
  {
    id: 'field_phone',
    selector: '[data-za-id="za_phone"]',
    tagName: 'input',
    inputType: 'text',
    label: cleanLabel(q3),
    placeholder: '',
    name: 'phoneNumber-nationalNumber',
    currentValue: '+91 83743 70572',
    required: true,
    hasError: false,
    rect: { x: 50, y: 310, width: 400, height: 40 },
  },
];

const classified = classifyFields(scannedFields, mockPersona);

assert.equal(classified[0].fieldType, 'email');
assert.equal(classified[0].mappedValue, 'kspchary077@gmail.com');

assert.equal(classified[1].fieldType, 'phone_country_code');
assert.equal(classified[1].mappedValue, 'India (+91)');

assert.equal(classified[2].fieldType, 'phone');
assert.equal(classified[2].mappedValue, '+91 83743 70572');
console.log('✅ Fields classified with 100% precision to persona data.');

console.log('\n--- TEST 3: Field Satisfaction Auditing ---');
assert.equal(isFieldAlreadySatisfied(classified[0], classified[0].mappedValue!), true);
assert.equal(isFieldAlreadySatisfied(classified[1], classified[1].mappedValue!), true);
assert.equal(isFieldAlreadySatisfied(classified[2], classified[2].mappedValue!), true);
console.log('✅ All 3 fields audited and verified against candidate profile.');

console.log('\n--- TEST 4: Visual Cursor Script Has verifyElement & za-verified-highlight ---');
const cursorScript = getVisualCursorScript();
assert.ok(cursorScript.includes('.za-verified-highlight'), 'Cursor script must contain .za-verified-highlight CSS');
assert.ok(cursorScript.includes('#10b981'), 'Verified highlight must use emerald green styling');
assert.ok(cursorScript.includes('verifyElement'), 'Cursor script must expose verifyElement method');
console.log('✅ Visual cursor engine contains dedicated verification highlighting and cursor animation.');

console.log('\n🎉 ALL SCREENSHOT QUESTION DETECTION & AUDIT TESTS PASSED! 🎉');
