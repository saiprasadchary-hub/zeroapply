import assert from 'node:assert/strict';
import { processTracker } from '../src/agent/tracker/processTracker';

console.log('=== TEST SUITE: ZeroApply Process Tracker & Plain English Workflow ===');

// 1. Initial State
processTracker.clearAll();
assert.equal(processTracker.getSessions().length, 0, 'Should start with empty sessions');
console.log('✓ Clear sessions verified.');

// 2. Step 1: Navigated & Clicked Apply
const session = processTracker.startNewJob('Senior Full Stack Engineer', 'Stripe', 'LinkedIn');
assert.equal(session.jobTitle, 'Senior Full Stack Engineer');
assert.equal(session.companyName, 'Stripe');
assert.equal(session.steps.length, 1);
assert.equal(session.steps[0].stage, 'navigating');
assert.ok(session.steps[0].title.includes('Navigated to LinkedIn and clicked Apply'));
console.log('✓ Step 1: Navigated to LinkedIn & Clicked Apply logged.');

// 3. Step 2: Opened New Tab
processTracker.recordTabOpened('new_tab', 'https://stripe.com/jobs/apply/123');
assert.equal(session.steps.length, 2);
assert.equal(session.steps[1].stage, 'tab_opened');
assert.ok(session.steps[1].title.includes('Opened in a new browser tab'));
console.log('✓ Step 2: New tab opened logged.');

// 4. Step 3: Searching & Answering Questions
processTracker.recordQuestionAnswer('How many years of TypeScript experience do you have?', '6', 'persona', 'number');
processTracker.recordQuestionAnswer('Are you authorized to work in the United States?', 'Yes', 'memory', 'select');
processTracker.recordQuestionAnswer('Describe your experience building distributed APIs', 'Built high-throughput microservices handling 25k req/s.', 'llm', 'textarea');

const qaStep = session.steps.find((s) => s.stage === 'answering_questions');
assert.ok(qaStep, 'Should have answering_questions step');
assert.equal(qaStep.qaItems?.length, 3, 'Should have recorded 3 QA items');
assert.equal(session.questionsCount, 3);
console.log('✓ Step 3: Answering questions based on candidate profile logged (3 QA pairs).');

// 5. Step 4: Submission Verification
processTracker.recordSubmissionCheck(true, 'Application confirmed by ATS.');
assert.equal(session.status, 'submitted');
const subStep = session.steps.find((s) => s.stage === 'verifying_submission');
assert.ok(subStep);
assert.equal(subStep.status, 'completed');
assert.ok(subStep.title.includes('Yes, successfully submitted!'));
console.log('✓ Step 4: Submission verification logged (Yes, successfully submitted!).');

// 6. Step 5: Moving to Next Application
processTracker.recordMovingToNext('Lead Frontend Architect at Netflix');
const nextStep = session.steps.find((s) => s.stage === 'moving_to_next');
assert.ok(nextStep);
assert.ok(nextStep.description.includes('Lead Frontend Architect at Netflix'));
console.log('✓ Step 5: Moving to next application logged.');

console.log('\n🎉 ALL PROCESS TRACKER TESTS PASSED WITH 100% ACCURACY! 🎉');
