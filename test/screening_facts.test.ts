import assert from 'node:assert/strict';
import { resolveScreeningFact } from '../src/agent/localLlm/screeningFacts';
import type { PersonaData } from '../src/types';
const persona = { employmentStatus: 'fresher', experienceYears: 0, minSalary: 3 } as PersonaData;
assert.equal(resolveScreeningFact('Do you have minimum 2-3 years minimum of C++ or Python industrial experience', persona), 'No');
assert.equal(resolveScreeningFact('Are you ok to overlap with some pacific time zone hours for meetings and collaborations?', persona), '');
assert.equal(resolveScreeningFact('Have you ever applied to our company before?', persona), '');
assert.equal(resolveScreeningFact('What is your desired pay rate in LPA? Please review job post.', persona), '3');
assert.equal(resolveScreeningFact('First name', persona), undefined);
console.log('Screening facts: experience, compensation and unknown commitments verified.');

assert.equal(resolveScreeningFact('What is your desired pay rate in LPA?', { ...persona, minSalary: 0 }), '');
