import { installSalaryRate } from '../src/agent/localLlm/salaryExchange';
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

for (const question of [
  'How many years of work experience do you have with Python (Programming Language)?',
  'How many years of exp do you have with Celery?',
  'How many months of work experience do you have with Python?',
]) {
  assert.equal(resolveScreeningFact(question, persona), '0', question);
}
assert.equal(resolveScreeningFact('Do you have more than 5 years of exp?', persona), 'No');
assert.equal(resolveScreeningFact('Do you have more than 5 years of exp?', { ...employed, experienceYears: 5 }), 'No');
assert.equal(resolveScreeningFact('Do you have more than 5 years of exp?', { ...employed, experienceYears: 6 }), 'Yes');
assert.equal(resolveScreeningFact('How many years of work experience do you have with Python (Programming Language)?', { ...employed, experienceYears: 5 }), '', 'Total tenure does not imply Python tenure');
assert.equal(resolveScreeningFact('in how many days can you join us ?*', persona), '0');
assert.equal(resolveScreeningFact('in how many days can you join us ?*', { ...employed, noticePeriodDays: 30 }), '30');
const rating = 'How would you rate your Data Structures & Algorithms skills on a scale of 1–10?*';
assert.equal(resolveScreeningFact(rating, persona), '', 'Self-ratings must not be invented');
assert.equal(resolveScreeningFact(rating, { ...persona, verifiedScreeningAnswers: { [rating]: '7' } }), '7');

assert.equal(resolveScreeningFact('Current CTC in USD', fresher), '0');
installSalaryRate({ base: 'INR', date: new Date().toISOString().slice(0, 10), rates: { USD: 0.01 } });
assert.equal(resolveScreeningFact('Expected CTC in USD', fresher), '6000');
assert.equal(resolveScreeningFact('Current Designation*', fresher), 'Fresher');
assert.equal(resolveScreeningFact('Income Expectations', fresher), '600000');
assert.equal(resolveScreeningFact('Current CTC in USD', { ...fresher, employmentStatus: 'currently_working' }), '8000');
