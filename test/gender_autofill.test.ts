import assert from 'node:assert/strict';
import { isGenderQuestion, resolveGenderAnswer } from '../src/agent/autofill/genderAnswer';
import { classifySingleField, type ScannedField } from '../src/agent/domScanner/fieldClassifier';
import { resolveFormStepBatch, resolveQuestionCognitively } from '../src/agent/localLlm/ultraQuestionResolver';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import type { PersonaData } from '../src/types';

const persona: PersonaData = { fullName: 'Sai Prasad', email: '', phone: '', location: '', linkedIn: '', gitHub: '', portfolio: '', experienceYears: 0, minSalary: 0, workPreference: 'Remote', tone: 'Minimalist', techStack: [], targetRoles: [], applyMode: 'easy', verified: false };
const options = ['Male', 'Female'];
assert.equal(resolveGenderAnswer(persona, options), '');
assert.equal(resolveGenderAnswer({ ...persona, gender: 'Female' }, options), 'Female');
assert.equal(resolveGenderAnswer({ ...persona, gender: 'Man' }, options), 'Male');
assert.equal(resolveGenderAnswer({ ...persona, gender: 'Non-binary' }, options), '');
assert.equal(resolveGenderAnswer(persona, [...options, 'Prefer not to say']), 'Prefer not to say');
assert.equal(isGenderQuestion('Sex'), true);
assert.equal(isGenderQuestion('Sexual orientation'), false);
const field: ScannedField = { id: 'gender', selector: '#gender', tagName: 'input', inputType: 'radio', label: 'Gender', name: 'gender', placeholder: '', required: true, currentValue: '', options };
assert.equal(classifySingleField(field, { ...persona, gender: 'Female' }).mappedValue, 'Female');
assert.equal(classifySingleField(field, persona).mappedValue, '');
const target = { id: 'gender', label: 'Gender', options, required: true };
assert.equal((await resolveQuestionCognitively(target, persona)).answer, '');
assert.equal((await resolveQuestionCognitively(target, { ...persona, gender: 'Female' })).answer, 'Female');
assert.equal((await resolveFormStepBatch([target], { ...persona, gender: 'Male' })).get('gender')?.answer, 'Male');
assert.equal((await resolveFormStepBatch([target], persona)).get('gender')?.answer, '');
console.log('Gender autofill regression checks passed');

assert.equal((await resolveQuestion(field, persona)).answer, '');
assert.equal((await resolveQuestion(field, { ...persona, gender: 'Female' })).answer, 'Female');
