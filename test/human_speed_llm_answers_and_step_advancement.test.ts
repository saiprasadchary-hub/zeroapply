import assert from 'node:assert/strict';
import { resolveQuestion } from '../src/agent/form/questionResolver';
import { questionMemory } from '../src/agent/brain/questionMemory';
import { stepNavigator } from '../src/agent/workflow/stepNavigator';
import { getHumanKeystrokeDelay, planKeystrokeTimings } from '../src/agent/stealth/humanTyping';
import type { PersonaData } from '../src/types';
import type { ClassifiedField } from '../src/agent/form/fieldClassifier';
import type { WebviewTarget } from '../src/agent/vision/domObserver';

console.log('=== TEST SUITE: Human Speed, LLM Answering & Next/Continue Step Advancement ===\n');

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
  techStack: ['React', 'TypeScript', 'Node.js', 'Solidity', 'Python'],
  targetRoles: ['Full Stack Engineer'],
  applyMode: 'easy',
  verified: true,
  resumeText: 'Senior Full Stack Engineer with 4 years building high performance React, TypeScript, and Python web applications. 2 years experience with Solidity and Web3 smart contracts.',
};

questionMemory.seedFromPersona(mockPersona);

// ----------------------------------------------------
// 1. Human Speed & Keystroke Simulation Tests
// ----------------------------------------------------
console.log('--- TEST 1: Human Keystroke Pacing & Delay Distributions ---');
const timings = planKeystrokeTimings('4', 70);
assert.ok(timings.length === 1, 'Should plan 1 timing for single digit');
assert.ok(timings[0] >= 25 && timings[0] <= 650, 'Keystroke timing must be within realistic human bounds');

const sentenceTimings = planKeystrokeTimings('Yes, I am authorized.', 70);
assert.equal(sentenceTimings.length, 'Yes, I am authorized.'.length);
// Natural pause after comma and period must be longer
const commaIndex = 'Yes, I am authorized.'.indexOf(',');
assert.ok(sentenceTimings[commaIndex + 1] > 60, 'Punctuation pause after comma must add natural human pause');
console.log(`✅ Keystroke delays generated with realistic human Gaussian distribution (mean delay: ${Math.round(sentenceTimings.reduce((a, b) => a + b, 0) / sentenceTimings.length)}ms/char).`);

// ----------------------------------------------------
// 2. LLM Question Answering with Resume Context
// ----------------------------------------------------
console.log('\n--- TEST 2: LLM Answering for Custom / Screening Questions ---');
const skillField: ClassifiedField = {
  id: 'solidity_exp',
  selector: '#solidity-years',
  tagName: 'input',
  inputType: 'number',
  label: 'How many years of work experience do you have with Solidity?*',
  placeholder: '',
  name: 'solidity_exp',
  currentValue: '',
  required: true,
  hasError: false,
  fieldType: 'custom_question',
  confidence: 0.3,
  rect: { x: 100, y: 200, width: 300, height: 40 },
};

console.log('Invoking resolveQuestion (consulting Local LLM & resume)...');
const answerRes = await resolveQuestion(skillField, mockPersona);
console.log(`LLM Resolved Answer: "${answerRes.answer}" (source: ${answerRes.source}, confidence: ${answerRes.confidence})`);
assert.ok(answerRes.answer, 'LLM must produce a valid answer');
assert.ok(
  answerRes.source === 'llm' || answerRes.source === 'memory' || answerRes.source === 'rule',
  'Answer source must be traceable'
);

// Verify Memory Bank now caches this answer for instantaneous human-speed recall
const cached = questionMemory.lookup('How many years of work experience do you have with Solidity?*');
assert.ok(cached.hit, 'Memory Bank must cache LLM answer for instant future answers');
assert.equal(cached.answer, answerRes.answer);
console.log('✅ LLM question answered using candidate resume context and cached in Memory Bank.');

// ----------------------------------------------------
// 3. Step Navigation: Next, Continue, Proceed, Submit Detection
// ----------------------------------------------------
console.log('\n--- TEST 3: Step Advancement Navigation Button Detection ---');

const mockNextWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    // Simulate finding a "Continue to next step" button in the DOM
    return {
      exists: true,
      action: 'next',
      selector: '[data-za-step-btn="true"]',
      text: 'continue to next step',
      disabled: false,
    } as T;
  },
};

const detectedNext = await stepNavigator.detectForwardButton(mockNextWebview);
assert.equal(detectedNext.exists, true);
assert.equal(detectedNext.action, 'next');
assert.equal(detectedNext.disabled, false);
console.log('✅ Forward button ("continue to next step") successfully detected.');

const mockSubmitWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    return {
      exists: true,
      action: 'submit',
      selector: '[data-za-step-btn="true"]',
      text: 'submit application',
      disabled: false,
    } as T;
  },
};

const detectedSubmit = await stepNavigator.detectForwardButton(mockSubmitWebview);
assert.equal(detectedSubmit.exists, true);
assert.equal(detectedSubmit.action, 'submit');
console.log('✅ Final "Submit application" forward action successfully detected.');

// ----------------------------------------------------
// 4. Step Advancement Execution Simulation
// ----------------------------------------------------
console.log('\n--- TEST 4: stepNavigator.advance Executes Click & Verifies Transition ---');
let clickDispatched = false;
const mockAdvanceWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    if (code.includes('clickElement') || code.includes('dispatchEvent')) {
      clickDispatched = true;
      return true as T;
    }
    if (code.includes('detectForwardButton') || code.includes('data-za-step-btn')) {
      return {
        exists: true,
        action: 'next',
        selector: '[data-za-step-btn="true"]',
        text: 'next',
        disabled: false,
      } as T;
    }
    if (code.includes('preClickFingerprint')) {
      return 'input_email|input_phone::0%' as T;
    }
    // Step changed check returns changed fingerprint
    return {
      fingerprint: 'input_work_auth::33%',
      errorCount: 0,
      progress: '33%',
    } as T;
  },
};

const advanceResult = await stepNavigator.advance(mockAdvanceWebview, 2000);
assert.ok(advanceResult.success, 'advance must succeed');
assert.equal(advanceResult.action, 'next');
assert.equal(advanceResult.stepChanged, true);
assert.equal(advanceResult.hasErrors, false);
assert.ok(clickDispatched, 'Visual cursor click dispatch must execute');
console.log('✅ stepNavigator.advance moved visual cursor, clicked "Next", and verified step transition to 33%.');

console.log('\n🎉 ALL HUMAN SPEED, LLM ANSWERS & STEP ADVANCEMENT TESTS PASSED! 🎉');
