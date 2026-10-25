import assert from 'node:assert/strict';
import { processTracker, type JobApplicationSession } from '../src/agent/tracker/processTracker';

console.log('=== TEST SUITE: Real-Time Wizard Step-by-Step & Next/Submit Tracking ===');

// 1. Clear State
processTracker.clearAll();
assert.equal(processTracker.getSessions().length, 0);

// 2. Start Application Session
const session = processTracker.startNewJob('Senior TypeScript Engineer', 'Meta', 'LinkedIn');
assert.equal(session.jobTitle, 'Senior TypeScript Engineer');
assert.equal(session.companyName, 'Meta');
assert.equal(session.steps.length, 1);
assert.equal(session.steps[0].stage, 'navigating');
console.log('✓ Step 1: Navigated to job listing & clicked Apply.');

// 3. Tab / Modal Opened
processTracker.recordTabOpened('modal');
assert.equal(session.steps.length, 2);
assert.equal(session.steps[1].stage, 'tab_opened');
console.log('✓ Step 2: In-page Easy Apply modal opened.');

// 4. Wizard Step 1: Contact Information -> Answer Question -> Click "Next"
processTracker.recordFormStep(1, 'Contact Information', 3);
processTracker.recordQuestionAnswer('Email address', 'alex.morgan@example.com', 'persona');
processTracker.recordQuestionAnswer('Phone country code', 'United States (+1)', 'persona');
processTracker.recordQuestionAnswer('Mobile phone number', '555-0199', 'persona');
processTracker.recordStepAudit(1, 0, 0);

// Click "Next" to advance to Step 2
processTracker.recordStepAdvance({
  stepNumber: 1,
  stepTitle: 'Contact Information',
  buttonText: 'Next',
  action: 'next',
  nextStepNumber: 2,
  fieldsFilledCount: 3,
});

const step1Action = session.steps.find((s) => s.stage === 'clicking_action' && s.stepNumber === 1);
assert.ok(step1Action, 'Should record clicking_action for Step 1');
assert.equal(step1Action.buttonClicked, 'Next');
assert.ok(step1Action.title.includes('Clicked "Next"'));
assert.equal(step1Action.nextStepNumber, 2);
console.log('✓ Wizard Step 1: Filled contact questions -> Clicked "Next" -> Advancing to Step 2 logged.');

// 5. Wizard Step 2: Resume Selection -> Click "Next"
processTracker.recordFormStep(2, 'Resume & Experience', 1);
processTracker.recordQuestionAnswer('Resume upload / selection', 'Alex_Morgan_Senior_Engineer.pdf', 'resume');
processTracker.recordStepAudit(2, 0, 0);

// Click "Next" to advance to Step 3
processTracker.recordStepAdvance({
  stepNumber: 2,
  stepTitle: 'Resume & Experience',
  buttonText: 'Next',
  action: 'next',
  nextStepNumber: 3,
  fieldsFilledCount: 4,
});

const step2Action = session.steps.find((s) => s.stage === 'clicking_action' && s.stepNumber === 2);
assert.ok(step2Action, 'Should record clicking_action for Step 2');
assert.equal(step2Action.buttonClicked, 'Next');
assert.equal(step2Action.nextStepNumber, 3);
console.log('✓ Wizard Step 2: Selected candidate resume -> Clicked "Next" -> Advancing to Step 3 logged.');

// 6. Wizard Step 3: Screening Questions (Qwen 2.5 3B local LLM) -> Click "Review"
processTracker.recordFormStep(3, 'Screening Questions', 2);
processTracker.recordQuestionAnswer('How many years of work experience do you have with React?', '6', 'llm');
processTracker.recordQuestionAnswer('Will you now or in the future require visa sponsorship?', 'No', 'llm');
processTracker.recordStepAudit(3, 0, 0);

// Click "Review" to advance to Step 4
processTracker.recordStepAdvance({
  stepNumber: 3,
  stepTitle: 'Screening Questions',
  buttonText: 'Review your application',
  action: 'review',
  nextStepNumber: 4,
  fieldsFilledCount: 6,
});

const step3Action = session.steps.find((s) => s.stage === 'clicking_action' && s.stepNumber === 3);
assert.ok(step3Action, 'Should record clicking_action for Step 3');
assert.equal(step3Action.buttonClicked, 'Review your application');
assert.equal(step3Action.actionType, 'click_review');
console.log('✓ Wizard Step 3: Answered screening questions via local Qwen 2.5 3B -> Clicked "Review your application" logged.');

// 7. Wizard Step 4: Final Review -> Click "Submit application"
processTracker.recordFormStep(4, 'Review', 0);
processTracker.recordStepAudit(4, 0, 0);

// Execute final submission click
processTracker.recordStepAdvance({
  stepNumber: 4,
  stepTitle: 'Review',
  buttonText: 'Submit application',
  action: 'submit',
  fieldsFilledCount: 6,
});

const submitAction = session.steps.find((s) => s.stage === 'submitting' && s.stepNumber === 4);
assert.ok(submitAction, 'Should record submitting action for final step');
assert.equal(submitAction.buttonClicked, 'Submit application');
assert.ok(submitAction.title.includes('Clicked "Submit application"'));
assert.ok(submitAction.title.includes('Submitting Application!'));
console.log('✓ Wizard Step 4: Final Pre-flight audit passed -> Clicked "Submit application" logged.');

// 8. Submission Verification & Confirmation
processTracker.recordSubmissionCheck(true, 'LinkedIn confirmation modal detected: "Your application was sent to Meta".');
assert.equal(session.status, 'submitted');
const verifyStep = session.steps.find((s) => s.stage === 'verifying_submission');
assert.ok(verifyStep, 'Should have submission verification step');
assert.equal(verifyStep.status, 'completed');
assert.ok(verifyStep.description.includes('Your application was sent to Meta'));
console.log('✓ Step 5: Submission confirmed & verified cleanly.');

// 9. Move to Next Job Card
processTracker.recordMovingToNext('Lead Frontend Architect at Stripe');
const nextStep = session.steps.find((s) => s.stage === 'moving_to_next');
assert.ok(nextStep, 'Should have moving_to_next step');
assert.ok(nextStep.description.includes('Lead Frontend Architect at Stripe'));
console.log('✓ Step 6: Moving to next job card logged.');

console.log('\n🎉 ALL REAL-TIME STEP-BY-STEP & SUBMISSION TESTS PASSED WITH 100% SUCCESS! 🎉\n');
