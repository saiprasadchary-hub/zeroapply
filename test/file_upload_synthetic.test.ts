import assert from 'node:assert/strict';
import {
  getFallbackResume,
  buildAttachFileScript,
  PICK_EXISTING_RESUME_SCRIPT,
} from '../src/agent/fileUpload';

console.log('=== TEST 1: Resume File Adapter Fallback Generation ===');
const fallback = getFallbackResume('Alex Rivera');
assert.equal(fallback.name, 'Alex_Rivera_Resume.pdf');
assert.equal(fallback.type, 'application/pdf');
assert.ok(fallback.base64Data?.startsWith('data:application/pdf;base64'));
console.log('✓ Fallback resume generated with valid PDF headers.');

console.log('=== TEST 2: Synthetic File Uploader Script Synthesis ===');
const script = buildAttachFileScript('Alex_Rivera_Resume.pdf', 'data:application/pdf;base64,AAAA', 'application/pdf');
assert.ok(script.includes('DataTransfer'));
assert.ok(script.includes('Alex_Rivera_Resume.pdf'));
assert.ok(script.includes('input.dispatchEvent(new Event(\'change\', { bubbles: true }));'));
// Verify script parses as valid JS
assert.doesNotThrow(() => {
  new Function(script);
});
console.log('✓ buildAttachFileScript produced syntactically valid executable code.');

console.log('=== TEST 3: Existing Resume Picker Script Validation ===');
assert.ok(PICK_EXISTING_RESUME_SCRIPT.includes('role="radiogroup"'));
assert.ok(PICK_EXISTING_RESUME_SCRIPT.includes('resume-item--selected'));
assert.doesNotThrow(() => {
  new Function(PICK_EXISTING_RESUME_SCRIPT);
});
console.log('✓ PICK_EXISTING_RESUME_SCRIPT validated without syntax errors.');

console.log('\n🎉 ALL FILE UPLOAD & ATTACHMENT TESTS PASSED (100%)!');
