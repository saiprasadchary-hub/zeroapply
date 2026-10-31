import assert from 'node:assert/strict';
import {
  getVisualCursorScript,
  ensureVisualCursor,
  cursorMoveAndClick,
  cursorMoveAndType,
  cursorMoveAndSelect,
  cursorMoveAndUpload,
  cursorGlideTo,
  cursorDismiss,
} from '../src/agent/stealth/agentCursor';
import { fillField } from '../src/agent/form/formFiller';
import { stepNavigator } from '../src/agent/workflow/stepNavigator';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { buildQuestionPrompt } from '../src/agent/localLlm/promptBuilder';
import { parseAnswer } from '../src/agent/localLlm/answerParser';
import { analyzeErrorConstraint } from '../src/agent/localLlm/errorConstraintAnalyzer';
import type { WebviewTarget } from '../src/agent/vision/domObserver';
import { type ClassifiedField, classifyFields } from '../src/agent/form/fieldClassifier';
import type { PersonaData } from '../src/types';

console.log('=== CODEX VISUAL CURSOR UNIT TEST SUITE ===');

// --- TEST 1: Injected Script Integrity & Styling Guarantees ---
console.log('--- TEST 1: Script Integrity & CSS Safety ---');
const script = getVisualCursorScript();
assert.ok(typeof script === 'string' && script.length > 500, 'Script must be non-empty');
assert.ok(script.includes('zeroapply-codex-cursor-root'), 'Must contain isolated root container ID');
assert.ok(script.includes('pointer-events: none !important'), 'Must enforce non-blocking pointer events');
assert.ok(script.includes('za-click-ripple'), 'Must declare radar click ripple style');
assert.ok(script.includes('za-cursor-badge'), 'Must declare floating action pill style');
assert.ok(script.includes('za-ripple-expand'), 'Must declare ripple expansion keyframes');
assert.ok(script.includes('za-cursor-bounce'), 'Must declare cursor click bounce animation');
assert.ok(script.includes('window.__zeroapplyCursor'), 'Must define window.__zeroapplyCursor bridge');
assert.ok(script.includes('uploadElement'), 'Must support uploadElement method');
assert.ok(script.includes('selectElement'), 'Must support selectElement method');
assert.ok(script.includes('typeElement'), 'Must support typeElement method');
assert.ok(script.includes('clickElement'), 'Must support clickElement method');
assert.ok(script.includes('za-glass-shadow'), 'Must declare valid SVG XML filter id za-glass-shadow');
assert.ok(!script.includes('za-cursor-logo'), 'Must omit circular crossline logo emblem for clean cursor design');
assert.ok(script.includes('za-motion-ghost'), 'Must support smooth follow motion ghost echoes');
assert.ok(script.includes('setMode'), 'Must support setMode state switcher');
assert.ok(!script.includes('blur(2.5px)'), 'Must not contain non-standard XML filter attribute blur(2.5px)');
assert.ok(script.includes('parsererror'), 'Must contain defensive parsererror check to prevent red error box');
assert.ok(script.includes('insertAdjacentHTML'), 'Must provide seamless fallback to prevent broken pointer rendering');
console.log('✅ Visual cursor client script satisfies all styling, animation, and safety criteria.');

// --- TEST 2: Webview Script Execution & Lifecycle ---
console.log('--- TEST 2: ensureVisualCursor and Webview Injection ---');
const executedScripts: string[] = [];
let mockIsAlive = false;

const mockWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    executedScripts.push(code);
    if (code.includes('zeroapply-codex-cursor-root')) {
      mockIsAlive = true;
      return undefined as unknown as T;
    }
    if (code.includes('!!(window.__zeroapplyCursor')) {
      return mockIsAlive as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.clickElement')) {
      return true as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.typeElement')) {
      return true as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.selectElement')) {
      return true as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.uploadElement')) {
      return true as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.moveTo')) {
      return true as unknown as T;
    }
    if (code.includes('window.__zeroapplyCursor.hide()')) {
      return true as unknown as T;
    }
    return { success: true } as unknown as T;
  },
};

const injected = await ensureVisualCursor(mockWebview);
assert.equal(injected, true, 'ensureVisualCursor should succeed');
assert.equal(mockIsAlive, true, 'Cursor state should now be alive in mock webview');

// Calling it again when alive should succeed without re-injecting full script
const aliveResult = await ensureVisualCursor(mockWebview);
assert.equal(aliveResult, true, 'Subsequent ensureVisualCursor should succeed quickly');
console.log('✅ ensureVisualCursor correctly manages injection and idempotency.');

// --- TEST 3: Cursor Action Controllers ---
console.log('--- TEST 3: Cursor Move, Click, Type, Select, and Upload APIs ---');

const clickRes = await cursorMoveAndClick(mockWebview, 'button.jobs-apply-button', {
  label: 'Codex AI: Clicking Easy Apply',
});
assert.equal(clickRes, true, 'cursorMoveAndClick should succeed');

const typeRes = await cursorMoveAndType(mockWebview, 'input#email-address', 'kspchary077@gmail.com', {
  label: 'Codex AI: Filling Email',
});
assert.equal(typeRes, true, 'cursorMoveAndType should succeed');

const selectRes = await cursorMoveAndSelect(mockWebview, 'select#phone-country-code', 'India (+91)', {
  label: 'Codex AI: Selecting India (+91)',
});
assert.equal(selectRes, true, 'cursorMoveAndSelect should succeed');

const uploadRes = await cursorMoveAndUpload(mockWebview, 'input[type="file"]', 'Resume.pdf', {
  label: 'Codex AI: 📄 Attaching Resume.pdf',
});
assert.equal(uploadRes, true, 'cursorMoveAndUpload should succeed');

const glideRes = await cursorGlideTo(mockWebview, 450, 320, 'Codex AI: Inspecting posting');
assert.equal(glideRes, true, 'cursorGlideTo should succeed');

const dismissRes = await cursorDismiss(mockWebview);
assert.equal(dismissRes, true, 'cursorDismiss should succeed');

console.log('✅ All high-level TypeScript cursor controllers executed as expected.');

// --- TEST 4: Integration with formFiller ---
console.log('--- TEST 4: formFiller Invokes Visual Cursor ---');

const testField: ClassifiedField = {
  id: 'urn:li:fs_easyApplyFormElement:100',
  name: 'email',
  label: 'Email address',
  selector: 'input#email',
  inputType: 'email',
  type: 'email',
  required: true,
  currentValue: '',
  confidence: 1.0,
};

const fillWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    executedScripts.push(code);
    return { success: true } as unknown as T;
  },
};

const fillOutcome = await fillField(fillWebview, testField, 'kspchary077@gmail.com');
assert.equal(fillOutcome.success, true, 'fillField should succeed with visual cursor active');
assert.ok(
  executedScripts.some((s) => s.includes('__zeroapplyCursor')),
  'fillField should reference visual cursor'
);
console.log('✅ formFiller triggers visual cursor animations during field completion.');

// --- TEST 5: Integration with stepNavigator ---
console.log('--- TEST 5: stepNavigator Invokes Visual Cursor on Button Clicks ---');

const navWebview: WebviewTarget = {
  executeJavaScript: async <T>(code: string): Promise<T> => {
    executedScripts.push(code);
    if (code.includes('detectForwardButton') || code.includes('data-za-step-btn')) {
      return {
        exists: true,
        action: 'submit',
        selector: '[data-za-step-btn="true"]',
        text: 'Submit application',
        disabled: false,
      } as unknown as T;
    }
    if (code.includes('preClickFingerprint') || code.includes('fingerprint')) {
      return 'initial_step' as unknown as T;
    }
    if (code.includes('clickScript') || code.includes('clickElement')) {
      return true as unknown as T;
    }
    return {
      fingerprint: 'next_step',
      errorCount: 0,
      progress: '100%',
    } as unknown as T;
  },
};

const navRes = await stepNavigator.advance(navWebview);
assert.equal(navRes.action, 'submit');
assert.ok(
  executedScripts.some((s) => s.includes('ZeroApply AI: Submitting Application') || s.includes('Codex AI: Submitting Application')),
  'stepNavigator should pass custom ZeroApply AI label for submit'
);
console.log('✅ stepNavigator smoothly glides visual cursor and clicks forward buttons.');

// --- TEST 6: Expected Hourly Rate Question Resolution ---
console.log('--- TEST 6: Hourly Rate Resolution Guard ---');

const mockPersona: PersonaData = {
  fullName: 'Sai Prasad Chary Kammari',
  email: 'kspchary077@gmail.com',
  phone: '+91 9876543210',
  location: 'Hyderabad, Telangana, India',
  workPreference: 'Remote',
  experienceYears: 2,
  minSalary: 12,
  tone: 'Confident',
  techStack: ['Python', 'TypeScript', 'Data Science'],
  targetRoles: ['Python Developer', 'AI/ML Engineer'],
  applyMode: 'easy',
  verified: true,
  education: 'B.Tech Computer Science & Engineering (Data Science) | Malla Reddy Engineering College',
  resumeText: 'EDUCATION B.Tech Computer Science & Engineering (Data Science) | Malla Reddy Engineering College',
};

const hourlyRes = await resolveQuestion(
  {
    label: 'What is your expected hourly rate? More affordable candidates will be prioritized.*',
    inputType: 'text',
  },
  mockPersona
);
assert.notEqual(hourlyRes.answer, mockPersona.education, 'Hourly rate MUST NEVER return education text');
assert.ok(!hourlyRes.answer.toLowerCase().includes('b.tech'), 'Hourly rate MUST NOT contain college details');
assert.ok(/^[0-9]+(\.[0-9]+)?$/.test(hourlyRes.answer.trim()) || /^\$?[0-9]+/.test(hourlyRes.answer.trim()), 'Hourly rate must be numeric or rate string');
console.log(`✅ Hourly rate correctly resolved to "${hourlyRes.answer}" without education leakage.`);

// --- TEST 7: Radio Button Group Field Filling ---
console.log('--- TEST 7: Radio Button Group Field Filling ---');
const radioField: ClassifiedField = {
  id: 'question_computational_workflows',
  name: 'reproducible_workflows',
  label: 'Have you designed reproducible computational workflows or scientifically verifiable solutions?*',
  selector: 'input[type="radio"][name="reproducible_workflows"]',
  inputType: 'radio',
  type: 'radio',
  required: true,
  currentValue: '',
  options: [
    'Yes, extensively, including reference solutions, pipelines, or automated validation',
    'Yes, through academic or professional research projects',
    'Limited experience',
    'No direct experience',
  ],
  confidence: 0.95,
};

const radioFillRes = await fillField(fillWebview, radioField, 'Yes, extensively, including reference solutions, pipelines, or automated validation');
assert.equal(radioFillRes.success, true, 'fillField for radio button should execute successfully');
assert.ok(
  executedScripts.some((s) => s.includes('targetEl.type === \'radio\'') || s.includes('targetEl.checked = true')),
  'Radio execution script should handle native and React controlled radio components'
);
console.log('✅ Radio button group selection correctly dispatches React events and visual cursor.');

// --- TEST 8: Decimal Validation Error Constraint in fieldClassifier ---
console.log('--- TEST 8: Decimal Validation Constraint in fieldClassifier ---');
const noticeFieldWithError: ClassifiedField = {
  id: 'notice_period_field',
  name: 'notice_period',
  label: 'Notice period (in weeks)*',
  selector: 'input#notice_period',
  inputType: 'text',
  type: 'text',
  required: true,
  currentValue: 'Immediately',
  hasError: true,
  errorMessage: 'Enter a decimal number larger than 0.0',
  confidence: 0.9,
};

const classifiedList = classifyFields([noticeFieldWithError], mockPersona);
assert.equal(classifiedList[0].mappedValue, '1.0', 'When validation error specifies "Enter a decimal number larger than 0.0", mappedValue must be "1.0", NOT "Immediately"');
console.log('✅ fieldClassifier correctly converted text mappedValue to "1.0" based on active decimal error.');

// --- TEST 9: PromptBuilder & AnswerParser with Validation Error ---
console.log('--- TEST 9: PromptBuilder & AnswerParser Validation Constraint ---');
const builtPrompt = buildQuestionPrompt({
  question: 'Notice period',
  persona: mockPersona,
  inputType: 'text',
  validationError: 'Enter a decimal number larger than 0.0',
});
assert.ok(builtPrompt.userPrompt.includes('Enter a decimal number larger than 0.0'), 'userPrompt must include validation error');
assert.ok(builtPrompt.systemPrompt.includes('ACTIVE VALIDATION ERROR'), 'systemPrompt must enforce validation error rule');

const parsedDecimal = parseAnswer('Immediately', {
  inputType: 'text',
  validationError: 'Enter a decimal number larger than 0.0',
});
assert.equal(parsedDecimal.answer, '1.0', 'parseAnswer must discard invalid string "Immediately" and return "1.0" for decimal larger than 0.0');

const parsedExplicitNum = parseAnswer('2', {
  inputType: 'text',
  validationError: 'Enter a decimal number larger than 0.0',
});
assert.equal(parsedExplicitNum.answer, '2.0', 'parseAnswer must format numeric value as decimal');
console.log('✅ PromptBuilder and AnswerParser strictly enforce decimal validation constraints.');

// --- TEST 10: QuestionResolver Decimal Constraint Self-Healing ---
console.log('--- TEST 10: QuestionResolver Decimal Constraint Self-Healing ---');
const resolvedErrorField = await resolveQuestion(
  {
    label: 'Notice period',
    inputType: 'text',
    validationError: 'Enter a decimal number larger than 0.0',
  },
  mockPersona
);
assert.equal(resolvedErrorField.answer, '1.0', 'resolveQuestion must resolve to "1.0" when constrained by decimal error');
assert.ok(!resolvedErrorField.answer.toLowerCase().includes('immediately'), 'Answer must not contain "Immediately"');
console.log(`✅ QuestionResolver self-healing returned "${resolvedErrorField.answer}" complying with decimal constraint.`);

// --- TEST 11: Universal Error Constraint Analyzer & Multi-Category Recovery ---
console.log('--- TEST 11: Universal Error Constraint Analyzer & Multi-Category Recovery ---');

// 11A. Whole number constraint
const wholeNumAnalysis = analyzeErrorConstraint('Please enter a whole number');
assert.equal(wholeNumAnalysis.category, 'whole_number');
assert.equal(wholeNumAnalysis.isNumericConstraint, true);
const parsedInt = parseAnswer('three', { inputType: 'text', validationError: 'Please enter a whole number' });
assert.equal(parsedInt.answer, '1');

// 11B. URL constraint
const urlAnalysis = analyzeErrorConstraint('Please enter a valid URL');
assert.equal(urlAnalysis.category, 'url');
const resolvedUrl = await resolveQuestion(
  { label: 'LinkedIn profile', inputType: 'text', validationError: 'Please enter a valid URL' },
  { ...mockPersona, linkedinUrl: 'https://www.linkedin.com/in/sai-prasad-chary' }
);
assert.ok(resolvedUrl.answer.startsWith('https://'), 'URL error must resolve to a valid https:// URL');

// 11C. Character length constraint
const lengthAnalysis = analyzeErrorConstraint('Must be at least 50 characters');
assert.equal(lengthAnalysis.category, 'min_length');
assert.equal(lengthAnalysis.targetMinLength, 50);
const resolvedMinLen = await resolveQuestion(
  { label: 'Tell us about your background', inputType: 'textarea', validationError: 'Must be at least 50 characters' },
  mockPersona
);
assert.ok(resolvedMinLen.answer.length >= 50, `Answer must satisfy 50+ chars minimum (got ${resolvedMinLen.answer.length})`);

// 11D. Required selection constraint
const selAnalysis = analyzeErrorConstraint('Please make a selection');
assert.equal(selAnalysis.category, 'required_selection');
const resolvedSel = await resolveQuestion(
  {
    label: 'Do you have required certifications?',
    inputType: 'radio',
    options: ['Yes, fully certified and licensed', 'In progress', 'No'],
    validationError: 'Please make a selection',
  },
  mockPersona
);
assert.equal(resolvedSel.answer, 'Yes, fully certified and licensed');

// 11E. Postal / ZIP code constraint
const postalAnalysis = analyzeErrorConstraint('Invalid ZIP code format');
assert.equal(postalAnalysis.category, 'postal');
const resolvedPostal = await resolveQuestion(
  { label: 'Postal code', inputType: 'text', validationError: 'Invalid ZIP code format' },
  mockPersona
);
assert.ok(/^[0-9]{5,6}$/.test(resolvedPostal.answer.replace(/\s+/g, '')), 'Postal error must output valid digits');

console.log('✅ Universal error constraint analyzer successfully tested across all 5 key ATS error categories.');

console.log('\n🎉 ALL CODEX VISUAL CURSOR & ATS FORM TESTS PASSED SUCCESSFULLY! 🎉\n');
