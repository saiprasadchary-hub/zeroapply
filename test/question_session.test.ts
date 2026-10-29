import assert from 'node:assert/strict';
import { createQuestionSession } from '../src/agent/localLlm/questionSession';
let calls = 0;
const resolve = createQuestionSession(async () => { calls++; return { answer: '', confidence: 0, source: 'llm', resumeContext: 'Applicant information is missing.' }; });
const field = { label: 'Which LLM APIs and frameworks have you used?', inputType: 'text' };
const first = resolve(field);
assert.equal(resolve(field), first);
await first;
await resolve({ ...field, id: 'rerendered-control' });
assert.equal(calls, 1, 'an unresolved answer must not trigger identical audit inference');
await resolve({ ...field, validationError: 'Use a comma-separated list' });
assert.equal(calls, 2, 'new validation constraints can trigger a fresh answer');
await resolve({ ...field, options: ['Yes', 'No'] });
assert.equal(calls, 3);
let failures = 0;
const retry = createQuestionSession(async () => { failures++; throw new Error('transport failure'); });
await assert.rejects(retry(field));
await assert.rejects(retry(field));
assert.equal(failures, 2, 'rejected transport requests do not poison the session');
console.log('Per-run reuse, context invalidation and rejected-request cleanup passed.');

let transientCalls = 0;
const transient = createQuestionSession(async () => {
  transientCalls++;
  return transientCalls === 1
    ? { answer: '', confidence: 0, source: 'llm', retryable: true, resumeContext: 'Local AI timed out.' }
    : { answer: 'Python', confidence: 1, source: 'llm' };
});
assert.equal((await transient(field)).answer, 'Python', 'Transient failure recovers before returning to the field loop');
await transient(field);
assert.equal(transientCalls, 2, 'Audit reuses recovered answer');
let repeatedFailures = 0;
const bounded = createQuestionSession(async () => {
  repeatedFailures++;
  return { answer: '', confidence: 0, source: 'llm', retryable: true };
});
await bounded(field);
await bounded(field);
assert.equal(repeatedFailures, 2, 'Repeated failures cannot create an endless retry loop');
console.log('Transient retry and retry limit passed.');
