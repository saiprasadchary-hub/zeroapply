import assert from 'node:assert/strict';
import { resolveScreeningFact } from '../src/agent/localLlm/screeningFacts';
import type { PersonaData } from '../src/types';
const persona = { employmentStatus: 'fresher', experienceYears: 0, minSalary: 3, location: 'Hyderabad, India' } as PersonaData;
assert.equal(resolveScreeningFact('Do you have minimum 2-3 years minimum of C++ or Python industrial experience', persona), 'No');
assert.equal(resolveScreeningFact('Are you ok to overlap with some pacific time zone hours for meetings and collaborations?', persona), '');
assert.equal(resolveScreeningFact('Have you ever applied to our company before?', persona), '');
assert.equal(resolveScreeningFact('What is your desired pay rate in LPA? Please review job post.', persona), '3');
assert.equal(resolveScreeningFact('First name', persona), undefined);
console.log('Screening facts: experience, compensation and unknown commitments verified.');

assert.equal(resolveScreeningFact('What is your desired pay rate in LPA?', { ...persona, minSalary: 0 }), '0');

const fresher = { ...persona, expectedSalaryLpa: 6, currentCtcLpa: 8 };
assert.equal(resolveScreeningFact('Current CTC in LPA', fresher), '0');
assert.equal(resolveScreeningFact('Current CTC in INR', fresher), '0');
assert.equal(resolveScreeningFact('Desired salary in LPA', fresher), '6');
assert.equal(resolveScreeningFact('Expected annual salary in INR', fresher), '600000');
assert.equal(resolveScreeningFact('Expected monthly salary in INR', fresher), '50000');
const employed = { ...fresher, employmentStatus: 'currently_working' as const, currentCtcLpa: 8 };
assert.equal(resolveScreeningFact('Current CTC in LPA', employed), '8');
assert.equal(resolveScreeningFact('Current salary in INR', employed), '800000');
assert.equal(resolveScreeningFact('Expected CTC in LPA', employed), '6');
assert.equal(resolveScreeningFact('Expected CTC in LPA', { ...employed, expectedSalaryLpa: 0 }), '');

assert.equal(resolveScreeningFact('Are you ok to overlap with some pacific time zone hours?', { ...persona, workingHoursPreference: 'daytime' }), 'No');
assert.equal(resolveScreeningFact('Have you ever applied to our company before?', persona, { previouslyAppliedToCompany: false }), 'No');
assert.equal(resolveScreeningFact('Have you ever applied to our company before?', persona, { previouslyAppliedToCompany: true }), 'Yes');

assert.equal(resolveScreeningFact('Can you work in the Indian time zone (IST)?', { ...persona, workingHoursPreference: 'daytime' }), 'Yes');
assert.equal(resolveScreeningFact('Can you work in the Australian time zone?', { ...persona, workingHoursPreference: 'daytime' }), '');
assert.equal(resolveScreeningFact('Are you authorized to work in the US?', persona), '');
assert.equal(resolveScreeningFact('What is your GPA?', persona), '');
assert.equal(resolveScreeningFact('What is your GPA?', { ...persona, education: 'CGPA: 8.2' }), '8.2');
assert.equal(resolveScreeningFact('What year did you graduate?', persona), '');
assert.equal(resolveScreeningFact('Are you authorized to work in the US?', { ...persona, verifiedScreeningAnswers: { 'Are you authorized to work in the US?': 'No' } }), 'No');
